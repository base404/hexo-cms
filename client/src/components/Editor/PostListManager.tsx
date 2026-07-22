import React, { useState, useEffect } from 'react';
import { useToast } from '../Common/ToastContext';
import { Search, Plus, Edit3, Trash2, FileText, Calendar, Tag, RefreshCw, Layers } from 'lucide-react';

export interface PostItem {
  filename: string;
  fullPath: string;
  title: string;
  date: string;
  updated: string;
  tags: string[];
  categories: string[];
  isDraft: boolean;
  content: string;
  frontMatter: Record<string, any>;
  readMtime: number;
}

interface PostListManagerProps {
  onEditPost: (post: PostItem) => void;
  onCreateNewPost: () => void;
}

export const PostListManager: React.FC<PostListManagerProps> = ({
  onEditPost,
  onCreateNewPost,
}) => {
  const { showToast, confirm } = useToast();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'published' | 'draft'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (post: PostItem) => {
    confirm({
      title: '确认删除文章',
      message: `确定要删除文章《${post.title}》（物理文件: ${post.filename}）吗？删除后不可恢复。`,
      confirmText: '确认删除',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/posts/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullPath: post.fullPath }),
          });

          if (res.ok) {
            showToast(`已成功删除文章: ${post.filename}`, 'success', '文章已物理删除');
            fetchPosts();
          } else {
            showToast('删除失败', 'error');
          }
        } catch (e: any) {
          showToast(`删除出错: ${e.message}`, 'error');
        }
      },
    });
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.filename.toLowerCase().includes(search.toLowerCase());

    if (filterType === 'published') return matchesSearch && !post.isDraft;
    if (filterType === 'draft') return matchesSearch && post.isDraft;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight text-vercel-black">文章管理</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            扫描自 <code className="bg-zinc-100 px-1 py-0.5 rounded">source/_posts</code> 与 <code className="bg-zinc-100 px-1 py-0.5 rounded">source/_drafts</code> 目录（共 {posts.length} 篇文章）
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Buttons */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-md border border-zinc-200 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-sm transition-all ${
                filterType === 'all' ? 'bg-white shadow-sm font-semibold text-black' : 'text-gray-500'
              }`}
            >
              全部 ({posts.length})
            </button>
            <button
              onClick={() => setFilterType('published')}
              className={`px-3 py-1 rounded-sm transition-all ${
                filterType === 'published' ? 'bg-white shadow-sm font-semibold text-black' : 'text-gray-500'
              }`}
            >
              已发布 ({posts.filter((p) => !p.isDraft).length})
            </button>
            <button
              onClick={() => setFilterType('draft')}
              className={`px-3 py-1 rounded-sm transition-all ${
                filterType === 'draft' ? 'bg-white shadow-sm font-semibold text-black' : 'text-gray-500'
              }`}
            >
              草稿 ({posts.filter((p) => p.isDraft).length})
            </button>
          </div>

          {/* Search Box with Flex Vertically Centered Search Icon */}
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索文章标题..."
              className="w-full pl-9 pr-3 py-1.5 bg-white geist-card text-xs text-vercel-black placeholder-gray-400 outline-none focus:box-shadow-geist-focus"
            />
          </div>

          <button
            onClick={fetchPosts}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>

          <button
            onClick={onCreateNewPost}
            className="btn-primary-pill flex items-center gap-1.5 text-xs py-1.5"
          >
            <Plus className="w-4 h-4" />
            新建文章
          </button>
        </div>
      </div>

      {/* Article Cards Grid / List */}
      {filteredPosts.length === 0 ? (
        <div className="geist-card p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-sm text-gray-500">暂无符合条件的文章</p>
          <button
            onClick={onCreateNewPost}
            className="btn-primary-pill text-xs px-4 py-1.5"
          >
            + 创建第一篇文章
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.filename}
              className="geist-card p-5 flex flex-col justify-between space-y-4 hover:border-gray-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-vercel-blue shrink-0" />
                    <h3 className="font-medium text-sm text-vercel-black line-clamp-1">
                      {post.title}
                    </h3>
                  </div>

                  {post.isDraft ? (
                    <span className="label-caps text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm font-semibold">
                      草稿 (DRAFT)
                    </span>
                  ) : (
                    <span className="label-caps text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-sm font-semibold">
                      已发布
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-gray-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.date).toLocaleDateString()}
                  </span>
                  <span>文件: {post.filename}</span>
                </div>
              </div>

              {/* Tags & Categories info */}
              <div className="flex items-center justify-between pt-2 border-t border-vercel-border">
                <div className="flex items-center gap-2">
                  {post.tags && post.tags.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-gray-400" />
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="label-caps text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-mono">无标签</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditPost(post)}
                    className="btn-secondary text-xs px-3 py-1 flex items-center gap-1 hover:bg-zinc-100"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-vercel-blue" />
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="安全物理删除文章"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
