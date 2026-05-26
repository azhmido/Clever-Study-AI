import { useState, useEffect, useRef, FormEvent } from "react";
import { User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { StudyMaterial } from "../types";
import { ArrowLeft, BookOpen, Layers, CheckCircle2, Play, BrainCircuit, Send, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../lib/language";
import toast from "react-hot-toast";

import ReactMarkdown from 'react-markdown';

const renderText = (value: any): string => {
  if (typeof value === 'string') return value;
  if (!value) return '';
  if (typeof value === 'object') {
     // sometimes gemini might return structured objects for texts, try to extract first string value
     const vals = Object.values(value);
     if (vals.length > 0 && typeof vals[0] === 'string') return vals[0];
     return JSON.stringify(value);
  }
  return String(value);
};

export default function MaterialView({ 
  user, 
  materialId, 
  onBack, 
  onTakeQuiz 
}: { 
  user: User, 
  materialId: string, 
  onBack: () => void, 
  onTakeQuiz: () => void 
}) {
  const { t } = useLanguage();
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"summary" | "flashcards" | "ai-tutor">("summary");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string, image?: string }[]>([
    { role: 'model', text: 'Halo! Saya Clever Study AI Tutor ✨\n\nMasukkan materi belajar Anda di sini, dan saya akan siap membantu! Anda juga bisa mengunggah gambar soal untuk saya bantu pecahkan.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatImageBase64, setChatImageBase64] = useState<string | null>(null);
  const [chatImageMime, setChatImageMime] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
           setChatImageBase64(reader.result as string);
           setChatImageMime(file.type);
        };
        reader.readAsDataURL(file);
     }
  };
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading, activeTab]);

  useEffect(() => {
    async function loadMaterial() {
      try {
        const docRef = doc(db, "studyMaterials", materialId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as StudyMaterial;
          setMaterial({ id: docSnap.id, ...data });
          if (data.chatHistory) {
             setChatHistory(data.chatHistory);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMaterial();
  }, [materialId]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !chatImageBase64) || !material) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const currentImg = chatImageBase64;
    setChatImageBase64(null);
    setChatImageMime(null);
    
    // Update local state first
    const userMessageObj: {role: 'user' | 'model', text: string, image?: string} = { role: 'user', text: userMsg };
    if (currentImg) {
      userMessageObj.image = currentImg;
    }
    const updatedHistory = [...chatHistory, userMessageObj];
    setChatHistory(updatedHistory);
    setChatLoading(true);

    try {
      const idToken = await user.getIdToken();
      const contextStr = `
Title: ${material.title}
Key Points: ${material.summary?.keyPoints.join(', ')}
Flashcards: ${material.flashcards?.map(f => `${f.front} - ${f.back}`).join(' | ')}
`;
      const formattedHistory = chatHistory.filter((_, i) => i > 0).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        text: msg.text
      }));

      const payload: any = {
          message: userMsg,
          context: contextStr,
          history: formattedHistory
      };
      if (currentImg) {
          payload.imageBase64 = currentImg;
          payload.imageMimeType = chatImageMime;
      }

      const res = await fetch('/api/chat-tutor', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
         if (res.status === 503) {
            throw new Error('Sistem sedang ramai (High Demand). Mohon coba lagi dalam beberapa detik ya! 🙏');
         }
         throw new Error(data.error || 'Gagal terhubung dengan AI Tutor');
      }

      const finalHistory: {role: 'user' | 'model', text: string, image?: string}[] = [...updatedHistory, { role: 'model', text: data.reply }];
      setChatHistory(finalHistory);
      
      // Update Firestore with the new chat history
      await updateDoc(doc(db, "studyMaterials", material.id!), {
         chatHistory: finalHistory
      });

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error communicating with AI tutor');
      setChatHistory(prev => [...prev, { role: 'model', text: `⚠️ ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-6"><div className="h-8 bg-slate-700 rounded w-1/3"></div><div className="h-64 bg-slate-700 rounded"></div></div>;
  }

  if (!material) {
    return <div>Material not found.</div>;
  }

  return (
    <div className="space-y-8 pb-24 text-white max-w-5xl mx-auto mt-4 px-4 sm:px-6">
       <button onClick={onBack} className="group flex items-center gap-2 text-sm font-semibold text-white hover:text-[#3B82F6] transition-all bg-[#1E293B] px-4 py-2 rounded-full shadow-sm border border-slate-700/50 hover:shadow-md w-fit">
         <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
         {t("mat.back")}
       </button>

       <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] p-8 sm:p-12 text-white shadow-xl">
         <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-[#1E293B] blur-3xl"></div>
         <div className="absolute bottom-0 left-0 -mb-24 -ml-24 h-80 w-80 rounded-full bg-[#10B981]/20 blur-3xl"></div>
         
         <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#FBBF24] bg-[#1E293B] rounded-full mb-4 border border-slate-700">
                <BookOpen className="h-3 w-3" />
                {t("mat.badge")}
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">{material.title}</h1>
              <p className="mt-4 text-base sm:text-lg text-white/80 font-medium">{t("mat.source")} {material.originalFileName}</p>
              <p className="text-sm text-white/60 mt-1">{t("mat.processed")} {new Date(material.createdAt).toLocaleDateString()}</p>
           </div>
           
           <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={onTakeQuiz}
             className="flex items-center justify-center gap-2 rounded-2xl bg-[#1E293B] px-8 py-4 font-bold text-[#3B82F6] shadow-lg hover:shadow-xl hover:bg-[#0F172A] transition-all shrink-0 w-full md:w-auto"
           >
             <Play className="h-5 w-5 fill-current" />
             {t("mat.quiz.start")}
           </motion.button>
         </div>
       </div>

       {/* Tabs */}
       <div className="flex p-1 space-x-2 bg-slate-800/50 rounded-2xl border border-slate-700/50 mx-auto max-w-fit overflow-x-auto">
           <button
             onClick={() => setActiveTab("summary")}
             className={`flex-shrink-0 relative flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all ${
               activeTab === "summary" ? "text-white bg-[#3B82F6] shadow-md" : "text-white hover:text-white hover:bg-[#1E293B]"
             }`}
           >
             <BookOpen className="h-4 w-4" />
             {t("mat.tab.summary")}
           </button>
           <button
             onClick={() => { setActiveTab("flashcards"); setIsCardFlipped(false); setCurrentCardIndex(0); }}
             className={`flex-shrink-0 relative flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all ${
               activeTab === "flashcards" ? "text-white bg-[#3B82F6] shadow-md" : "text-white hover:text-white hover:bg-[#1E293B]"
             }`}
           >
             <Layers className="h-4 w-4" />
             {t("mat.tab.flashcards")} ({material.flashcards?.length || 0})
           </button>
           <button
             onClick={() => setActiveTab("ai-tutor")}
             className={`flex-shrink-0 relative flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all group ${
               activeTab === "ai-tutor" ? "text-white bg-[#10B981] shadow-md" : "text-white hover:text-[#10B981] hover:bg-[#1E293B]"
             }`}
           >
             <BrainCircuit className={`h-4 w-4 ${activeTab === "ai-tutor" ? "animate-pulse" : ""}`} />
             {t("mat.tab.ai")}
           </button>
       </div>

       {/* Tab Content */}
       <div className="pt-4 overflow-hidden relative">
         <AnimatePresence mode="wait">
           {activeTab === "summary" && (
              <motion.div 
                key="summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid gap-6 md:grid-cols-12"
              >
                 <div className="md:col-span-8 flex flex-col gap-6">
                    <div className="bg-[#1E293B] rounded-[2rem] p-6 sm:p-10 shadow-sm border border-slate-700/50 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                       <div className="absolute -top-12 -right-12 text-[#FBBF24]/5 group-hover:text-[#FBBF24]/10 transition-colors duration-500">
                           <BookOpen className="w-64 h-64 rotate-12" />
                       </div>
                       <h2 className="mb-8 flex items-center gap-4 text-xl sm:text-2xl font-extrabold text-white relative z-10">
                         <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6]">
                           <CheckCircle2 className="h-6 w-6" />
                         </span>
                         {t("mat.summary.keyPoints")}
                       </h2>
                       <ul className="space-y-4 relative z-10">
                          {material.summary?.keyPoints?.map((point, i) => (
                             <motion.li 
                               initial={{ opacity: 0, x: -10 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: i * 0.05 }}
                               key={i} 
                               className="flex gap-4 sm:gap-5 group/item items-start bg-[#0F172A]/50 p-4 rounded-2xl hover:bg-[#1E293B] hover:shadow-sm border border-transparent hover:border-slate-700/50 transition-all duration-300"
                             >
                                <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] font-bold text-xs group-hover/item:scale-110 group-hover/item:bg-[#10B981] group-hover/item:text-white transition-all shadow-sm">
                                  {i + 1}
                                </div>
                            <div className="prose prose-invert prose-sm sm:prose-base max-w-none leading-relaxed">
                               <ReactMarkdown>
                                  {renderText(point)}
                               </ReactMarkdown>
                            </div>
                             </motion.li>
                          ))}
                       </ul>
                    </div>
                 </div>
                 <div className="md:col-span-4 space-y-6">
                    <h2 className="flex items-center gap-3 text-xl font-extrabold text-white p-4 bg-[#0F172A] rounded-2xl">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-lg shadow-[#10B981]/20">
                        <BrainCircuit className="h-5 w-5" />
                      </span>
                      {t("mat.summary.mainConcepts")}
                    </h2>
                    <div className="flex flex-col gap-4">
                      {material.summary?.mainConcepts?.map((concept, i) => (
                         <motion.div 
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: i * 0.1 }}
                           key={i} 
                           className="group rounded-2xl border border-slate-700/50 bg-[#1E293B] p-5 sm:p-6 hover:shadow-xl hover:-translate-y-1 hover:border-[#3B82F6]/30 transition-all duration-300 relative overflow-hidden"
                         >
                           <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Sparkles className="h-8 w-8 text-[#3B82F6]" />
                           </div>
                           <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[#3B82F6] to-[#1E3A8A] opacity-0 group-hover:opacity-100 transition-opacity rounded-l-2xl"></div>
                           <h3 className="font-extrabold text-[#3B82F6] text-lg mb-3 relative z-10">{renderText(concept.term)}</h3>
                           <div className="prose prose-invert prose-sm sm:prose-base max-w-none leading-relaxed relative z-10 text-white">
                               <ReactMarkdown>
                                   {renderText(concept.explanation)}
                               </ReactMarkdown>
                           </div>
                         </motion.div>
                      ))}
                    </div>
                 </div>
              </motion.div>
           )}

           {activeTab === "flashcards" && material.flashcards && material.flashcards.length > 0 && (
              <motion.div 
                key="flashcards"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="mx-auto max-w-2xl flex flex-col items-center"
              >
                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full mb-6 relative z-10">
                   <div className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></div>
                   <span className="text-sm font-bold text-white">
                     {t("mat.flashcards.card")} {currentCardIndex + 1} {t("mat.flashcards.of")} {material.flashcards.length}
                   </span>
                 </div>

                 {/* Flashcard */}
                 <div 
                   className="relative w-full cursor-pointer perspective-1000 group max-w-4xl"
                   onClick={() => setIsCardFlipped(!isCardFlipped)}
                 >
                    <motion.div 
                      key={currentCardIndex}
                      initial={{ scale: 0.9, opacity: 0, rotateX: 10 }}
                      animate={{ scale: 1, opacity: 1, rotateX: 0, rotateY: isCardFlipped ? 180 : 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className={`w-full transform-style-preserve-3d shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2.5rem] hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] transition-all grid`}
                    >
                       {/* Front */}
                       <div className="relative col-start-1 row-start-1 backface-hidden w-full h-auto min-h-[300px] sm:min-h-[400px] bg-[#1E293B] border border-slate-700/50 rounded-[2.5rem] p-8 sm:p-14 flex flex-col items-center justify-center overflow-hidden">
                          <div className="absolute top-0 right-0 w-48 h-48 bg-[#0F172A]/80 rounded-full blur-3xl -mt-20 -mr-20 pointer-events-none"></div>
                          <div className="absolute top-8 left-8 text-[#10B981]/10 pointer-events-none">
                            <Layers className="h-16 w-16" />
                          </div>
                          <div className="text-xs uppercase font-extrabold tracking-[0.2em] text-[#10B981] mb-6 sm:mb-8 relative z-10 shrink-0">{t("mat.flashcards.question")}</div>
                          
                          <div className="w-full flex-1 relative z-10 flex items-center justify-center py-4">
                            <h3 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight text-center">{renderText(material.flashcards[currentCardIndex].front)}</h3>
                          </div>

                          <div className="mt-8 sm:mt-10 text-center flex items-center justify-center gap-2 text-[10px] sm:text-xs text-white font-bold tracking-wider uppercase opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                            {t("mat.flashcards.flip")}
                          </div>
                       </div>
                       
                       {/* Back */}
                       <div className="relative col-start-1 row-start-1 backface-hidden w-full h-auto min-h-[300px] sm:min-h-[400px] bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] rounded-[2.5rem] p-8 sm:p-14 flex flex-col items-center justify-center rotate-y-180 custom-shadow text-white overflow-hidden shadow-inner">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E293B] rounded-full blur-3xl -mt-20 -mr-20 pointer-events-none"></div>
                          <div className="text-xs uppercase font-extrabold tracking-[0.2em] text-[#10B981] mb-6 sm:mb-8 relative z-10 shrink-0">{t("mat.flashcards.answer")}</div>
                          
                          <div className="w-full flex-1 relative z-10 flex items-center justify-center py-4">
                            <p className="text-lg sm:text-2xl font-medium leading-relaxed text-center">{renderText(material.flashcards[currentCardIndex].back)}</p>
                          </div>

                          <div className="mt-8 sm:mt-10 text-center flex items-center justify-center gap-2 text-[10px] sm:text-xs text-white/40 font-bold tracking-wider uppercase opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                            {t("mat.flashcards.flipBack")}
                          </div>
                       </div>

                    </motion.div>
                 </div>

                 <div className="mt-10 flex items-center gap-4 bg-[#1E293B] p-2.5 rounded-full shadow-sm border border-slate-700/50 relative z-10">
                    <button 
                      onClick={() => { setCurrentCardIndex(prev => Math.max(0, prev - 1)); setIsCardFlipped(false); }}
                      disabled={currentCardIndex === 0}
                      className="rounded-full px-8 py-3.5 text-sm font-bold text-white hover:bg-[#0F172A] disabled:opacity-30 transition-all flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {t("mat.flashcards.prev")}
                    </button>
                    <div className="w-[2px] h-6 bg-slate-700"></div>
                    <button 
                      onClick={() => { setCurrentCardIndex(prev => Math.min(material.flashcards.length - 1, prev + 1)); setIsCardFlipped(false); }}
                      disabled={currentCardIndex === material.flashcards.length - 1}
                      className="rounded-full px-8 py-3.5 text-sm font-bold text-white hover:bg-[#0F172A] disabled:opacity-30 transition-all flex items-center gap-2"
                    >
                      {t("mat.flashcards.next")}
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </button>
                 </div>
              </motion.div>
           )}

           {activeTab === "ai-tutor" && (
             <motion.div 
               key="ai-tutor"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               transition={{ duration: 0.3 }}
               className="mx-auto max-w-4xl flex flex-col h-[600px] bg-[#1E293B] rounded-[2rem] border border-slate-700/50 shadow-xl overflow-hidden"
             >
               {/* Header AI Tutor */}
               <div className="px-6 py-4 border-b border-slate-700/50 bg-[#1E293B] flex items-center justify-between z-20 shrink-0 shadow-sm relative">
                  <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-[#10B981]/5 to-transparent pointer-events-none"></div>
                  <div className="flex items-center gap-4 relative z-10">
                     <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] text-white shadow-lg shadow-[#3B82F6]/20">
                        <BrainCircuit className="h-6 w-6" />
                     </div>
                     <div>
                        <h3 className="font-extrabold text-white text-lg">{t("mat.tutor.title")}</h3>
                        <p className="text-xs text-white font-medium tracking-wide">{t("mat.tutor.subtitle")}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-[#10B981] bg-[#10B981]/10 px-3 py-1.5 rounded-full relative z-10 border border-[#10B981]/20">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                     </span>
                     {t("mat.tutor.online")}
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 bg-[#0F172A] relative scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700">
                  {/* Background Decor */}
                  <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#3B82F6]/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  {chatHistory.length === 0 && (
                     <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 space-y-4 my-8 relative z-10 transform hover:scale-105 transition-transform duration-500">
                        <div className="h-20 w-20 rounded-[2rem] bg-[#1E293B] shadow-xl shadow-[#10B981]/5 flex items-center justify-center text-[#10B981] border border-slate-700">
                           <Sparkles className="h-10 w-10" />
                        </div>
                        <p className="max-w-[250px] text-[15px] font-semibold text-white">{t("mat.tutor.empty")}</p>
                     </div>
                  )}
                  {chatHistory.map((msg, i) => (
                     <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={i} 
                        className={`flex gap-3 sm:gap-4 relative z-10 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                     >
                        {msg.role !== 'user' && (
                           <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] text-white shadow-md self-end mb-1">
                              <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
                           </div>
                        )}
                        <div className={`max-w-[85%] rounded-3xl px-5 py-3.5 sm:px-6 sm:py-4 text-sm sm:text-[15px] leading-relaxed shadow-sm ${
                           msg.role === 'user' 
                           ? 'bg-gradient-to-r from-[#3B82F6] to-[#1D4ED8] text-white rounded-br-sm shadow-md shadow-[#3B82F6]/10' 
                           : 'bg-[#1E293B] text-slate-200 border border-slate-700/50 rounded-bl-sm shadow-md shadow-gray-200/40'
                        }`}>
                           {msg.role === 'user' ? (
                             <div className="flex flex-col gap-2">
                                {msg.image && (
                                   <img src={msg.image} className="rounded-xl border border-slate-700 max-h-48 object-cover" />
                                )}
                                <span>{msg.text}</span>
                             </div>
                           ) : (
                             <div className="markdown-body">
                               <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700">
                                 <ReactMarkdown>
                                   {renderText(msg.text)}
                                 </ReactMarkdown>
                               </div>
                             </div>
                           )}
                        </div>
                     </motion.div>
                  ))}
                  {chatLoading && (
                     <div className="flex justify-start gap-2 sm:gap-3">
                        <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-white shadow-sm self-end mb-1">
                           <BrainCircuit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                        <div className="max-w-[85%] rounded-2xl bg-[#1E293B] px-4 py-3 sm:px-5 sm:py-3.5 border border-slate-700/50 rounded-bl-sm flex items-center gap-2 shadow-sm text-sm text-white">
                           <Loader2 className="h-4 w-4 animate-spin text-[#10B981]" />
                           {t("mat.tutor.thinking")}
                        </div>
                     </div>
                  )}
                  <div ref={chatEndRef} />
               </div>
               
               <div className="p-3 sm:p-4 bg-[#1E293B] border-t border-slate-700/50 shrink-0">
                 {chatImageBase64 && (
                    <div className="mb-2 relative inline-block">
                       <img src={chatImageBase64} alt="Preview" className="h-16 rounded-xl border border-slate-600 object-cover" />
                       <button 
                          onClick={() => { setChatImageBase64(null); setChatImageMime(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full text-white p-0.5"
                       >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                       </button>
                    </div>
                 )}
                 <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={t("mat.tutor.placeholder")}
                      className="flex-1 rounded-xl border border-slate-700 bg-[#0F172A] text-white px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-[15px] focus:border-[#3B82F6] focus:bg-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={chatLoading || (!chatInput.trim() && !chatImageBase64)}
                      className="flex items-center justify-center rounded-xl bg-[#10B981] px-4 py-3 sm:px-5 sm:py-3.5 text-white transition-all hover:bg-[#047857] disabled:opacity-50 disabled:hover:bg-[#10B981] font-bold shadow-md shadow-[#10B981]/20 shrink-0"
                    >
                      <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                 </form>
               </div>
             </motion.div>
           )}
         </AnimatePresence>
       </div>
    </div>
  );
}
