import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'id';

interface Translations {
  [key: string]: {
    en: string;
    id: string;
  };
}

export const translations: Translations = {
  // App.tsx
  "app.loading": { en: "Loading Clever Study AI...", id: "Memuat Clever Study AI..." },
  "app.hero.title1": { en: "Learn Cleverer,", id: "Belajar Lebih Cerdas," },
  "app.hero.title2": { en: "Not Harder.", id: "Bukan Lebih Keras." },
  "app.hero.subtitle": { en: "Transform your raw study materials — PDFs, presentations, documents, or text — into structured AI-powered flashcards, quizzes, and summaries in seconds.", id: "Ubah materi belajar mentah Anda — PDF, presentasi, dokumen, atau teks — menjadi kartu flash, kuis, dan ringkasan terstruktur dengan bantuan AI dalam hitungan detik." },
  "app.hero.cta": { en: "Get Started for Free", id: "Mulai Gratis" },
  "app.nav.dashboard": { en: "Dashboard", id: "Dasbor" },
  "app.nav.addMaterial": { en: "Add Material", id: "Tambah Materi" },
  "app.nav.profile": { en: "My Profile", id: "Profil Saya" },
  "app.nav.signout": { en: "Sign Out", id: "Keluar" },
  "app.signout.title": { en: "Sign Out", id: "Keluar" },
  "app.signout.desc": { en: "Are you sure you want to sign out? You will need to sign in again to access your materials.", id: "Apakah Anda yakin ingin keluar? Anda harus masuk lagi untuk mengakses materi Anda." },
  "app.signout.cancel": { en: "Cancel", id: "Batal" },
  "app.signout.confirm": { en: "Yes, Sign out", id: "Ya, Keluar" },

  // Dashboard.tsx
  "app.footer.rights": { en: "All rights reserved.", id: "Hak cipta dilindungi." },
  "dash.welcome": { en: "Welcome back,", id: "Selamat datang kembali," },
  "dash.subtitle": { en: "Ready to continue your learning journey? Your AI assistant has prepared your study materials.", id: "Siap melanjutkan perjalanan belajar Anda? Asisten AI Anda telah menyiapkan materi belajar Anda." },
  "dash.stats.materials": { en: "Total Materials", id: "Total Materi" },
  "dash.stats.flashcards": { en: "Flashcards Created", id: "Kartu Flash Dibuat" },
  "dash.stats.quizzes": { en: "Quizzes Taken", id: "Kuis Diambil" },
  "dash.tabs.materials": { en: "My Materials", id: "Materi Saya" },
  "dash.tabs.performance": { en: "Performance History", id: "Riwayat Performa" },
  "dash.empty.materials": { en: "No materials yet. Upload something to get started!", id: "Belum ada materi. Unggah sesuatu untuk memulai!" },
  "dash.empty.materials.btn": { en: "Upload First Material", id: "Unggah Materi Pertama" },
  "dash.empty.performance": { en: "No quiz attempts yet. Take a quiz to see your performance!", id: "Belum ada kuis yang diambil. Ambil kuis untuk melihat performa Anda!" },

  // UploadMaterial.tsx
  "upload.title": { en: "Upload Study Material", id: "Unggah Materi Belajar" },
  "upload.subtitle": { en: "Upload your PDFs, presentations, documents, or paste text. Our AI will automatically generate summaries, flashcards, and quizzes.", id: "Unggah PDF, presentasi, dokumen, atau tempel teks Anda. AI kami akan secara otomatis membuat ringkasan, kartu flash, dan kuis." },
  "upload.tab.file": { en: "File Upload", id: "Unggah File" },
  "upload.tab.text": { en: "Paste Text", id: "Tempel Teks" },
  "upload.file.drag": { en: "Drag & drop a file here, or click to browse", id: "Seret & lepas file ke sini, atau klik untuk menelusuri" },
  "upload.file.support": { en: "Supports PDF, DOCX, TXT, PPTX (Max 10MB)", id: "Mendukung PDF, DOCX, TXT, PPTX (Maks 10MB)" },
  "upload.text.placeholder": { en: "Paste your study notes, articles, or any text here (minimum 50 words)...", id: "Tempel catatan belajar, artikel, atau teks apa pun di sini (minimal 50 kata)..." },
  "upload.text.titlePlaceholder": { en: "Give this material a title (e.g., Biology Chapter 4)", id: "Beri judul pada materi ini (misal, Biologi Bab 4)" },
  "upload.btn.generating": { en: "AI is analyzing and generating...", id: "AI sedang menganalisis dan membuat..." },
  "upload.btn.submit": { en: "Generate Study Material", id: "Buat Materi Belajar" },
  "upload.tips.title": { en: "Pro Tips for Best Results", id: "Tips Pro untuk Hasil Terbaik" },
  "upload.tips.1": { en: "Upload clear, text-rich documents. Scanned PDFs without OCR might not work well.", id: "Unggah dokumen yang jelas dan kaya teks. PDF hasil scan tanpa OCR mungkin tidak berfungsi dengan baik." },
  "upload.tips.2": { en: "For pasted text, provide enough context (at least a few paragraphs) for better flashcards.", id: "Untuk teks yang ditempel, berikan konteks yang cukup (setidaknya beberapa paragraf) untuk kartu flash yang lebih baik." },

  // MaterialView.tsx
  "mat.back": { en: "Back to Dashboard", id: "Kembali ke Dasbor" },
  "mat.badge": { en: "Study Material", id: "Materi Belajar" },
  "mat.source": { en: "Source:", id: "Sumber:" },
  "mat.processed": { en: "Processed on", id: "Diproses pada" },
  "mat.quiz.start": { en: "Start Quiz Challenge", id: "Mulai Tantangan Kuis" },
  "mat.tab.summary": { en: "Summary & Concepts", id: "Ringkasan & Konsep" },
  "mat.tab.flashcards": { en: "Flashcards", id: "Kartu Flash" },
  "mat.tab.ai": { en: "AI Tutor", id: "Tutor AI" },
  "mat.summary.keyPoints": { en: "Key Points", id: "Poin Penting" },
  "mat.summary.mainConcepts": { en: "Main Concepts", id: "Konsep Utama" },
  "mat.flashcards.card": { en: "Card", id: "Kartu" },
  "mat.flashcards.of": { en: "of", id: "dari" },
  "mat.flashcards.question": { en: "Question", id: "Pertanyaan" },
  "mat.flashcards.answer": { en: "Answer", id: "Jawaban" },
  "mat.flashcards.flip": { en: "Click to flip open", id: "Klik untuk membuka" },
  "mat.flashcards.flipBack": { en: "Click to flip back", id: "Klik untuk membalik kembali" },
  "mat.flashcards.clickOpen": { en: "Click to flip open", id: "Klik untuk membalik" },
  "mat.flashcards.clickBack": { en: "Click to flip back", id: "Klik untuk kembali" },
  "mat.flashcards.prev": { en: "Prev", id: "Sebel" },
  "mat.flashcards.next": { en: "Next", id: "Selanj" },
  "mat.tutor.title": { en: "AI Study Tutor", id: "Tutor Belajar AI" },
  "mat.tutor.subtitle": { en: "Ask anything about this material", id: "Tanyakan apa saja tentang materi ini" },
  "mat.tutor.online": { en: "Online", id: "Online" },
  "mat.tutor.empty": { en: "I'm ready to answer any questions about this study material.", id: "Saya siap menjawab pertanyaan apa pun tentang materi belajar ini." },
  "mat.tutor.thinking": { en: "Thinking...", id: "Sedang Berpikir..." },
  "mat.tutor.placeholder": { en: "Type your question...", id: "Ketik pertanyaan Anda..." },
  "mat.ai.title": { en: "AI Study Tutor", id: "Tutor Belajar AI" },
  "mat.ai.subtitle": { en: "Ask anything about this material", id: "Tanyakan apa saja tentang materi ini" },
  "mat.ai.online": { en: "Online", id: "Online" },
  "mat.ai.ready": { en: "I'm ready to answer any questions about this study material.", id: "Saya siap menjawab pertanyaan apa pun tentang materi belajar ini." },
  "mat.ai.thinking": { en: "Thinking...", id: "Berpikir..." },
  "mat.ai.placeholder": { en: "Type your question...", id: "Ketik pertanyaan Anda..." },

  // QuizView.tsx
  "quiz.back": { en: "Quit Quiz", id: "Keluar dari Kuis" },
  "quiz.completed": { en: "Quiz Completed!", id: "Kuis Selesai!" },
  "quiz.score": { en: "You scored", id: "Skor Anda" },
  "quiz.saving": { en: "Saving Results...", id: "Menyimpan Hasil..." },
  "quiz.return": { en: "Return to Dashboard", id: "Kembali ke Dasbor" },
  "quiz.exit": { en: "Exit Quiz", id: "Keluar Kuis" },
  "quiz.timeout": { en: "Time's Up!", id: "Waktu Habis!" },
  "quiz.submit": { en: "Submit Answer", id: "Kirim Jawaban" },
  "quiz.question": { en: "Question", id: "Pertanyaan" },
  "quiz.of": { en: "of", id: "dari" },
  "quiz.explanation": { en: "Explanation:", id: "Penjelasan:" },
  "quiz.correct": { en: "Correct!", id: "Benar!" },
  "quiz.incorrect": { en: "Incorrect", id: "Salah" },
  "quiz.next": { en: "Next Question", id: "Pertanyaan Berikutnya" },
  "quiz.finish": { en: "Finish Quiz", id: "Selesaikan Kuis" },

  // ProfileView.tsx
  "profile.title": { en: "My Profile", id: "Profil Saya" },
  "profile.name": { en: "Display Name", id: "Nama Tampilan" },
  "profile.email": { en: "Email Address", id: "Alamat Email" },
  "profile.saving": { en: "Saving...", id: "Menyimpan..." },
  "profile.save": { en: "Save Changes", id: "Simpan Perubahan" },
  "profile.change": { en: "Change", id: "Ubah" },
  "profile.stats.avgScore": { en: "Avg Quiz Score", id: "Rata-rata Kuis" },
  "profile.danger": { en: "Danger Zone", id: "Zona Bahaya" },
  "profile.danger.desc": { en: "Permanently delete your account and all associated data.", id: "Hapus akun Anda dan semua data terkait secara permanen." },
  "profile.delete": { en: "Delete Account", id: "Hapus Akun" },
  "profile.delete.desc": { en: "Are you absolutely sure? This will permanently delete your account, materials, and progress. This action cannot be undone.", id: "Apakah Anda benar-benar yakin? Ini akan menghapus akun, materi, dan kemajuan Anda secara permanen. Tindakan ini tidak dapat dibatalkan." },
  "profile.delete.confirm": { en: "Yes, Delete My Account", id: "Ya, Hapus Akun Saya" }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'id')) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string) => {
    if (!translations[key]) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    return translations[key][language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
