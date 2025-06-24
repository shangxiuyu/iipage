// 数据迁移工具 - localStorage to IndexedDB 无缝迁移
import { ErrorHandler } from './errorHandler';
import { indexedDBAdapter, type WhiteboardData } from './indexedDBAdapter';

export interface MigrationResult {
  success: boolean;
  migratedItems: number;
  errors: string[];
  backupCreated: boolean;
}

export class DataMigration {
  
  /**
   * 从localStorage迁移到IndexedDB
   */
  static async migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedItems: 0,
      errors: [],
      backupCreated: false
    };

    try {
      console.log('🚀 开始数据迁移: localStorage → IndexedDB');
      
      // 1. 检查IndexedDB支持
      if (!indexedDBAdapter.constructor.isSupported()) {
        result.errors.push('浏览器不支持IndexedDB');
        return result;
      }

      // 2. 初始化IndexedDB
      const initSuccess = await indexedDBAdapter.init();
      if (!initSuccess) {
        result.errors.push('IndexedDB初始化失败');
        return result;
      }

      // 3. 创建localStorage备份
      const backupSuccess = await this.createLocalStorageBackup();
      result.backupCreated = backupSuccess;

      // 4. 获取localStorage中的白板数据
      const localStorageData = this.extractLocalStorageData();
      if (!localStorageData) {
        result.errors.push('未找到localStorage中的白板数据');
        return result;
      }

      // 5. 迁移主白板数据
      if (localStorageData.mainWhiteboard) {
        const migrated = await this.migrateMainWhiteboard(localStorageData.mainWhiteboard);
        if (migrated) {
          result.migratedItems++;
          console.log('✅ 主白板数据迁移成功');
        } else {
          result.errors.push('主白板数据迁移失败');
        }
      }

      // 6. 迁移多白板数据
      for (const [boardId, boardData] of Object.entries(localStorageData.multipleWhiteboards)) {
        const migrated = await this.migrateSingleWhiteboard(boardId, boardData);
        if (migrated) {
          result.migratedItems++;
          console.log(`✅ 白板 ${boardId} 迁移成功`);
        } else {
          result.errors.push(`白板 ${boardId} 迁移失败`);
        }
      }

      // 7. 验证迁移结果
      const validationSuccess = await this.validateMigration();
      if (!validationSuccess) {
        result.errors.push('迁移数据验证失败');
      }

      result.success = result.errors.length === 0 && result.migratedItems > 0;
      
      if (result.success) {
        console.log(`🎉 数据迁移完成！共迁移 ${result.migratedItems} 个白板`);
      } else {
        console.warn('⚠️ 数据迁移存在问题:', result.errors);
      }

      return result;

    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Data Migration',
        'high'
      );
      result.errors.push(`迁移过程异常: ${(error as Error).message}`);
      return result;
    }
  }

  /**
   * 提取localStorage中的白板数据
   */
  private static extractLocalStorageData(): {
    mainWhiteboard: any;
    multipleWhiteboards: Record<string, any>;
    settings: Record<string, any>;
  } | null {
    try {
      const data = {
        mainWhiteboard: null as any,
        multipleWhiteboards: {} as Record<string, any>,
        settings: {} as Record<string, any>
      };

      // 获取主白板数据
      const mainWhiteboardData = localStorage.getItem('whiteboard-storage');
      if (mainWhiteboardData) {
        data.mainWhiteboard = JSON.parse(mainWhiteboardData);
      }

      // 获取多白板数据
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('whiteboard-data-')) {
          const boardId = key.replace('whiteboard-data-', '');
          const boardData = localStorage.getItem(key);
          if (boardData) {
            data.multipleWhiteboards[boardId] = JSON.parse(boardData);
          }
        }

        // 获取设置数据
        if (key.startsWith('whiteboard-') && !key.includes('data-') && key !== 'whiteboard-storage') {
          const settingData = localStorage.getItem(key);
          if (settingData) {
            data.settings[key] = settingData;
          }
        }
      });

      return data;
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Extract LocalStorage Data',
        'medium'
      );
      return null;
    }
  }

  /**
   * 迁移主白板数据
   */
  private static async migrateMainWhiteboard(data: any): Promise<boolean> {
    try {
      const whiteboardData: Partial<WhiteboardData> = {
        id: 'main-whiteboard',
        title: '主白板',
        nodes: data.nodes || [],
        connections: data.connections || [],
        currentBackground: data.currentBackground || 'default',
        showGrid: data.showGrid ?? true,
        backgroundMode: data.backgroundMode || 'grid',
        videoBackgroundUrl: data.videoBackgroundUrl || null,
        imageBackgroundUrl: data.imageBackgroundUrl || null,
        imageBlurLevel: data.imageBlurLevel || 0,
        interactiveTheme: data.interactiveTheme || null,
        scale: data.scale || 1,
        panX: data.panX || 0,
        panY: data.panY || 0,
        defaultCardConfig: data.defaultCardConfig || {},
        createdAt: new Date(),
        version: 1
      };

      return await indexedDBAdapter.saveWhiteboard(whiteboardData);
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Migrate Main Whiteboard',
        'medium'
      );
      return false;
    }
  }

  /**
   * 迁移单个白板数据
   */
  private static async migrateSingleWhiteboard(boardId: string, data: any): Promise<boolean> {
    try {
      const whiteboardData: Partial<WhiteboardData> = {
        id: boardId,
        title: data.title || `白板 ${boardId}`,
        nodes: data.nodes || [],
        connections: data.connections || [],
        currentBackground: data.currentBackground || 'default',
        showGrid: data.showGrid ?? true,
        backgroundMode: data.backgroundMode || 'grid',
        videoBackgroundUrl: data.videoBackgroundUrl || null,
        imageBackgroundUrl: data.imageBackgroundUrl || null,
        imageBlurLevel: data.imageBlurLevel || 0,
        interactiveTheme: data.interactiveTheme || null,
        scale: data.scale || 1,
        panX: data.panX || 0,
        panY: data.panY || 0,
        defaultCardConfig: data.defaultCardConfig || {},
        createdAt: new Date(),
        version: 1
      };

      return await indexedDBAdapter.saveWhiteboard(whiteboardData);
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Migrate Single Whiteboard',
        'medium'
      );
      return false;
    }
  }

  /**
   * 创建localStorage备份
   */
  private static async createLocalStorageBackup(): Promise<boolean> {
    try {
      const backup: Record<string, string> = {};
      
      // 备份所有白板相关数据
      Object.keys(localStorage).forEach(key => {
        if (key.includes('whiteboard')) {
          const value = localStorage.getItem(key);
          if (value) {
            backup[key] = value;
          }
        }
      });

      const backupData = {
        timestamp: new Date().toISOString(),
        source: 'localStorage',
        destination: 'IndexedDB',
        data: backup
      };

      // 保存备份到localStorage的特殊键
      localStorage.setItem('whiteboard-migration-backup', JSON.stringify(backupData));
      console.log('💾 localStorage备份已创建');
      return true;
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Create LocalStorage Backup',
        'medium'
      );
      return false;
    }
  }

  /**
   * 验证迁移结果
   */
  private static async validateMigration(): Promise<boolean> {
    try {
      // 检查IndexedDB中是否有数据
      const whiteboards = await indexedDBAdapter.getAllWhiteboards();
      if (whiteboards.length === 0) {
        console.warn('⚠️ IndexedDB中没有找到迁移的数据');
        return false;
      }

      // 验证数据完整性
      for (const whiteboard of whiteboards) {
        if (!whiteboard.id || !Array.isArray(whiteboard.nodes) || !Array.isArray(whiteboard.connections)) {
          console.warn('⚠️ 发现数据结构异常的白板:', whiteboard.id);
          return false;
        }
      }

      console.log('✅ 数据验证通过');
      return true;
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Validate Migration',
        'medium'
      );
      return false;
    }
  }

  /**
   * 回滚迁移 - 从备份恢复localStorage
   */
  static async rollbackMigration(): Promise<boolean> {
    try {
      const backupData = localStorage.getItem('whiteboard-migration-backup');
      if (!backupData) {
        console.warn('⚠️ 未找到迁移备份数据');
        return false;
      }

      const backup = JSON.parse(backupData);
      
      // 清除当前白板数据
      Object.keys(localStorage).forEach(key => {
        if (key.includes('whiteboard') && key !== 'whiteboard-migration-backup') {
          localStorage.removeItem(key);
        }
      });

      // 恢复备份数据
      Object.entries(backup.data).forEach(([key, value]) => {
        localStorage.setItem(key, value as string);
      });

      console.log('🔄 数据已从备份回滚到localStorage');
      return true;
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Rollback Migration',
        'high'
      );
      return false;
    }
  }

  /**
   * 清理迁移备份
   */
  static cleanupMigrationBackup(): void {
    try {
      localStorage.removeItem('whiteboard-migration-backup');
      console.log('🧹 迁移备份已清理');
    } catch (error) {
      ErrorHandler.logError(
        error as Error,
        'Cleanup Migration Backup',
        'low'
      );
    }
  }

  /**
   * 获取迁移状态
   */
  static getMigrationStatus(): {
    hasLocalStorageData: boolean;
    hasIndexedDBData: boolean;
    hasBackup: boolean;
    recommendMigration: boolean;
  } {
    try {
      const hasLocalStorageData = Boolean(localStorage.getItem('whiteboard-storage'));
      const hasBackup = Boolean(localStorage.getItem('whiteboard-migration-backup'));
      
      return {
        hasLocalStorageData,
        hasIndexedDBData: false, // 这个需要异步检查
        hasBackup,
        recommendMigration: hasLocalStorageData && !hasBackup
      };
    } catch (error) {
      return {
        hasLocalStorageData: false,
        hasIndexedDBData: false,
        hasBackup: false,
        recommendMigration: false
      };
    }
  }
} 