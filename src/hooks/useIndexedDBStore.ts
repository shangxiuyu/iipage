// IndexedDB 存储 Hook - React状态管理集成
import { useState, useEffect, useCallback } from 'react';
import { storageManager, type StorageMode } from '../utils/storageManager';
import { type MigrationResult } from '../utils/dataMigration';

export interface IndexedDBStoreState {
  // 存储状态
  isReady: boolean;
  activeMode: StorageMode;
  isLoading: boolean;
  error: string | null;
  
  // 数据状态
  whiteboards: any[];
  currentWhiteboard: any | null;
  
  // 统计信息
  storageStats: {
    localStorage: {
      used: number;
      total: number;
      items: number;
    };
    indexedDB: {
      available: boolean;
      whiteboards: number;
      assets: number;
      totalSize: number;
    };
    recommendation: string;
  } | null;
  
  // 迁移状态
  migrationInProgress: boolean;
  migrationResult: MigrationResult | null;
}

export interface IndexedDBStoreActions {
  // 白板操作
  loadWhiteboard: (boardId?: string) => Promise<any | null>;
  saveWhiteboard: (data: any, boardId?: string) => Promise<boolean>;
  deleteWhiteboard: (boardId: string) => Promise<boolean>;
  getAllWhiteboards: () => Promise<any[]>;
  
  // 存储管理
  refreshStorageStats: () => Promise<void>;
  migrateToIndexedDB: () => Promise<MigrationResult>;
  updateStorageMode: (mode: StorageMode) => void;
  
  // 状态管理
  clearError: () => void;
  refresh: () => Promise<void>;
}

/**
 * IndexedDB存储管理Hook
 * 提供完整的存储管理、迁移、统计功能
 */
