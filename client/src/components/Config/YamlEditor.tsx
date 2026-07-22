import React, { useState } from 'react';
import { Save, CheckCircle, FileCode } from 'lucide-react';

interface YamlEditorProps {
  initialContent: string;
  configName: string;
  onSave: (newYaml: string) => Promise<void>;
}

export const YamlEditor: React.FC<YamlEditorProps> = ({
  initialContent,
  configName,
  onSave,
}) => {
  const [yaml, setYaml] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await onSave(yaml);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      alert(`保存失败: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="geist-card flex flex-col h-[600px] overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-vercel-border bg-white">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-vercel-black" />
          <span className="font-mono text-xs font-medium text-vercel-black">{configName}</span>
          <span className="label-caps text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-sm">
            YAML (保留注释)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {success && (
            <span className="text-xs text-emerald-600 font-mono flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> 保存成功
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary-pill text-xs px-4 py-1.5 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      {/* Editor Main Textarea */}
      <div className="flex-1 bg-zinc-900 p-4 relative font-mono text-xs text-zinc-100 leading-relaxed overflow-auto">
        <textarea
          value={yaml}
          onChange={(e) => setYaml(e.target.value)}
          spellCheck={false}
          className="w-full h-full bg-transparent text-zinc-100 outline-none resize-none font-mono"
        />
      </div>
    </div>
  );
};
