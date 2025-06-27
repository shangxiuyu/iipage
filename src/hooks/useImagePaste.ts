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
  if (!url || typeof url !== 'string') return false;
  
  if (url.length > 2000) {
    console.log('🖼️ URL过长，跳过图片检测');
    return false;
  }
  
  const hasImageExt = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(url);
  if (!hasImageExt) return false;
  
  try {
    return /^(https?:\/\/)[^\s]{1,1990}\.(png|jpe?g|gif|webp|bmp|svg)(\?[^\s]{0,200})?(#[^\s]{0,100})?$/i.test(url);
  } catch (error) {
    console.warn('⚠️ 图片URL检测出错:', error);
    return false;
  }
}

export function useImagePaste({ onInsertImage, uploadImage, editorRef }: UseImagePasteOptions) {
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

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
            if (str && str.length > 50 && str.length < 2000 && isImageUrl(str)) {
              e.preventDefault();
              onInsertImage({ url: str, status: 'done' });
            }
          });
        }
      }
    };

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

    const handleFile = (file: File) => {
      const localUrl = URL.createObjectURL(file);
      onInsertImage({ url: localUrl, status: 'loading', file });
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (uploadImage) {
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