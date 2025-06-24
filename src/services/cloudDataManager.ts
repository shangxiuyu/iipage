/**
 * 云端数据管理器
 * 整合阿里云存储服务到现有的白板数据管理系统中
 * 提供自动同步、手动备份、恢复等功能
 */

import { aliCloudStorage } from './aliCloudStorageService';

interface CloudConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  autoSync: boolean;
  syncInterval: number; // 分钟
}

interface SyncStatus {
  lastSyncTime: number;
  isAutoSyncEnabled: boolean;
  pendingChanges: string[]; // 待同步的白板ID列表
  syncInProgress: boolean;
}

class CloudDataManager {
  private config: CloudConfig | null = null;
  private syncStatus: SyncStatus = {
    lastSyncTime: 0,
    isAutoSyncEnabled: false,
    pendingChanges: [],
    syncInProgress: false,
  };
  private syncTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * 初始化云端数据管理器
   */
  async initialize(config: CloudConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // 初始化阿里云OSS
      const success = await aliCloudStorage.initialize({
        region: config.region,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        bucket: config.bucket,
      });

      if (!success) {
        console.error('云端数据管理器初始化失败：阿里云OSS初始化失败');
        return false;
      }

      this.isInitialized = true;
      console.log('云端数据管理器初始化成功');

      // 启用自动同步（如果配置了）
      if (config.autoSync) {
        this.enableAutoSync();
      }

      return true;
    } catch (error) {
      console.error('云端数据管理器初始化失败:', error);
      return false;
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && aliCloudStorage.isReady();
  }

