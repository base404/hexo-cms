import React, { useState, useEffect, useRef } from 'react';
import { ImageUploadInput } from '../Common/ImageUploadInput';
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
  Check,
  Plus,
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
  const [availableCategories, setAvailableCategories] = useState<{ name: string; count: number }[]>([]);
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([]);

  // State for inline creation of new tag / category
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagVal, setNewTagVal] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatVal, setNewCatVal] = useState('');

  const [viewMode, setViewMode] = useState<'split' | 'source' | 'preview'>('split');
  const [showDrawer, setShowDrawer] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Custom Undo / Redo History Stack
  const historyRef = useRef<string[]>([initialContent]);
  const historyIndexRef = useRef<number>(0);
  const isUndoRedoAction = useRef<boolean>(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollingSourceRef = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeoutRef = useRef<any>(null);

  const resetScrollingSource = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      scrollingSourceRef.current = null;
    }, 150);
  };

  const handleEditorScroll = () => {
    if (viewMode !== 'split') return;
    if (scrollingSourceRef.current === 'preview') return;

    scrollingSourceRef.current = 'editor';
    const editor = editorRef.current;
    const preview = previewRef.current;

    if (editor && preview) {
      const editorScrollable = editor.scrollHeight - editor.clientHeight;
      if (editorScrollable > 0) {
        const percentage = editor.scrollTop / editorScrollable;
        const previewScrollable = preview.scrollHeight - preview.clientHeight;
        preview.scrollTop = percentage * previewScrollable;
      }
    }
    resetScrollingSource();
  };

  const handlePreviewScroll = () => {
    if (viewMode !== 'split') return;
    if (scrollingSourceRef.current === 'editor') return;

    scrollingSourceRef.current = 'preview';
    const editor = editorRef.current;
    const preview = previewRef.current;

    if (editor && preview) {
      const previewScrollable = preview.scrollHeight - preview.clientHeight;
      if (previewScrollable > 0) {
        const percentage = preview.scrollTop / previewScrollable;
        const editorScrollable = editor.scrollHeight - editor.clientHeight;
        editor.scrollTop = percentage * editorScrollable;
      }
    }
    resetScrollingSource();
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const formatDateForInput = (dStr?: string) => {
    if (!dStr) return new Date().toISOString().slice(0, 16);
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return new Date().toISOString().slice(0, 16);
    }
  };

  // Sync props when changing posts & fetch taxonomy list
  useEffect(() => {
    setContent(initialContent);
    const m = frontMatter || { title: 'Untitled Post', tags: [], categories: [] };
    const catsArr = Array.isArray(m.categories) ? m.categories : m.categories ? [m.categories] : [];
    const tagsArr = Array.isArray(m.tags) ? m.tags : m.tags ? [m.tags] : [];

    setMeta({
      ...m,
      categories: catsArr,
      tags: tagsArr,
    });
    historyRef.current = [initialContent];
    historyIndexRef.current = 0;

    fetchTaxonomies();
  }, [initialContent, frontMatter]);

  const fetchTaxonomies = () => {
    fetch('/api/taxonomy')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAvailableCategories(data.categories || []);
          setAvailableTags(data.tags || []);
        }
      })
      .catch(() => {});
  };

  const toggleTagItem = (tagName: string) => {
    const currentTags: string[] = Array.isArray(meta.tags) ? meta.tags : [];
    let nextTags: string[];
    if (currentTags.includes(tagName)) {
      nextTags = currentTags.filter((t) => t !== tagName);
    } else {
      nextTags = [...currentTags, tagName];
    }
    setMeta((prev) => ({ ...prev, tags: nextTags }));
  };

  const toggleCategoryItem = (catName: string) => {
    const currentCats: string[] = Array.isArray(meta.categories) ? meta.categories : [];
    let nextCats: string[];
    if (currentCats.includes(catName)) {
      nextCats = currentCats.filter((c) => c !== catName);
    } else {
      nextCats = [...currentCats, catName];
    }
    setMeta((prev) => ({ ...prev, categories: nextCats }));
  };

  const handleAddNewTag = () => {
    const trimmed = newTagVal.trim();
    if (!trimmed) return;
    if (!availableTags.some((t) => t.name === trimmed)) {
      setAvailableTags((prev) => [...prev, { name: trimmed, count: 0 }]);
    }
    toggleTagItem(trimmed);
    setNewTagVal('');
    setShowNewTagInput(false);

    fetch('/api/taxonomy/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'tag', name: trimmed }),
    }).catch(() => {});
  };

  const handleAddNewCat = () => {
    const trimmed = newCatVal.trim();
    if (!trimmed) return;
    if (!availableCategories.some((c) => c.name === trimmed)) {
      setAvailableCategories((prev) => [...prev, { name: trimmed, count: 0 }]);
    }
    toggleCategoryItem(trimmed);
    setNewCatVal('');
    setShowNewCatInput(false);

    fetch('/api/taxonomy/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'category', name: trimmed }),
    }).catch(() => {});
  };

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

  // Process imported text & extract Front-matter or H1 header title (# XX)
  const processImportedText = (rawText: string, fileName: string) => {
    let cleanText = rawText;
    let extractedTitle = '';
    const extractedMeta: Record<string, any> = {};

    // 1. Parse YAML Front-matter (--- ... ---) if present
    const fmMatch = cleanText.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/);
    if (fmMatch) {
      const yamlStr = fmMatch[1];
      cleanText = cleanText.slice(fmMatch[0].length);

      yamlStr.split('\n').forEach((line) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          let val = line.slice(colonIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key === 'title') {
            extractedTitle = val;
          } else if (key === 'tags' || key === 'categories') {
            if (val.startsWith('[') && val.endsWith(']')) {
              extractedMeta[key] = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
            }
          } else {
            extractedMeta[key] = val;
          }
        }
      });
    }

    // 2. Extract first non-empty line H1 header (# Title) if available
    const lines = cleanText.split('\n');
    let h1Index = -1;
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (trimmedLine.startsWith('# ')) {
        h1Index = i;
        const h1Title = trimmedLine.replace(/^#\s+/, '').trim();
        if (!extractedTitle) {
          extractedTitle = h1Title;
        }
        break;
      }
      if (trimmedLine.length > 0) {
        break;
      }
    }

    // If H1 header was found at the beginning, strip it from content body
    if (h1Index !== -1) {
      lines.splice(h1Index, 1);
      cleanText = lines.join('\n').replace(/^\s*[\r\n]+/, '');
    }

    // 3. Fallback title from file name
    if (!extractedTitle && fileName) {
      extractedTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }

    // Update Meta and Content state
    if (extractedTitle) {
      setMeta((prev) => ({ ...prev, ...extractedMeta, title: extractedTitle }));
    } else if (Object.keys(extractedMeta).length > 0) {
      setMeta((prev) => ({ ...prev, ...extractedMeta }));
    }

    handleContentChange(cleanText);
  };

  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  };

  // Handle Drag and Drop Markdown / Text File Import
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            processImportedText(text, file.name);
          }
        };
        reader.readAsText(file);
      }
    }
  };

  const selectedTags: string[] = Array.isArray(meta.tags) ? meta.tags : [];
  const selectedCats: string[] = Array.isArray(meta.categories) ? meta.categories : [];

  return (
    <div
      className="flex flex-col h-[calc(100vh-140px)] bg-white border border-vercel-border rounded-lg overflow-hidden shadow-sm relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
    >
      {/* File Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-vercel-blue/10 backdrop-blur-xs border-2 border-dashed border-vercel-blue z-50 flex flex-col items-center justify-center text-vercel-blue pointer-events-none transition-all duration-150">
          <Upload className="w-12 h-12 mb-2 animate-bounce" />
          <span className="font-medium text-base">拖放 Markdown (.md) 文件至此直接导入</span>
        </div>
      )}

      {/* Editor Top Bar Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-vercel-neutral border-b border-vercel-border select-none overflow-x-auto gap-3 scrollbar-none">
        <div className="flex items-center gap-3 shrink-0">
          <input
            type="text"
            value={meta.title || ''}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            placeholder="输入文章标题..."
            className="text-base font-semibold bg-transparent text-vercel-black placeholder-gray-400 outline-none w-48 sm:w-72 focus:w-80 transition-all truncate"
          />

          <div className="flex items-center gap-1 shrink-0">
            {isDraft && (
              <span className="label-caps text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-mono whitespace-nowrap">
                草稿 DRAFT
              </span>
            )}
            <button
              onClick={() => setShowDrawer(!showDrawer)}
              className={`btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
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
        <div className="flex items-center gap-3 shrink-0">
          {/* Undo / Redo buttons */}
          <div className="flex items-center bg-white border border-vercel-border rounded-md p-0.5 shrink-0">
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
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-md border border-vercel-border text-xs shrink-0">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all whitespace-nowrap ${
                viewMode === 'split' ? 'bg-white shadow-2xs font-medium text-black' : 'text-gray-500'
              }`}
            >
              <Columns className="w-3.5 h-3.5" /> 双栏分屏
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all whitespace-nowrap ${
                viewMode === 'source' ? 'bg-white shadow-2xs font-medium text-black' : 'text-gray-500'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> 纯源码
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-sm transition-all whitespace-nowrap ${
                viewMode === 'preview' ? 'bg-white shadow-2xs font-medium text-black' : 'text-gray-500'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> 纯预览
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSave(content, meta, true)}
              disabled={isSaving}
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-[#171717] text-xs px-3 py-1.5 rounded-[6px] font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-600" /> 存为草稿
            </button>
            <button
              onClick={() => onSave(content, meta, false)}
              disabled={isSaving}
              className="bg-[#171717] hover:bg-black text-white text-xs px-4 py-1.5 rounded-[6px] font-medium shadow-2xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
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
              ref={editorRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onScroll={handleEditorScroll}
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
            onScroll={handlePreviewScroll}
            className={`h-full overflow-y-auto p-6 bg-white markdown-body ${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            }`}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}

        {/* Front-Matter Drawer Side Overlay */}
        {showDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-vercel-border shadow-xl z-20 p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-5 text-xs">
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
                  className="w-full bg-white border border-vercel-border rounded px-2.5 py-1.5 outline-none focus:border-vercel-blue font-sans text-xs"
                />
              </div>

              {/* Date Component using datetime-local */}
              <div className="space-y-1">
                <label className="font-medium text-gray-700">发布日期 (date)</label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(meta.date)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const formattedDate = val ? new Date(val).toISOString() : new Date().toISOString();
                    setMeta((prev) => ({ ...prev, date: formattedDate }));
                  }}
                  className="w-full bg-white border border-vercel-border rounded px-2.5 py-1.5 outline-none focus:border-vercel-blue font-mono text-xs cursor-pointer"
                />
              </div>

              {/* Cover Image URL */}
              <div className="space-y-1">
                <label className="font-medium text-gray-700">文章封面图 (cover)</label>
                <ImageUploadInput
                  value={meta.cover || meta.image || ''}
                  onChange={(newUrl) => setMeta({ ...meta, cover: newUrl })}
                  placeholder="/images/cover.png 或上传..."
                />
              </div>

              {/* Tags Section with Direct Click Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-gray-700">文章标签 (tags)</label>
                  <span className="text-[10px] text-gray-400 font-mono">点击按钮直选</span>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-[6px] max-h-36 overflow-y-auto">
                  {availableTags.map((t) => {
                    const isSelected = selectedTags.includes(t.name);
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => toggleTagItem(t.name)}
                        className={`text-[11px] font-mono px-2.5 py-1 rounded-[4px] border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#171717] text-white border-[#171717] font-semibold shadow-2xs'
                            : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        <span>#{t.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                    );
                  })}

                  {showNewTagInput ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newTagVal}
                        onChange={(e) => setNewTagVal(e.target.value)}
                        placeholder="新标签名"
                        className="w-20 px-1.5 py-0.5 text-[10px] border border-zinc-300 rounded font-mono outline-none focus:border-vercel-blue bg-white"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNewTag();
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewTag}
                        className="text-[10px] bg-[#171717] text-white px-2 py-0.5 rounded font-mono"
                      >
                        确定
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewTagInput(true)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] border border-dashed border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:border-zinc-500 bg-white"
                    >
                      + 新增标签
                    </button>
                  )}
                </div>
              </div>

              {/* Categories Section with Direct Click Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-gray-700">文章分类 (categories)</label>
                  <span className="text-[10px] text-gray-400 font-mono">点击按钮直选</span>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-[6px] max-h-36 overflow-y-auto">
                  {availableCategories.map((c) => {
                    const isSelected = selectedCats.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => toggleCategoryItem(c.name)}
                        className={`text-[11px] font-sans px-2.5 py-1 rounded-[4px] border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#171717] text-white border-[#171717] font-semibold shadow-2xs'
                            : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        <span>📁 {c.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                    );
                  })}

                  {showNewCatInput ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newCatVal}
                        onChange={(e) => setNewCatVal(e.target.value)}
                        placeholder="新分类名"
                        className="w-20 px-1.5 py-0.5 text-[10px] border border-zinc-300 rounded font-sans outline-none focus:border-vercel-blue bg-white"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNewCat();
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCat}
                        className="text-[10px] bg-[#171717] text-white px-2 py-0.5 rounded font-sans"
                      >
                        确定
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewCatInput(true)}
                      className="text-[10px] font-sans px-2 py-0.5 rounded-[4px] border border-dashed border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:border-zinc-500 bg-white"
                    >
                      + 新增分类
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700">自定义路径 (permalink)</label>
                <input
                  type="text"
                  value={meta.permalink || ''}
                  onChange={(e) => setMeta({ ...meta, permalink: e.target.value })}
                  placeholder="my-custom-post-url"
                  className="w-full bg-white border border-vercel-border rounded px-2.5 py-1.5 outline-none focus:border-vercel-blue font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
