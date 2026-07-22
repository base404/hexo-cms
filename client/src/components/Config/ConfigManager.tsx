import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { parseDocument } from 'yaml';
import { useToast } from '../Common/ToastContext';
import { CustomScriptModal } from './CustomScriptModal';
import {
  Save,
  FileCode,
  Globe,
  Link,
  BookOpen,
  Calendar,
  Layers,
  Palette,
  Sliders,
  X,
  Check,
  Code,
  Sparkles,
} from 'lucide-react';

interface ConfigManagerProps {
  initialContent: string;
  configName: string;
  onSave: (newContent: string) => Promise<void>;
}

export const ConfigManager: React.FC<ConfigManagerProps> = ({
  initialContent,
  configName,
  onSave,
}) => {
  const { showToast } = useToast();
  const [yamlText, setYamlText] = useState(initialContent);

  // Form Field State Values
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [language, setLanguage] = useState('zh-CN');
  const [timezone, setTimezone] = useState('');
  const [url, setUrl] = useState('');
  const [root, setRoot] = useState('/');
  const [theme, setTheme] = useState('landscape');
  const [perPage, setPerPage] = useState(10);
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState('HH:mm:ss');

  // Installed Themes for Dropdown Select
  const [installedThemes, setInstalledThemes] = useState<{ name: string; isBuiltin?: boolean }[]>([]);

  // Modals UI Control
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isCustomScriptModalOpen, setIsCustomScriptModalOpen] = useState(false);
  const [sourceEditorText, setSourceEditorText] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setYamlText(initialContent);
    setSourceEditorText(initialContent);
    parseYamlToForm(initialContent);
    fetchInstalledThemes();

    const handleFocus = () => {
      fetchInstalledThemes();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('hashchange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('hashchange', handleFocus);
    };
  }, [initialContent]);

  const fetchInstalledThemes = async () => {
    try {
      const res = await fetch('/api/themes/installed');
      if (res.ok) {
        const data = await res.json();
        setInstalledThemes(data);
      }
    } catch {}
  };

  const parseYamlToForm = (rawYaml: string) => {
    try {
      const doc = parseDocument(rawYaml);
      const data = doc.toJS() || {};

      setTitle(data.title || '');
      setSubtitle(data.subtitle || '');
      setDescription(data.description || '');
      setAuthor(data.author || '');
      setLanguage(data.language || 'zh-CN');
      setTimezone(data.timezone || '');
      setUrl(data.url || '');
      setRoot(data.root || '/');
      setTheme(data.theme || 'landscape');
      setPerPage(data.per_page || 10);
      setDateFormat(data.date_format || 'YYYY-MM-DD');
      setTimeFormat(data.time_format || 'HH:mm:ss');
    } catch { }
  };

  const handleFormSave = async () => {
    setSaving(true);
    try {
      const doc = parseDocument(yamlText);
      doc.set('title', title);
      doc.set('subtitle', subtitle);
      doc.set('description', description);
      doc.set('author', author);
      doc.set('language', language);
      doc.set('timezone', timezone);
      doc.set('url', url);
      doc.set('root', root);
      doc.set('theme', theme);
      doc.set('per_page', Number(perPage));
      doc.set('date_format', dateFormat);
      doc.set('time_format', timeFormat);

      const updatedYaml = doc.toString();
      await onSave(updatedYaml);
      setYamlText(updatedYaml);
      setSourceEditorText(updatedYaml);
      showToast('_config.yml 主题与系统参数保存成功！', 'success', '配置重载生效');
    } catch (e: any) {
      showToast(`保存表单配置失败: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSourceSave = async () => {
    setSaving(true);
    try {
      await onSave(sourceEditorText);
      setYamlText(sourceEditorText);
      parseYamlToForm(sourceEditorText);
      setIsSourceModalOpen(false);
      showToast('_config.yml YAML 源码已落盘并同步至图形界面！', 'success', '源码重载成功');
    } catch (e: any) {
      showToast(`保存 YAML 失败: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Combine default, active theme, and all installed themes dynamically
  const themeOptions = Array.from(
    new Set(['landscape', theme, ...installedThemes.map((t) => t.name)].filter(Boolean))
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight text-vercel-black">全局系统配置中心</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            配置文件: <code className="bg-zinc-100 px-1 py-0.5 rounded text-black font-semibold">{configName}</code> (基于 YAML AST 格式化引擎)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCustomScriptModalOpen(true)}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5 text-zinc-900 border-zinc-300 shadow-2xs hover:bg-zinc-100"
          >
            <Code className="w-3.5 h-3.5 text-purple-600" />
            拓展 JS/CSS
          </button>

          <button
            onClick={() => setIsSourceModalOpen(true)}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5 text-zinc-800"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-600" />
            编辑源文件
          </button>

          <button
            onClick={handleFormSave}
            disabled={saving}
            className="btn-primary-pill text-xs py-1.5 flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            {saving ? '保存中...' : '保存更改'}
          </button>
        </div>
      </div>

      {/* Main Grid Categories */}
      <div className="grid grid-cols-1 gap-6">
        {/* Category 1: Site Info */}
        <div className="geist-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-vercel-border pb-3">
            <Globe className="w-4 h-4 text-vercel-blue" />
            <h3 className="font-semibold text-sm text-vercel-black tracking-tight">网站基础信息</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-gray-700">主标题 (title)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="我的 Hexo 博客"
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-vercel-blue"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-gray-700">副标题 (subtitle)</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="极客技术随笔"
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-vercel-blue"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-gray-700">网站描述 (description)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="分享全栈开发与技术实践"
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-vercel-blue"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-gray-700">作者名称 (author)</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-vercel-blue"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-gray-700">站点语言 (language)</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-vercel-blue cursor-pointer"
              >
                <option value="zh-CN">简体中文 (zh-CN)</option>
                <option value="zh-TW">繁體中文 (zh-TW)</option>
                <option value="en">English (en)</option>
                <option value="ja">日本語 (ja)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-gray-700">时区 (timezone)</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Shanghai"
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-vercel-blue font-mono"
              />
            </div>
          </div>
        </div>

        {/* Category 2: URL & Root */}
        <div className="geist-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-vercel-border pb-3">
            <Link className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-vercel-black tracking-tight">网址与域名设置 (URL)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-gray-700">博客主网址 (url)</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-vercel-blue font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-gray-700">根目录路径 (root)</label>
              <input
                type="text"
                value={root}
                onChange={(e) => setRoot(e.target.value)}
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-vercel-blue font-mono"
              />
            </div>
          </div>
        </div>

        {/* Category 3: Theme & Pagination */}
        <div className="geist-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-vercel-border pb-3">
            <Palette className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-sm text-vercel-black tracking-tight">外观主题与分页 (Theme & Pagination)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Theme Dropdown Select Field */}
            <div className="space-y-1.5">
              <label className="font-medium text-gray-700 flex items-center justify-between">
                <span>当前皮肤主题 (theme)</span>
                <span className="text-[10px] text-purple-600 font-mono">已安装 {installedThemes.length} 个</span>
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                onFocus={fetchInstalledThemes}
                onClick={fetchInstalledThemes}
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-purple-600 font-mono text-xs cursor-pointer font-semibold text-zinc-900 shadow-2xs"
              >
                {themeOptions.map((tName) => {
                  const isBuiltin = tName === 'landscape';
                  return (
                    <option key={tName} value={tName}>
                      {tName} {isBuiltin ? '(Hexo 默认主题)' : '(已安装主程序)'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-gray-700">每页文章数量 (per_page)</label>
              <input
                type="number"
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-vercel-blue font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-gray-700">日期格式 (date_format)</label>
              <input
                type="text"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full bg-white border border-vercel-border rounded-md px-3 py-1.5 outline-none focus:border-vercel-blue font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Toolbar Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-vercel-border z-30 px-8 py-3.5 flex items-center justify-between shadow-lg">
        <span className="text-xs text-gray-500 font-mono">
          通过 AST 保持原 YAML 注释与对齐架构。
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCustomScriptModalOpen(true)}
            className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 text-zinc-900 border-zinc-300 shadow-2xs hover:bg-zinc-100"
          >
            <Code className="w-4 h-4 text-purple-600" />
            拓展 JS/CSS
          </button>

          <button
            onClick={() => setIsSourceModalOpen(true)}
            className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 text-zinc-800"
          >
            <FileCode className="w-4 h-4 text-blue-600" />
            编辑源文件
          </button>

          <button
            onClick={handleFormSave}
            disabled={saving}
            className="btn-primary-pill text-xs px-6 py-2 flex items-center gap-1.5 shadow-md"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            {saving ? '正在写入保存...' : '保存更改'}
          </button>
        </div>
      </div>

      {/* Raw YAML Source Modal */}
      {isSourceModalOpen &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-6">
            <div className="w-full max-w-4xl h-[650px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-sm text-zinc-900 font-mono">
                    编辑源文件 ({configName})
                  </h3>
                </div>
                <button
                  onClick={() => setIsSourceModalOpen(false)}
                  className="text-gray-400 hover:text-zinc-900 p-1.5 rounded-md hover:bg-zinc-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-4 bg-zinc-950 text-zinc-100 font-mono text-xs overflow-hidden">
                <textarea
                  value={sourceEditorText}
                  onChange={(e) => setSourceEditorText(e.target.value)}
                  className="w-full h-full bg-transparent text-zinc-100 outline-none resize-none font-mono leading-relaxed p-2"
                />
              </div>

              <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-200 bg-zinc-50">
                <span className="text-xs text-gray-500 font-mono">
                  YAML 文本直接同步写入物理磁盘
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSourceModalOpen(false)}
                    className="btn-secondary text-xs px-4 py-1.5"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSourceSave}
                    disabled={saving}
                    className="btn-primary-pill text-xs px-5 py-1.5"
                  >
                    保存物理文件
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Custom Scripts & CSS CRUD Modal */}
      {isCustomScriptModalOpen && (
        <CustomScriptModal onClose={() => setIsCustomScriptModalOpen(false)} />
      )}
    </div>
  );
};