  /**
   * 保存白板到云端（立即同步）
   */
  async saveToCloud(boardId: string): Promise<boolean> {
    if (!this.isReady()) {
      console.warn('云端数据管理器未初始化，无法保存到云端');
      return false;
    }

    try {
      // 从localStorage获取白板数据
      const storageKey = `whiteboard-data-${boardId}`;
      const localData = localStorage.getItem(storageKey);
      
      if (!localData) {
        console.warn(`白板 ${boardId} 在本地不存在`);
        return false;
      }

      const boardData = JSON.parse(localData);
      
      // 添加云端同步时间戳
      boardData.cloudSyncAt = Date.now();
      boardData.cloudSyncVersion = (boardData.cloudSyncVersion || 0) + 1;

      // 保存到阿里云OSS
      const result = await aliCloudStorage.saveBoard(boardId, boardData);
      
      if (result.success) {
        console.log(`白板 ${boardId} 已同步到云端`);
        
        // 更新本地数据的云端同步时间戳
        localStorage.setItem(storageKey, JSON.stringify(boardData));
        
        // 从待同步列表中移除
        this.syncStatus.pendingChanges = this.syncStatus.pendingChanges.filter(id => id !== boardId);
        this.syncStatus.lastSyncTime = Date.now();
        
        return true;
      } else {
        console.error(`白板 ${boardId} 同步到云端失败:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`保存白板 ${boardId} 到云端失败:`, error);
      return false;
    }
  }

  /**
   * 从云端加载白板
   */
  async loadFromCloud(boardId: string): Promise<any | null> {
    if (!this.isReady()) {
      console.warn('云端数据管理器未初始化，无法从云端加载');
      return null;
    }

    try {
      const result = await aliCloudStorage.loadBoard(boardId);
      
      if (result.success) {
        console.log(`从云端加载白板 ${boardId} 成功`);
        return result.data;
      } else {
        console.warn(`从云端加载白板 ${boardId} 失败:`, result.error);
        return null;
      }
    } catch (error) {
      console.error(`从云端加载白板 ${boardId} 失败:`, error);
      return null;
    }
  }

  /**
   * 禁用云端白板分享（不删除文件，只修改访问权限）
   */
  async disableCloudShare(boardId: string): Promise<boolean> {
    if (!this.isReady()) {
      console.warn('云端数据管理器未初始化，无法禁用分享');
      return false;
    }

    try {
      const result = await aliCloudStorage.disableShare(boardId);
      
      if (result.success) {
        console.log(`云端白板 ${boardId} 分享已禁用`);
        return true;
      } else {
        console.error(`禁用云端白板 ${boardId} 分享失败:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`禁用云端白板 ${boardId} 分享失败:`, error);
      return false;
    }
  }

  /**
   * 删除云端白板（保留原方法用于完全删除）
   */
  async deleteFromCloud(boardId: string): Promise<boolean> {
    if (!this.isReady()) {
      console.warn('云端数据管理器未初始化，无法删除云端数据');
      return false;
    }

    try {
      const result = await aliCloudStorage.deleteBoard(boardId);
      
      if (result.success) {
        console.log(`从云端删除白板 ${boardId} 成功`);
        return true;
      } else {
        console.error(`从云端删除白板 ${boardId} 失败:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`从云端删除白板 ${boardId} 失败:`, error);
      return false;
    }
  }

  /**
   * 标记白板需要同步
   */
  markForSync(boardId: string): void {
    if (!this.syncStatus.pendingChanges.includes(boardId)) {
      this.syncStatus.pendingChanges.push(boardId);
      console.log(`白板 ${boardId} 已标记为待同步`);
    }
  }

  /**
   * 批量同步所有待同步的白板
   */
  async syncPendingChanges(): Promise<void> {
    if (!this.isReady() || this.syncStatus.syncInProgress) {
      return;
    }

    if (this.syncStatus.pendingChanges.length === 0) {
      console.log('没有待同步的白板');
      return;
    }

    this.syncStatus.syncInProgress = true;
    console.log(`开始同步 ${this.syncStatus.pendingChanges.length} 个白板到云端`);

    const boardsToSync = [...this.syncStatus.pendingChanges];
    let successCount = 0;

    for (const boardId of boardsToSync) {
      try {
        const success = await this.saveToCloud(boardId);
        if (success) {
          successCount++;
        }
      } catch (error) {
        console.error(`同步白板 ${boardId} 失败:`, error);
      }
    }

    this.syncStatus.syncInProgress = false;
    console.log(`同步完成：${successCount}/${boardsToSync.length} 个白板成功同步`);
  }

  /**
   * 启用自动同步
   */
  enableAutoSync(): void {
    if (!this.config) {
      console.warn('无法启用自动同步：配置不存在');
      return;
    }

    this.disableAutoSync(); // 先清除现有的定时器

    this.syncStatus.isAutoSyncEnabled = true;
    
    // 设置定时同步
    const intervalMs = this.config.syncInterval * 60 * 1000; // 转换为毫秒
    this.syncTimer = setInterval(async () => {
      if (this.syncStatus.pendingChanges.length > 0) {
        console.log('自动同步开始...');
        await this.syncPendingChanges();
      }
    }, intervalMs);

    console.log(`自动同步已启用，同步间隔：${this.config.syncInterval} 分钟`);
  }

  /**
   * 禁用自动同步
   */
  disableAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.syncStatus.isAutoSyncEnabled = false;
    console.log('自动同步已禁用');
  }

  /**
   * 立即同步所有本地白板到云端
   */
  async backupAllBoards(): Promise<void> {
    if (!this.isReady()) {
      console.warn('云端数据管理器未初始化，无法备份');
      return;
    }

    console.log('开始备份所有本地白板到云端...');

    // 获取所有本地白板ID
    const localBoardIds: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('whiteboard-data-')) {
        const boardId = key.replace('whiteboard-data-', '');
        localBoardIds.push(boardId);
      }
    }

    console.log(`发现 ${localBoardIds.length} 个本地白板`);

    let successCount = 0;
    for (const boardId of localBoardIds) {
      try {
        const success = await this.saveToCloud(boardId);
        if (success) {
          successCount++;
        }
      } catch (error) {
        console.error(`备份白板 ${boardId} 失败:`, error);
      }
    }

    console.log(`备份完成：${successCount}/${localBoardIds.length} 个白板成功备份到云端`);
  }

  /**
   * 从云端恢复所有白板到本地
   */
  async restoreAllBoards(): Promise<void> {
    if (!this.isReady()) {
      console.warn('云端数据管理器未初始化，无法恢复');
      return;
    }

    console.log('开始从云端恢复所有白板到本地...');

    try {
      // 获取云端白板列表
      const result = await aliCloudStorage.listBoards();
      
      if (!result.success || !result.data) {
        console.error('获取云端白板列表失败:', result.error);
        return;
      }

      const cloudBoards = result.data;
      console.log(`发现 ${cloudBoards.length} 个云端白板`);

      let successCount = 0;
      for (const board of cloudBoards) {
        try {
          const boardData = await this.loadFromCloud(board.id);
          if (boardData) {
            // 保存到本地
            const storageKey = `whiteboard-data-${board.id}`;
            localStorage.setItem(storageKey, JSON.stringify(boardData));
            successCount++;
            console.log(`白板 ${board.id} 已恢复到本地`);
          }
        } catch (error) {
          console.error(`恢复白板 ${board.id} 失败:`, error);
        }
      }

      console.log(`恢复完成：${successCount}/${cloudBoards.length} 个白板成功恢复到本地`);
    } catch (error) {
      console.error('从云端恢复白板失败:', error);
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * 获取云端存储统计信息
   */
  async getStorageStats(): Promise<any> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const result = await aliCloudStorage.getStorageStats();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('获取存储统计失败:', error);
      return null;
    }
  }

  /**
   * 检查白板是否存在于云端
   */
  async cloudBoardExists(boardId: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    return await aliCloudStorage.boardExists(boardId);
  }

  /**
   * 获取云端白板列表
   */
  async getCloudBoardList(): Promise<any[]> {
    if (!this.isReady()) {
      return [];
    }

    try {
      const result = await aliCloudStorage.listBoards();
      return result.success ? (result.data || []) : [];
    } catch (error) {
      console.error('获取云端白板列表失败:', error);
      return [];
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.disableAutoSync();
    aliCloudStorage.disconnect();
    this.isInitialized = false;
    this.config = null;
    console.log('云端数据管理器已断开连接');
  }
}

// 创建单例实例
export const cloudDataManager = new CloudDataManager();
export default cloudDataManager; 