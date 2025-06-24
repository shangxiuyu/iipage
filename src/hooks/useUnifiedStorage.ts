/**
 * 统一存储钩子 - 集成Zustand状态管理和IndexedDB持久化
 * 彻底解决双重持久化冲突问题
 */

import { useEffect, useCallback } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { unifiedStorageService, type UnifiedBoardData, type BoardMetadata } from '../services/unifiedStorageService';

export interface UseUnifiedStorageReturn {
  // 白板管理
  loadBoard: (boardId: string) => Promise<boolean>;
  saveCurrentBoard: () => Promise<boolean>;
  saveCurrentBoardImmediately: () => Promise<boolean>;
  deleteBoard: (boardId: string) => Promise<boolean>;
  getAllBoards: () => Promise<BoardMetadata[]>;
  
  // 状态管理
  getCurrentBoardId: () => string | null;
  setCurrentBoard: (boardId: string) => void;
  
  // 工具函数
  createNewBoard: (title?: string) => Promise<string | null>;
  duplicateBoard: (boardId: string) => Promise<string | null>;
  
  // 统计信息
  getStorageStats: () => Promise<{ boardCount: number; totalSize: number; lastUpdated: Date | null }>;
  
  // 维护工具
  clearAllData: () => Promise<boolean>;
}

let autoSaveTimer: number | null = null;
const AUTO_SAVE_DELAY = 1000; // 1秒自动保存

