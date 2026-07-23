import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../Common/ToastContext';
import {
  X,
  Save,
  Palette,
  Globe,
  Sliders,
  MessageSquare,
  Code,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export interface ThemeSchemaField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'color' | 'code';
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
  globe: <Globe className="w-4 h-4 text-blue-500" />,
  palette: <Palette className="w-4 h-4 text-purple-500" />,
  sliders: <Sliders className="w-4 h-4 text-amber-500" />,
  'message-square': <MessageSquare className="w-4 h-4 text-emerald-500" />,
  code: <Code className="w-4 h-4 text-rose-500" />,
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

      // Fill defaults from schema if missing in configData
      const merged: Record<string, any> = { ...configData };
      if (schemaData?.groups) {
        schemaData.groups.forEach((g) => {
          g.fields.forEach((f) => {
            if (merged[f.name] === undefined && f.default !== undefined) {
              merged[f.name] = f.default;
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
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/themes/${themeName}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: formData }),
      });

      if (res.ok) {
        showToast(
          `主题《${themeName}》配置已成功持久化至 _config.${themeName}.yml！`,
          'success',
          '配置保存成功'
        );
        setInitialData(formData);
      } else {
        const err = await res.json();
        showToast(`保存失败: ${err.error || '未知错误'}`, 'error');
      }
    } catch (e: any) {
      showToast(`保存异常: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(initialData);
    showToast('已重置表单至上次保存状态', 'info');
  };

  const renderFieldInput = (field: ThemeSchemaField) => {
    const val = formData[field.name];

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
            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            <span className="ml-2 text-xs text-zinc-600 font-mono">
              {val ? '开启 (ON)' : '关闭 (OFF)'}
            </span>
          </label>
        );

      case 'select':
        return (
          <select
            value={val !== undefined ? String(val) : ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs outline-none focus:border-purple-600 font-mono shadow-2xs"
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
            className="w-full bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs outline-none focus:border-purple-600 font-mono shadow-2xs"
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
              placeholder="#7952b3"
              className="w-32 bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs font-mono outline-none focus:border-purple-600"
            />
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={val || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={3}
            className="w-full bg-white border border-zinc-200 rounded-md p-2.5 text-xs font-sans outline-none focus:border-purple-600 resize-y"
          />
        );

      case 'code':
        return (
          <textarea
            value={val || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={4}
            placeholder={`<!-- 输入 ${field.language || 'HTML/CSS'} 自定义代码 -->`}
            className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-md p-3 text-xs font-mono outline-none focus:border-purple-500 leading-relaxed resize-y"
          />
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            value={val !== undefined ? val : ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.default ? `默认: ${field.default}` : ''}
            className="w-full bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-xs outline-none focus:border-purple-600 font-sans shadow-2xs"
          />
        );
    }
  };

  const displayName = schema?.meta?.display_name || themeName;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl h-[720px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-150">
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-zinc-900">
                  主题可视化配置 ({displayName})
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                  _config.{themeName}.yml
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Hexo Theme Schema 标准驱动 • 无损解耦覆盖机制
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

        {/* Content Body area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-zinc-50/50">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-mono">
              加载 Schema 与配置解析中...
            </div>
          ) : !schema ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                该主题未包含 theme-schema.yaml 标准声明
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                当前主题 <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">{themeName}</code> 暂未声明 Hexo Theme Schema 文件。你仍可通过系统配置页面编辑 <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">_config.{themeName}.yml</code>。
              </p>
            </div>
          ) : (
            schema.groups.map((group) => {
              const isCollapsed = collapsedGroups[group.id];
              const groupIcon = ICON_MAP[group.icon || ''] || <Sliders className="w-4 h-4 text-purple-500" />;

              return (
                <div key={group.id} className="geist-card p-5 bg-white border border-zinc-200 space-y-4">
                  {/* Group Header */}
                  <div
                    onClick={() => toggleGroupCollapse(group.id)}
                    className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-zinc-100"
                  >
                    <div className="flex items-center gap-2">
                      {groupIcon}
                      <h4 className="font-semibold text-sm text-zinc-900">{group.label}</h4>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        ({group.fields.length} 项配置)
                      </span>
                    </div>

                    <button className="text-zinc-400 hover:text-zinc-700">
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Group Fields Container */}
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                      {group.fields.map((field) => {
                        const isFullWidth = field.type === 'textarea' || field.type === 'code';

                        return (
                          <div
                            key={field.name}
                            className={`space-y-1.5 text-xs ${isFullWidth ? 'md:col-span-2' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <label className="font-medium text-zinc-800 flex items-center gap-1.5">
                                <span>{field.label}</span>
                                <code className="text-[10px] text-zinc-400 font-mono font-normal">
                                  ({field.name})
                                </code>
                              </label>
                            </div>

                            {field.description && (
                              <p className="text-[11px] text-zinc-500">{field.description}</p>
                            )}

                            <div>{renderFieldInput(field)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Toolbar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 bg-white">
          <span className="text-xs text-zinc-500 font-mono">
            读取路径: <code className="bg-zinc-100 px-1 py-0.5 rounded">themes/{themeName}/theme-schema.yaml</code>
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={loading || saving}
              className="btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1 text-zinc-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>

            <button
              onClick={onClose}
              className="btn-secondary text-xs px-4 py-1.5"
            >
              取消
            </button>

            <button
              onClick={handleSave}
              disabled={loading || saving || !schema}
              className="btn-primary-pill text-xs px-5 py-1.5 flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              {saving ? '正在保存...' : '保存主题配置'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
