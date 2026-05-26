import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { StudyMaterial, QuizAttempt } from "../types";
import { ArrowLeft, CheckCircle2, XCircle, Trophy, Clock, BrainCircuit, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../lib/language";

const QUESTION_TIME_LIMIT = 30;

export default function QuizView({
  user,
  materialId,
  onBack,
  onFinish
}: {
  user: User;
  materialId: string;
  onBack: () => void;
  onFinish: () => void;
}) {
  const { t } = useLanguage();
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);

  useEffect(() => {
    async function loadMaterial() {
      try {
        const docRef = doc(db, "studyMaterials", materialId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as StudyMaterial;
          if (data.quiz && Array.isArray(data.quiz)) {
            const shuffleArray = <T,>(array: T[]): T[] => {
              const newArray = [...array];
              for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
              }
              return newArray;
            };
            data.quiz = shuffleArray(data.quiz).map(q => ({
              ...q,
              options: shuffleArray(q.options)
            }));
          }
          setMaterial({ id: docSnap.id, ...data });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMaterial();
  }, [materialId]);

  useEffect(() => {
    if (loading || quizFinished || isAnswerRevealed || !material) return;
    
    if (timeLeft <= 0) {
      setIsAnswerRevealed(true);
      setSelectedAnswer(null);
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isAnswerRevealed, loading, quizFinished, material]);

  if (loading) {
    return <div className="p-8 text-center">Loading quiz...</div>;
  }

  if (!material || !material.quiz || material.quiz.length === 0) {
    return <div>No quiz available for this material.</div>;
  }

  const currentQuestion = material.quiz[currentQuestionIndex];

  const handleAnswerSubmit = () => {
    if (!selectedAnswer || isAnswerRevealed) return;
    
    setIsAnswerRevealed(true);
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = async () => {
    setUserAnswers(prev => [...prev, selectedAnswer]);
    if (currentQuestionIndex < material.quiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerRevealed(false);
      setTimeLeft(QUESTION_TIME_LIMIT);
    } else {
      // Finish quiz
      setQuizFinished(true);
      setSavingLoading(true);
      try {
         const attemptData: QuizAttempt = {
            userId: user.uid,
            materialId: material.id!,
            score: score,
            totalQuestions: material.quiz.length,
            createdAt: Date.now()
         };
         await addDoc(collection(db, "quizAttempts"), attemptData);
      } catch (err) {
         console.error("Error saving quiz attempt:", err);
      } finally {
         setSavingLoading(false);
      }
    }
  };

    if (quizFinished) {
     return (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="flex flex-col w-full max-w-4xl mx-auto p-4 sm:p-8 text-white"
        >
           <div className="flex flex-col items-center justify-center text-center mb-10">
               <motion.div 
                 initial={{ rotate: -180, scale: 0 }}
                 animate={{ rotate: 0, scale: 1 }}
                 transition={{ duration: 0.5, type: "spring" }}
                 className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#10B981]/20 text-[#FBBF24]"
               >
                  <Trophy className="h-12 w-12" />
               </motion.div>
               <h2 className="mb-2 text-3xl font-bold text-white tracking-tight">{t("quiz.completed")}</h2>
               <p className="text-xl text-white">
                 {t("quiz.score")} <strong className="text-[#3B82F6] font-bold text-3xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">{score}</strong> {t("mat.flashcards.of")} {material.quiz.length}
               </p>
           </div>
           
           <div className="space-y-6 w-full mb-10">
              <h3 className="text-xl font-bold border-b border-slate-700 pb-2">Pembahasan Kuis</h3>
              {material.quiz.map((q, idx) => {
                 const userAnswer = userAnswers[idx];
                 const isCorrect = userAnswer === q.correctAnswer;
                 const isTimeout = userAnswer === null;

                 return (
                    <div key={idx} className="bg-[#1E293B] rounded-2xl p-6 border border-slate-700">
                       <p className="font-semibold text-lg mb-4"><span className="text-slate-400 mr-2">{idx + 1}.</span>{q.question}</p>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className={`p-4 rounded-xl ${isCorrect ? 'bg-green-900/30 border border-green-500/30' : (isTimeout ? 'bg-yellow-900/30 border border-yellow-500/30' : 'bg-red-900/30 border border-red-500/30')}`}>
                             <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-bold">Jawabanmu</p>
                             <p className={`font-medium ${isCorrect ? 'text-green-400' : (isTimeout ? 'text-yellow-400' : 'text-red-400')}`}>{userAnswer || "Tidak ada jawaban (Waktu Habis)"}</p>
                          </div>
                          {!isCorrect && (
                             <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-700">
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-bold">Jawaban Benar</p>
                                <p className="font-medium text-[#10B981]">{q.correctAnswer}</p>
                             </div>
                          )}
                       </div>
                       <div className="bg-[#0F172A] p-4 rounded-xl border border-slate-800">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5"><BrainCircuit className="w-3 h-3"/> Penjelasan AI</p>
                          <p className="text-sm text-slate-300 leading-relaxed">{q.explanation}</p>
                       </div>
                    </div>
                 );
              })}
           </div>

           <div className="flex justify-center">
               <button 
                 onClick={onFinish}
                 disabled={savingLoading}
                 className="w-full sm:w-auto min-w-[240px] rounded-full bg-[#3B82F6] px-8 py-4 font-bold text-white custom-shadow hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
               >
                 {savingLoading ? <><Loader2 className="w-5 h-5 animate-spin"/> {t("quiz.saving")}</> : <>Kembali ke Dashboard <ArrowRight className="w-4 h-4"/></>}
               </button>
           </div>
        </motion.div>
     );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 mt-4 text-white">
      <div className="flex items-center justify-between">
         <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-white hover:text-white transition-colors">
           <ArrowLeft className="h-4 w-4" />
           {t("quiz.exit")}
         </button>
         <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 font-bold ${timeLeft <= 5 ? "text-red-600 animate-pulse" : "text-[#10B981]"}`}>
               <Clock className="h-4 w-4" />
               <span>00:{timeLeft.toString().padStart(2, '0')}</span>
            </div>
            <span className="font-semibold text-[#FBBF24] text-sm uppercase tracking-wider">{t("mat.flashcards.question")} {currentQuestionIndex + 1} {t("mat.flashcards.of")} {material.quiz.length}</span>
         </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full rounded-full bg-[#FBBF24]/10 overflow-hidden">
         <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${((currentQuestionIndex) / material.quiz.length) * 100}%` }}
           transition={{ duration: 0.5, ease: "easeInOut" }}
           className="h-full bg-[#3B82F6]"
         ></motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="glass-card rounded-2xl p-8"
        >
           <h2 className="mb-8 text-xl md:text-2xl font-bold text-white leading-snug">
             {currentQuestion.question}
           </h2>

           <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                 let btnClasses = "w-full text-left p-4 rounded-xl border-2 transition-all font-medium flex items-center justify-between ";
                 
                 if (!isAnswerRevealed) {
                    btnClasses += selectedAnswer === option 
                       ? "border-[#3B82F6] bg-[#3B82F6]/5 text-[#3B82F6]" 
                       : "border-transparent bg-[#1E293B] shadow-sm text-white hover:border-[#FBBF24]/20 hover:bg-[#0F172A] text-white";
                 } else {
                    if (option === currentQuestion.correctAnswer) {
                       btnClasses += "border-green-500 bg-green-50 text-green-800";
                    } else if (option === selectedAnswer) {
                       btnClasses += "border-red-500 bg-red-900/30 text-red-800";
                    } else {
                       btnClasses += "border-transparent bg-[#0F172A] text-white opacity-50";
                    }
                 }

                 return (
                    <motion.button 
                      whileHover={!isAnswerRevealed ? { scale: 1.01 } : {}}
                      whileTap={!isAnswerRevealed ? { scale: 0.99 } : {}}
                      key={idx}
                      disabled={isAnswerRevealed}
                      onClick={() => setSelectedAnswer(option)}
                      className={btnClasses}
                    >
                       <span>{option}</span>
                       {isAnswerRevealed && option === currentQuestion.correctAnswer && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                       {isAnswerRevealed && option === selectedAnswer && option !== currentQuestion.correctAnswer && <XCircle className="h-5 w-5 text-red-600" />}
                    </motion.button>
                 )
              })}
           </div>

           <AnimatePresence>
             {isAnswerRevealed && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className={`overflow-hidden rounded-xl bg-[#1E293B]`}
                >
                  <div className={`p-4 rounded-xl ${selectedAnswer === currentQuestion.correctAnswer ? 'bg-green-50 border border-green-200' : 'bg-red-900/30 border border-red-200'}`}>
                    <h3 className={`font-bold mb-1 ${selectedAnswer === currentQuestion.correctAnswer ? 'text-green-800' : 'text-red-800'}`}>
                      {timeLeft <= 0 && !selectedAnswer ? t("quiz.timeout") : selectedAnswer === currentQuestion.correctAnswer ? t("quiz.correct") : t("quiz.incorrect")}
                    </h3>
                    <p className="text-white text-sm leading-relaxed">{currentQuestion.explanation}</p>
                  </div>
                </motion.div>
             )}
           </AnimatePresence>

           <div className="mt-8 flex justify-end">
              {!isAnswerRevealed ? (
                 <motion.button 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   disabled={!selectedAnswer}
                   onClick={handleAnswerSubmit}
                   className="rounded-full bg-[#10B981] px-8 py-3 font-semibold text-white custom-shadow hover:opacity-90 transition-opacity disabled:opacity-50"
                 >
                   {t("quiz.submit")}
                 </motion.button>
              ) : (
                 <motion.button 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={handleNextQuestion}
                   className="rounded-full bg-[#3B82F6] px-8 py-3 font-semibold text-white custom-shadow hover:opacity-90 transition-opacity"
                 >
                   {currentQuestionIndex < material.quiz.length - 1 ? t("quiz.next") : t("quiz.finish")}
                 </motion.button>
              )}
           </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
