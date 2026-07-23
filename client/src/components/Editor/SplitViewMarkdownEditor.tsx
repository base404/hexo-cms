import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import {
  Save,
  Eye,
  Columns,
  Code,
  FileText,
  Sliders,
  Sparkles,
  Undo,
  Redo,
  Upload,
  CheckCircle2,
  FileCode,
} from 'lucide-react';

interface SplitViewMarkdownEditorProps {
  content: string;
  frontMatter?: Record<string, any>;
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
  const [tagInput, setTagInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'source' | 'preview'>('split');
  const [showDrawer, setShowDrawer] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Custom Undo / Redo History Stack
  const historyRef = useRef<string[]>([initialContent]);
  const historyIndexRef = useRef<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);

  const previewRef = useRef<HTMLDivElement>(null);

  const formatArrayToString = (val: any) => {
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'string') return val;
    return '';
  };

  const parseCommaList = (text: string): string[] => {
    return text
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Sync props when changing posts
  useEffect(() => {
    setContent(initialContent);
    const m = frontMatter || { title: 'Untitled Post', tags: [], categories: [] };
    setMeta(m);
    setTagInput(formatArrayToString(m.tags));
    setCategoryInput(formatArrayToString(m.categories));
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            handleContentChange(text);
          }
        };
        reader.readAsText(file);
      }
    }
  };

  return (
    <div
      className="flex flex-col h-[calc(100vh-140px)] bg-white border border-vercel-border rounded-lg overflow-hidden shadow-sm relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleFileDrop}
    >
      {/* File Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-vercel-blue/10 backdrop-blur-xs border-2 border-dashed border-vercel-blue z-50 flex flex-col items-center justify-center text-vercel-blue animate-in fade-in duration-150">
          <Upload className="w-12 h-12 mb-2 animate-bounce" />
          <span className="font-medium text-base">拖放 Markdown (.md) 文件至此直接导入</span>
        </div>
      )}

      {/* Editor Top Bar Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-vercel-neutral border-b border-vercel-border select-none">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={meta.title || ''}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            placeholder="输入文章标题..."
            className="text-base font-semibold bg-transparent text-vercel-black placeholder-gray-400 outline-none w-72 focus:w-96 transition-all"
          />

          <div className="flex items-center gap-1">
            {isDraft && (
              <span className="label-caps text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-mono">
                草稿 DRAFT
              </span>
            )}
            <button
              onClick={() => setShowDrawer(!showDrawer)}
              className={`btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 transition-colors ${
                showDrawer ? 'bg-zinc-200 text-black font-semibold' : ''
              }`}
              title="设置文章属性与 Front-matter"
            >
              <Sliders className="w-3.5 h-3.5" />
              元数据
            </button>
          </div>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-3">
          {/* Undo / Redo buttons */}
          <div className="flex items-center bg-white border border-vercel-border rounded-md p-0.5">
            <button
              onClick={handleUndo}
              disabled={historyIndexRef.current <= 0}
              className="p-1 hover:bg-zinc-100 rounded disabled:opacity-30 transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5 text-gray-700" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndexRef.current >= historyRef.current.length - 1}
              className="p-1 hover:bg-zinc-100 rounded disabled:opacity-30 transition-colors"
              title="重做 (Ctrl+Y)"
            >
              <Redo className="w-3.5 h-3.5 text-gray-700" />
            </button>
          </div>

          {/* Mode Segment Switcher */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-md border border-vercel-border text-xs">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all ${
                viewMode === 'split' ? 'bg-white shadow-2xs font-medium text-black' : 'text-gray-500'
              }`}
            >
              <Columns className="w-3.5 h-3.5" /> 双栏分屏
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all ${
                viewMode === 'source' ? 'bg-white shadow-2xs font-medium text-black' : 'text-gray-500'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> 纯源码
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all ${
                viewMode === 'preview' ? 'bg-white shadow-2xs font-medium text-black' : 'text-gray-500'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> 纯预览
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave(content, meta, true)}
              disabled={isSaving}
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-[#171717] text-xs px-3 py-1.5 rounded-[6px] font-medium transition-colors flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-600" /> 存为草稿
            </button>
            <button
              onClick={() => onSave(content, meta, false)}
              disabled={isSaving}
              className="bg-[#171717] hover:bg-black text-white text-xs px-4 py-1.5 rounded-[6px] font-medium shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              {isSaving ? '保存中...' : '发布文章'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Markdown Source Code Editor */}
        {(viewMode === 'split' || viewMode === 'source') && (
          <div className={`h-full flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-vercel-border' : 'w-full'}`}>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="开始编写 Markdown 内容..."
              className="w-full h-full p-4 font-mono text-xs text-vercel-black bg-white outline-none resize-none leading-relaxed select-text"
              spellCheck={false}
            />
          </div>
        )}

        {/* Right Live Preview Area */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div
            ref={previewRef}
            className={`h-full overflow-y-auto p-6 bg-white markdown-body ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}

        {/* Front-Matter Drawer Side Overlay */}
        {showDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-vercel-border shadow-xl z-20 p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-vercel-border pb-3">
                <span className="font-semibold text-sm text-vercel-black flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-vercel-blue" />
                  Front-matter 元数据
                </span>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="text-gray-400 hover:text-black p-1 rounded"
                >
                  ✕
                </button>
              </div>

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
                  value={tagInput}
                  onChange={(e) => {
                    const text = e.target.value;
                    setTagInput(text);
                    setMeta((prev) => ({
                      ...prev,
                      tags: parseCommaList(text),
                    }));
                  }}
                  placeholder="前端, React, Vite"
                  className="w-full bg-white border border-vercel-border rounded px-2.5 py-1.5 outline-none focus:border-vercel-blue font-sans text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700">分类 (categories, 逗号分隔)</label>
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => {
                    const text = e.target.value;
                    setCategoryInput(text);
                    setMeta((prev) => ({
                      ...prev,
                      categories: parseCommaList(text),
                    }));
                  }}
                  placeholder="技术分类, 前端干货"
                  className="w-full bg-white border border-vercel-border rounded px-2.5 py-1.5 outline-none focus:border-vercel-blue font-sans text-xs"
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
