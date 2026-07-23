import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ToastProvider, useToast } from './components/Common/ToastContext';
import { BlogWizardOnboarding } from './components/Wizard/BlogWizardOnboarding';
import { PostListManager, PostItem } from './components/Editor/PostListManager';
import { SplitViewMarkdownEditor } from './components/Editor/SplitViewMarkdownEditor';
import { PluginMarket } from './components/Market/PluginMarket';
import { ThemeMarket } from './components/Market/ThemeMarket';
import { ConfigManager } from './components/Config/ConfigManager';
import { BuildConsole } from './components/Build/BuildConsole';
import { HexoServerControl } from './components/Build/HexoServerControl';
import {
  FileEdit,
  Package,
  Palette,
  Settings,
  Terminal,
  Globe,
  Play,
  Layers,
  CheckCircle,
  Folder,
  ArrowLeft,
  Lock,
} from 'lucide-react';

type TabType = 'posts' | 'editor' | 'plugins' | 'themes' | 'config' | 'build';

const getInitialTab = (): TabType => {
  const hash = window.location.hash.replace('#', '');
  if (['posts', 'editor', 'plugins', 'themes', 'config', 'build'].includes(hash)) {
    return hash as TabType;
  }
  const saved = localStorage.getItem('hexo_gui_active_tab');
  if (saved && ['posts', 'editor', 'plugins', 'themes', 'config', 'build'].includes(saved)) {
    return saved as TabType;
  }
  return 'posts';
};

