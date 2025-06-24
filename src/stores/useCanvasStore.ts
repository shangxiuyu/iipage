import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type BackgroundMode = 'grid' | 'blank' | 'image' | 'video';
export type InteractiveTheme = string | null;

interface CanvasState {
  // 缩放和平移
  scale: number;
  panX: number;
  panY: number;
  
  // 背景设置
  currentBackground: string;
  showGrid: boolean;
  backgroundMode: BackgroundMode;
  
  // 视频背景
  videoBackgroundMode: boolean;
  videoBackgroundUrl: string | null;
  
  // 图片背景
  imageBackgroundUrl: string | null;
  imageBlurLevel: number;
  
  // 可交互主题
  interactiveTheme: InteractiveTheme;
  
  // 框选相关
  isSelecting: boolean;
  selectionStart: { x: number; y: number } | null;
  selectionEnd: { x: number; y: number } | null;
  
  // 缩放和平移操作
  setScale: (scale: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  
  // 背景操作
  setBackground: (backgroundId: string) => void;
  toggleGrid: () => void;
  setBackgroundMode: (mode: BackgroundMode) => void;
  
  // 视频背景操作
  toggleVideoBackgroundMode: () => void;
  setVideoBackgroundUrl: (url: string | null) => void;
  
  // 图片背景操作
  setImageBackgroundUrl: (url: string | null) => void;
  setImageBlurLevel: (level: number) => void;
  
  // 可交互主题操作
  setInteractiveTheme: (theme: InteractiveTheme) => void;
  
  // 框选操作
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      // 初始状态
      scale: 1,
      panX: 0,
      panY: 0,
      currentBackground: 'default',
      showGrid: true,
      backgroundMode: 'grid',
      videoBackgroundMode: false,
      videoBackgroundUrl: null,
      imageBackgroundUrl: null,
      imageBlurLevel: 5,
      interactiveTheme: null,
      isSelecting: false,
      selectionStart: null,
      selectionEnd: null,

      // 缩放和平移操作
      setScale: (scale) => {
        set({ scale: Math.max(0.1, Math.min(3, scale)) });
      },

      setPan: (x, y) => {
        set({ panX: x, panY: y });
      },

      resetView: () => {
        set({ scale: 1, panX: 0, panY: 0 });
      },

      zoomIn: () => {
        const { scale } = get();
        get().setScale(scale * 1.2);
      },

      zoomOut: () => {
        const { scale } = get();
        get().setScale(scale / 1.2);
      },

      zoomToFit: () => {
        // 这里可以根据节点位置计算合适的缩放级别
        // 暂时重置为默认视图
        get().resetView();
      },

      // 背景操作
      setBackground: (backgroundId) => {
        set({ currentBackground: backgroundId });
      },

      toggleGrid: () => {
        set((state) => ({ showGrid: !state.showGrid }));
      },

      setBackgroundMode: (mode) => {
        set({ backgroundMode: mode });
      },

      // 视频背景操作
      toggleVideoBackgroundMode: () => {
        set((state) => ({ videoBackgroundMode: !state.videoBackgroundMode }));
      },

      setVideoBackgroundUrl: (url) => {
        set({ videoBackgroundUrl: url });
      },

      // 图片背景操作
      setImageBackgroundUrl: (url) => {
        set({ imageBackgroundUrl: url });
      },

      setImageBlurLevel: (level) => {
        set({ imageBlurLevel: Math.max(0, Math.min(20, level)) });
      },

      // 可交互主题操作
      setInteractiveTheme: (theme) => {
        set({ interactiveTheme: theme });
      },

      // 框选操作
      startSelection: (x, y) => {
        set({
          isSelecting: true,
          selectionStart: { x, y },
          selectionEnd: { x, y },
        });
      },

      updateSelection: (x, y) => {
        set({ selectionEnd: { x, y } });
      },

      endSelection: () => {
        set({
          isSelecting: false,
          selectionStart: null,
          selectionEnd: null,
        });
      },
    }),
    {
      name: 'whiteboard-canvas-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        scale: state.scale,
        panX: state.panX,
        panY: state.panY,
        currentBackground: state.currentBackground,
        showGrid: state.showGrid,
        backgroundMode: state.backgroundMode,
        videoBackgroundUrl: state.videoBackgroundUrl,
        imageBackgroundUrl: state.imageBackgroundUrl,
        imageBlurLevel: state.imageBlurLevel,
        interactiveTheme: state.interactiveTheme,
      }),
    }
  )
); 