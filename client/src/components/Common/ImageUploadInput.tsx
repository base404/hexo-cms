import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  accept?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  placeholder = '输入图片 URL 或点击上传...',
  className = '',
  accept = 'image/*,.ico',
}) => {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target?.result as string;
        if (!fileData) {
          setUploading(false);
          return;
        }

        const res = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData,
            filename: file.name,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            onChange(data.url);
          }
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`relative flex items-center gap-2 ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {/* Input container with thumbnail preview if present */}
      <div className={`relative flex-1 flex items-center bg-white border rounded-[6px] transition-all overflow-hidden ${
        isDragging ? 'border-vercel-blue bg-blue-50/20 ring-2 ring-vercel-blue/20' : 'border-vercel-border focus-within:border-vercel-blue'
      }`}>
        {/* Thumbnail Preview */}
        {value ? (
          <div className="pl-2 pr-1 shrink-0 flex items-center">
            <img
              src={value}
              alt="preview"
              className="w-6 h-6 object-cover rounded border border-zinc-200 bg-zinc-50"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="pl-2.5 text-gray-400 shrink-0">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
        )}

        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-2 py-1.5 outline-none font-mono text-xs text-vercel-black placeholder-gray-400"
        />

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 pr-2 text-gray-400 hover:text-rose-600 transition-colors"
            title="清空路径"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Upload Trigger Button */}
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:bg-zinc-100 disabled:opacity-50"
        title="上传本地文件/图片 (支持拖拽到输入框)"
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-vercel-blue" />
        ) : (
          <Upload className="w-3.5 h-3.5 text-zinc-700" />
        )}
        <span>{uploading ? '上传中...' : '上传图片'}</span>
      </button>
    </div>
  );
};
