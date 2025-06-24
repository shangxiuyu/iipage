import { useEffect } from 'react';

export interface ImageBlock {
  url: string;
  status: 'loading' | 'done' | 'error';
  file?: File;
  caption?: string;
  width?: number; // %
  height?: number; // px
  aspectRatio?: number;
}

export interface UseImagePasteOptions {
  onInsertImage: (img: ImageBlock) => void;
  uploadImage?: (file: File) => Promise<string>; // 可选：异步上传
  editorRef: React.RefObject<HTMLElement>;
}

function isImageUrl(url: string) {
  return /^(https?:\/\/).+\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
}

export function useImagePaste({ onInsertImage, uploadImage, editorRef }: UseImagePasteOptions) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // 粘贴事件
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
        } else if (item.kind === 'string') {
          item.getAsString((str) => {
            if (isImageUrl(str)) {
              e.preventDefault();
              onInsertImage({ url: str, status: 'done' });
            }
          });
        }
      }
    };

    // 拖拽事件
    const handleDrop = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const files = e.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          handleFile(file);
        }
      }
    };

    // 处理图片文件
    const handleFile = (file: File) => {
      // 先本地预览
      const localUrl = URL.createObjectURL(file);
      onInsertImage({ url: localUrl, status: 'loading', file });
      // 读取为base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (uploadImage) {
          // 可选：异步上传
          uploadImage(file)
            .then((remoteUrl) => {
              onInsertImage({ url: remoteUrl, status: 'done', file });
            })
            .catch(() => {
              onInsertImage({ url: base64, status: 'done', file });
            });
        } else {
          onInsertImage({ url: base64, status: 'done', file });
        }
      };
      reader.readAsDataURL(file);
    };

    editor.addEventListener('paste', handlePaste as any);
    editor.addEventListener('drop', handleDrop as any);
    return () => {
      editor.removeEventListener('paste', handlePaste as any);
      editor.removeEventListener('drop', handleDrop as any);
    };
  }, [editorRef, onInsertImage, uploadImage]);
} 