export function useUnifiedStorage(): UseUnifiedStorageReturn {
  // 获取Zustand状态
  const {
    nodes,
    connections,
    currentBackground,
    showGrid,
    backgroundMode,
    videoBackgroundUrl,
    imageBackgroundUrl,
    imageBlurLevel,
    builtinBackgroundPath,
    interactiveTheme,
    scale,
    panX,
    panY,
    defaultCardConfig,
    loadBoard: loadBoardToZustand,
    clearBoard,
    setBuiltinBackgroundPath
  } = useBoardStore();

  // 自动保存机制 - 监听状态变化
  useEffect(() => {
    const currentBoardId = unifiedStorageService.getCurrentBoardId();
    if (!currentBoardId) return;

    // 清除之前的计时器
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // 设置新的防抖计时器
    autoSaveTimer = window.setTimeout(async () => {
      await saveCurrentBoard();
      console.log('🔄 自动保存触发');
    }, AUTO_SAVE_DELAY);

    // 清理函数
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [nodes, connections, currentBackground, showGrid, backgroundMode, 
      videoBackgroundUrl, imageBackgroundUrl, imageBlurLevel, builtinBackgroundPath,
      interactiveTheme, scale, panX, panY, defaultCardConfig]);

  // 获取当前白板数据
  const getCurrentBoardData = useCallback((): Partial<UnifiedBoardData> => {
    const currentBoardId = unifiedStorageService.getCurrentBoardId();
    if (!currentBoardId) return {};

    return {
      id: currentBoardId,
      nodes,
      connections,
      currentBackground,
      showGrid,
      backgroundMode,
      videoBackgroundUrl,
      imageBackgroundUrl,
      imageBlurLevel,
      builtinBackgroundPath,
      interactiveTheme,
      scale,
      panX,
      panY,
      defaultCardConfig,
      updatedAt: new Date()
    };
  }, [nodes, connections, currentBackground, showGrid, backgroundMode, 
      videoBackgroundUrl, imageBackgroundUrl, imageBlurLevel, builtinBackgroundPath,
      interactiveTheme, scale, panX, panY, defaultCardConfig]);

  // 加载白板
  const loadBoard = useCallback(async (boardId: string): Promise<boolean> => {
    try {
      console.log(`📋 开始加载白板: ${boardId}`);
      
      // 在切换前保存当前白板（如果有）
      const currentBoardId = unifiedStorageService.getCurrentBoardId();
      if (currentBoardId && currentBoardId !== boardId) {
        await saveCurrentBoardImmediately();
      }
      
      const boardData = await unifiedStorageService.loadBoard(boardId);
      if (!boardData) {
        console.warn(`❌ 白板不存在: ${boardId}`);
        return false;
      }
      
      // 更新当前白板ID
      unifiedStorageService.setCurrentBoard(boardId);
      
      // 加载数据到Zustand
      loadBoardToZustand({
        nodes: boardData.nodes,
        connections: boardData.connections,
        currentBackground: boardData.currentBackground,
        showGrid: boardData.showGrid,
        backgroundMode: boardData.backgroundMode,
        videoBackgroundUrl: boardData.videoBackgroundUrl,
        imageBackgroundUrl: boardData.imageBackgroundUrl,
        imageBlurLevel: boardData.imageBlurLevel,
        interactiveTheme: boardData.interactiveTheme,
        scale: boardData.scale,
        panX: boardData.panX,
        panY: boardData.panY,
        defaultCardConfig: boardData.defaultCardConfig
      });
      
      // 单独设置内置背景路径
      if (boardData.builtinBackgroundPath) {
        setBuiltinBackgroundPath(boardData.builtinBackgroundPath);
      }
      
      console.log(`✅ 白板加载成功: ${boardData.title}`);
      return true;
    } catch (error) {
      console.error(`❌ 加载白板失败: ${boardId}`, error);
      return false;
    }
  }, [loadBoardToZustand, setBuiltinBackgroundPath]);

  // 保存当前白板（防抖）
  const saveCurrentBoard = useCallback(async (): Promise<boolean> => {
    const boardData = getCurrentBoardData();
    if (!boardData.id) {
      console.warn('⚠️ 没有当前白板，跳过保存');
      return false;
    }
    
    try {
      const success = await unifiedStorageService.saveBoard(boardData);
      if (success) {
        console.log(`💾 白板已保存: ${boardData.id} (防抖)`);
      }
      return success;
    } catch (error) {
      console.error('❌ 保存白板失败:', error);
      return false;
    }
  }, [getCurrentBoardData]);

  // 立即保存当前白板（无防抖）
  const saveCurrentBoardImmediately = useCallback(async (): Promise<boolean> => {
    const boardData = getCurrentBoardData();
    if (!boardData.id) {
      console.warn('⚠️ 没有当前白板，跳过立即保存');
      return false;
    }
    
    try {
      const success = await unifiedStorageService.saveBoardImmediately(boardData);
      if (success) {
        console.log(`💾 白板已立即保存: ${boardData.id}`);
      }
      return success;
    } catch (error) {
      console.error('❌ 立即保存白板失败:', error);
      return false;
    }
  }, [getCurrentBoardData]);

  // 删除白板
  const deleteBoard = useCallback(async (boardId: string): Promise<boolean> => {
    try {
      const success = await unifiedStorageService.deleteBoard(boardId);
      if (success) {
        console.log(`🗑️ 白板已删除: ${boardId}`);
        
        // 如果删除的是当前白板，清空Zustand状态
        if (unifiedStorageService.getCurrentBoardId() === boardId) {
          clearBoard();
        }
      }
      return success;
    } catch (error) {
      console.error(`❌ 删除白板失败: ${boardId}`, error);
      return false;
    }
  }, [clearBoard]);

  // 获取所有白板
  const getAllBoards = useCallback(async (): Promise<BoardMetadata[]> => {
    try {
      return await unifiedStorageService.getAllBoards();
    } catch (error) {
      console.error('❌ 获取白板列表失败:', error);
      return [];
    }
  }, []);

  // 创建新白板
  const createNewBoard = useCallback(async (title = '新建白板'): Promise<string | null> => {
    try {
      const boardId = `board-${Date.now()}`;
      const newBoardData: Partial<UnifiedBoardData> = {
        id: boardId,
        title,
        icon: '1F4C4.png',
        isPinned: false,
        nodes: [],
        connections: [],
        currentBackground: 'default',
        showGrid: true,
        backgroundMode: 'grid',
        videoBackgroundUrl: null,
        imageBackgroundUrl: null,
        imageBlurLevel: 0,
        builtinBackgroundPath: null,
        interactiveTheme: null,
        scale: 1,
        panX: 0,
        panY: 0,
        defaultCardConfig: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
      
      const success = await unifiedStorageService.saveBoardImmediately(newBoardData);
      if (success) {
        console.log(`✅ 新白板已创建: ${title} (${boardId})`);
        return boardId;
      } else {
        console.error(`❌ 创建白板失败: ${title}`);
        return null;
      }
    } catch (error) {
      console.error('❌ 创建白板失败:', error);
      return null;
    }
  }, []);

  // 复制白板
  const duplicateBoard = useCallback(async (boardId: string): Promise<string | null> => {
    try {
      const originalBoard = await unifiedStorageService.loadBoard(boardId);
      if (!originalBoard) {
        console.error(`❌ 原白板不存在: ${boardId}`);
        return null;
      }
      
      const newBoardId = `board-${Date.now()}`;
      const duplicatedBoard: Partial<UnifiedBoardData> = {
        ...originalBoard,
        id: newBoardId,
        title: `${originalBoard.title} (副本)`,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
      
      const success = await unifiedStorageService.saveBoardImmediately(duplicatedBoard);
      if (success) {
        console.log(`✅ 白板已复制: ${originalBoard.title} -> ${duplicatedBoard.title}`);
        return newBoardId;
      } else {
        console.error(`❌ 复制白板失败: ${boardId}`);
        return null;
      }
    } catch (error) {
      console.error('❌ 复制白板失败:', error);
      return null;
    }
  }, []);

  // 获取当前白板ID
  const getCurrentBoardId = useCallback((): string | null => {
    return unifiedStorageService.getCurrentBoardId();
  }, []);

  // 设置当前白板
  const setCurrentBoard = useCallback((boardId: string): void => {
    unifiedStorageService.setCurrentBoard(boardId);
  }, []);

  // 获取存储统计
  const getStorageStats = useCallback(async () => {
    return await unifiedStorageService.getStorageStats();
  }, []);

  // 清理所有数据
  const clearAllData = useCallback(async (): Promise<boolean> => {
    try {
      const success = await unifiedStorageService.clearAllData();
      if (success) {
        clearBoard(); // 清空Zustand状态
        console.log('🗑️ 所有数据已清理');
      }
      return success;
    } catch (error) {
      console.error('❌ 清理数据失败:', error);
      return false;
    }
  }, [clearBoard]);

  return {
    loadBoard,
    saveCurrentBoard,
    saveCurrentBoardImmediately,
    deleteBoard,
    getAllBoards,
    getCurrentBoardId,
    setCurrentBoard,
    createNewBoard,
    duplicateBoard,
    getStorageStats,
    clearAllData
  };
}

// 全局钩子实例（用于非React组件中的调用）
export const createGlobalStorageInstance = () => {
  const instance = {
    async saveCurrentBoard() {
      const currentBoardId = unifiedStorageService.getCurrentBoardId();
      if (!currentBoardId) return false;
      
      // 从Zustand获取当前状态
      const state = useBoardStore.getState();
      const boardData: Partial<UnifiedBoardData> = {
        id: currentBoardId,
        nodes: state.nodes,
        connections: state.connections,
        currentBackground: state.currentBackground,
        showGrid: state.showGrid,
        backgroundMode: state.backgroundMode,
        videoBackgroundUrl: state.videoBackgroundUrl,
        imageBackgroundUrl: state.imageBackgroundUrl,
        imageBlurLevel: state.imageBlurLevel,
        builtinBackgroundPath: state.builtinBackgroundPath,
        interactiveTheme: state.interactiveTheme,
        scale: state.scale,
        panX: state.panX,
        panY: state.panY,
        defaultCardConfig: state.defaultCardConfig,
        updatedAt: new Date()
      };
      
      return await unifiedStorageService.saveBoardImmediately(boardData);
    }
  };
  
  return instance;
}; 