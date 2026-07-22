import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Terminal, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface InstallConsoleModalProps {
  title: string;
  logs: string;
  isFinished: boolean;
  isError: boolean;
  onClose: () => void;
}

export const InstallConsoleModal: React.FC<InstallConsoleModalProps> = ({
  title,
  logs,
  isFinished,
  isError,
  onClose,
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Format log lines for high contrast readability
  const renderFormattedLogs = (rawLogs: string) => {
    if (!rawLogs) return <span className="text-zinc-500">准备启动执行环境...\n</span>;

    const lines = rawLogs.split('\n');
    return lines.map((line, index) => {
      let colorClass = 'text-zinc-200'; // Default clear white/grey

      if (line.includes('✅') || line.includes('DONE') || line.includes('SUCCESS') || line.includes('resolved')) {
        colorClass = 'text-emerald-400 font-semibold';
      } else if (line.includes('❌') || line.includes('ERROR') || line.includes('err') || line.includes('failed')) {
        colorClass = 'text-rose-400 font-semibold';
      } else if (line.includes('🚀') || line.includes('执行命令') || line.includes('git clone')) {
        colorClass = 'text-sky-300 font-medium';
      } else if (line.includes('⚠️') || line.includes('WARN')) {
        colorClass = 'text-amber-300';
      } else if (line.startsWith('Progress:') || line.startsWith('Packages:')) {
        colorClass = 'text-zinc-400';
      }

      return (
        <div key={index} className={`${colorClass} leading-relaxed font-mono`}>
          {line || ' '}
        </div>
      );
    });
  };

  const modalNode = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[9999] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl h-[560px] bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden shadow-2xl rounded-xl border border-zinc-800 animate-in zoom-in-95 duration-150">
        {/* Dark Terminal Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <Terminal className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-zinc-100 font-mono tracking-tight">{title}</h3>

            {!isFinished && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-sky-400 bg-sky-950/80 px-2.5 py-0.5 rounded border border-sky-800/80">
                <Loader2 className="w-3 h-3 animate-spin" /> 执行中...
              </span>
            )}
            {isFinished && !isError && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800/80">
                <CheckCircle2 className="w-3 h-3" /> 执行完成
              </span>
            )}
            {isFinished && isError && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-950/80 px-2.5 py-0.5 rounded border border-rose-800/80">
                <AlertCircle className="w-3 h-3" /> 执行失败
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            disabled={!isFinished}
            className="text-zinc-400 hover:text-white disabled:opacity-30 p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pure Dark High-Contrast Terminal Log Area */}
        <div className="flex-1 p-6 overflow-y-auto font-mono text-xs leading-relaxed space-y-0.5 bg-black select-text">
          {renderFormattedLogs(logs)}
          <div ref={logEndRef} />
        </div>

        {/* Terminal Footer Action Bar */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between font-mono text-xs">
          <span className="text-zinc-400 text-[11px]">
            正在推送后台实时控制台日志 (STDOUT / STDERR)...
          </span>
          <button
            onClick={onClose}
            disabled={!isFinished}
            className={`px-5 py-1.5 rounded-md text-xs transition-all font-sans font-medium ${
              isFinished
                ? 'bg-white hover:bg-zinc-200 text-black shadow-sm'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isFinished ? '完成并关闭' : '后台进行中...'}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalNode, document.body);
};
