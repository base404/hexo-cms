import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Save, Bold, Italic, List, ListOrdered, Code, Sliders, Check, Plus } from 'lucide-react';

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
  const [availableCategories, setAvailableCategories] = useState<{ name: string; count: number }[]>([]);
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);

  // State for inline creation of new tag / category
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagVal, setNewTagVal] = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatVal, setNewCatVal] = useState('');

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

  useEffect(() => {
    const m = frontMatter || { title: 'Untitled Post', tags: [], categories: [] };
    const catsArr = Array.isArray(m.categories) ? m.categories : m.categories ? [m.categories] : [];
    const tagsArr = Array.isArray(m.tags) ? m.tags : m.tags ? [m.tags] : [];

    setMeta({
      ...m,
      categories: catsArr,
      tags: tagsArr,
    });

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

  const selectedTags: string[] = Array.isArray(meta.tags) ? meta.tags : [];
  const selectedCats: string[] = Array.isArray(meta.categories) ? meta.categories : [];

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

            {/* Date Picker using datetime-local */}
            <div className="space-y-1">
              <label className="block text-gray-500 mb-1">发布日期 (date)</label>
              <input
                type="datetime-local"
                value={formatDateForInput(meta.date)}
                onChange={(e) => {
                  const val = e.target.value;
                  const formattedDate = val ? new Date(val).toISOString() : new Date().toISOString();
                  setMeta((prev) => ({ ...prev, date: formattedDate }));
                }}
                className="w-full bg-white border border-vercel-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-vercel-blue font-mono cursor-pointer"
              />
            </div>

            {/* Tags Direct Click Selection */}
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-gray-500">文章标签 (Tags)</label>
                <span className="text-[10px] text-gray-400">点击按钮直选</span>
              </div>

              <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-zinc-200 rounded-[6px] max-h-36 overflow-y-auto">
                {availableTags.map((t) => {
                  const isSelected = selectedTags.includes(t.name);
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => toggleTagItem(t.name)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#171717] text-white border-[#171717] font-semibold shadow-2xs'
                          : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
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
                    className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] border border-dashed border-zinc-300 text-zinc-500 hover:text-zinc-900 bg-white"
                  >
                    + 新增标签
                  </button>
                )}
              </div>
            </div>

            {/* Categories Direct Click Selection */}
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-gray-500">文章分类 (Categories)</label>
                <span className="text-[10px] text-gray-400">点击按钮直选</span>
              </div>

              <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-zinc-200 rounded-[6px] max-h-36 overflow-y-auto">
                {availableCategories.map((c) => {
                  const isSelected = selectedCats.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => toggleCategoryItem(c.name)}
                      className={`text-[10px] font-sans px-2 py-0.5 rounded-[4px] border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#171717] text-white border-[#171717] font-semibold shadow-2xs'
                          : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
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
                    className="text-[10px] font-sans px-2 py-0.5 rounded-[4px] border border-dashed border-zinc-300 text-zinc-500 hover:text-zinc-900 bg-white"
                  >
                    + 新增分类
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
