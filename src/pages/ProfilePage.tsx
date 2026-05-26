import { User, updateProfile, deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useState, useEffect, useRef, ChangeEvent } from "react";
import { BookOpen, BrainCircuit, Blocks, User as UserIcon, Edit2, Check, X, Camera, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StudyMaterial, QuizAttempt } from "../types";
import { useLanguage } from "../lib/language";

export default function ProfileView({ user }: { user: User }) {
  const { t } = useLanguage();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.displayName || "");
  const [editPhotoUrl, setEditPhotoUrl] = useState(user.photoURL || "");
  const [isSaving, setIsSaving] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayPhotoUrl, setDisplayPhotoUrl] = useState(user.photoURL || "");
  const [displayNameDisplay, setDisplayNameDisplay] = useState(user.displayName || "");

  useEffect(() => {
    async function loadData() {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.photoURL) {
            setEditPhotoUrl(data.photoURL);
            setDisplayPhotoUrl(data.photoURL);
          }
          if (data.displayName) {
            setEditName(data.displayName);
            setDisplayNameDisplay(data.displayName);
          }
        }
        
        const qMaterials = query(collection(db, "studyMaterials"), where("userId", "==", user.uid));
        const qAttempts = query(collection(db, "quizAttempts"), where("userId", "==", user.uid));
        
        const [materialsSnap, attemptsSnap] = await Promise.all([
          getDocs(qMaterials),
          getDocs(qAttempts)
        ]);
        
        const fetchedMaterials = materialsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyMaterial));
        const fetchedAttempts = attemptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
        
        setMaterials(fetchedMaterials);
        setRecentAttempts(fetchedAttempts);
      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.uid]);

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const MAX_WIDTH = 250;
          const MAX_HEIGHT = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setEditPhotoUrl(dataUrl);
        };
        img.src = evt.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Save display name to Auth
      await updateProfile(user, {
        displayName: editName,
      });
      // Save full profile (including bulky base64 photo) to Firestore
      await setDoc(doc(db, "users", user.uid), {
        displayName: editName,
        photoURL: editPhotoUrl
      }, { merge: true });
      
      setDisplayPhotoUrl(editPhotoUrl);
      setDisplayNameDisplay(editName);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteUser(user);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        try {
          // Attempt to re-authenticate the user then delete
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(user, provider);
          await deleteUser(user);
        } catch (reauthError: any) {
          console.error("Reauthentication or deletion failed:", reauthError);
          alert("For security reasons, please log out and log back in manually before deleting your account.");
        }
      } else {
        console.error("Error deleting account:", error);
        alert("Failed to delete account.");
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const totalCards = materials.reduce((acc, curr) => acc + (curr.flashcards?.length || 0), 0);
  const averageScore = recentAttempts.length > 0 
    ? Math.round(recentAttempts.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / recentAttempts.length * 100) 
    : 0;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#3B82F6]/20 border-t-[#3B82F6]" />
          <p className="text-sm font-medium text-[#3B82F6] animate-pulse">Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-10 text-white pb-10 max-w-4xl mx-auto mt-4 md:mt-10"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row items-center gap-8 bg-[#1E293B] p-8 rounded-[2rem] shadow-sm border border-slate-700/50 relative">
        <div className="absolute top-4 right-4 flex gap-2">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2 text-white hover:text-[#3B82F6] hover:bg-[#1E293B] rounded-xl transition-colors"
              title="Edit Profile"
            >
              <Edit2 className="h-5 w-5" />
            </button>
          ) : (
            <>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditName(displayNameDisplay);
                  setEditPhotoUrl(displayPhotoUrl);
                }}
                className="p-2 text-white hover:text-red-500 hover:bg-red-900 rounded-xl transition-colors"
                title="Cancel"
                disabled={isSaving}
              >
                <X className="h-5 w-5" />
              </button>
              <button 
                onClick={handleSaveProfile}
                className="p-2 text-[#3B82F6] bg-[#1E293B] hover:bg-[#3B82F6] hover:text-white rounded-xl transition-colors flex items-center justify-center gap-2 px-4"
                disabled={isSaving || !editName.trim()}
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                <span className="font-semibold text-sm hidden sm:block">{t("profile.save")}</span>
              </button>
            </>
          )}
        </div>

        <div className="relative group">
          <img 
            src={isEditing ? (editPhotoUrl || `https://ui-avatars.com/api/?name=${editName}&size=200`) : (displayPhotoUrl || `https://ui-avatars.com/api/?name=${displayNameDisplay}&size=200`)} 
            alt="Profile Avatar" 
            className={`h-32 w-32 rounded-full object-cover border-4 border-[#1E293B] shadow-lg transition-opacity ${isEditing ? 'opacity-80' : ''}`}
          />
          {isEditing && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center text-white bg-[#0F172A] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="h-8 w-8 mb-1" />
              <span className="text-xs font-bold">{t("profile.change")}</span>
            </button>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handlePhotoUpload} 
            accept="image/*" 
            className="hidden" 
          />
          {!isEditing && (
             <div className="absolute bottom-0 right-0 h-8 w-8 bg-[#3B82F6] rounded-full border-4 border-white flex items-center justify-center text-white">
               <UserIcon className="h-4 w-4" />
             </div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left w-full">
          {isEditing ? (
            <div className="space-y-4 max-w-sm mx-auto md:mx-0">
              <div>
                <label className="block text-sm font-semibold text-white mb-1">{t("profile.name")}</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all"
                  placeholder="Your Name"
                />
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{displayNameDisplay}</h1>
              <p className="text-lg text-white font-medium mt-1">{user.email}</p>
            </>
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700/50 shadow-sm flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white flex items-center justify-center mb-4 shadow-lg shadow-[#3B82F6]/20">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-white transition-colors">{materials.length}</p>
          <p className="text-sm font-semibold uppercase tracking-wider text-white mt-2">{t("dash.stats.materials")}</p>
        </div>
        
        <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700/50 shadow-sm flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center mb-4 shadow-lg shadow-[#10B981]/20">
            <Blocks className="h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-white transition-colors">{totalCards}</p>
          <p className="text-sm font-semibold uppercase tracking-wider text-white mt-2">{t("dash.stats.flashcards")}</p>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700/50 shadow-sm flex flex-col items-center text-center group hover:-translate-y-1 transition-transform">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#FBBF24] to-[#D97706] text-white flex items-center justify-center mb-4 shadow-lg shadow-[#FBBF24]/20">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <p className="text-3xl font-bold text-white transition-colors">{averageScore}%</p>
          <p className="text-sm font-semibold uppercase tracking-wider text-white mt-2">{t("profile.stats.avgScore")}</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="bg-[#1E293B] rounded-[2rem] border border-red-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t("profile.danger")}
            </h2>
            <p className="text-sm text-white mt-1">{t("profile.danger.desc")}</p>
          </div>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-3 font-semibold text-red-600 bg-red-900/30 hover:bg-red-100 rounded-xl transition-colors shrink-0 flex items-center gap-2"
          >
            <Trash2 className="h-5 w-5" />
            {t("profile.delete")}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showDeleteConfirm && (
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
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-center text-white mb-2">{t("profile.delete")}?</h3>
              <p className="text-white text-center mb-8 font-medium">{t("profile.delete.desc")}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-6 py-3 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                  {t("profile.delete.confirm")}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-6 py-3 font-semibold text-white bg-slate-800 hover:bg-slate-600 rounded-xl transition-colors"
                >
                  {t("app.signout.cancel")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
