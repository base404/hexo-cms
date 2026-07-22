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
} from 'lucide-react';

interface SplitViewMarkdownEditorProps {
  content: string;
  frontMatter: Record<string, any>;
  onSave: (content: string, frontMatter: Record<string, any>) => void;
  isSaving?: boolean;
}

export const SplitViewMarkdownEditor: React.FC<SplitViewMarkdownEditorProps> = ({
  content: initialContent,
  frontMatter,
  onSave,
  isSaving = false,
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

  // Keyboard Shortcuts: Ctrl+S (Save), Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isCtrlOrCmd && key === 's') {
        e.preventDefault();
        onSave(content, meta);
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
          <span className="label-caps bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-sm">
            {meta.published !== false ? 'POST' : 'DRAFT'}
          </span>
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

          <button
            onClick={() => onSave(content, meta)}
            disabled={isSaving}
            className="btn-primary-pill text-xs px-5 py-1.5"
            title="快捷键 Ctrl+S / Cmd+S"
          >
            {isSaving ? '保存中...' : '保存文章 (Ctrl+S)'}
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

        <div className="h-4 w-px bg-zinc-300 mx-1" />

        <button
          onClick={() => insertTextAtCursor('# ')}
          className="px-2 py-1 hover:bg-zinc-200 rounded font-semibold text-xs flex items-center gap-0.5"
        >
          <Heading1 className="w-3.5 h-3.5" /> H1
        </button>
        <button
          onClick={() => insertTextAtCursor('## ')}
          className="px-2 py-1 hover:bg-zinc-200 rounded font-semibold text-xs flex items-center gap-0.5"
        >
          <Heading2 className="w-3.5 h-3.5" /> H2
        </button>
        <button
          onClick={() => insertTextAtCursor('**', '**')}
          className="p-1.5 hover:bg-zinc-200 rounded"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertTextAtCursor('*', '*')}
          className="p-1.5 hover:bg-zinc-200 rounded"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertTextAtCursor('```javascript\n', '\n```')}
          className="p-1.5 hover:bg-zinc-200 rounded"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertTextAtCursor('- ')}
          className="p-1.5 hover:bg-zinc-200 rounded"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <div className="h-4 w-px bg-zinc-300 mx-1" />
        <button
          onClick={() => insertTextAtCursor('{% codeblock %}\n', '\n{% endcodeblock %}')}
          className="px-2 py-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded font-mono text-[11px] flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-blue-600" />
          插入 Hexo Tag
        </button>

        <div className="ml-auto text-xs text-gray-400 flex items-center gap-3 font-mono">
          <span>拖拽 .md 文件至此导入</span>
          <span>{content.length} 字符</span>
          <Lock className="w-3 h-3 text-emerald-500" />
        </div>
      </div>

      {/* Editor Split Main Layout */}
      <div className="flex-1 flex overflow-hidden relative bg-white">
        {/* Left: Source Markdown Editor */}
        {(viewMode === 'split' || viewMode === 'source') && (
          <div className={`h-full flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-vercel-border' : 'w-full'}`}>
            <textarea
              id="md-textarea"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="在此输入完整的 Markdown 源码 (支持 Ctrl+Z 撤销 / Ctrl+Y 重做，支持拖拽文件导入...)"
              spellCheck={false}
              className="w-full h-full p-6 bg-white text-zinc-900 font-mono text-sm leading-relaxed outline-none resize-none"
            />
          </div>
        )}

        {/* Right: Real-time Markdown & Mermaid Preview Panel */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div
            ref={previewRef}
            className={`h-full overflow-y-auto p-8 markdown-body bg-white ${
              viewMode === 'split' ? 'w-1/2' : 'w-full max-w-4xl mx-auto'
            }`}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}

        {/* Front-Matter Drawer Side Overlay */}
        {showDrawer && (
          <div className="w-80 border-l border-vercel-border bg-vercel-neutral p-5 flex flex-col gap-4 text-xs font-mono absolute right-0 top-0 bottom-0 z-20 shadow-xl">
            <h3 className="label-caps text-gray-500">Front-matter 元数据配置</h3>

            <div>
              <label className="block text-gray-500 mb-1">标题 (Title)</label>
              <input
                type="text"
                value={meta.title || ''}
                onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                className="w-full bg-white border border-vercel-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-vercel-blue"
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1">标签 (Tags, 逗号分隔，默认无)</label>
              <input
                type="text"
                value={Array.isArray(meta.tags) ? meta.tags.join(', ') : meta.tags || ''}
                onChange={(e) =>
                  setMeta({
                    ...meta,
                    tags: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : [],
                  })
                }
                placeholder="例如: Hexo, 随笔"
                className="w-full bg-white border border-vercel-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-vercel-blue"
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1">分类 (Categories，默认无)</label>
              <input
                type="text"
                value={Array.isArray(meta.categories) ? meta.categories.join(', ') : meta.categories || ''}
                onChange={(e) =>
                  setMeta({
                    ...meta,
                    categories: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : [],
                  })
                }
                placeholder="例如: 技术架构"
                className="w-full bg-white border border-vercel-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-vercel-blue"
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1">发布日期 (Date)</label>
              <input
                type="text"
                value={meta.date || new Date().toISOString()}
                onChange={(e) => setMeta({ ...meta, date: e.target.value })}
                className="w-full bg-white border border-vercel-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-vercel-blue"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
