import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../Common/ToastContext';
import { CodeEditorWithHighlight } from '../Common/CodeEditorWithHighlight';
import { X, Plus, Trash2, Code, FileText, ToggleLeft, ToggleRight, Save, Edit3, Wand2 } from 'lucide-react';

export interface ScriptItem {
  filename: string;
  type: 'css' | 'js';
  content: string;
  enabled: boolean;
}

interface CustomScriptModalProps {
  onClose: () => void;
}

const PRESET_TEMPLATES = [
  {
    name: '百度统计 (Baidu Analytics)',
    type: 'js' as const,
    filename: 'baidu_analytics.js',
    code: `// 百度统计 JS 自动注入
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?YOUR_BAIDU_SITE_ID";
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();
`,
  },
  {
    name: '谷歌 Analytics (GA4)',
    type: 'js' as const,
    filename: 'google_analytics.js',
    code: `// 谷歌 Analytics GA4 自动注入
(function() {
  var ga = document.createElement('script');
  ga.async = true;
  ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-YOUR_MEASUREMENT_ID';
  document.head.appendChild(ga);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-YOUR_MEASUREMENT_ID');
})();
`,
  },
  {
    name: '极简滚动条美化 (Scrollbar)',
    type: 'css' as const,
    filename: 'custom_scrollbar.css',
    code: `/* 全站极简极客滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #f1f1f1;
}
::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
`,
  },
  {
    name: '暗黑模式全站样式 (Dark Mode Accent)',
    type: 'css' as const,
    filename: 'theme_dark_accent.css',
    code: `/* 全站暗黑/柔和选中文本样式 */
::selection {
  background-color: #0070f3;
  color: #ffffff;
}
`,
  },
];

