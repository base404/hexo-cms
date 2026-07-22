import React, { useState, useEffect } from 'react';
import { useToast } from '../Common/ToastContext';
import { InstallConsoleModal } from '../Common/InstallConsoleModal';
import { Search, Download, ExternalLink, RefreshCw, Trash2, CheckCircle2, PackageCheck, AlertTriangle, ShieldCheck } from 'lucide-react';

export const CORE_BUILTIN_PLUGINS = new Set([
  'hexo',
  'hexo-generator-archive',
  'hexo-generator-category',
  'hexo-generator-index',
  'hexo-generator-tag',
  'hexo-renderer-ejs',
  'hexo-renderer-marked',
  'hexo-renderer-stylus',
  'hexo-server',
  'hexo-theme-landscape',
]);

export interface PluginItem {
  name: string;
  description: string;
  link: string;
  tags: string[];
}

export interface InstalledPlugin {
  name: string;
  version: string;
  isCorePlugin?: boolean;
}

export const PluginMarket: React.FC = () => {
  const { showToast, confirm } = useToast();
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'installed' | 'core'>('all');
  const [loading, setLoading] = useState(true);

  // Streaming log modal state
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

  useEffect(() => {
    fetchMarketPlugins();
    fetchInstalledPlugins();
  }, []);

  const fetchMarketPlugins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market/plugins');
      if (res.ok) {
        const data = await res.json();
        setPlugins(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchInstalledPlugins = async () => {
    try {
      const res = await fetch('/api/plugins/installed');
      if (res.ok) {
        const data = await res.json();
        setInstalledPlugins(data);
      }
    } catch {}
  };

  const handleClearCache = async () => {
    try {
      await fetch('/api/market/clear-cache', { method: 'POST' });
      await fetchMarketPlugins();
      showToast('已成功清理离线市场缓存，并重新从 hexo.io/plugins 抓取了全量插件！', 'success', '缓存已清理');
    } catch (e: any) {
      showToast(`清理失败: ${e.message}`, 'error');
    }
  };

  const isPluginInstalled = (name: string) => {
    return installedPlugins.some((p) => p.name === name);
  };

  const handleInstallPlugin = async (name: string) => {
    setConsoleModal({
      show: true,
      title: `安装插件: ${name}`,
      logs: `🚀 正在连接后台 API 启动安装进程...\n`,
      isFinished: false,
      isError: false,
    });

    try {
      const response = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
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
      showToast(`插件《${name}》已成功安装物理落盘！`, 'success', '插件安装成功');
      fetchInstalledPlugins();
    } catch (e: any) {
      setConsoleModal((prev) => ({
        ...prev,
        logs: prev.logs + `\n❌ 安装发生异常: ${e.message}`,
        isFinished: true,
        isError: true,
      }));
      showToast(`插件《${name}》安装失败，详见日志`, 'error', '安装异常');
    }
  };

  const handleUninstallPlugin = (name: string) => {
    const isCore = CORE_BUILTIN_PLUGINS.has(name);

    confirm({
      title: isCore ? '⚠️ 严正警告：卸载 Hexo 核心内置依赖' : '确认卸载插件',
      message: isCore
        ? `【风险提示】《${name}》是 Hexo 博客初始化自带的核心内置依赖！卸载该组件将可能直接导致博客文章无法编译渲染、Hexo 本地预览服务器失效或报错崩溃。确定要强行卸载吗？`
        : `确定要从当前 Hexo 博客中卸载插件 ${name} 吗？ package.json 将自动移除该依赖。`,
      confirmText: isCore ? '已知晓风险，强行卸载' : '确认卸载',
      onConfirm: async () => {
        setConsoleModal({
          show: true,
          title: `卸载插件: ${name}`,
          logs: `🗑️ 正在发起卸载任务...\n`,
          isFinished: false,
          isError: false,
        });

        try {
          const response = await fetch('/api/plugins/uninstall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
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
          showToast(`插件《${name}》已成功卸载！`, 'info', '卸载完成');
          fetchInstalledPlugins();
        } catch (e: any) {
          setConsoleModal((prev) => ({
            ...prev,
            logs: prev.logs + `\n❌ 卸载异常: ${e.message}`,
            isFinished: true,
            isError: true,
          }));
          showToast(`插件《${name}》卸载异常，详见日志`, 'error', '卸载失败');
        }
      },
    });
  };

  // Build combined list including official core plugins if not in market list
  const combinedPluginsMap = new Map<string, PluginItem>();

  CORE_BUILTIN_PLUGINS.forEach((coreName) => {
    combinedPluginsMap.set(coreName, {
      name: coreName,
      description: `Hexo 官方初始化内置核心组件 (${coreName})`,
      link: `https://github.com/hexojs/${coreName}`,
      tags: ['core', 'built-in', 'official'],
    });
  });

  plugins.forEach((p) => {
    if (combinedPluginsMap.has(p.name)) {
      const existing = combinedPluginsMap.get(p.name)!;
      combinedPluginsMap.set(p.name, {
        ...p,
        description: existing.description || p.description,
      });
    } else {
      combinedPluginsMap.set(p.name, p);
    }
  });

  const allPluginList = Array.from(combinedPluginsMap.values());

  const filtered = allPluginList.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    if (filterMode === 'installed') {
      return matchSearch && isPluginInstalled(p.name);
    }
    if (filterMode === 'core') {
      return matchSearch && CORE_BUILTIN_PLUGINS.has(p.name);
    }
    return matchSearch;
  });

  filtered.sort((a, b) => {
    const aIsCore = CORE_BUILTIN_PLUGINS.has(a.name);
    const bIsCore = CORE_BUILTIN_PLUGINS.has(b.name);
    if (aIsCore && !bIsCore) return -1;
    if (!aIsCore && bIsCore) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      {/* Header Bar: Removed (CRUD) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight text-vercel-black">插件市场 & 依赖管理</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            包含 {CORE_BUILTIN_PLUGINS.size} 项官方核心初始化自带依赖 (紫标前置置顶)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-md border border-zinc-200 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-sm transition-all ${
                filterMode === 'all' ? 'bg-white shadow-sm font-semibold text-black' : 'text-gray-500'
              }`}
            >
              全部插件 ({allPluginList.length})
            </button>
            <button
              onClick={() => setFilterMode('core')}
              className={`flex items-center gap-1 px-3 py-1 rounded-sm transition-all ${
                filterMode === 'core' ? 'bg-white shadow-sm font-semibold text-purple-700' : 'text-gray-500'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              核心自带 ({CORE_BUILTIN_PLUGINS.size})
            </button>
            <button
              onClick={() => setFilterMode('installed')}
              className={`flex items-center gap-1 px-3 py-1 rounded-sm transition-all ${
                filterMode === 'installed' ? 'bg-white shadow-sm font-semibold text-black' : 'text-gray-500'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
              已安装 ({installedPlugins.length})
            </button>
          </div>

          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索插件..."
              className="w-full pl-9 pr-3 py-1.5 bg-white geist-card text-xs text-vercel-black placeholder-gray-400 outline-none focus:box-shadow-geist-focus"
            />
          </div>

          <button
            onClick={() => {
              fetchMarketPlugins();
              fetchInstalledPlugins();
            }}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>

          <button
            onClick={handleClearCache}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-md px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清理市场缓存
          </button>
        </div>
      </div>

      {/* Grid of Plugins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((plugin) => {
          const installed = isPluginInstalled(plugin.name);
          const isCore = CORE_BUILTIN_PLUGINS.has(plugin.name);

          return (
            <div
              key={plugin.name}
              className={`geist-card p-5 flex flex-col justify-between space-y-4 border ${
                isCore ? 'border-purple-200 bg-purple-50/10' : 'border-vercel-border'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <a
                    href={plugin.link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-vercel-black hover:text-vercel-blue flex items-center gap-1 group text-sm"
                  >
                    {plugin.name}
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>

                  <div className="flex items-center gap-2">
                    {isCore && (
                      <span className="label-caps text-[10px] bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-sm font-semibold flex items-center gap-1 shadow-2xs">
                        ⚡ 核心组件
                      </span>
                    )}

                    {installed ? (
                      <span className="label-caps text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-sm font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 已安装
                      </span>
                    ) : (
                      <span className="label-caps text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-sm">
                        HEXO
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                  {plugin.description || '暂无描述'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-vercel-border">
                <div className="flex flex-wrap gap-1">
                  {plugin.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="label-caps text-[10px] text-zinc-500 bg-zinc-50 border border-zinc-200 px-1.5 py-0.2 rounded-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {installed ? (
                  <button
                    onClick={() => handleUninstallPlugin(plugin.name)}
                    className={`btn-secondary text-xs px-3 py-1 flex items-center gap-1 ${
                      isCore
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300 font-medium'
                        : 'text-rose-600 hover:bg-rose-50 border-rose-200'
                    }`}
                  >
                    {isCore ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> : <Trash2 className="w-3.5 h-3.5" />}
                    {isCore ? '卸载核心依赖' : '卸载插件'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstallPlugin(plugin.name)}
                    className="btn-primary-pill text-xs px-4 py-1 flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    一键安装
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Streaming Terminal Console Modal */}
      {consoleModal.show && (
        <InstallConsoleModal
          title={consoleModal.title}
          logs={consoleModal.logs}
          isFinished={consoleModal.isFinished}
          isError={consoleModal.isError}
          onClose={() => setConsoleModal((prev) => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};
