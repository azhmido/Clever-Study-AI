import React, { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";
import { UploadCloud, File, AlertCircle, Loader2, FileText, CheckCircle } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../lib/language";
import toast from "react-hot-toast";

export default function UploadMaterial({ user, onSuccess }: { user: User, onSuccess: (id: string) => void }) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("File is too large. Maximum size is 10MB.");
        toast.error("File is too large");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.size > MAX_FILE_SIZE) {
        setError("File is too large. Maximum size is 10MB.");
        toast.error("File is too large");
        return;
      }
      
      const fileExt = droppedFile.name.split('.').pop()?.toLowerCase();
      const allowedExts = ['pdf', 'txt', 'doc', 'docx', 'ppt', 'pptx'];
      
      if (allowedExts.includes(fileExt || '')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Only PDF, TXT, Word, and PowerPoint files are supported.");
        toast.error("Unsupported file type");
      }
    }
  };

  const loadingTexts = [
    t("upload.btn.generating"), // Default e.g. "Generating Study Material..."
    "Mengekstrak teks dokumen...",
    "Menyusun ringkasan komprehensif...",
    "Merancang materi flashcards...",
    "Membuat kuis adaptif..."
  ];
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingTextIndex(prev => (prev + 1) % loadingTexts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const toastId = toast.loading("Processing document...");

    try {
      const idToken = await user.getIdToken();
      // 1. Upload to Node backend for processing
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/process-document", {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${idToken}`
        },
        credentials: "include"
      });

      if (!response.ok) {
        if (response.status === 503 || response.status === 504) {
           throw new Error("Sistem AI sedang bermuatan tinggi (High Demand). Mohon coba kembali beberapa saat lagi ya! 🙏");
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to initiate document processing.");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("Server returned an invalid response.");
      }

      const { taskId } = await response.json();
      if (!taskId) {
        throw new Error("Failed to start background task.");
      }

      // Poll the task status every 3 seconds
      let generatedData = null;
      while (true) {
         await new Promise(resolve => setTimeout(resolve, 3000));
         
         const statusRes = await fetch(`/api/process-document/status/${taskId}`, {
            headers: { "Authorization": `Bearer ${idToken}` },
            credentials: "include"
         });
         
         if (!statusRes.ok) {
            throw new Error("Failed to check task status.");
         }
         
         const statusData = await statusRes.json();
         
         if (statusData.status === "error") {
            let errorMsg = statusData.error || "An error occurred during processing.";
            if (errorMsg.includes("experiencing high demand") || errorMsg.includes("503")) {
               errorMsg = "Sistem AI sedang bermuatan tinggi (High Demand). Mohon coba kembali beberapa saat lagi ya! 🙏";
            }
            throw new Error(errorMsg);
         } else if (statusData.status === "completed") {
            generatedData = statusData.data;
            break;
         }
      }

      // Save generated content to Firestore
      const docData = {
         userId: user.uid,
         title: generatedData?.summary?.title || file.name,
         originalFileName: file.name,
         summary: generatedData?.summary || {},
         flashcards: generatedData?.flashcards || [],
         quiz: generatedData?.quiz || [],
         createdAt: Date.now()
      };

      const docRef = await addDoc(collection(db, "studyMaterials"), docData);

      toast.success("Document processed successfully!", { id: toastId });
      onSuccess(docRef.id);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "An unexpected error occurred while processing.";
      setError(errorMessage);
      toast.error(errorMessage, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-4 md:mt-10 text-white pb-10">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center flex flex-col items-center"
      >
        <div className="h-20 w-20 bg-gradient-to-br from-[#3B82F6]/20 to-[#10B981]/20 rounded-full flex items-center justify-center mb-6 shadow-sm border border-white">
          <UploadCloud className="h-10 w-10 text-[#3B82F6]" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">{t("upload.title")}</h1>
        <p className="max-w-xl text-lg text-white font-medium">{t("upload.subtitle")}</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={!loading && !file ? { scale: 1.01 } : {}}
        className={`relative overflow-hidden flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed p-12 md:p-20 text-center transition-all duration-500 ${
          isDragging ? "border-[#3B82F6] bg-[#3B82F6]/5 scale-105" : 
          file ? "border-transparent bg-[#1E293B] shadow-2xl" :
          "border-gray-300 bg-[#1E293B] shadow-sm hover:border-[#3B82F6]/50 hover:bg-[#1E293B]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
      >
        <div className="absolute top-0 right-0 -m-32 h-64 w-64 rounded-full bg-gradient-to-br from-[#3B82F6]/5 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -m-32 h-64 w-64 rounded-full bg-gradient-to-tr from-[#10B981]/5 to-transparent blur-3xl pointer-events-none"></div>

        <input 
           type="file" 
           ref={fileInputRef}
           onChange={handleFileSelect}
           accept=".pdf,.txt,.doc,.docx,.ppt,.pptx"
           className="hidden"
           disabled={loading}
        />
        
        <AnimatePresence mode="wait">
        {file ? (
          <motion.div 
            key="file"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center z-10 w-full"
          >
             <div className="relative">
               <div className="absolute inset-0 bg-[#3B82F6]/20 rounded-2xl blur-xl animate-pulse"></div>
               <div className="relative flex h-28 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-slate-700 shadow-lg text-[#3B82F6] mb-6">
                 <FileText className="h-12 w-12" />
                 <div className="absolute -right-3 -top-3 bg-[#1E293B] rounded-full p-1 shadow-md">
                   <CheckCircle className="h-6 w-6 text-green-500" />
                 </div>
               </div>
             </div>

             <div className="w-full max-w-sm">
               <p className="font-bold text-xl text-white truncate text-center mb-1">{file.name}</p>
               <p className="text-sm font-semibold text-white text-center mb-8">{(file.size / 1024 / 1024).toFixed(2)} MB &middot; Ready to process</p>
             </div>
             
             {!loading ? (
               <div className="flex gap-4 w-full max-w-sm">
                 <button 
                   onClick={() => setFile(null)}
                   className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-600 hover:text-white transition-colors"
                 >
                   {t("app.signout.cancel")}
                 </button>
                 <button 
                   onClick={processFile}
                   className="flex-[2] py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-[#3B82F6] to-[#1f401b] hover:shadow-lg hover:shadow-[#3B82F6]/30 transition-all flex items-center justify-center gap-2"
                 >
                   <span>{t("upload.btn.submit")}</span>
                 </button>
               </div>
             ) : (
               <div className="flex flex-col w-full max-w-sm items-center gap-4">
                 <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                   <motion.div 
                     className="h-full bg-gradient-to-r from-[#3B82F6] to-[#10B981] rounded-full"
                     initial={{ width: "0%" }}
                     animate={{ width: "95%" }}
                     transition={{ duration: 15, ease: "easeOut" }}
                   />
                 </div>
                 <div className="flex flex-col items-center gap-2 text-[#3B82F6] font-medium">
                   <div className="flex items-center gap-2">
                     <Loader2 className="h-5 w-5 animate-spin" />
                   </div>
                   <AnimatePresence mode="wait">
                     <motion.span
                       key={loadingTextIndex}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="text-center font-bold tracking-wide"
                     >
                        {loadingTexts[loadingTextIndex]}
                     </motion.span>
                   </AnimatePresence>
                 </div>
               </div>
             )}
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center z-10 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-[#1E293B] shadow-inner text-[#FBBF24] group-hover:scale-110 transition-transform duration-300">
               <UploadCloud className="h-10 w-10 text-[#10B981]" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-white">{t("upload.file.drag")}</h3>
            <p className="mb-8 text-white font-medium">{t("upload.file.support")}</p>
            
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-white uppercase tracking-wide">.PDF</span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-white uppercase tracking-wide">.DOCX</span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-white uppercase tracking-wide">.TXT</span>
              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-white uppercase tracking-wide">.PPTX</span>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
      {error && (
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -20 }}
           className="mt-6 flex items-center gap-3 rounded-2xl bg-red-900/30 p-6 text-red-700 font-medium border border-red-100 shadow-sm"
         >
           <AlertCircle className="h-6 w-6 flex-shrink-0" />
           <p>{error}</p>
         </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
