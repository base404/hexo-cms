import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Save, Bold, Italic, List, ListOrdered, Code, Sliders } from 'lucide-react';

interface TipTapEditorProps {
  content: string;
  frontMatter?: Record<string, any>;
  onSave: (htmlContent: string, frontMatter: Record<string, any>) => void;
  isSaving?: boolean;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content: initialContent,
  frontMatter,
  onSave,
  isSaving = false,
}) => {
  const [meta, setMeta] = useState<Record<string, any>>(frontMatter || { title: 'Untitled Post', tags: [] });
  const [tagInput, setTagInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [availableCategories, setAvailableCategories] = useState<{ name: string; count: number }[]>([]);
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);

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

  useEffect(() => {
    const m = frontMatter || { title: 'Untitled Post', tags: [], categories: [] };
    setMeta(m);
    setTagInput(formatArrayToString(m.tags));
    setCategoryInput(formatArrayToString(m.categories));

    fetch('/api/taxonomy')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAvailableCategories(data.categories || []);
          setAvailableTags(data.tags || []);
        }
      })
      .catch(() => {});
  }, [frontMatter]);

  const toggleTagItem = (tagName: string) => {
    const currentTags = parseCommaList(tagInput);
    let nextTags: string[];
    if (currentTags.includes(tagName)) {
      nextTags = currentTags.filter((t) => t !== tagName);
    } else {
      nextTags = [...currentTags, tagName];
    }
    const nextText = nextTags.join(', ');
    setTagInput(nextText);
    setMeta((prev) => ({ ...prev, tags: nextTags }));
  };

  const toggleCategoryItem = (catName: string) => {
    const currentCats = parseCommaList(categoryInput);
    let nextCats: string[];
    if (currentCats.includes(catName)) {
      nextCats = currentCats.filter((c) => c !== catName);
    } else {
      nextCats = [...currentCats, catName];
    }
    const nextText = nextCats.join(', ');
    setCategoryInput(nextText);
    setMeta((prev) => ({ ...prev, categories: nextCats }));
  };

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose focus:outline-none max-w-none min-h-[400px] p-6 text-sm font-sans leading-relaxed',
      },
    },
  });

  const handleSave = () => {
    if (editor) {
      const html = editor.getHTML();
      onSave(html, meta);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-vercel-border rounded-lg bg-white overflow-hidden shadow-sm flex flex-col h-[calc(100vh-140px)]">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-vercel-neutral border-b border-vercel-border">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={meta.title || ''}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            placeholder="文章标题..."
            className="text-base font-semibold bg-transparent text-vercel-black placeholder-gray-400 outline-none w-72 focus:w-96 transition-all"
          />

          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className={`btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 transition-colors ${
              showDrawer ? 'bg-zinc-200 text-black font-semibold' : ''
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            元数据
          </button>
        </div>

        {/* Rich Text Toolbar Options */}
        <div className="flex items-center gap-1 bg-white border border-vercel-border rounded-md p-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-zinc-100 ${editor.isActive('bold') ? 'bg-zinc-200 text-black font-bold' : 'text-gray-600'}`}
            title="加粗"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-zinc-100 ${editor.isActive('italic') ? 'bg-zinc-200 text-black italic' : 'text-gray-600'}`}
            title="斜体"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-zinc-100 ${editor.isActive('bulletList') ? 'bg-zinc-200 text-black' : 'text-gray-600'}`}
            title="无序列表"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-zinc-100 ${editor.isActive('orderedList') ? 'bg-zinc-200 text-black' : 'text-gray-600'}`}
            title="有序列表"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded hover:bg-zinc-100 ${editor.isActive('codeBlock') ? 'bg-zinc-200 text-black font-mono' : 'text-gray-600'}`}
            title="代码块"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#171717] hover:bg-black text-white text-xs px-4 py-1.5 rounded-[6px] font-medium shadow-2xs transition-colors flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400" />
          {isSaving ? '保存中...' : '保存文章'}
        </button>
      </div>

      {/* Editor Content & Drawer Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-y-auto bg-white">
          <EditorContent editor={editor} />
        </div>

        {/* Front-Matter Drawer Side Overlay */}
        {showDrawer && (
          <div className="w-80 border-l border-vercel-border bg-vercel-neutral p-4 flex flex-col gap-4 text-xs font-mono overflow-y-auto">
            <h3 className="label-caps text-gray-500">Front-matter 元数据配置</h3>

            <div className="space-y-1">
              <label className="text-gray-500">标签 (Tags)</label>
              <select
                className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-vercel-blue font-sans shadow-2xs"
                onChange={(e) => {
                  if (e.target.value) {
                    toggleTagItem(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">-- 选择已有标签 ({availableTags.length}) --</option>
                {availableTags.map((t) => (
                  <option key={t.name} value={t.name}>
                    #{t.name} ({t.count} 篇)
                  </option>
                ))}
              </select>

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
                placeholder="前端, React"
                className="w-full bg-white border border-vercel-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-vercel-blue font-sans"
              />

              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1.5 max-h-28 overflow-y-auto">
                  {availableTags.map((t) => {
                    const isSelected = parseCommaList(tagInput).includes(t.name);
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => toggleTagItem(t.name)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] border transition-all ${
                          isSelected
                            ? 'bg-[#171717] text-white border-[#171717] font-semibold'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        #{t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-gray-500">分类 (Categories)</label>
              <select
                className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-vercel-blue font-sans shadow-2xs"
                onChange={(e) => {
                  if (e.target.value) {
                    toggleCategoryItem(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">-- 选择已有分类 ({availableCategories.length}) --</option>
                {availableCategories.map((c) => (
                  <option key={c.name} value={c.name}>
                    📁 {c.name} ({c.count} 篇)
                  </option>
                ))}
              </select>

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
                className="w-full bg-white border border-vercel-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-vercel-blue font-sans"
              />

              {availableCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1.5 max-h-28 overflow-y-auto">
                  {availableCategories.map((c) => {
                    const isSelected = parseCommaList(categoryInput).includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => toggleCategoryItem(c.name)}
                        className={`text-[10px] font-sans px-2 py-0.5 rounded-[4px] border transition-all ${
                          isSelected
                            ? 'bg-[#171717] text-white border-[#171717] font-semibold'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        📁 {c.name}
                      </button>
                    );
                  })}
                </div>
              )}
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