export function useIndexedDBStore(): IndexedDBStoreState & IndexedDBStoreActions {
  // 状态管理
  const [state, setState] = useState<IndexedDBStoreState>({
    isReady: false,
    activeMode: 'localStorage',
    isLoading: false,
    error: null,
    whiteboards: [],
    currentWhiteboard: null,
    storageStats: null,
    migrationInProgress: false,
    migrationResult: null
  });

  /**
   * 更新状态的辅助函数
   */
  const updateState = useCallback((updates: Partial<IndexedDBStoreState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * 错误处理包装器
   */
  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> => {
    try {
      updateState({ isLoading: true, error: null });
      const result = await operation();
      updateState({ isLoading: false });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      updateState({ 
        isLoading: false, 
        error: `${operationName}失败: ${errorMessage}` 
      });
      console.error(`❌ ${operationName}失败:`, error);
      return null;
    }
  }, [updateState]);

  /**
   * 初始化存储管理器
   */
  const initializeStorage = useCallback(async () => {
    await withErrorHandling(async () => {
      // 等待存储管理器初始化
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const activeMode = storageManager.getActiveMode();
      const stats = await storageManager.getStorageStats();
      
      updateState({
        isReady: true,
        activeMode,
        storageStats: stats
      });
      
      console.log('✅ IndexedDB Hook 初始化完成');
    }, '存储初始化');
  }, [withErrorHandling, updateState]);

  /**
   * 加载白板数据
   */
  const loadWhiteboard = useCallback(async (boardId: string = 'main'): Promise<any | null> => {
    return await withErrorHandling(async () => {
      const whiteboard = await storageManager.loadWhiteboard(boardId);
      if (whiteboard) {
        updateState({ currentWhiteboard: whiteboard });
        console.log(`📂 白板 "${boardId}" 加载成功`);
      }
      return whiteboard;
    }, '加载白板');
  }, [withErrorHandling, updateState]);

  /**
   * 保存白板数据
   */
  const saveWhiteboard = useCallback(async (data: any, boardId: string = 'main'): Promise<boolean> => {
    const result = await withErrorHandling(async () => {
      const success = await storageManager.saveWhiteboard(data, boardId);
      if (success) {
        updateState({ currentWhiteboard: data });
        // 更新统计信息
        const stats = await storageManager.getStorageStats();
        updateState({ storageStats: stats });
        console.log(`💾 白板 "${boardId}" 保存成功`);
      }
      return success;
    }, '保存白板');
    
    return result ?? false;
  }, [withErrorHandling, updateState]);

  /**
   * 删除白板
   */
  const deleteWhiteboard = useCallback(async (boardId: string): Promise<boolean> => {
    const result = await withErrorHandling(async () => {
      const success = await storageManager.deleteWhiteboard(boardId);
      if (success) {
        // 如果删除的是当前白板，清空当前白板状态
        updateState(prev => ({
          currentWhiteboard: prev.currentWhiteboard?.id === boardId ? null : prev.currentWhiteboard
        }));
        console.log(`🗑️ 白板 "${boardId}" 删除成功`);
      }
      return success;
    }, '删除白板');
    
    return result ?? false;
  }, [withErrorHandling, updateState]);

  /**
   * 获取所有白板
   */
  const getAllWhiteboards = useCallback(async (): Promise<any[]> => {
    const result = await withErrorHandling(async () => {
      const whiteboards = await storageManager.getAllWhiteboards();
      updateState({ whiteboards });
      console.log(`📋 获取到 ${whiteboards.length} 个白板`);
      return whiteboards;
    }, '获取白板列表');
    
    return result ?? [];
  }, [withErrorHandling, updateState]);

  /**
   * 刷新存储统计信息
   */
  const refreshStorageStats = useCallback(async (): Promise<void> => {
    await withErrorHandling(async () => {
      const stats = await storageManager.getStorageStats();
      updateState({ 
        storageStats: stats,
        activeMode: storageManager.getActiveMode()
      });
      console.log('📊 存储统计信息已更新');
    }, '刷新存储统计');
  }, [withErrorHandling, updateState]);

  /**
   * 迁移到IndexedDB
   */
  const migrateToIndexedDB = useCallback(async (): Promise<MigrationResult> => {
    const result = await withErrorHandling(async () => {
      updateState({ migrationInProgress: true });
      
      const migrationResult = await storageManager.migrateToIndexedDB();
      
      updateState({ 
        migrationInProgress: false,
        migrationResult,
        activeMode: storageManager.getActiveMode()
      });
      
      // 如果迁移成功，刷新统计信息和白板列表
      if (migrationResult.success) {
        await refreshStorageStats();
        await getAllWhiteboards();
        console.log('🎉 迁移完成，数据已刷新');
      }
      
      return migrationResult;
    }, '数据迁移');
    
    return result ?? {
      success: false,
      migratedItems: 0,
      errors: ['迁移操作失败'],
      backupCreated: false
    };
  }, [withErrorHandling, updateState, refreshStorageStats, getAllWhiteboards]);

  /**
   * 更新存储模式
   */
  const updateStorageMode = useCallback((mode: StorageMode) => {
    storageManager.updateConfig({ mode });
    updateState({ activeMode: storageManager.getActiveMode() });
    console.log(`🔄 存储模式已更新为: ${mode}`);
  }, [updateState]);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * 刷新所有数据
   */
  const refresh = useCallback(async (): Promise<void> => {
    await withErrorHandling(async () => {
      await Promise.all([
        refreshStorageStats(),
        getAllWhiteboards()
      ]);
      console.log('🔄 数据已全部刷新');
    }, '刷新数据');
  }, [withErrorHandling, refreshStorageStats, getAllWhiteboards]);

  // 初始化效果
  useEffect(() => {
    initializeStorage();
  }, [initializeStorage]);

  // 定期刷新统计信息
  useEffect(() => {
    if (!state.isReady) return;
    
    const interval = setInterval(() => {
      refreshStorageStats();
    }, 30000); // 每30秒刷新一次
    
    return () => clearInterval(interval);
  }, [state.isReady, refreshStorageStats]);

  return {
    // 状态
    ...state,
    
    // 操作
    loadWhiteboard,
    saveWhiteboard,
    deleteWhiteboard,
    getAllWhiteboards,
    refreshStorageStats,
    migrateToIndexedDB,
    updateStorageMode,
    clearError,
    refresh
  };
}

/**
 * 简化版Hook - 仅用于迁移状态检查
 */
export function useMigrationStatus() {
  const [migrationStatus, setMigrationStatus] = useState<{
    hasLocalStorageData: boolean;
    recommendMigration: boolean;
    canMigrate: boolean;
  }>({
    hasLocalStorageData: false,
    recommendMigration: false,
    canMigrate: false
  });

  useEffect(() => {
    const checkStatus = async () => {
      const hasLocalStorageData = Boolean(localStorage.getItem('whiteboard-storage'));
      const stats = await storageManager.getStorageStats();
      const canMigrate = stats.indexedDB.available;
      const recommendMigration = hasLocalStorageData && canMigrate && stats.localStorage.used > 1024; // > 1MB
      
      setMigrationStatus({
        hasLocalStorageData,
        recommendMigration,
        canMigrate
      });
    };
    
    checkStatus();
  }, []);

  return migrationStatus;
} 