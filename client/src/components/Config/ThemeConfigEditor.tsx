import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../Common/ToastContext';
import { ImageUploadInput } from '../Common/ImageUploadInput';
import {
  X,
  Save,
  Palette,
  Globe,
  Sliders,
  MessageSquare,
  Code,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Share2,
  Plus,
  Trash2,
  RotateCw,
} from 'lucide-react';

export interface ThemeSchemaField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'color' | 'code' | 'json' | 'array' | 'tags';
  description?: string;
  default?: any;
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  language?: string;
}

export interface ThemeSchemaGroup {
  id: string;
  label: string;
  icon?: string;
  fields: ThemeSchemaField[];
}

export interface ThemeSchema {
  schema_version: string;
  meta?: {
    name?: string;
    display_name?: string;
    description?: string;
    version?: string;
    author?: string;
    homepage?: string;
    preview?: string;
    tags?: string[];
  };
  groups: ThemeSchemaGroup[];
}

interface ThemeConfigEditorProps {
  themeName: string;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  globe: <Globe className="w-4 h-4 text-zinc-700" />,
  palette: <Palette className="w-4 h-4 text-zinc-700" />,
  sliders: <Sliders className="w-4 h-4 text-zinc-700" />,
  'message-square': <MessageSquare className="w-4 h-4 text-zinc-700" />,
  code: <Code className="w-4 h-4 text-zinc-700" />,
  'share-2': <Share2 className="w-4 h-4 text-zinc-700" />,
};

const getValueByPath = (obj: any, pathStr: string) => {
  if (!obj || !pathStr) return undefined;
  const parts = pathStr.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr && typeof curr === 'object' && p in curr) {
      curr = curr[p];
    } else {
      return undefined;
    }
  }
  return curr;
};

const setValueByPath = (obj: any, pathStr: string, value: any): Record<string, any> => {
  const parts = pathStr.split('.');
  const result = { ...obj };
  let curr = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    curr[p] = curr[p] && typeof curr[p] === 'object' ? { ...curr[p] } : {};
    curr = curr[p];
  }
  curr[parts[parts.length - 1]] = value;
  return result;
};

