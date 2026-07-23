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
  globe: <Globe className="w-4 h-4 text-zinc-700" />,
  palette: <Palette className="w-4 h-4 text-zinc-700" />,
  sliders: <Sliders className="w-4 h-4 text-zinc-700" />,
  'message-square': <MessageSquare className="w-4 h-4 text-zinc-700" />,
  code: <Code className="w-4 h-4 text-zinc-700" />,
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
          `主题《${themeName}》配置已更新至 _config.${themeName}.yml`,
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
              className="w-8 h-8 rounded-[4px] border border-zinc-200 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={val || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder="#000000"
              className="w-32 bg-white border border-zinc-200 rounded-[6px] px-3 py-1.5 text-xs font-mono outline-none focus:border-[#0070F3] focus:ring-1 focus:ring-[#0070F3] transition-colors"
            />
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={val || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={3}
            className="w-full bg-white border border-zinc-200 rounded-[6px] p-2.5 text-xs font-sans outline-none focus:border-[#0070F3] focus:ring-1 focus:ring-[#0070F3] resize-y transition-colors"
          />
        );

      case 'code':
        return (
          <textarea
            value={val || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={4}
            placeholder={`<!-- ${field.language || 'HTML/CSS'} 自定义代码 -->`}
            className="w-full bg-[#171717] text-zinc-100 border border-zinc-800 rounded-[6px] p-3 text-xs font-mono outline-none focus:border-[#0070F3] focus:ring-1 focus:ring-[#0070F3] leading-relaxed resize-y"
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
            className="w-full bg-white border border-zinc-200 rounded-[6px] px-3 py-1.5 text-xs outline-none focus:border-[#0070F3] focus:ring-1 focus:ring-[#0070F3] font-sans shadow-2xs transition-colors"
          />
        );
    }
  };

  const displayName = schema?.meta?.display_name || themeName;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-6 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl h-[720px] bg-white rounded-[8px] shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
        {/* Header Bar - Geist Minimalist */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-[#FAFAFA]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[#171717] text-white flex items-center justify-center text-sm font-medium">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-base text-[#171717] tracking-tight">
                  主题可视化配置 ({displayName})
                </h3>
                <span className="label-caps text-[10px] font-mono font-medium px-2 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-[4px]">
                  _config.{themeName}.yml
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 font-sans">
                Hexo Theme Schema 标准驱动 • Geist / Vercel 设计规范
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-[#171717] p-1.5 rounded-[6px] hover:bg-zinc-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - White & Neutral Canvas */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#FAFAFA]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-mono">
              加载 Schema 与配置解析中...
            </div>
          ) : !schema ? (
            <div className="bg-zinc-100 border border-zinc-300 text-zinc-800 p-6 rounded-[6px] space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm text-[#171717]">
                <HelpCircle className="w-4 h-4 text-zinc-600" />
                该主题未包含 theme-schema.yaml 标准声明
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed font-sans">
                当前主题 <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-zinc-200">{themeName}</code> 暂未声明 Hexo Theme Schema 文件。你仍可通过系统配置页面编辑 <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-zinc-200">_config.{themeName}.yml</code>。
              </p>
            </div>
          ) : (
            schema.groups.map((group) => {
              const isCollapsed = collapsedGroups[group.id];
              const groupIcon = ICON_MAP[group.icon || ''] || <Sliders className="w-4 h-4 text-zinc-700" />;

              return (
                <div key={group.id} className="bg-white border border-zinc-200 rounded-[6px] p-5 space-y-4 shadow-2xs">
                  {/* Group Header */}
                  <div
                    onClick={() => toggleGroupCollapse(group.id)}
                    className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-zinc-100"
                  >
                    <div className="flex items-center gap-2">
                      {groupIcon}
                      <h4 className="font-medium text-sm text-[#171717] tracking-tight">{group.label}</h4>
                      <span className="label-caps text-[10px] text-zinc-400 font-mono">
                        ({group.fields.length} 项)
                      </span>
                    </div>

                    <button className="text-zinc-400 hover:text-[#171717]">
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Group Fields */}
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
                              <p className="text-[11px] text-zinc-500 font-sans leading-normal">{field.description}</p>
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

        {/* Footer Toolbar - Clean Action Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 bg-white">
          <span className="text-xs text-zinc-500 font-mono">
            读取路径: <code className="bg-zinc-100 px-1.5 py-0.5 rounded-[4px] border border-zinc-200 text-zinc-700">themes/{themeName}/theme-schema.yaml</code>
          </span>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReset}
              disabled={loading || saving}
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-[#171717] text-xs px-3.5 py-1.5 rounded-[6px] font-medium transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
              重置
            </button>

            <button
              onClick={onClose}
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-[#171717] text-xs px-4 py-1.5 rounded-[6px] font-medium transition-colors"
            >
              取消
            </button>

            <button
              onClick={handleSave}
              disabled={loading || saving || !schema}
              className="bg-[#171717] hover:bg-black text-white text-xs px-5 py-1.5 rounded-[6px] font-medium shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? '正在保存...' : '保存主题配置'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
