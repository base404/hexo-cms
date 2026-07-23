import React, { useState, useEffect, useRef } from 'react';
import matter from 'gray-matter';
import { marked } from 'marked';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  List,
  Lock,
  FileText,
  Columns,
  Eye,
  Edit3,
  Sparkles,
  UploadCloud,
  Undo,
  Redo,
  Bookmark,
  Send,
} from 'lucide-react';

interface SplitViewMarkdownEditorProps {
  content: string;
  frontMatter: Record<string, any>;
  onSave: (content: string, frontMatter: Record<string, any>, isDraft?: boolean) => void;
  isSaving?: boolean;
  isDraft?: boolean;
}

export const SplitViewMarkdownEditor: React.FC<SplitViewMarkdownEditorProps> = ({
  content: initialContent,
  frontMatter,
  onSave,
  isSaving = false,
  isDraft = false,
}) => {
  const [content, setContent] = useState(initialContent);
  const [meta, setMeta] = useState<Record<string, any>>(frontMatter || { title: 'Untitled Post', tags: [], categories: [] });
  const [viewMode, setViewMode] = useState<'split' | 'source' | 'preview'>('split');
  const [showDrawer, setShowDrawer] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Custom Undo / Redo History Stack
  const historyRef = useRef<string[]>([initialContent]);
  const historyIndexRef = useRef<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);

  const previewRef = useRef<HTMLDivElement>(null);

  // Sync props when changing posts
  useEffect(() => {
    setContent(initialContent);
    setMeta(frontMatter || { title: 'Untitled Post', tags: [], categories: [] });
    historyRef.current = [initialContent];
    historyIndexRef.current = 0;
  }, [initialContent, frontMatter]);

  // Record content changes into history stack (debounced)
  const handleContentChange = (newText: string) => {
    setContent(newText);

    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (currentHistory[currentHistory.length - 1] !== newText) {
      currentHistory.push(newText);
      // Limit history stack size to 50 steps
      if (currentHistory.length > 50) currentHistory.shift();
      historyRef.current = currentHistory;
      historyIndexRef.current = currentHistory.length - 1;
    }
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevText = historyRef.current[historyIndexRef.current];
      isUndoRedoAction.current = true;
      setContent(prevText);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextText = historyRef.current[historyIndexRef.current];
      isUndoRedoAction.current = true;
      setContent(nextText);
    }
  };

  // Keyboard Shortcuts: Ctrl+S (Save/Publish), Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isCtrlOrCmd && key === 's') {
        e.preventDefault();
        onSave(content, meta, false);
      } else if (isCtrlOrCmd && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isCtrlOrCmd && key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, meta, onSave]);

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
    });
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
  }, []);

  // Update Preview HTML when content changes
  useEffect(() => {
    let processedMarkdown = content.replace(/\{%\s*([\s\S]*?)\s*%\}/g, (match, p1) => {
      return `<span class="hexo-tag-rendered">⚡ {% ${p1.trim()} %}</span>`;
    });

    const parsed = marked.parse(processedMarkdown);
    if (typeof parsed === 'string') {
      setRenderedHtml(parsed);
    } else {
      parsed.then((res) => setRenderedHtml(res));
    }
  }, [content]);

  // Highlight code & render mermaid after HTML update
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });

      const mermaidElements = previewRef.current.querySelectorAll('.language-mermaid, code.language-mermaid');
      mermaidElements.forEach((el, index) => {
        const code = el.textContent || '';
        const id = `mermaid-svg-${index}-${Date.now()}`;
        try {
          mermaid.render(id, code).then(({ svg }) => {
            const container = document.createElement('div');
            container.className = 'mermaid-chart flex justify-center my-4';
            container.innerHTML = svg;
            el.parentElement?.replaceWith(container);
          });
        } catch {
          // ignore
        }
      });
    }
  }, [renderedHtml]);

  // Handle Drag and Drop Markdown / Text File Import
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const rawText = (event.target?.result as string) || '';
      parseAndImportText(rawText);
    };

    reader.readAsText(file);
  };

  // Parse imported text: Gray-matter + auto extract # Title if first line starts with # Title
  const parseAndImportText = (rawText: string) => {
    let parsedContent = rawText;
    let extractedMeta: Record<string, any> = { ...meta };

    if (rawText.trim().startsWith('---')) {
      try {
        const parsed = matter(rawText);
        parsedContent = parsed.content;
        extractedMeta = { ...extractedMeta, ...parsed.data };
      } catch {
        // ignore
      }
    }

    const lines = parsedContent.split('\n');
    let titleFound = false;
    const cleanLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!titleFound && line.trim().startsWith('# ')) {
        const titleText = line.trim().replace(/^#\s+/, '').trim();
        if (titleText) {
          extractedMeta.title = titleText;
          titleFound = true;
          continue;
        }
      }
      cleanLines.push(line);
    }

    handleContentChange(cleanLines.join('\n').trim());
    setMeta(extractedMeta);
  };

  const insertTextAtCursor = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('md-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = prefix + selected + suffix;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    handleContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 50);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleFileDrop}
      className={`flex flex-col h-full geist-card overflow-hidden relative ${
        isDraggingOver ? 'ring-2 ring-vercel-blue bg-blue-50/20' : ''
      }`}
    >
      {/* Drag Over Overlay Alert */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-vercel-blue/10 backdrop-blur-xs z-50 flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <UploadCloud className="w-12 h-12 text-vercel-blue animate-bounce" />
          <p className="text-sm font-medium text-vercel-blue">松开鼠标即可导入 Markdown / 文本文件</p>
          <p className="text-xs text-gray-500">（自动提取 # 标题及 Front-matter 元数据）</p>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-vercel-border bg-white">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={meta.title || ''}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            placeholder="文章标题..."
            className="text-xl font-medium tracking-tight bg-transparent border-none outline-none text-vercel-black placeholder-gray-400 w-80"
          />
          {isDraft ? (
            <span className="label-caps bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-sm font-semibold text-[10px]">
              📝 草稿 (DRAFT)
            </span>
          ) : (
            <span className="label-caps bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-sm font-semibold text-[10px]">
              🚀 已发布 (POST)
            </span>
          )}
        </div>

        {/* View Switcher & Action buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-md border border-zinc-200 text-xs">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all ${
                viewMode === 'split' ? 'bg-white shadow-sm font-semibold text-black' : 'text-gray-500'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              左右分屏
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all ${
                viewMode === 'source' ? 'bg-white shadow-sm font-semibold text-black' : 'text-gray-500'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              源码
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all ${
                viewMode === 'preview' ? 'bg-white shadow-sm font-semibold text-black' : 'text-gray-500'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              实时渲染
            </button>
          </div>

          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            Front-matter
          </button>

          {/* Stash / Save as Draft Button */}
          <button
            onClick={() => onSave(content, meta, true)}
            disabled={isSaving}
            className="btn-secondary text-xs px-4 py-1.5 flex items-center gap-1.5 text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100 shadow-2xs font-medium"
            title="暂存保存为 Hexo 草稿 (source/_drafts)"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-600" />
            暂存草稿
          </button>

          {/* Save / Publish Article Button */}
          <button
            onClick={() => onSave(content, meta, false)}
            disabled={isSaving}
            className="btn-primary-pill text-xs px-5 py-1.5 flex items-center gap-1.5 shadow-sm"
            title="正式发布文章 (Ctrl+S)"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            {isSaving ? '保存中...' : '发布文章 (Ctrl+S)'}
          </button>
        </div>
      </div>

      {/* Formatting Quick Bar */}
      <div className="flex items-center gap-1.5 px-6 py-2 border-b border-vercel-border bg-vercel-neutral text-gray-600 text-xs">
        {/* Undo / Redo buttons */}
        <button
          onClick={handleUndo}
          disabled={historyIndexRef.current <= 0}
          className="p-1.5 hover:bg-zinc-200 rounded disabled:opacity-40"
          title="撤销 (Ctrl+Z)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleRedo}
          disabled={historyIndexRef.current >= historyRef.current.length - 1}
          className="p-1.5 hover:bg-zinc-200 rounded disabled:opacity-40"
          title="重做 (Ctrl+Y / Ctrl+Shift+Z)"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-zinc-300 mx-1" />

        <button
          onClick={() => insertTextAtCursor('**', '**')}
          className="p-1.5 hover:bg-zinc-200 rounded"
          title="加粗"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertTextAtCursor('*', '*')}
          className="p-1.5 hover:bg-zinc-200 rounded"
          title="斜体"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertTextAtCursor('`', '`')}
          className="p-1.5 hover:bg-zinc-200 rounded"
          title="行内代码"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-zinc-300 mx-1" />

        <button
          onClick={() => insertTextAtCursor('# ')}
          className="p-1.5 hover:bg-zinc-200 rounded"
          title="一级标题"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertTextAtCursor('## ')}
          className="p-1.5 hover:bg-zinc-200 rounded"
          title="二级标题"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertTextAtCursor('- ')}
          className="p-1.5 hover:bg-zinc-200 rounded"
          title="无序列表"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-zinc-300 mx-1" />

        {/* Hexo Tag Shortcut insertion */}
        <button
          onClick={() => insertTextAtCursor('{% codeblock %}\n', '\n{% endcodeblock %}')}
          className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[11px] font-mono flex items-center gap-1 border border-purple-200"
          title="插入 Hexo 原生代码块标签"
        >
          <Sparkles className="w-3 h-3 text-purple-500" />
          Hexo Codeblock
        </button>
        <button
          onClick={() => insertTextAtCursor('{% quote %}\n', '\n{% endquote %}')}
          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-mono flex items-center gap-1 border border-blue-200"
          title="插入 Hexo 引用块标签"
        >
          <Sparkles className="w-3 h-3 text-blue-500" />
          Hexo Quote
        </button>
      </div>

      {/* Main Workspace split */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Markdown Source Editor */}
        {(viewMode === 'split' || viewMode === 'source') && (
          <div className="flex-1 flex flex-col border-r border-vercel-border bg-white overflow-hidden">
            <textarea
              id="md-textarea"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="在此输入 Markdown 正文内容..."
              className="w-full h-full p-6 bg-transparent outline-none resize-none font-mono text-xs leading-relaxed text-vercel-black"
            />
          </div>
        )}

        {/* Right Side: Live HTML Rendered View */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className="flex-1 p-6 bg-white overflow-y-auto font-sans leading-relaxed text-vercel-black">
            <div
              ref={previewRef}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
              className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-vercel-blue prose-pre:bg-zinc-950 prose-pre:text-zinc-100"
            />
          </div>
        )}

        {/* Drawer: Front-matter Editor Modal */}
        {showDrawer && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-vercel-border shadow-xl p-6 z-30 space-y-4 font-sans text-xs overflow-y-auto">
            <div className="flex items-center justify-between border-b border-vercel-border pb-3">
              <h3 className="font-semibold text-sm text-vercel-black">Front-matter 元数据</h3>
              <button
                onClick={() => setShowDrawer(false)}
                className="text-gray-400 hover:text-black font-semibold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-medium text-gray-700">文章标题 (title)</label>
                <input
                  type="text"
                  value={meta.title || ''}
                  onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                  className="w-full bg-white border border-vercel-border rounded px-2.5 py-1.5 outline-none focus:border-vercel-blue"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700">发布日期 (date)</label>
                <input
                  type="text"
                  value={meta.date || ''}
                  onChange={(e) => setMeta({ ...meta, date: e.target.value })}
                  className="w-full bg-white border border-vercel-border rounded px-2.5 py-1.5 outline-none focus:border-vercel-blue font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700">标签 (tags, 逗号分隔)</label>
                <input
                  type="text"
                  value={Array.isArray(meta.tags) ? meta.tags.join(', ') : meta.tags || ''}
                  onChange={(e) =>
                    setMeta({
                      ...meta,
                      tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="前端, React, Vite"
                  className="w-full bg-white border border-vercel-border rounded px-2.5 py-1.5 outline-none focus:border-vercel-blue"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700">分类 (categories, 逗号分隔)</label>
                <input
                  type="text"
                  value={
                    Array.isArray(meta.categories)
                      ? meta.categories.join(', ')
                      : meta.categories || ''
                  }
                  onChange={(e) =>
                    setMeta({
                      ...meta,
                      categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="技术干货"
                  className="w-full bg-white border border-vercel-border rounded px-2.5 py-1.5 outline-none focus:border-vercel-blue"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700">自定义路径 (permalink)</label>
                <input
                  type="text"
                  value={meta.permalink || ''}
                  onChange={(e) => setMeta({ ...meta, permalink: e.target.value })}
                  placeholder="my-custom-post-url"
                  className="w-full bg-white border border-vercel-border rounded px-2.5 py-1.5 outline-none focus:border-vercel-blue font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
