import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Memperbarui state agar render berikutnya menampilkan UI fallback
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-white p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
          <h1 className="text-3xl font-bold mb-4 text-slate-100">Oops! Terjadi Kesalahan.</h1>
          <p className="text-slate-400 mb-8 max-w-md">
            Maaf, aplikasi mengalami masalah saat mencoba menampilkan halaman ini. Silakan muat ulang halaman.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Muat Ulang Halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
