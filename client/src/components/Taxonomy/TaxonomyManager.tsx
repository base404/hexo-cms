import React, { useState, useEffect } from 'react';
import { useToast } from '../Common/ToastContext';
import {
  FolderTree,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export interface TaxonomyItem {
  name: string;
  count: number;
}

export const TaxonomyManager: React.FC = () => {
  const { showToast, confirm } = useToast();
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [tags, setTags] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State for Rename / Create
  const [modal, setModal] = useState<{
    show: boolean;
    type: 'category' | 'tag';
    action: 'create' | 'rename';
    targetName: string;
    inputName: string;
  }>({
    show: false,
    type: 'category',
    action: 'create',
    targetName: '',
    inputName: '',
  });

  useEffect(() => {
    fetchTaxonomies();
  }, []);

  const fetchTaxonomies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/taxonomy');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setTags(data.tags || []);
      } else {
        showToast('获取分类与标签失败', 'error');
      }
    } catch (e: any) {
      showToast(`请求异常: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (type: 'category' | 'tag') => {
    setModal({
      show: true,
      type,
      action: 'create',
      targetName: '',
      inputName: '',
    });
  };

  const handleRename = (type: 'category' | 'tag', currentName: string) => {
    setModal({
      show: true,
      type,
      action: 'rename',
      targetName: currentName,
      inputName: currentName,
    });
  };

  const handleModalSubmit = async () => {
    const trimmed = modal.inputName.trim();
    if (!trimmed) {
      showToast('请输入有效的名称', 'warning');
      return;
    }

    if (modal.action === 'rename') {
      try {
        const res = await fetch('/api/taxonomy/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: modal.type,
            oldName: modal.targetName,
            newName: trimmed,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          showToast(
            `已将${modal.type === 'category' ? '分类' : '标签'}《${modal.targetName}》重命名为《${trimmed}》，同步更新了 ${data.updatedFilesCount} 篇文章！`,
            'success',
            '更新成功'
          );
          fetchTaxonomies();
          setModal((prev) => ({ ...prev, show: false }));
        } else {
          showToast('重命名失败', 'error');
        }
      } catch (e: any) {
        showToast(`操作失败: ${e.message}`, 'error');
      }
    } else {
      // Create new tag / category (Local UI update)
      if (modal.type === 'category') {
        if (!categories.some((c) => c.name === trimmed)) {
          setCategories((prev) => [...prev, { name: trimmed, count: 0 }]);
        }
      } else {
        if (!tags.some((t) => t.name === trimmed)) {
          setTags((prev) => [...prev, { name: trimmed, count: 0 }]);
        }
      }
      showToast(`已新建预设${modal.type === 'category' ? '分类' : '标签'}《${trimmed}》！可于编辑器中直接选择。`, 'success');
      setModal((prev) => ({ ...prev, show: false }));
    }
  };

  const handleDelete = (type: 'category' | 'tag', name: string, count: number) => {
    confirm({
      title: `确认删除${type === 'category' ? '分类' : '标签'}`,
      message:
        count > 0
          ? `确定要删除${type === 'category' ? '分类' : '标签'}《${name}》吗？该操作将从 ${count} 篇 Hexo 文章的 Front-matter 中移除该${type === 'category' ? '分类' : '标签'}！`
          : `确定要移除预设${type === 'category' ? '分类' : '标签'}《${name}》吗？`,
      confirmText: '确认删除',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/taxonomy/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, name }),
          });

          if (res.ok) {
            const data = await res.json();
            showToast(
              `已成功删除${type === 'category' ? '分类' : '标签'}《${name}》，同步更新了 ${data.updatedFilesCount} 篇 Hexo 文章！`,
              'success',
              '删除成功'
            );
            fetchTaxonomies();
          } else {
            showToast('删除失败', 'error');
          }
        } catch (e: any) {
          showToast(`删除异常: ${e.message}`, 'error');
        }
      },
    });
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight text-vercel-black">分类与标签管理 (Taxonomy)</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            实时扫描全量文章 Front-matter (共 {categories.length} 个分类 / {tags.length} 个标签)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索分类与标签..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-[6px] text-xs text-vercel-black placeholder-gray-400 outline-none focus:border-[#0070F3] focus:ring-1 focus:ring-[#0070F3]"
            />
          </div>

          <button
            onClick={fetchTaxonomies}
            className="bg-white border border-zinc-200 hover:bg-zinc-50 text-[#171717] rounded-[6px] flex items-center gap-1.5 text-xs py-1.5 px-3 font-medium shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>

          <button
            onClick={() => handleCreate('category')}
            className="bg-[#171717] hover:bg-black text-white rounded-[6px] px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            新建分类
          </button>

          <button
            onClick={() => handleCreate('tag')}
            className="bg-[#171717] hover:bg-black text-white rounded-[6px] px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            新建标签
          </button>
        </div>
      </div>

      {/* Dual Column Cards for Categories & Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories Column */}
        <div className="bg-white border border-zinc-200 rounded-[8px] p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-zinc-700" />
              <h3 className="font-medium text-sm text-[#171717]">文章分类 (Categories)</h3>
            </div>
            <span className="label-caps text-[10px] font-mono bg-zinc-100 px-2 py-0.5 rounded-[4px] text-zinc-600 border border-zinc-200">
              {filteredCategories.length} 项
            </span>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 font-mono">
              暂无分类数据
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 max-h-[500px] overflow-y-auto pr-1">
              {filteredCategories.map((cat) => (
                <div key={cat.name} className="py-2.5 flex items-center justify-between group hover:bg-zinc-50/80 px-2 rounded-[4px] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-[#171717]">{cat.name}</span>
                    <span className="label-caps text-[10px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded-[4px]">
                      {cat.count} 篇文章
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRename('category', cat.name)}
                      className="p-1 text-zinc-500 hover:text-[#171717] hover:bg-zinc-200/60 rounded-[4px]"
                      title="重命名分类 (全量更新文章)"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete('category', cat.name, cat.count)}
                      className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-[4px]"
                      title="删除分类 (从文章移除)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags Column */}
        <div className="bg-white border border-zinc-200 rounded-[8px] p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-zinc-700" />
              <h3 className="font-medium text-sm text-[#171717]">文章标签 (Tags)</h3>
            </div>
            <span className="label-caps text-[10px] font-mono bg-zinc-100 px-2 py-0.5 rounded-[4px] text-zinc-600 border border-zinc-200">
              {filteredTags.length} 项
            </span>
          </div>

          {filteredTags.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400 font-mono">
              暂无标签数据
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredTags.map((tag) => (
                <div
                  key={tag.name}
                  className="bg-zinc-50 border border-zinc-200 rounded-[6px] px-2.5 py-1.5 flex items-center gap-2 text-xs group hover:border-zinc-400 transition-colors"
                >
                  <span className="font-mono text-zinc-700 font-medium">#{tag.name}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">({tag.count})</span>

                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      onClick={() => handleRename('tag', tag.name)}
                      className="p-0.5 text-zinc-400 hover:text-[#171717]"
                      title="重命名标签"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete('tag', tag.name, tag.count)}
                      className="p-0.5 text-zinc-400 hover:text-rose-600"
                      title="删除标签"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog for Rename / Create */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-[8px] p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="font-medium text-base text-[#171717]">
              {modal.action === 'rename'
                ? `重命名${modal.type === 'category' ? '分类' : '标签'}《${modal.targetName}》`
                : `新建${modal.type === 'category' ? '分类' : '标签'}`}
            </h3>

            <p className="text-xs text-zinc-500 font-sans">
              {modal.action === 'rename'
                ? `修改后将自动扫描并重写所有关联文章的 Front-matter。`
                : `创建后将作为预设项显示于编辑器的下拉选择器中。`}
            </p>

            <input
              type="text"
              value={modal.inputName}
              onChange={(e) => setModal((prev) => ({ ...prev, inputName: e.target.value }))}
              placeholder={`输入${modal.type === 'category' ? '分类' : '标签'}名称...`}
              className="w-full bg-white border border-zinc-200 rounded-[6px] px-3 py-2 text-xs outline-none focus:border-[#0070F3] focus:ring-1 focus:ring-[#0070F3] font-sans"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModal((prev) => ({ ...prev, show: false }))}
                className="bg-white border border-zinc-200 hover:bg-zinc-50 text-[#171717] text-xs px-4 py-1.5 rounded-[6px] font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleModalSubmit}
                className="bg-[#171717] hover:bg-black text-white text-xs px-5 py-1.5 rounded-[6px] font-medium shadow-2xs transition-colors"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