export const ThemeConfigEditor: React.FC<ThemeConfigEditorProps> = ({
  themeName,
  onClose,
}) => {
  const { showToast } = useToast();
  const [schema, setSchema] = useState<ThemeSchema | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [initialData, setInitialData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSchemaAndConfig();
  }, [themeName]);

  const loadSchemaAndConfig = async () => {
    setLoading(true);
    try {
      const [schemaRes, configRes] = await Promise.all([
        fetch(`/api/themes/${themeName}/schema`),
        fetch(`/api/themes/${themeName}/config`),
      ]);

      let schemaData: ThemeSchema | null = null;
      if (schemaRes.ok) {
        const data = await schemaRes.json();
        schemaData = data.schema;
        setSchema(schemaData);
      }

      let configData: Record<string, any> = {};
      if (configRes.ok) {
        const data = await configRes.json();
        configData = data.config || {};
      }

      let merged: Record<string, any> = { ...configData };
      if (schemaData?.groups) {
        schemaData.groups.forEach((g) => {
          g.fields.forEach((f) => {
            if (getValueByPath(merged, f.name) === undefined && f.default !== undefined) {
              merged = setValueByPath(merged, f.name, f.default);
            }
          });
        });
      }

      setFormData(merged);
      setInitialData(merged);
    } catch (e: any) {
      showToast(`加载主题配置失败: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => setValueByPath(prev, fieldName, value));
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleSave = async (shouldRestart = false) => {
    setSaving(true);
    if (shouldRestart) {
      setRestarting(true);
    }
    try {
      const res = await fetch(`/api/themes/${themeName}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: formData }),
      });

      if (res.ok) {
        setInitialData(formData);
        if (!shouldRestart) {
          showToast(
            `主题《${themeName}》配置已更新至 _config.${themeName}.yml`,
            'success',
            '配置保存成功'
          );
        } else {
          showToast('正在重启 Hexo 本地预览服务...', 'info', '服务重启中');
          window.dispatchEvent(
            new CustomEvent('hexo-server-log-chunk', {
              detail: `🔄 [主题配置] 用户保存《${themeName}》配置并触发 Hexo Server 重启...\n`,
            })
          );

          try {
            const restartResponse = await fetch('/api/server/restart', { method: 'POST' });
            if (!restartResponse.body) throw new Error('Response body error');

            const reader = restartResponse.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullOutput = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const text = decoder.decode(value, { stream: true });
              fullOutput += text;
              window.dispatchEvent(
                new CustomEvent('hexo-server-log-chunk', { detail: text })
              );
            }

            const statusRes = await fetch('/api/server/status');
            let updatedStatus: any = null;
            if (statusRes.ok) {
              updatedStatus = await statusRes.json();
            }

            if (
              updatedStatus?.lastError ||
              !updatedStatus?.running ||
              fullOutput.includes('[ERROR]')
            ) {
              const errorDetail =
                updatedStatus?.lastError || '重启异常终止，请在控制台查看详情';
              showToast(`重启失败: ${errorDetail}`, 'error', 'Hexo 服务异常');
            } else {
              showToast(
                '配置保存成功，Hexo 预览服务已成功重启并全局生效！',
                'success',
                '重启完毕'
              );
            }
          } catch (restartErr: any) {
            showToast(`重启失败: ${restartErr.message}`, 'error');
            window.dispatchEvent(
              new CustomEvent('hexo-server-log-chunk', {
                detail: `❌ [ERROR] 重启异常: ${restartErr.message}\n`,
              })
            );
          }
        }
      } else {
        const err = await res.json();
        showToast(`保存失败: ${err.error || '未知错误'}`, 'error');
      }
    } catch (e: any) {
      showToast(`保存异常: ${e.message}`, 'error');
    } finally {
      setSaving(false);
      setRestarting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialData);
    showToast('已重置表单至上次保存状态', 'info');
  };

  const renderFieldInput = (field: ThemeSchemaField) => {
    const val = getValueByPath(formData, field.name);

    switch (field.type) {
      case 'switch':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!!val}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
            <span className="ml-2 text-xs text-zinc-600 font-mono tracking-tight">
              {val ? 'ON' : 'OFF'}
            </span>
          </label>
        );

      case 'select':
        return (
          <select
            value={val !== undefined ? String(val) : ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-[6px] px-3 py-1.5 text-xs outline-none focus:border-[#0070F3] focus:ring-1 focus:ring-[#0070F3] font-mono shadow-2xs transition-colors"
          >
            {field.options?.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            min={field.min}
            max={field.max}
            value={val !== undefined ? val : ''}
            onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
            className="w-full bg-white border border-zinc-200 rounded-[6px] px-3 py-1.5 text-xs outline-none focus:border-[#0070F3] focus:ring-1 focus:ring-[#0070F3] font-mono shadow-2xs transition-colors"
          />
        );

      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={val || '#000000'}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="w-8 h-8 rounded border border-zinc-200 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={val || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder="#000000"
              className="w-28 bg-white border border-zinc-200 rounded-[6px] px-3 py-1.5 text-xs outline-none focus:border-[#0070F3] font-mono shadow-2xs"
            />
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={val || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={3}
            className="w-full bg-white border border-zinc-200 rounded-[6px] px-3 py-2 text-xs outline-none focus:border-[#0070F3] font-mono shadow-2xs resize-y"
          />
        );

      case 'code':
        return (
          <textarea
            value={val || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={4}
            placeholder={`<!-- 输入 ${field.language || 'code'} 代码 -->`}
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-[6px] p-3 text-xs outline-none focus:border-[#0070F3] font-mono shadow-inner resize-y leading-relaxed"
          />
        );

      case 'tags':
      case 'json':
      case 'array': {
        const arr = Array.isArray(val)
          ? val
          : typeof val === 'string'
          ? val.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        const isTagsField = field.type === 'tags' || (field.type === 'array' && arr.length > 0 && typeof arr[0] === 'string');

        if (isTagsField || (field.type === 'tags' && arr.length === 0)) {
          const tagsList: string[] = arr.map(String);
          return (
            <div className="space-y-2 bg-zinc-50/80 p-3 border border-zinc-200 rounded-lg">
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-white border border-zinc-200 rounded-md shadow-2xs">
                {tagsList.length === 0 ? (
                  <span className="text-xs font-mono text-zinc-400 self-center px-1">暂无标签 (输入名称添加)</span>
                ) : (
                  tagsList.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-zinc-100 text-zinc-800 border border-zinc-200 shadow-2xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => {
                          const next = tagsList.filter((_, i) => i !== idx);
                          handleFieldChange(field.name, next);
                        }}
                        className="text-zinc-400 hover:text-red-600 rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id={`input-${field.name}`}
                  placeholder="输入新标签按 Enter 键添加..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const inputEl = e.currentTarget;
                      const v = inputEl.value.trim();
                      if (v && !tagsList.includes(v)) {
                        handleFieldChange(field.name, [...tagsList, v]);
                        inputEl.value = '';
                      }
                    }
                  }}
                  className="flex-1 bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#0070F3] font-mono shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.getElementById(`input-${field.name}`) as HTMLInputElement;
                    if (inputEl) {
                      const v = inputEl.value.trim();
                      if (v && !tagsList.includes(v)) {
                        handleFieldChange(field.name, [...tagsList, v]);
                        inputEl.value = '';
                      }
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-mono bg-zinc-900 hover:bg-black text-white rounded font-medium shadow-2xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-3 bg-zinc-50/80 p-3 border border-zinc-200 rounded-lg">
            {arr.length === 0 && (
              <div className="text-xs font-mono text-zinc-400 text-center py-4 border border-dashed border-zinc-200 rounded-lg bg-white">
                暂无配置项目 (点击下方按钮添加)
              </div>
            )}
            {arr.map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-white border border-zinc-200 rounded-lg space-y-2 relative shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5 mb-1.5">
                  <span className="text-[11px] font-mono font-bold text-zinc-600">项目 #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = arr.filter((_: any, i: number) => i !== idx);
                      handleFieldChange(field.name, next);
                    }}
                    className="text-zinc-400 hover:text-red-600 text-xs flex items-center gap-1 font-mono transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 font-semibold">名称 (name)</label>
                    <input
                      type="text"
                      value={item.name || ''}
                      onChange={(e) => {
                        const next = [...arr];
                        next[idx] = { ...next[idx], name: e.target.value };
                        handleFieldChange(field.name, next);
                      }}
                      placeholder="例如: Hexo 官方文档"
                      className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs outline-none focus:border-[#0070F3] font-mono shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 font-semibold text-[#0070F3]">链接 (url)</label>
                    <input
                      type="text"
                      value={item.url || ''}
                      onChange={(e) => {
                        const next = [...arr];
                        next[idx] = { ...next[idx], url: e.target.value };
                        handleFieldChange(field.name, next);
                      }}
                      placeholder="https://..."
                      className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs outline-none focus:border-[#0070F3] font-mono shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500">头像 (avatar)</label>
                    <ImageUploadInput
                      value={item.avatar || ''}
                      onChange={(newUrl) => {
                        const next = [...arr];
                        next[idx] = { ...next[idx], avatar: newUrl };
                        handleFieldChange(field.name, next);
                      }}
                      placeholder="图片 URL 或上传..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500">描述 (desc)</label>
                    <input
                      type="text"
                      value={item.desc || ''}
                      onChange={(e) => {
                        const next = [...arr];
                        next[idx] = { ...next[idx], desc: e.target.value };
                        handleFieldChange(field.name, next);
                      }}
                      placeholder="简短介绍..."
                      className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs outline-none focus:border-[#0070F3] font-mono shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const next = [...arr, { name: '', url: 'https://', avatar: '', desc: '' }];
                handleFieldChange(field.name, next);
              }}
              className="w-full py-2 border border-dashed border-zinc-300 hover:border-zinc-500 text-zinc-700 hover:text-zinc-900 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition-colors bg-white shadow-2xs font-medium"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-600" />
              添加新项目
            </button>
          </div>
        );
      }

      case 'image':
      case 'text':
      default: {
        const isImageType =
          field.type === 'image' ||
          /avatar|favicon|logo|image|cover|photo|pic|icon/i.test(field.name) ||
          /头像|图标|图片|封面|favicon/i.test(field.label || '');

        if (isImageType) {
          return (
            <ImageUploadInput
              value={val !== undefined ? String(val) : ''}
              onChange={(newUrl) => handleFieldChange(field.name, newUrl)}
              placeholder={field.description || '输入图片 URL 或点击/拖拽上传图片...'}
            />
          );
        }

        return (
          <input
            type="text"
            value={val !== undefined ? val : ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-[6px] px-3 py-1.5 text-xs outline-none focus:border-[#0070F3] focus:ring-1 focus:ring-[#0070F3] font-mono shadow-2xs transition-colors"
          />
        );
      }
    }
  };

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center font-mono font-bold text-sm shadow-2xs">
              {themeName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                {schema?.meta?.display_name || themeName}
                <span className="text-[10px] font-mono font-normal bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-full">
                  v{schema?.meta?.version || '1.0.0'}
                </span>
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                可视化编辑 _config.{themeName}.yml 配置
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-mono text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-[6px] hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置修改
              </button>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={saving || restarting}
              className="px-4 py-1.5 text-xs font-medium bg-[#171717] hover:bg-black text-white rounded-[6px] shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              {saving && !restarting ? '保存中...' : '保存配置'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || restarting}
              className="px-4 py-1.5 text-xs font-medium bg-[#171717] hover:bg-black text-white rounded-[6px] shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="保存配置并自动重启 Hexo 预览服务"
            >
              <RotateCw className={`w-3.5 h-3.5 text-emerald-400 ${restarting ? 'animate-spin' : ''}`} />
              {restarting ? '重启中...' : '保存配置且重启'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-[6px] hover:bg-zinc-100 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-zinc-300 border-t-[#171717] rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-zinc-500">正在读取主题 Schema 与配置文件...</p>
            </div>
          ) : !schema || !schema.groups ? (
            <div className="p-8 text-center bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-2">
              <HelpCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="font-bold text-sm">此主题尚未提供 theme-schema.yaml</h3>
              <p className="text-xs text-amber-700">
                主题未提供可视化规范架构定义文件，无法生成图形配置界面。
              </p>
            </div>
          ) : (
            schema.groups.map((group) => {
              const isCollapsed = !!collapsedGroups[group.id];
              const groupIcon = (group.icon && ICON_MAP[group.icon]) || (
                <Sliders className="w-4 h-4 text-zinc-700" />
              );

              return (
                <div
                  key={group.id}
                  className="bg-white border border-zinc-200 rounded-lg shadow-2xs overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleGroupCollapse(group.id)}
                    className="w-full flex items-center justify-between p-4 bg-zinc-50/80 hover:bg-zinc-100/80 transition-colors border-b border-zinc-100 text-left select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-white border border-zinc-200 rounded-md shadow-2xs">
                        {groupIcon}
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900">{group.label}</h3>
                      <span className="text-[10px] font-mono text-zinc-400">
                        ({group.fields.length} 项)
                      </span>
                    </div>
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                      {group.fields.map((field) => (
                        <div
                          key={field.name}
                          className={`space-y-1.5 ${
                            field.type === 'textarea' || field.type === 'code' ? 'md:col-span-2' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1">
                              {field.label}
                              <span className="text-[10px] font-mono font-normal text-zinc-400">
                                ({field.name})
                              </span>
                            </label>
                          </div>

                          {renderFieldInput(field)}

                          {field.description && (
                            <p className="text-[11px] text-zinc-500 leading-normal">
                              {field.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
