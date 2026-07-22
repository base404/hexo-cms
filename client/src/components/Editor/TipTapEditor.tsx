import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { HexoTagExtension } from './extensions/HexoTagExtension';
import { Bold, Italic, Code, Heading1, Heading2, List, Lock, FileText } from 'lucide-react';

interface TipTapEditorProps {
  content: string;
  frontMatter: Record<string, any>;
  onSave: (content: string, frontMatter: Record<string, any>) => void;
  isSaving?: boolean;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  frontMatter,
  onSave,
  isSaving = false,
}) => {
  const [meta, setMeta] = useState<Record<string, any>>(frontMatter || { title: 'Untitled Post', tags: [] });
  const [showDrawer, setShowDrawer] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '写下你的 Markdown 内容...',
      }),
      HexoTagExtension,
    ],
    content: content,
  });

  if (!editor) {
    return null;
  }

  const handleSave = () => {
    const html = editor.getHTML();
    // Parse out data-hexo-tag elements and revert back to {% %} tag format
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const tagElements = tempDiv.querySelectorAll('span[data-hexo-tag]');
    tagElements.forEach((el) => {
      const raw = el.getAttribute('data-raw-tag');
      if (raw) {
        el.replaceWith(`{% ${raw} %}`);
      }
    });

    onSave(tempDiv.innerText, meta);
  };

  return (
    <div className="flex flex-col h-full geist-card overflow-hidden">
      {/* Top Action Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-vercel-border bg-white">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={meta.title || ''}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            placeholder="文章标题..."
            className="text-xl font-medium tracking-tight bg-transparent border-none outline-none text-vercel-black placeholder-gray-400 w-96"
          />
          <span className="label-caps bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-sm">
            {meta.published !== false ? 'POST' : 'DRAFT'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            Front-matter
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary-pill text-xs px-5 py-1.5"
          >
            {isSaving ? '保存中...' : '保存文章'}
          </button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-vercel-border bg-vercel-neutral text-gray-600 text-xs">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-zinc-200 ${editor.isActive('bold') ? 'bg-zinc-200 text-black' : ''}`}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-zinc-200 ${editor.isActive('italic') ? 'bg-zinc-200 text-black' : ''}`}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded hover:bg-zinc-200 ${editor.isActive('code') ? 'bg-zinc-200 text-black' : ''}`}
        >
          <Code className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-zinc-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded hover:bg-zinc-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-zinc-200 text-black' : ''}`}
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-zinc-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-200 text-black' : ''}`}
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-zinc-200 ${editor.isActive('bulletList') ? 'bg-zinc-200 text-black' : ''}`}
        >
          <List className="w-4 h-4" />
        </button>

        <div className="ml-auto text-xs text-gray-400 flex items-center gap-1 font-mono">
          <Lock className="w-3 h-3 text-emerald-500" />
          Hexo Tag Protection On
        </div>
      </div>

      {/* Editor Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-y-auto px-8 py-4 bg-white">
          <EditorContent editor={editor} />
        </div>

        {/* Front-Matter Drawer Side Overlay */}
        {showDrawer && (
          <div className="w-80 border-l border-vercel-border bg-vercel-neutral p-4 flex flex-col gap-4 text-xs font-mono">
            <h3 className="label-caps text-gray-500">Front-matter 元数据配置</h3>

            <div>
              <label className="block text-gray-500 mb-1">标签 (Tags, 逗号分隔)</label>
              <input
                type="text"
                value={Array.isArray(meta.tags) ? meta.tags.join(', ') : meta.tags || ''}
                onChange={(e) =>
                  setMeta({ ...meta, tags: e.target.value.split(',').map((s) => s.trim()) })
                }
                className="w-full bg-white border border-vercel-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-vercel-blue"
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1">分类 (Categories)</label>
              <input
                type="text"
                value={meta.categories || ''}
                onChange={(e) => setMeta({ ...meta, categories: e.target.value })}
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
