import React, { createContext, useContext, useState, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  confirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmOptions | null>(null);

  const showToast = (message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const confirm = (options: ConfirmOptions) => {
    setConfirmModal(options);
  };

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Toast Render Stack (Bottom Right) with Topmost z-[99999] */}
      {ReactDOM.createPortal(
        <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2 pointer-events-none max-w-md w-full">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto geist-card p-4 bg-white border border-vercel-border shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200"
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-vercel-blue shrink-0 mt-0.5" />}

              <div className="flex-1 space-y-0.5">
                {toast.title && <h4 className="text-xs font-semibold text-vercel-black">{toast.title}</h4>}
                <p className="text-xs text-gray-700 leading-relaxed font-mono">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Confirm Modal Dialog with Topmost z-[100000] */}
      {confirmModal &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100000] flex items-center justify-center p-4">
            <div className="geist-card p-6 bg-white max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 border border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-vercel-black">{confirmModal.title}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{confirmModal.message}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-vercel-border">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="btn-secondary text-xs px-4 py-1.5"
                >
                  {confirmModal.cancelText || '取消'}
                </button>
                <button
                  onClick={() => {
                    const onConf = confirmModal.onConfirm;
                    setConfirmModal(null);
                    onConf();
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs px-4 py-1.5 font-medium transition-colors shadow-sm"
                >
                  {confirmModal.confirmText || '确认删除'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};
