import React, { useState, useEffect } from 'react';
import { useToast } from '../Common/ToastContext';
import { InstallConsoleModal } from '../Common/InstallConsoleModal';
import { ThemeConfigEditor } from '../Config/ThemeConfigEditor';
import { Search, Download, ExternalLink, RefreshCw, Eye, Trash2, CheckCircle2, Play, Sparkles, Sliders } from 'lucide-react';

export interface ThemeItem {
  name: string;
  description: string;
  link: string;
  preview?: string;
  tags: string[];
}

export interface InstalledTheme {
  name: string;
  path: string;
  isActive: boolean;
  hasConfig: boolean;
  hasSchema?: boolean;
}

export const ThemeMarket: React.FC = () => {
  const { showToast, confirm } = useToast();
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [installedThemes, setInstalledThemes] = useState<InstalledTheme[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'installed'>('all');
  const [loading, setLoading] = useState(true);
  const [editingThemeConfig, setEditingThemeConfig] = useState<string | null>(null);

  // Streaming Log Console Modal
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
    fetchMarketThemes();
    fetchInstalledThemes();
  }, []);

  const fetchMarketThemes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market/themes');
      if (res.ok) {
        const data = await res.json();
        setThemes(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchInstalledThemes = async () => {
    try {
      const res = await fetch('/api/themes/installed');
      if (res.ok) {
        const data = await res.json();
        setInstalledThemes(data);
      }
    } catch {}
  };

  const handleClearCache = async () => {
    try {
      await fetch('/api/market/clear-cache', { method: 'POST' });
      await fetchMarketThemes();
      showToast('已成功清理主题市场离线缓存，并重新从 hexo.io/themes 抓取全量数据！', 'success', '缓存已清理');
    } catch (e: any) {
      showToast(`清理失败: ${e.message}`, 'error');
    }
  };

  const getInstalledInfo = (name: string) => {
    return installedThemes.find((t) => t.name.toLowerCase() === name.toLowerCase());
  };

  const handleInstallTheme = async (name: string, repositoryUrl: string) => {
    setConsoleModal({
      show: true,
      title: `Git Clone 克隆主题: ${name}`,
      logs: `🚀 正在连接后台发起 Git Clone 任务...\n`,
      isFinished: false,
      isError: false,
    });

    try {
      const response = await fetch('/api/themes/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, repositoryUrl }),
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
      showToast(`主题《${name}》已成功 Git Clone 克隆完毕！点击【启用该主题】即可生效。`, 'success', '主题安装成功');
      fetchInstalledThemes();
    } catch (e: any) {
      setConsoleModal((prev) => ({
        ...prev,
        logs: prev.logs + `\n❌ 克隆主题异常: ${e.message}`,
        isFinished: true,
        isError: true,
      }));
      showToast(`主题《${name}》克隆过程发生错误，详见日志`, 'error', '主题安装失败');
    }
  };

  const handleActivateTheme = async (name: string) => {
    try {
      const res = await fetch('/api/themes/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        showToast(`已成功将当前博客主题切换为《${name}》！`, 'success', '启用成功');
        fetchInstalledThemes();
      } else {
        showToast('启用主题失败', 'error');
      }
    } catch (e: any) {
      showToast(`启用出错: ${e.message}`, 'error');
    }
  };

  const handleDeleteTheme = (name: string) => {
    confirm({
      title: '确认删除主题',
      message: `确定要删除物理主题文件夹 themes/${name} 吗？`,
      confirmText: '确认删除',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/themes/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          });
          if (res.ok) {
            showToast(`已删除主题目录 themes/${name}`, 'success', '删除成功');
            fetchInstalledThemes();
          } else {
            showToast('删除失败', 'error');
          }
        } catch (e: any) {
          showToast(`删除异常: ${e.message}`, 'error');
        }
      },
    });
  };

  // Base list depending on filter mode
  const baseThemesList =
    filterMode === 'installed'
      ? installedThemes.map((t) => {
          const found = themes.find((m) => m.name.toLowerCase() === t.name.toLowerCase());
          return (
            found || {
              name: t.name,
              description: '已安装本地 Hexo 主题',
              link: '',
              tags: ['已安装'],
            }
          );
        })
      : themes;

  const filteredThemes = baseThemesList.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight text-vercel-black">主题市场 & 管理</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            动态提取自 hexo.io/themes/ (已安装 {installedThemes.length} / 共 {themes.length} 项)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-[6px] border border-zinc-200 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-[4px] transition-all font-medium ${
                filterMode === 'all' ? 'bg-white shadow-2xs font-semibold text-[#171717]' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              全部主题 ({themes.length})
            </button>
            <button
              onClick={() => setFilterMode('installed')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] transition-all font-medium ${
                filterMode === 'installed' ? 'bg-white shadow-2xs font-semibold text-[#171717]' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
              已安装 ({installedThemes.length})
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
              placeholder="搜索主题..."
              className="w-full pl-9 pr-3 py-1.5 bg-white geist-card text-xs text-vercel-black placeholder-gray-400 outline-none focus:box-shadow-geist-focus rounded-[6px]"
            />
          </div>

          <button
            onClick={() => {
              fetchMarketThemes();
              fetchInstalledThemes();
            }}
            className="bg-white border border-zinc-200 hover:bg-zinc-50 text-[#171717] rounded-[6px] flex items-center gap-1.5 text-xs py-1.5 px-3 font-medium shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>

          <button
            onClick={handleClearCache}
            className="bg-[#EE0000] hover:bg-red-700 text-white rounded-[6px] px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清理市场缓存
          </button>
        </div>
      </div>

      {/* Grid of Theme Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredThemes.map((theme) => {
          const installedInfo = getInstalledInfo(theme.name);
          const isActive = installedInfo?.isActive;

          return (
            <div key={theme.name} className="geist-card flex flex-col justify-between overflow-hidden group border border-zinc-200 rounded-[6px] bg-white">
              {/* Theme Screenshot Image Header */}
              <div className="relative h-44 bg-zinc-100 overflow-hidden border-b border-zinc-200">
                <img
                  src={`https://hexo.io/themes/screenshots/${theme.name}.jpg`}
                  alt={theme.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://via.placeholder.com/400x220/FAFAFA/171717?text=Hexo+Theme';
                  }}
                />
                {theme.preview && (
                  <a
                    href={theme.preview}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white text-[10px] px-2 py-1 rounded-[4px] flex items-center gap-1 backdrop-blur-xs transition-colors font-mono"
                  >
                    <Eye className="w-3 h-3" /> 预览站
                  </a>
                )}
                {isActive && (
                  <span className="absolute top-2 left-2 bg-[#00C853] text-white font-mono text-[10px] font-semibold px-2 py-1 rounded-[4px] flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" /> 当前在用主题 (ACTIVE)
                  </span>
                )}
              </div>

              {/* Theme Info Details */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <a
                      href={theme.link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-base text-vercel-black hover:text-vercel-blue flex items-center gap-1"
                    >
                      {theme.name}
                      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                    </a>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1.5 leading-relaxed font-sans">{theme.description || '暂无描述'}</p>
                </div>

                <div className="space-y-3 pt-2 border-t border-zinc-100">
                  <div className="flex flex-wrap gap-1">
                    {theme.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="label-caps text-[10px] text-zinc-600 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-[4px] font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {installedInfo ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingThemeConfig(theme.name)}
                        className="bg-white border border-zinc-200 hover:bg-zinc-50 text-[#171717] text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 font-medium rounded-[6px] shadow-2xs transition-colors shrink-0"
                        title="可视化配置主题 Schema"
                      >
                        <Sliders className="w-3.5 h-3.5 text-zinc-700" />
                        配置 Schema
                      </button>

                      {!isActive ? (
                        <button
                          onClick={() => handleActivateTheme(theme.name)}
                          className="btn-primary-pill text-xs flex-1 py-1.5 flex items-center justify-center gap-1 bg-[#171717] hover:bg-black text-white font-medium rounded-[6px]"
                        >
                          <Play className="w-3.5 h-3.5" /> 启用该主题
                        </button>
                      ) : (
                        <span className="text-xs text-[#00C853] font-mono font-semibold flex-1 text-center py-1.5 bg-emerald-50 rounded-[6px] border border-emerald-200">
                          运行中
                        </span>
                      )}

                      {!isActive && (
                        <button
                          onClick={() => handleDeleteTheme(theme.name)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-[6px] transition-colors"
                          title="删除主题目录"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInstallTheme(theme.name, theme.link)}
                      className="bg-[#171717] hover:bg-black text-white text-xs w-full py-1.5 flex items-center justify-center gap-1.5 rounded-[6px] font-medium shadow-2xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      一键 Git Clone 主题
                    </button>
                  )}
                </div>
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

      {/* Schema Theme Visual Editor Modal */}
      {editingThemeConfig && (
        <ThemeConfigEditor
          themeName={editingThemeConfig}
          onClose={() => setEditingThemeConfig(null)}
        />
      )}
    </div>
  );
};