const MainApp: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [workspace, setWorkspace] = useState<{ blogDir: string; exists: boolean; isHexoBlog: boolean }>({
    blogDir: 'C:/Users/Nuoka/blog',
    exists: true,
    isHexoBlog: true,
  });

  const [inputDir, setInputDir] = useState('');
  const [showDirModal, setShowDirModal] = useState(false);

  const [editingPost, setEditingPost] = useState<{
    originalFilename?: string;
    title: string;
    content: string;
    frontMatter: Record<string, any>;
    readMtime?: number;
  }>({
    title: '未命名文章',
    content: '# 未命名文章\n\n在此输入内容...',
    frontMatter: {
      title: '未命名文章',
      tags: [],
      categories: [],
      date: new Date().toISOString(),
    },
  });

  const [realConfig, setRealConfig] = useState('');

  useEffect(() => {
    fetchWorkspace();
    fetchConfig();

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabType;
      if (['posts', 'editor', 'plugins', 'themes', 'config', 'build'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const changeActiveTab = (tab: TabType) => {
    setActiveTab(tab);
    window.location.hash = tab;
    localStorage.setItem('hexo_gui_active_tab', tab);
  };

  const fetchWorkspace = async () => {
    try {
      const res = await fetch('/api/workspace');
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data);
        setInputDir(data.blogDir);
      }
    } catch {}
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setRealConfig(data.content);
      }
    } catch {}
  };

  const handleSwitchDirectory = async (targetDir: string) => {
    try {
      const res = await fetch('/api/workspace/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogDir: targetDir }),
      });

      if (res.ok) {
        const data = await res.json();
        setWorkspace(data);
        setShowDirModal(false);

        if (data.isHexoBlog) {
          showToast(`已切换绑定 Hexo 博客目录: ${data.blogDir}`, 'success', '工作区切换成功');
          fetchConfig();
          changeActiveTab('posts');
        } else {
          showToast(`目录 ${data.blogDir} 尚未初始化为 Hexo 博客`, 'warning', '即刻一键初始化');
        }
      }
    } catch (e: any) {
      showToast(`切换目录失败: ${e.message}`, 'error');
    }
  };

  const handleEditPostFromList = (post: PostItem) => {
    setEditingPost({
      originalFilename: post.filename,
      title: post.title,
      content: post.content,
      frontMatter: post.frontMatter,
      readMtime: post.readMtime,
    });
    changeActiveTab('editor');
  };

  const handleCreateNewPost = () => {
    setEditingPost({
      originalFilename: undefined,
      title: '未命名文章',
      content: '# 新文章标题\n\n在此书写 Markdown 内容...',
      frontMatter: {
        title: '未命名文章',
        tags: [],
        categories: [],
        date: new Date().toISOString(),
      },
      readMtime: undefined,
    });
    changeActiveTab('editor');
  };

  const handleSavePost = async (
    updatedContent: string,
    updatedFrontMatter: Record<string, any>,
    isDraft: boolean = false
  ) => {
    try {
      const response = await fetch('/api/posts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedFrontMatter.title || editingPost.title,
          content: updatedContent,
          frontMatter: updatedFrontMatter,
          isDraft: isDraft,
          readMtime: editingPost.readMtime,
          originalFilename: editingPost.originalFilename,
          originalFilePath: editingPost.fullPath,
        }),
      });

      if (response.status === 409) {
        showToast('物理磁盘文件已被外部修改！为防止覆盖，请先备份或刷新重载。', 'error', '检测到文件冲突');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setEditingPost((prev: any) => ({
          ...prev,
          originalFilename: data.filename,
          fullPath: data.filePath,
          readMtime: data.newMtime,
          isDraft: isDraft,
        }));
        const msg = isDraft
          ? `文章《${data.meta.title}》已成功暂存为 Hexo 草稿 (source/_drafts)！`
          : `文章《${data.meta.title}》已成功保存发布 (source/_posts)！`;
        showToast(msg, 'success', isDraft ? '已暂存为草稿' : '文章已发布');
      } else {
        showToast('保存文章失败', 'error');
      }
    } catch (e: any) {
      showToast(`保存出错: ${e.message}`, 'error');
    }
  };

  const handleSaveConfig = async (newYamlContent: string) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newYamlContent }),
      });

      if (res.ok) {
        setRealConfig(newYamlContent);
        showToast('_config.yml 全局配置文件更新成功！', 'success', 'AST 全局生效');
      } else {
        showToast('保存配置文件失败', 'error');
      }
    } catch (e: any) {
      showToast(`配置保存异常: ${e.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-vercel-neutral text-vercel-black">
      {/* Navigation Header */}
      <header className="bg-white border-b border-vercel-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo Brand Icon */}
            <div
              onClick={() => workspace.isHexoBlog && changeActiveTab('posts')}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              title="回到首页 (文章管理)"
            >
              <div className="w-5 h-5 bg-vercel-black rounded-sm flex items-center justify-center text-white font-bold text-xs shadow-xs">
                ▲
              </div>
              <span className="font-semibold text-sm tracking-tight text-vercel-black">Hexo CMS</span>
              <span className="label-caps bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-sm text-[10px]">
                ZERO-CLI
              </span>
            </div>

            {/* Nav Tabs */}
            <nav className="flex items-center gap-1 text-xs font-medium text-gray-600">
              <button
                onClick={() => workspace.isHexoBlog && changeActiveTab('posts')}
                disabled={!workspace.isHexoBlog}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'posts' || activeTab === 'editor' ? 'bg-zinc-100 text-black font-semibold' : 'hover:bg-zinc-50'
                } ${!workspace.isHexoBlog ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                文章管理
              </button>
              <button
                onClick={() => workspace.isHexoBlog && changeActiveTab('plugins')}
                disabled={!workspace.isHexoBlog}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'plugins' ? 'bg-zinc-100 text-black font-semibold' : 'hover:bg-zinc-50'
                } ${!workspace.isHexoBlog ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Package className="w-3.5 h-3.5" />
                插件市场
                {!workspace.isHexoBlog && <Lock className="w-3 h-3 text-gray-400" />}
              </button>
              <button
                onClick={() => workspace.isHexoBlog && changeActiveTab('themes')}
                disabled={!workspace.isHexoBlog}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'themes' ? 'bg-zinc-100 text-black font-semibold' : 'hover:bg-zinc-50'
                } ${!workspace.isHexoBlog ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Palette className="w-3.5 h-3.5" />
                主题市场
                {!workspace.isHexoBlog && <Lock className="w-3 h-3 text-gray-400" />}
              </button>
              <button
                onClick={() => workspace.isHexoBlog && changeActiveTab('config')}
                disabled={!workspace.isHexoBlog}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'config' ? 'bg-zinc-100 text-black font-semibold' : 'hover:bg-zinc-50'
                } ${!workspace.isHexoBlog ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Settings className="w-3.5 h-3.5" />
                系统配置
                {!workspace.isHexoBlog && <Lock className="w-3 h-3 text-gray-400" />}
              </button>
              <button
                onClick={() => workspace.isHexoBlog && changeActiveTab('build')}
                disabled={!workspace.isHexoBlog}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'build' ? 'bg-zinc-100 text-black font-semibold' : 'hover:bg-zinc-50'
                } ${!workspace.isHexoBlog ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Terminal className="w-3.5 h-3.5" />
                构建部署
                {!workspace.isHexoBlog && <Lock className="w-3 h-3 text-gray-400" />}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Hexo Server Preview Quick Control Pill */}
            {workspace.isHexoBlog && <HexoServerControl />}

            <button
              onClick={() => setShowDirModal(true)}
              className="flex items-center gap-1.5 text-xs font-mono bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-3 py-1.5 rounded-md border border-zinc-200 transition-colors"
            >
              <Folder className="w-3.5 h-3.5 text-blue-600" />
              <span className="max-w-[140px] truncate">{workspace.blogDir}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Workspace */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-6 space-y-4">
        {!workspace.isHexoBlog ? (
          <BlogWizardOnboarding
            blogDir={workspace.blogDir}
            onInitSuccess={() => {
              fetchWorkspace();
              fetchConfig();
              changeActiveTab('posts');
            }}
            onSwitchDir={(newDir) => handleSwitchDirectory(newDir)}
          />
        ) : (
          <>
            {activeTab === 'posts' && (
              <PostListManager
                onEditPost={handleEditPostFromList}
                onCreateNewPost={handleCreateNewPost}
              />
            )}

            {activeTab === 'editor' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => changeActiveTab('posts')}
                    className="btn-secondary text-xs flex items-center gap-1 px-3 py-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> 返回文章列表
                  </button>
                </div>
                <div className="h-[730px]">
                  <SplitViewMarkdownEditor
                    content={editingPost.content}
                    frontMatter={editingPost.frontMatter}
                    onSave={handleSavePost}
                    isDraft={editingPost.isDraft}
                  />
                </div>
              </div>
            )}

            {activeTab === 'plugins' && <PluginMarket />}

            {activeTab === 'themes' && <ThemeMarket />}

            {activeTab === 'config' && (
              <ConfigManager
                configName="_config.yml"
                initialContent={realConfig}
                onSave={handleSaveConfig}
              />
            )}

            {activeTab === 'build' && <BuildConsole blogDir={workspace.blogDir} />}
          </>
        )}
      </main>

      {/* Directory Switcher Modal */}
      {showDirModal &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
            <div className="geist-card p-6 w-full max-w-md bg-white space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 border border-zinc-200">
              <h3 className="text-lg font-medium text-vercel-black">绑定/切换本地 Hexo 博客目录</h3>
              <p className="text-xs text-gray-500">
                请输入本地 Hexo 博客根目录绝对路径（如 <code className="bg-zinc-100 px-1">C:/Users/Nuoka/blog</code>）：
              </p>
              <input
                type="text"
                value={inputDir}
                onChange={(e) => setInputDir(e.target.value)}
                placeholder="例如 C:/Users/Nuoka/blog 或 D:/my-hexo-site"
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-vercel-blue"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDirModal(false)}
                  className="btn-secondary text-xs px-4 py-1.5"
                >
                  取消
                </button>
                <button
                  onClick={() => handleSwitchDirectory(inputDir)}
                  className="btn-primary-pill text-xs px-5 py-1.5"
                >
                  确认绑定目录
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
};
