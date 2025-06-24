// 混合存储管理器 - 智能选择最佳存储方案
import { ErrorHandler } from './errorHandler';
import { indexedDBAdapter, type WhiteboardData } from './indexedDBAdapter';
import { DataMigration, type MigrationResult } from './dataMigration';

export type StorageMode = 'localStorage' | 'indexedDB' | 'hybrid';

export interface StorageConfig {
  mode: StorageMode;
  autoMigrate: boolean;
  fallbackToLocalStorage: boolean;
  maxLocalStorageSize: number; // KB
}

export class StorageManager {
  private config: StorageConfig;
  private isIndexedDBAvailable: boolean = false;
  private migrationInProgress: boolean = false;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      mode: 'hybrid',
      autoMigrate: true,
      fallbackToLocalStorage: true,
      maxLocalStorageSize: 3072, // 3MB
      ...config
    };

    this.init();
  }

  /**
   * 初始化存储管理器
   */
  private async init(): Promise<void> {
    try {
      // 检查IndexedDB可用性
      this.isIndexedDBAvailable = this.checkIndexedDBSupport();
      
      if (this.isIndexedDBAvailable) {
        const initSuccess = await indexedDBAdapter.init();
        if (!initSuccess) {
          this.isIndexedDBAvailable = false;
          console.warn('⚠️ IndexedDB初始化失败，将使用localStorage');
        }
      }

      // 自动迁移检查
      if (this.config.autoMigrate && this.isIndexedDBAvailable) {
        await this.checkAndAutoMigrate();
      }

      console.log(`📦 存储管理器已初始化 (模式: ${this.getActiveMode()})`);
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Storage Manager Init',
        'medium'
      );
    }
  }

  /**
   * 保存白板数据
   */
  async saveWhiteboard(data: any, boardId: string = 'main'): Promise<boolean> {
    try {
      const mode = this.determineStorageMode(data);
      
      switch (mode) {
        case 'indexedDB':
          return await this.saveToIndexedDB(data, boardId);
        
        case 'localStorage':
        default:
          return this.saveToLocalStorage(data, boardId);
      }
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Save Whiteboard',
        'medium'
      );
      
      // 降级到localStorage
      if (this.config.fallbackToLocalStorage) {
        return this.saveToLocalStorage(data, boardId);
      }
      
      return false;
    }
  }

  /**
   * 加载白板数据
   */
  async loadWhiteboard(boardId: string = 'main'): Promise<any | null> {
    try {
      // 优先从IndexedDB加载
      if (this.isIndexedDBAvailable) {
        const indexedDBData = await this.loadFromIndexedDB(boardId);
        if (indexedDBData) {
          return indexedDBData;
        }
      }

      // 降级到localStorage
      return this.loadFromLocalStorage(boardId);
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Load Whiteboard',
        'medium'
      );
      
      // 最后的降级尝试
      return this.loadFromLocalStorage(boardId);
    }
  }

  /**
   * 获取所有白板列表
   */
  async getAllWhiteboards(): Promise<any[]> {
    try {
      if (this.isIndexedDBAvailable) {
        const indexedDBWhiteboards = await indexedDBAdapter.getAllWhiteboards();
        if (indexedDBWhiteboards.length > 0) {
          return indexedDBWhiteboards;
        }
      }

      // 从localStorage获取
      return this.getAllFromLocalStorage();
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Get All Whiteboards',
        'medium'
      );
      return this.getAllFromLocalStorage();
    }
  }

  /**
   * 删除白板
   */
  async deleteWhiteboard(boardId: string): Promise<boolean> {
    try {
      let indexedDBSuccess = true;
      let localStorageSuccess = true;

      // 从IndexedDB删除
      if (this.isIndexedDBAvailable) {
        indexedDBSuccess = await indexedDBAdapter.deleteWhiteboard(boardId);
      }

      // 从localStorage删除
      localStorageSuccess = this.deleteFromLocalStorage(boardId);

      return indexedDBSuccess && localStorageSuccess;
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Delete Whiteboard',
        'medium'
      );
      return false;
    }
  }

  /**
   * 手动迁移到IndexedDB
   */
  async migrateToIndexedDB(): Promise<MigrationResult> {
    if (this.migrationInProgress) {
      return {
        success: false,
        migratedItems: 0,
        errors: ['迁移已在进行中'],
        backupCreated: false
      };
    }

    try {
      this.migrationInProgress = true;
      
      if (!this.isIndexedDBAvailable) {
        return {
          success: false,
          migratedItems: 0,
          errors: ['IndexedDB不可用'],
          backupCreated: false
        };
      }

      const result = await DataMigration.migrateFromLocalStorage();
      
      if (result.success) {
        console.log('🎉 迁移成功完成！');
        // 切换到IndexedDB模式
        this.config.mode = 'indexedDB';
      }

      return result;
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Manual Migration',
        'high'
      );
      return {
        success: false,
        migratedItems: 0,
        errors: [`迁移异常: ${(error as Error).message}`],
        backupCreated: false
      };
    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
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
  }> {
    try {
      // localStorage统计
      let localStorageUsed = 0;
      let localStorageItems = 0;
      
      Object.keys(localStorage).forEach(key => {
        if (key.includes('whiteboard')) {
          const value = localStorage.getItem(key);
          if (value) {
            localStorageUsed += new Blob([value]).size;
            localStorageItems++;
          }
        }
      });

      // IndexedDB统计
      let indexedDBStats = {
        available: this.isIndexedDBAvailable,
        whiteboards: 0,
        assets: 0,
        totalSize: 0
      };

      if (this.isIndexedDBAvailable) {
        const stats = await indexedDBAdapter.getStorageStats();
        indexedDBStats = {
          ...indexedDBStats,
          ...stats
        };
      }

      // 生成建议
      const localStorageUsedKB = Math.round(localStorageUsed / 1024);
      let recommendation = '';
      
      if (localStorageUsedKB > this.config.maxLocalStorageSize) {
        recommendation = '强烈建议迁移到IndexedDB';
      } else if (localStorageUsedKB > this.config.maxLocalStorageSize * 0.7) {
        recommendation = '建议考虑IndexedDB升级';
      } else if (indexedDBStats.whiteboards > 0) {
        recommendation = '已使用IndexedDB存储';
      } else {
        recommendation = 'localStorage存储充足';
      }

      return {
        localStorage: {
          used: localStorageUsedKB,
          total: 5120, // 5MB typical limit
          items: localStorageItems
        },
        indexedDB: indexedDBStats,
        recommendation
      };
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Get Storage Stats',
        'low'
      );
      return {
        localStorage: { used: 0, total: 5120, items: 0 },
        indexedDB: { available: false, whiteboards: 0, assets: 0, totalSize: 0 },
        recommendation: '无法获取存储统计'
      };
    }
  }

  /**
   * 私有方法：检查IndexedDB支持
   */
  private checkIndexedDBSupport(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  /**
   * 私有方法：确定存储模式
   */
  private determineStorageMode(data: any): StorageMode {
    if (this.config.mode === 'localStorage') {
      return 'localStorage';
    }

    if (this.config.mode === 'indexedDB' && this.isIndexedDBAvailable) {
      return 'indexedDB';
    }

    // 混合模式逻辑
    if (this.config.mode === 'hybrid') {
      const dataSize = JSON.stringify(data).length;
      const dataSizeKB = dataSize / 1024;

      // 大数据优先使用IndexedDB
      if (dataSizeKB > 500 && this.isIndexedDBAvailable) {
        return 'indexedDB';
      }

      // 检查localStorage使用量
      const localStorageUsed = this.getLocalStorageUsage();
      if (localStorageUsed > this.config.maxLocalStorageSize * 1024) {
        return this.isIndexedDBAvailable ? 'indexedDB' : 'localStorage';
      }
    }

    return 'localStorage';
  }

  /**
   * 私有方法：保存到IndexedDB
   */
  private async saveToIndexedDB(data: any, boardId: string): Promise<boolean> {
    const whiteboardData: Partial<WhiteboardData> = {
      id: boardId,
      title: data.title || `白板 ${boardId}`,
      ...data,
      updatedAt: new Date()
    };

    return await indexedDBAdapter.saveWhiteboard(whiteboardData);
  }

  /**
   * 私有方法：保存到localStorage
   */
  private saveToLocalStorage(data: any, boardId: string): boolean {
    try {
      const key = boardId === 'main' ? 'whiteboard-storage' : `whiteboard-data-${boardId}`;
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Save to LocalStorage',
        'medium'
      );
      return false;
    }
  }

  /**
   * 私有方法：从IndexedDB加载
   */
  private async loadFromIndexedDB(boardId: string): Promise<any | null> {
    const whiteboard = await indexedDBAdapter.loadWhiteboard(boardId);
    return whiteboard;
  }

  /**
   * 私有方法：从localStorage加载
   */
  private loadFromLocalStorage(boardId: string): any | null {
    try {
      const key = boardId === 'main' ? 'whiteboard-storage' : `whiteboard-data-${boardId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Load from LocalStorage',
        'medium'
      );
      return null;
    }
  }

  /**
   * 私有方法：从localStorage获取所有白板
   */
  private getAllFromLocalStorage(): any[] {
    try {
      const whiteboards: any[] = [];
      
      Object.keys(localStorage).forEach(key => {
        if (key === 'whiteboard-storage' || key.startsWith('whiteboard-data-')) {
          const data = localStorage.getItem(key);
          if (data) {
            const parsedData = JSON.parse(data);
            const boardId = key === 'whiteboard-storage' ? 'main' : key.replace('whiteboard-data-', '');
            whiteboards.push({
              id: boardId,
              title: parsedData.title || `白板 ${boardId}`,
              ...parsedData,
              updatedAt: new Date() // localStorage没有时间戳
            });
          }
        }
      });

      return whiteboards;
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Get All from LocalStorage',
        'medium'
      );
      return [];
    }
  }

  /**
   * 私有方法：从localStorage删除
   */
  private deleteFromLocalStorage(boardId: string): boolean {
    try {
      const key = boardId === 'main' ? 'whiteboard-storage' : `whiteboard-data-${boardId}`;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Delete from LocalStorage',
        'medium'
      );
      return false;
    }
  }

  /**
   * 私有方法：获取localStorage使用量
   */
  private getLocalStorageUsage(): number {
    let totalSize = 0;
    Object.keys(localStorage).forEach(key => {
      if (key.includes('whiteboard')) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }
    });
    return totalSize;
  }

  /**
   * 私有方法：检查并自动迁移
   */
  private async checkAndAutoMigrate(): Promise<void> {
    try {
      const migrationStatus = DataMigration.getMigrationStatus();
      
      if (migrationStatus.recommendMigration) {
        const localStorageUsage = this.getLocalStorageUsage();
        const localStorageUsageKB = localStorageUsage / 1024;
        
        // 如果localStorage使用量超过阈值，自动迁移
        if (localStorageUsageKB > this.config.maxLocalStorageSize * 0.8) {
          console.log('🔄 检测到localStorage使用量较高，开始自动迁移...');
          const result = await this.migrateToIndexedDB();
          
          if (result.success) {
            console.log('✅ 自动迁移完成');
          } else {
            console.warn('⚠️ 自动迁移失败:', result.errors);
          }
        }
      }
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Auto Migration Check',
        'low'
      );
    }
  }

  /**
   * 获取当前活动存储模式
   */
  getActiveMode(): StorageMode {
    if (!this.isIndexedDBAvailable) {
      return 'localStorage';
    }
    return this.config.mode;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📦 存储配置已更新:', this.config);
  }
}

// 创建默认存储管理器实例
export const storageManager = new StorageManager(); 