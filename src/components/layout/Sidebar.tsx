import React, { Dispatch, SetStateAction } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { BrainCircuit, X, LayoutDashboard, Upload, User as UserIcon, Globe, LogOut } from "lucide-react";
import { useLanguage } from "../../lib/language";

interface SidebarProps {
  user: FirebaseUser;
  userProfile: { displayName?: string, photoURL?: string } | null;
  currentView: string;
  setCurrentView: (view: any) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setShowLogoutDialog: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({
  user,
  userProfile,
  currentView,
  setCurrentView,
  isSidebarOpen,
  setIsSidebarOpen,
  setShowLogoutDialog
}: SidebarProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 md:relative transform flex-shrink-0 bg-[#1E293B] border-r border-[#FBBF24]/20 flex flex-col p-6 justify-between transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:p-0 md:border-none md:overflow-hidden md:opacity-0"}`}>
      <div className="space-y-8 min-w-[208px]">
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6] text-blue-400">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-[#3B82F6] tracking-tight">Clever Study AI</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-md p-1.5 text-white hover:bg-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <nav className="space-y-2">
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`flex w-full items-center gap-3 rounded-lg p-3 text-sm font-medium transition-colors ${
                currentView === "dashboard" ? "bg-[#3B82F6] text-white" : "text-white hover:bg-[#3B82F6]/10"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              {t("app.nav.dashboard")}
            </button>
            <button
              onClick={() => setCurrentView("upload")}
              className={`flex w-full items-center gap-3 rounded-lg p-3 text-sm font-medium transition-colors ${
                currentView === "upload" ? "bg-[#3B82F6] text-white" : "text-white hover:bg-[#3B82F6]/10"
              }`}
            >
              <Upload className="h-5 w-5" />
              {t("app.nav.addMaterial")}
            </button>
            <button
              onClick={() => setCurrentView("profile")}
              className={`flex w-full items-center gap-3 rounded-lg p-3 text-sm font-medium transition-colors ${
                currentView === "profile" ? "bg-[#3B82F6] text-white" : "text-white hover:bg-[#3B82F6]/10"
              }`}
            >
              <UserIcon className="h-5 w-5" />
              {t("app.nav.profile")}
            </button>
          </nav>
        </div>
      </div>

      <div className="p-4 bg-[#1E293B] rounded-xl flex flex-col gap-4 mt-8 md:mt-0 min-w-[208px]">
        <div className="flex items-center justify-between border-b border-[#FBBF24]/10 pb-3">
            <span className="text-xs font-bold text-white uppercase">Language</span>
            <button
              onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
              className="flex items-center gap-1.5 rounded-md bg-[#1E293B] border border-slate-700 px-2 py-1 text-xs font-bold text-[#3B82F6] transition hover:bg-[#0F172A]"
            >
              <Globe className="h-3 w-3" />
              {language === 'en' ? 'EN' : 'ID'}
            </button>
        </div>
        <div className="flex items-center gap-3">
          <img src={userProfile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${userProfile?.displayName || user.displayName}`} alt="Profile" className="h-9 w-9 rounded-full object-cover border border-[#FBBF24]/20" />
          <div className="flex flex-col text-left overflow-hidden">
            <span className="truncate text-sm font-medium text-white">{userProfile?.displayName || user.displayName}</span>
            <span className="truncate text-xs text-white">{user?.email}</span>
          </div>
        </div>
        <button
          onClick={() => setShowLogoutDialog(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-[#FBBF24]/20 bg-[#1E293B] px-3 py-2 text-sm font-medium text-white hover:bg-[#0F172A] transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t("app.nav.signout")}
        </button>
      </div>
    </aside>
  );
}
