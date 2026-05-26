import { useState, useEffect, Suspense, lazy } from "react";
import { auth, loginWithGoogle, logout, db } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { BookOpen, LogIn, LogOut, Upload, Library, LayoutDashboard, FileText, Blocks, BrainCircuit, Play, User as UserIcon, Globe, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Sidebar from "./components/layout/Sidebar";
import { useLanguage } from "./lib/language";
import { Toaster } from "react-hot-toast";

const Dashboard = lazy(() => import("./pages/DashboardPage"));
const UploadMaterial = lazy(() => import("./pages/UploadPage"));
const MaterialView = lazy(() => import("./pages/MaterialPage"));
const QuizView = lazy(() => import("./pages/QuizPage"));
const ProfileView = lazy(() => import("./pages/ProfilePage"));

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"dashboard" | "upload" | "material" | "quiz" | "profile">("dashboard");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [userProfile, setUserProfile] = useState<{ displayName?: string, photoURL?: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubProfile = onSnapshot(doc(db, "users", user.uid), (docRef) => {
        if (docRef.exists()) {
          setUserProfile(docRef.data());
        }
      });
      return () => unsubProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0F172A] text-[#3B82F6]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <BookOpen className="h-10 w-10 animate-bounce" />
          <span className="text-lg font-medium">{t("app.loading")}</span>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0F172A] font-sans text-white">
        {/* Language Toggle */}
        <div className="relative z-50 flex w-full justify-end p-6">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
            className="flex items-center gap-2 rounded-full border border-slate-700 bg-[#1E293B] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            <Globe className="h-4 w-4" />
            {language === 'en' ? 'ID' : 'EN'}
          </button>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[30%] -left-[10%] h-[800px] w-[800px] rounded-full bg-gradient-to-tr from-[#3B82F6] to-transparent blur-3xl filter"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-[#10B981] to-transparent blur-3xl filter"
          />
        </div>

        <div className="relative z-10 mx-auto flex flex-1 w-full max-w-7xl flex-col items-center justify-center gap-12 px-6 py-12 lg:flex-row lg:justify-between">
          {/* Hero Content */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1E293B] shadow-lg shadow-[#3B82F6]/20 border border-[#3B82F6]/30"
            >
              <BrainCircuit className="h-10 w-10 text-[#3B82F6]" />
            </motion.div>
            
            <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.1]">
              {t("app.hero.title1")} <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B82F6] to-[#10B981]">{t("app.hero.title2")}</span>
            </h1>
            
            <p className="mb-10 text-lg leading-relaxed text-slate-400 sm:text-xl font-medium max-w-lg">
              {t("app.hero.subtitle")}
            </p>

            <motion.div 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               className="w-full sm:w-auto"
            >
              <button
                onClick={loginWithGoogle}
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-[#3B82F6] to-[#1D4ED8] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-[#3B82F6]/30 transition-all hover:shadow-[#3B82F6]/50 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent flex -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <LogIn className="h-6 w-6 transition-transform group-hover:-rotate-12" />
                <span>{t("app.hero.cta")}</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Floating UI Elements Showcase */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative hidden w-full max-w-md lg:block"
          >
             <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-800 bg-[#1E293B]/50 "></div>
             
             <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[10%] -left-6 z-20 flex items-center gap-4 rounded-2xl border border-slate-700 bg-[#1E293B] p-5 shadow-xl "
             >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FBBF24] to-[#D97706] text-white shadow-lg shadow-[#FBBF24]/20">
                   <Blocks className="h-6 w-6" />
                </div>
                <div>
                   <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Generated</p>
                   <p className="text-xl font-bold text-white">Flashcards</p>
                </div>
             </motion.div>

             <motion.div 
                animate={{ y: [0, 15, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-[40%] -right-6 z-20 flex items-center gap-4 rounded-2xl border border-slate-700 bg-[#1E293B] p-5 shadow-xl "
             >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-lg shadow-[#10B981]/20">
                   <FileText className="h-6 w-6" />
                </div>
                <div>
                   <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Study Guide</p>
                   <p className="text-xl font-bold text-white">AI Summary Ready</p>
                </div>
             </motion.div>

             <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-[5%] left-0 z-20 flex items-center gap-4 rounded-2xl border border-slate-700 bg-[#1E293B] p-5 shadow-xl "
             >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1E3A8A] text-white shadow-lg shadow-[#3B82F6]/20">
                   <BrainCircuit className="h-6 w-6" />
                </div>
                <div>
                   <p className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Tutor</p>
                   <p className="text-xl font-bold text-white">Always Online</p>
                </div>
             </motion.div>

             {/* Central Image Placeholder / Graphic */}
             <div className="relative z-10 mx-auto aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-[2.5rem] border border-slate-700 bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-4 shadow-2xl ">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-[#0F172A] p-6 text-center border border-slate-800">
                   <BookOpen className="h-20 w-20 text-[#3B82F6]/50 mb-6" />
                   <div className="h-2 w-3/4 bg-slate-800 rounded-full mb-3"></div>
                   <div className="h-2 w-full bg-slate-800 rounded-full mb-3"></div>
                   <div className="h-2 w-5/6 bg-slate-800 rounded-full mb-8"></div>
                   
                   <div className="grid grid-cols-2 gap-3 w-full mt-auto">
                     <div className="h-20 bg-slate-800 rounded-xl"></div>
                     <div className="h-20 bg-slate-800 rounded-xl"></div>
                   </div>
                </div>
             </div>
          </motion.div>
        </div>

        <footer className="relative z-10 w-full py-6 text-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} Clever Study AI. {t("app.footer.rights")}</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0F172A] flex-col md:flex-row overflow-hidden font-sans text-white">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1E293B', color: '#fff' } }} />
      {/* Toggle Button for Sidebar */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E293B] shadow-md border border-slate-700 text-[#3B82F6] hover:bg-[#0F172A] transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-[#0F172A] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        user={user}
        userProfile={userProfile}
        currentView={currentView}
        setCurrentView={setCurrentView}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setShowLogoutDialog={setShowLogoutDialog}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-[#0F172A]">
        <div className="mx-auto max-w-5xl p-6 md:p-8">
          <Suspense fallback={
            <div className="flex h-full min-h-[50vh] items-center justify-center">
              <BookOpen className="h-8 w-8 animate-bounce text-[#3B82F6]" />
            </div>
          }>
            <AnimatePresence mode="wait">
              {currentView === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Dashboard 
                  user={user} 
                  onViewMaterial={(id) => {
                    setSelectedMaterialId(id);
                    setCurrentView("material");
                  }} 
                  onNavigateToUpload={() => setCurrentView("upload")}
                />
              </motion.div>
            )}
            {currentView === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <UploadMaterial 
                  user={user}
                  onSuccess={(id) => {
                    setSelectedMaterialId(id);
                    setCurrentView("material");
                  }}
                />
              </motion.div>
            )}
            {currentView === "material" && selectedMaterialId && (
              <motion.div
                key="material"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MaterialView 
                  user={user}
                  materialId={selectedMaterialId}
                  onBack={() => setCurrentView("dashboard")}
                  onTakeQuiz={() => setCurrentView("quiz")}
                />
              </motion.div>
            )}
            {currentView === "quiz" && selectedMaterialId && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <QuizView
                  user={user}
                  materialId={selectedMaterialId}
                  onBack={() => setCurrentView("material")}
                  onFinish={() => setCurrentView("dashboard")}
                />
              </motion.div>
            )}
            {currentView === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileView user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>
        </div>
        <footer className="border-t border-slate-800/50 py-6 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Clever Study AI. {t("app.footer.rights")}</p>
        </footer>
      </main>

      {/* Logout Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A] "
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#1E293B] rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">{t("app.signout.title")}</h3>
              <p className="text-white mb-6">{t("app.signout.desc")}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowLogoutDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {t("app.signout.cancel")}
                </button>
                <button
                  onClick={() => {
                    setShowLogoutDialog(false);
                    logout();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  {t("app.signout.confirm")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
