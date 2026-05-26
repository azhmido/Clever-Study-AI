import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { collection, query, where, orderBy, getDocs, limit, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Play, FileText, Blocks, BrainCircuit, Clock, Trash2, ArrowRight, Upload, Sparkles } from "lucide-react";
import { StudyMaterial, QuizAttempt } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../lib/language";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function Dashboard({ user, onViewMaterial, onNavigateToUpload }: { user: User; onViewMaterial: (id: string) => void; onNavigateToUpload?: () => void }) {
  const { t } = useLanguage();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<(QuizAttempt & { materialTitle?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [streakCount, setStreakCount] = useState(0);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'material' | 'attempt' } | null>(null);

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    
    try {
      if (type === 'material') {
        // Delete the material
        await deleteDoc(doc(db, "studyMaterials", id));
        
        // Also delete all associated quiz attempts in Firestore to prevent orphaned data
        const attemptsQuery = query(
          collection(db, "quizAttempts"), 
          where("userId", "==", user.uid),
          where("materialId", "==", id)
        );
        const attemptsSnapshot = await getDocs(attemptsQuery);
        const deletePromises = attemptsSnapshot.docs.map(docSnap => deleteDoc(doc(db, "quizAttempts", docSnap.id)));
        await Promise.all(deletePromises);

        setMaterials(prev => prev.filter(m => m.id !== id));
        setRecentAttempts(prev => prev.filter(a => a.materialId !== id));
      } else {
        await deleteDoc(doc(db, "quizAttempts", id));
        setRecentAttempts(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteMaterial = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ id, type: 'material' });
  };

  const handleDeleteAttempt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ id, type: 'attempt' });
  };

  useEffect(() => {
    async function loadData() {
      try {
        const matQ = query(
          collection(db, "studyMaterials"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const matSnapshot = await getDocs(matQ);
        const fetchedMaterials = matSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyMaterial));
        setMaterials(fetchedMaterials);

        const attQ = query(
          collection(db, "quizAttempts"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const attSnapshot = await getDocs(attQ);
        const fetchedAttempts = attSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
        
        // Populate material titles
        const attemptsWithTitles = fetchedAttempts.map(att => {
          const mat = fetchedMaterials.find(m => m.id === att.materialId);
          return { ...att, materialTitle: mat?.title || "Unknown Material" };
        });

        setRecentAttempts(attemptsWithTitles);

        // Extract Streak Logic
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let currentStreak = 0;
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          currentStreak = userData.streak || 0;
          const lastActive = userData.lastActiveDate || 0;
          
          if (lastActive < today) {
            if (lastActive === today - 86400000) {
              currentStreak += 1;
            } else {
              currentStreak = 1;
            }
            await setDoc(userDocRef, { streak: currentStreak, lastActiveDate: today }, { merge: true });
          }
        } else {
           currentStreak = 1;
           await setDoc(userDocRef, { streak: 1, lastActiveDate: today }, { merge: true });
        }
        setStreakCount(currentStreak);

      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.uid]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#3B82F6]/20 border-t-[#3B82F6]" />
          <p className="text-sm font-medium text-[#3B82F6] animate-pulse">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-10 text-white pb-10"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#3B82F6] via-[#1e293b] to-[#0f172a] p-6 sm:p-8 md:p-12 text-white shadow-xl">
        <div className="absolute top-0 right-0 -m-20 h-64 w-64 rounded-full bg-[#1E293B] blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -m-20 h-48 w-48 rounded-full bg-[#10B981]/20 blur-3xl"></div>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">{t("dash.welcome")}<br/><span className="text-blue-400">{user.displayName?.split(" ")[0]}</span>!</h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-white/80 font-medium max-w-xl">{t("dash.subtitle")}</p>
          </div>
          
          <div className="flex items-center gap-3 bg-[#0F172A]/50 border border-slate-700 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-xl hover:scale-105 transition-transform duration-300">
             <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F43F5E] to-[#E11D48] text-white shadow-lg shadow-[#F43F5E]/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>
                <Sparkles className="h-6 w-6 relative z-10" />
             </div>
             <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">🔥 Streak Belajar</p>
                <p className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                   {streakCount} {streakCount === 1 ? 'Hari' : 'Hari'}
                </p>
             </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {/* Stats Cards */}
        <div className=" relative overflow-hidden rounded-[1.5rem] p-6 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 border border-slate-700 bg-[#1E293B] group">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-[#3B82F6]/10 to-transparent transition-transform group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white shadow-lg shadow-[#3B82F6]/30">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{materials.length}</p>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400 mt-1">{t("dash.stats.materials")}</p>
          </div>
        </div>

        <div className=" relative overflow-hidden rounded-[1.5rem] p-6 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 border border-slate-700 bg-[#1E293B] group">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-[#10B981]/10 to-transparent transition-transform group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-lg shadow-[#10B981]/30">
                <Blocks className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{materials.reduce((acc, curr) => acc + (curr.flashcards?.length || 0), 0)}</p>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400 mt-1">{t("dash.stats.flashcards")}</p>
          </div>
        </div>

        <div className=" relative overflow-hidden rounded-[1.5rem] p-6 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 border border-slate-700 bg-[#1E293B] group">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-[#FBBF24]/10 to-transparent transition-transform group-hover:scale-150"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FBBF24] to-[#D97706] text-white shadow-lg shadow-[#FBBF24]/30">
                <BrainCircuit className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{recentAttempts.length}</p>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400 mt-1">{t("dash.stats.quizzes")}</p>
          </div>
        </div>
      </motion.div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* Recent Materials */}
        <motion.div variants={item} className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{t("dash.tabs.materials")}</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent ml-4"></div>
          </div>
          
          {materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-700 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-12 text-center shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/5 rounded-full blur-3xl -mt-20 -mr-20 pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#10B981]/5 rounded-full blur-3xl -mb-10 -ml-10 pointer-events-none"></div>
               
               <div className="relative z-10 flex flex-col items-center gap-6">
                 <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#3B82F6]/20 to-[#1D4ED8]/10 text-[#3B82F6] border border-[#3B82F6]/20 shadow-lg shadow-[#3B82F6]/5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <Sparkles className="absolute top-2 right-2 h-4 w-4 text-[#FBBF24]" />
                    <Upload className="h-10 w-10" />
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-2xl font-bold text-white tracking-tight">Mulai Petualangan Belajarmu! ✨</h3>
                   <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                      Belum ada materi yang diunggah. Unggah materi pertamamu sekarang dan biarkan AI membantumu belajar.
                   </p>
                 </div>
                 
                 <button 
                   onClick={onNavigateToUpload}
                   className="mt-2 flex items-center gap-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 py-3.5 font-bold shadow-lg shadow-[#3B82F6]/20 hover:-translate-y-1 transition-all group/btn"
                 >
                   <Upload className="h-5 w-5 group-hover/btn:-translate-y-0.5 transition-transform" />
                   Unggah Materi Pertama
                 </button>
               </div>
            </div>
          ) : (
            <motion.div className="flex flex-col gap-4" variants={container}>
              {materials.slice(0, 5).map((mat) => (
                <motion.div 
                  variants={item}
                  key={mat.id} 
                  onClick={() => onViewMaterial(mat.id!)}
                  className="group relative flex cursor-pointer items-center gap-3 sm:gap-5  rounded-2xl p-3 sm:p-5 transition-all hover:bg-slate-700 hover:shadow-xl hover:shadow-[#3B82F6]/10 hover:-translate-y-1 border border-slate-700"
                >
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-[#0F172A] border border-slate-700/50 text-white group-hover:bg-[#3B82F6] group-hover:border-[#3B82F6] group-hover:text-white transition-all duration-300 shadow-sm shrink-0">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="truncate text-base sm:text-lg font-bold text-white transition-colors">{mat.title}</h3>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-semibold text-white uppercase tracking-wider">{new Date(mat.createdAt).toLocaleDateString()}</span>
                      <span className="hidden sm:block h-1 w-1 rounded-full bg-gray-300"></span>
                      <span className="text-[10px] sm:text-xs font-semibold text-[#FBBF24] bg-[#FBBF24]/10 px-2 py-0.5 rounded-full whitespace-nowrap">{mat.flashcards?.length || 0} cards</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 md:opacity-0 transition-all duration-300 group-hover:opacity-100 transform translate-x-0 md:translate-x-2 group-hover:translate-x-0 shrink-0">
                    <button 
                      onClick={(e) => handleDeleteMaterial(mat.id!, e)}
                      className="p-1.5 sm:p-2 text-white md:text-gray-300 hover:text-red-500 hover:bg-red-900 rounded-lg transition-colors"
                      title="Delete material"
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#1E293B] text-[#3B82F6]">
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Recent Quiz Performance */}
        <motion.div variants={item} className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{t("dash.tabs.performance")}</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent ml-4"></div>
          </div>
          
          {recentAttempts.length === 0 ? (
             <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-700 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-12 text-center shadow-xl relative overflow-hidden group">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#FBBF24]/5 rounded-full blur-3xl pointer-events-none"></div>

                 <div className="relative z-10 flex flex-col items-center gap-6">
                   <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FBBF24]/20 to-[#D97706]/10 text-[#FBBF24] border border-[#FBBF24]/20 shadow-lg shadow-[#FBBF24]/5 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                     <BrainCircuit className="h-10 w-10" />
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-xl font-bold text-white tracking-tight">Belum Ada Riwayat Kuis</h3>
                     <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed text-sm">
                        Ambil kuis dari materi belajarmu untuk melihat perkembangan skormu di sini.
                     </p>
                   </div>
                 </div>
             </div>
          ) : (
            <div className=" rounded-[2rem] p-3 border border-slate-700 bg-[#1E293B]">
               <motion.div className="flex flex-col gap-2" variants={container}>
                  {recentAttempts.map((attempt) => {
                    const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
                    let colorClass = "from-red-500 to-orange-500";
                    let bgClass = "bg-red-900/30 text-red-400";
                    if (percentage >= 80) {
                      colorClass = "from-[#3B82F6] to-[#4ade80]";
                      bgClass = "bg-blue-900/40 text-blue-400";
                    } else if (percentage >= 50) {
                      colorClass = "from-[#10B981] to-yellow-400";
                      bgClass = "bg-emerald-900/40 text-emerald-400";
                    }
                    
                    return (
                      <motion.div variants={item} key={attempt.id} className="group relative overflow-hidden flex items-center justify-between p-3 sm:p-4 bg-[#1E293B] rounded-2xl hover:bg-slate-700 hover:shadow-md transition-all border border-slate-700">
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-x-0 group-hover:-translate-x-0"></div>
                         <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-2">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bgClass} font-bold shadow-inner text-sm sm:text-base`}>
                               {percentage}%
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-sm text-white truncate">{attempt.materialTitle}</span>
                              <span className="text-[10px] sm:text-xs text-white font-medium">{new Date(attempt.createdAt).toLocaleDateString()}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-2 sm:gap-4 pl-1 sm:pl-4 shrink-0">
                           <div className="flex flex-col items-end gap-1.5 hidden sm:flex min-w-[80px]">
                             <span className="text-[10px] sm:text-xs font-bold text-white">{attempt.score} of {attempt.totalQuestions}</span>
                             <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                                <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${percentage}%` }}
                                   transition={{ duration: 1, delay: 0.2 }}
                                   className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
                                ></motion.div>
                             </div>
                           </div>
                           <button 
                             onClick={(e) => handleDeleteAttempt(attempt.id!, e)}
                             className="p-1.5 sm:p-2 text-white md:opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-900 rounded-lg transition-all"
                             title="Delete performance record"
                           >
                             <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                           </button>
                         </div>
                      </motion.div>
                    )
                  })}
               </motion.div>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A] "
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#1E293B] rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-700"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-center text-white mb-2">Delete {deleteConfirm.type === 'material' ? 'Material' : 'Record'}?</h3>
              <p className="text-white text-center mb-8 font-medium">Are you sure you want to remove this {deleteConfirm.type === 'material' ? 'study material' : 'performance record'}? This cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-3 font-semibold text-white bg-slate-800 hover:bg-slate-600 rounded-xl transition-colors flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-3 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-600/20 flex-1"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
