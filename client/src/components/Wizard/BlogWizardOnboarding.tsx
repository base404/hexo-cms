import React, { useState } from 'react';
import { useToast } from '../Common/ToastContext';
import { InstallConsoleModal } from '../Common/InstallConsoleModal';
import { Sparkles, Folder, AlertTriangle, Layers, FileCode, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';

interface BlogWizardOnboardingProps {
  blogDir: string;
  onInitSuccess: () => void;
  onSwitchDir: (newDir: string) => void;
}

export const BlogWizardOnboarding: React.FC<BlogWizardOnboardingProps> = ({
  blogDir,
  onInitSuccess,
  onSwitchDir,
}) => {
  const { showToast } = useToast();
  const [initializing, setInitializing] = useState(false);
  const [inputDir, setInputDir] = useState(blogDir);

  // Real-time Streaming Console Log Modal
  const [consoleModal, setConsoleModal] = useState<{
    show: boolean;
    title: string;
    logs: string;
    isFinished: boolean;
    isError: boolean;
  }>({
    show: false,
    title: '',
    logs: '',
    isFinished: false,
    isError: false,
  });

  const handleInit = async () => {
    setInitializing(true);
    setConsoleModal({
      show: true,
      title: `Hexo 官方标准建站初始化: ${blogDir}`,
      logs: `🚀 准备启动官方 Hexo CLI 建站初始化流程...\n`,
      isFinished: false,
      isError: false,
    });

    try {
      const response = await fetch('/api/workspace/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogDir }),
      });

      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setConsoleModal((prev) => ({
          ...prev,
          logs: prev.logs + text,
        }));
      }

      setConsoleModal((prev) => ({
        ...prev,
        isFinished: true,
        isError: false,
      }));

      showToast('🎉 官方标准 Hexo 初始化建站成功！', 'success', '建站完成');
    } catch (e: any) {
      setConsoleModal((prev) => ({
        ...prev,
        logs: prev.logs + `\n❌ 初始化建站发生异常: ${e.message}`,
        isFinished: true,
        isError: true,
      }));
      showToast(`初始化出错: ${e.message}`, 'error');
    } finally {
      setInitializing(false);
    }
  };

  const handleConsoleModalClose = () => {
    const isSuccess = consoleModal.isFinished && !consoleModal.isError;
    setConsoleModal((prev) => ({ ...prev, show: false }));
    if (isSuccess) {
      onInitSuccess();
    }
  };

  const handleSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDir.trim()) return;
    onSwitchDir(inputDir.trim());
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-8 animate-in fade-in-50 duration-300">
      {/* Warning Hero Header Card */}
      <div className="geist-card p-8 bg-gradient-to-br from-amber-50/80 via-white to-white border border-amber-200/80 space-y-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300/60 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-vercel-black">未检测到 Hexo 博客结构</h2>
              <span className="label-caps text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-sm font-semibold">
                NEEDS INITIALIZATION
              </span>
            </div>
            <p className="text-xs text-gray-600 font-mono leading-relaxed">
              当前工作区路径 <code className="bg-amber-100/70 text-amber-900 px-1.5 py-0.5 rounded font-mono font-semibold">{blogDir}</code> 下未找到 Hexo 的 <code className="bg-amber-100/70 text-amber-900 px-1.5 py-0.5 rounded">_config.yml</code> 配置文件。
            </p>
          </div>
        </div>

        <div className="text-xs text-amber-800 bg-amber-100/50 p-3 rounded-md border border-amber-200/60 font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>请点击下方按钮启动 Hexo 官方 CLI 标准建站初始化流程。</span>
        </div>
      </div>

      {/* Main Wizard Setup Card */}
      <div className="geist-card p-8 bg-white border border-vercel-border space-y-6 shadow-md">
        <div className="border-b border-vercel-border pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-vercel-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-vercel-blue" />
              Hexo 官方 CLI 标准初始化建站
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-1">
              完全遵循 Hexo 官网标准命令 (检测 Node/Git 依赖 ➔ `hexo init` ➔ `npm install`) 全程流式日志反馈：
            </p>
          </div>
        </div>

        {/* Feature List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
            <FileCode className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-zinc-900">1. 环境与依赖自动检查</h4>
            <p className="text-gray-500 leading-relaxed text-[11px]">
              自动检测环境 Node.js, Git 客户端, npm/pnpm 及 hexo-cli 命令行脚手架。
            </p>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-zinc-900">2. 官方 CLI 核心建站</h4>
            <p className="text-gray-500 leading-relaxed text-[11px]">
              调用官方 `hexo init` 从 GitHub 拉取全套最新模板、配置文件与目录结构。
            </p>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h4 className="font-semibold text-zinc-900">3. 自动安装 npm 依赖包</h4>
            <p className="text-gray-500 leading-relaxed text-[11px]">
              自动在博客根目录运行 `npm install` 下载全部必须核心渲染插件与主题。
            </p>
          </div>
        </div>

        {/* Big Action Button */}
        <div className="pt-2">
          <button
            onClick={handleInit}
            disabled={initializing}
            className="w-full bg-zinc-900 hover:bg-black text-white text-sm font-medium py-3.5 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            {initializing ? '正在流式推流执行建站命令...' : '一键启动 Hexo 官方 CLI 标准初始化建站'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alternative Option: Switch Working Directory Card */}
      <div className="geist-card p-6 bg-white border border-vercel-border space-y-4">
        <h4 className="text-sm font-medium text-vercel-black flex items-center gap-2">
          <Folder className="w-4 h-4 text-gray-600" /> 选错路径？切换/绑定已有 Hexo 博客目录
        </h4>

        <form onSubmit={handleSwitch} className="flex items-center gap-3">
          <input
            type="text"
            value={inputDir}
            onChange={(e) => setInputDir(e.target.value)}
            placeholder="例如 C:/Users/Nuoka/blog 或 D:/my-hexo-site"
            className="flex-1 bg-white border border-vercel-border rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-vercel-blue"
          />
          <button type="submit" className="btn-secondary text-xs px-5 py-2">
            绑定已有博客目录
          </button>
        </form>
      </div>

      {/* Real-time Streaming Terminal Modal */}
      {consoleModal.show && (
        <InstallConsoleModal
          title={consoleModal.title}
          logs={consoleModal.logs}
          isFinished={consoleModal.isFinished}
          isError={consoleModal.isError}
          onClose={handleConsoleModalClose}
        />
      )}
    </div>
  );
};