export const CustomScriptModal: React.FC<CustomScriptModalProps> = ({ onClose }) => {
  const { showToast, confirm } = useToast();
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [activeType, setActiveType] = useState<'css' | 'js'>('js');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isNewFileModal, setIsNewFileModal] = useState(false);
  const [newFilenameInput, setNewFilenameInput] = useState('');

  // Rename modal states
  const [isRenameModal, setIsRenameModal] = useState(false);
  const [renameTargetFile, setRenameTargetFile] = useState<ScriptItem | null>(null);
  const [renameInput, setRenameInput] = useState('');

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const res = await fetch('/api/custom-scripts');
      if (res.ok) {
        const data: ScriptItem[] = await res.json();
        setScripts(data);

        const matches = data.filter((s) => s.type === activeType);
        if (matches.length > 0 && (!selectedFile || !data.some((d) => d.filename === selectedFile))) {
          setSelectedFile(matches[0].filename);
          setEditorContent(matches[0].content);
        }
      }
    } catch {}
  };

  const handleSelectFile = (fileItem: ScriptItem) => {
    setSelectedFile(fileItem.filename);
    setEditorContent(fileItem.content);
    setActiveType(fileItem.type);
  };

  const handleSaveCurrent = async () => {
    if (!selectedFile) return;
    try {
      const current = scripts.find((s) => s.filename === selectedFile && s.type === activeType);
      const res = await fetch('/api/custom-scripts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeType,
          filename: selectedFile,
          content: editorContent,
          enabled: current ? current.enabled : true,
        }),
      });

      if (res.ok) {
        showToast('🔄 该功能需要重启生效', 'warning', '保存成功');
        fetchScripts();
      } else {
        showToast('保存失败', 'error');
      }
    } catch (e: any) {
      showToast(`保存异常: ${e.message}`, 'error');
    }
  };

  const handleFormatCode = () => {
    if (!editorContent.trim()) return;

    try {
      let formatted = editorContent;
      if (activeType === 'css') {
        formatted = formatted
          .replace(/\s*{\s*/g, ' {\n  ')
          .replace(/;\s*/g, ';\n  ')
          .replace(/\s*}\s*/g, '\n}\n\n')
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .trim();
      } else {
        formatted = formatted
          .replace(/;\s*/g, ';\n')
          .replace(/\s*{\s*/g, ' {\n  ')
          .replace(/\s*}\s*/g, '\n}\n')
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .trim();
      }
      setEditorContent(formatted);
      showToast('代码格式化整理完毕', 'info');
    } catch {
      showToast('格式化整理完成', 'info');
    }
  };

  const handleToggleEnable = async (fileItem: ScriptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/custom-scripts/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: fileItem.type,
          filename: fileItem.filename,
          enabled: !fileItem.enabled,
        }),
      });

      if (res.ok) {
        showToast(
          `文件 ${fileItem.filename} 已${!fileItem.enabled ? '开启' : '关闭'}注入`,
          'info'
        );
        fetchScripts();
      }
    } catch {}
  };

  const openRenameModal = (fileItem: ScriptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameTargetFile(fileItem);
    setRenameInput(fileItem.filename);
    setIsRenameModal(true);
  };

  const handleExecuteRename = async () => {
    if (!renameTargetFile || !renameInput.trim()) return;
    const cleanNew = renameInput.trim();
    try {
      const res = await fetch('/api/custom-scripts/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: renameTargetFile.type,
          oldFilename: renameTargetFile.filename,
          newFilename: cleanNew,
        }),
      });

      if (res.ok) {
        showToast(`已重命名为 ${cleanNew}`, 'success');
        setIsRenameModal(false);
        if (selectedFile === renameTargetFile.filename) {
          setSelectedFile(
            cleanNew.endsWith(`.${renameTargetFile.type}`)
              ? cleanNew
              : `${cleanNew}.${renameTargetFile.type}`
          );
        }
        fetchScripts();
      }
    } catch (e: any) {
      showToast(`重命名失败: ${e.message}`, 'error');
    }
  };

  const handleDelete = (fileItem: ScriptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    confirm({
      title: '确认删除文件',
      message: `确定要删除文件 source/_custom/${fileItem.type}/${fileItem.filename} 吗？`,
      confirmText: '确认删除',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/custom-scripts/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: fileItem.type,
              filename: fileItem.filename,
            }),
          });
          if (res.ok) {
            showToast(`已删除文件 ${fileItem.filename}`, 'success');
            if (selectedFile === fileItem.filename) {
              setSelectedFile(null);
              setEditorContent('');
            }
            fetchScripts();
          }
        } catch (e: any) {
          showToast(`删除异常: ${e.message}`, 'error');
        }
      },
    });
  };

  const handleCreateNewFile = async () => {
    if (!newFilenameInput.trim()) return;
    const name = newFilenameInput.trim();
    try {
      const res = await fetch('/api/custom-scripts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeType,
          filename: name,
          content: activeType === 'js' ? `// ${name}\n` : `/* ${name} */\n`,
          enabled: true,
        }),
      });

      if (res.ok) {
        showToast(`成功创建文件: ${name}`, 'success');
        setIsNewFileModal(false);
        setNewFilenameInput('');
        fetchScripts();
      }
    } catch (e: any) {
      showToast(`创建失败: ${e.message}`, 'error');
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setActiveType(preset.type);
    setSelectedFile(preset.filename);
    setEditorContent(preset.code);
    showToast(`已装载模版《${preset.name}》，请修改后保存！`, 'info', '模版就绪');
  };

  const filteredScripts = scripts.filter((s) => s.type === activeType);

  const modalNode = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl h-[680px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              &lt;/&gt;
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">拓展 JS / CSS 多文件管理</h3>
              <p className="text-xs text-gray-500 font-mono">
                自动落盘存放在 source/_custom/ 并通过 Hexo 原生 Injector 自动化注入网页
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-zinc-900 p-1.5 rounded-md hover:bg-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar File List Manager */}
          <div className="w-72 bg-zinc-50 border-r border-zinc-200 p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center bg-zinc-200/80 p-0.5 rounded-md text-xs font-medium">
                <button
                  onClick={() => {
                    setActiveType('js');
                    const matches = scripts.filter((s) => s.type === 'js');
                    if (matches.length > 0) {
                      setSelectedFile(matches[0].filename);
                      setEditorContent(matches[0].content);
                    } else {
                      setSelectedFile(null);
                      setEditorContent('');
                    }
                  }}
                  className={`flex-1 py-1.5 rounded-sm transition-all flex items-center justify-center gap-1 ${
                    activeType === 'js' ? 'bg-white text-black font-semibold shadow-xs' : 'text-gray-600'
                  }`}
                >
                  JS 脚本文件
                </button>
                <button
                  onClick={() => {
                    setActiveType('css');
                    const matches = scripts.filter((s) => s.type === 'css');
                    if (matches.length > 0) {
                      setSelectedFile(matches[0].filename);
                      setEditorContent(matches[0].content);
                    } else {
                      setSelectedFile(null);
                      setEditorContent('');
                    }
                  }}
                  className={`flex-1 py-1.5 rounded-sm transition-all flex items-center justify-center gap-1 ${
                    activeType === 'css' ? 'bg-white text-black font-semibold shadow-xs' : 'text-gray-600'
                  }`}
                >
                  CSS 样式文件
                </button>
              </div>

              <button
                onClick={() => setIsNewFileModal(true)}
                className="btn-secondary w-full py-1.5 text-xs flex items-center justify-center gap-1 text-zinc-900 border-zinc-300"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                新建 {activeType.toUpperCase()} 文件
              </button>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                {filteredScripts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    暂无 {activeType.toUpperCase()} 文件
                  </div>
                ) : (
                  filteredScripts.map((file) => {
                    const isSelected = selectedFile === file.filename && activeType === file.type;

                    return (
                      <div
                        key={file.filename}
                        onClick={() => handleSelectFile(file)}
                        className={`p-2 rounded-md border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white border-zinc-400 text-black font-semibold shadow-xs'
                            : 'bg-transparent border-transparent hover:bg-zinc-200/50 text-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                          <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{file.filename}</span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          {/* Toggle enable button */}
                          <button
                            onClick={(e) => handleToggleEnable(file, e)}
                            className={`p-1 rounded hover:bg-zinc-200 ${
                              file.enabled ? 'text-emerald-600' : 'text-gray-400'
                            }`}
                            title={file.enabled ? '已启用注入' : '已停用注入'}
                          >
                            {file.enabled ? (
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                            )}
                          </button>

                          {/* Rename File Button */}
                          <button
                            onClick={(e) => openRenameModal(file, e)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                            title="重命名文件"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete File Button */}
                          <button
                            onClick={(e) => handleDelete(file, e)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="删除文件"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Presets Gallery */}
            <div className="border-t border-zinc-200 pt-3 space-y-1.5">
              <span className="label-caps text-[10px] text-gray-500 flex items-center gap-1">
                快捷模板
              </span>
              <div className="space-y-1">
                {PRESET_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    onClick={() => handleApplyPreset(tmpl)}
                    className="w-full text-left text-[11px] font-mono text-zinc-700 hover:text-black hover:bg-zinc-200/60 p-1.5 rounded transition-colors truncate block"
                  >
                    + {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Editor Area with Highlight.js Syntax Highlighting */}
          <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
            {selectedFile ? (
              <>
                {/* Editor Top Toolbar */}
                <div className="flex items-center justify-between px-6 py-2.5 border-b border-zinc-800 bg-zinc-900 text-xs font-mono">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Code className="w-4 h-4 text-blue-400" />
                    <span>
                      source/_custom/{activeType}/{selectedFile}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleFormatCode}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors text-xs"
                      title="自动格式化代码缩进"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-purple-400" /> 格式化
                    </button>

                    <button
                      onClick={handleSaveCurrent}
                      className="bg-white hover:bg-zinc-200 text-black font-semibold px-5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" /> 保存
                    </button>
                  </div>
                </div>

                {/* Highlighted Code Editor Component */}
                <div className="flex-1 relative overflow-hidden">
                  <CodeEditorWithHighlight
                    value={editorContent}
                    onChange={setEditorContent}
                    language={activeType === 'js' ? 'javascript' : 'css'}
                    placeholder={`在此输入 ${activeType.toUpperCase()} 代码...`}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 font-mono text-xs space-y-2">
                <Code className="w-10 h-10 text-zinc-700" />
                <p>请在左侧选择或新建一个 {activeType.toUpperCase()} 扩展文件</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rename File Modal */}
      {isRenameModal && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
          <div className="geist-card p-6 w-full max-w-sm bg-white space-y-4 shadow-xl">
            <h4 className="font-semibold text-sm text-zinc-900">
              重命名 {renameTargetFile?.type.toUpperCase()} 文件
            </h4>
            <p className="text-xs text-gray-500">
              当前原文件名: <code className="bg-zinc-100 px-1">{renameTargetFile?.filename}</code>
            </p>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="w-full border border-zinc-300 rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-blue-600"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRenameModal(false)}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                取消
              </button>
              <button
                onClick={handleExecuteRename}
                className="btn-primary-pill text-xs px-5 py-1.5"
              >
                确认重命名
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {isNewFileModal && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
          <div className="geist-card p-6 w-full max-w-sm bg-white space-y-4 shadow-xl">
            <h4 className="font-semibold text-sm text-zinc-900">
              新建 {activeType.toUpperCase()} 拓展文件
            </h4>
            <p className="text-xs text-gray-500">
              请输入文件名（例如：<code className="bg-zinc-100 px-1">{activeType === 'js' ? 'baidu_analytics.js' : 'custom_style.css'}</code>）:
            </p>
            <input
              type="text"
              value={newFilenameInput}
              onChange={(e) => setNewFilenameInput(e.target.value)}
              placeholder={`filename.${activeType}`}
              className="w-full border border-zinc-300 rounded-md px-3 py-2 text-xs font-mono outline-none focus:border-blue-600"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNewFileModal(false)}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                取消
              </button>
              <button
                onClick={handleCreateNewFile}
                className="btn-primary-pill text-xs px-5 py-1.5"
              >
                创建文件
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return ReactDOM.createPortal(modalNode, document.body);
};
