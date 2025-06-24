// IndexedDB 存储适配器 - 企业级白板数据存储解决方案
import { ErrorHandler } from './errorHandler';
import type { NodeData, Connection } from '../store/useBoardStore';

export interface WhiteboardData {
  id: string;
  title: string;
  nodes: NodeData[];
  connections: Connection[];
  currentBackground: string;
  showGrid: boolean;
  backgroundMode: string;
  videoBackgroundUrl: string | null;
  imageBackgroundUrl: string | null;
  imageBlurLevel: number;
  interactiveTheme: any;
  scale: number;
  panX: number;
  panY: number;
  defaultCardConfig: any;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface AssetData {
  id: string;
  name: string;
  type: string;
  size: number;
  data: Blob;
  metadata: Record<string, any>;
  createdAt: Date;
}

export class IndexedDBAdapter {
  private dbName = 'WhiteboardAppDB';
  private version = 1;
  private db: IDBDatabase | null = null;
  
  // 存储表名
  private readonly stores = {
    whiteboards: 'whiteboards',
    assets: 'assets',
    settings: 'settings',
    history: 'history'
  } as const;

  /**
   * 初始化数据库连接
   */
  async init(): Promise<boolean> {
    try {
      return await new Promise<boolean>((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
        
        request.onerror = () => {
          const error = new Error(`IndexedDB初始化失败: ${request.error?.message || 'Unknown error'}`);
          ErrorHandler.logError(error, 'IndexedDB', 'high');
          resolve(false);
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          console.log('✅ IndexedDB 数据库连接成功');
          resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // 创建白板数据表
          if (!db.objectStoreNames.contains(this.stores.whiteboards)) {
            const whiteboardStore = db.createObjectStore(this.stores.whiteboards, { 
              keyPath: 'id' 
            });
            whiteboardStore.createIndex('title', 'title', { unique: false });
            whiteboardStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            whiteboardStore.createIndex('createdAt', 'createdAt', { unique: false });
            console.log('📋 创建白板数据表');
          }
          
          // 创建资源表
          if (!db.objectStoreNames.contains(this.stores.assets)) {
            const assetStore = db.createObjectStore(this.stores.assets, { 
              keyPath: 'id' 
            });
            assetStore.createIndex('type', 'type', { unique: false });
            assetStore.createIndex('size', 'size', { unique: false });
            assetStore.createIndex('createdAt', 'createdAt', { unique: false });
            console.log('📎 创建资源数据表');
          }
          
          // 创建设置表
          if (!db.objectStoreNames.contains(this.stores.settings)) {
            db.createObjectStore(this.stores.settings, { 
              keyPath: 'key' 
            });
            console.log('⚙️ 创建设置数据表');
          }
          
          // 创建历史记录表
          if (!db.objectStoreNames.contains(this.stores.history)) {
            const historyStore = db.createObjectStore(this.stores.history, { 
              keyPath: 'id' 
            });
            historyStore.createIndex('whiteboardId', 'whiteboardId', { unique: false });
            historyStore.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('📚 创建历史记录表');
          }
          
          console.log('🔧 IndexedDB 数据库结构创建完成');
        };
      });
    } catch (error) {
      ErrorHandler.logError(
        error as Error, 
        'IndexedDB Init', 
        'high'
      );
      return false;
    }
  }

  /**
   * 保存白板数据
   */
  async saveWhiteboard(data: Partial<WhiteboardData>): Promise<boolean> {
    if (!this.db) {
      const initSuccess = await this.init();
      if (!initSuccess) return false;
    }
    
    try {
      return await new Promise<boolean>((resolve, reject) => {
        const transaction = this.db!.transaction([this.stores.whiteboards], 'readwrite');
        const store = transaction.objectStore(this.stores.whiteboards);
        
        const whiteboardData: WhiteboardData = {
          id: data.id || `whiteboard-${Date.now()}`,
          title: data.title || '未命名白板',
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
          createdAt: data.createdAt || new Date(),
          updatedAt: new Date(),
          version: (data.version || 0) + 1
        };
        
        const request = store.put(whiteboardData);
        
        request.onsuccess = () => {
          console.log(`💾 白板 "${whiteboardData.title}" 已保存到 IndexedDB`);
          resolve(true);
        };
        
        request.onerror = () => {
          const error = new Error(`保存白板失败: ${request.error?.message || 'Unknown error'}`);
          ErrorHandler.logError(error, 'IndexedDB Save', 'medium');
          resolve(false);
        };
      });
    } catch (error) {
      ErrorHandler.logError(
        error as Error, 
        'Save Whiteboard', 
        'medium'
      );
      return false;
    }
  }

  /**
   * 加载白板数据
   */
  async loadWhiteboard(id: string): Promise<WhiteboardData | null> {
    if (!this.db) {
      const initSuccess = await this.init();
      if (!initSuccess) return null;
    }
    
    try {
      return await new Promise<WhiteboardData | null>((resolve, reject) => {
        const transaction = this.db!.transaction([this.stores.whiteboards], 'readonly');
        const store = transaction.objectStore(this.stores.whiteboards);
        const request = store.get(id);
        
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            console.log(`📂 白板 "${result.title}" 已从 IndexedDB 加载`);
            resolve(result);
          } else {
            console.log(`⚠️ 未找到白板: ${id}`);
            resolve(null);
          }
        };
        
        request.onerror = () => {
          const error = new Error(`加载白板失败: ${request.error?.message || 'Unknown error'}`);
          ErrorHandler.logError(error, 'IndexedDB Load', 'medium');
          resolve(null);
        };
      });
    } catch (error) {
      ErrorHandler.logError(
        error as Error, 
        'Load Whiteboard', 
        'medium'
      );
      return null;
    }
  }

  /**
   * 获取所有白板列表
   */
  async getAllWhiteboards(): Promise<WhiteboardData[]> {
    if (!this.db) {
      const initSuccess = await this.init();
      if (!initSuccess) return [];
    }
    
    try {
      return await new Promise<WhiteboardData[]>((resolve, reject) => {
        const transaction = this.db!.transaction([this.stores.whiteboards], 'readonly');
        const store = transaction.objectStore(this.stores.whiteboards);
        const index = store.index('updatedAt');
        const request = index.openCursor(null, 'prev'); // 按更新时间倒序
        
        const whiteboards: WhiteboardData[] = [];
        
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            whiteboards.push(cursor.value);
            cursor.continue();
          } else {
            console.log(`📋 已加载 ${whiteboards.length} 个白板`);
            resolve(whiteboards);
          }
        };
        
        request.onerror = () => {
          const error = new Error(`获取白板列表失败: ${request.error?.message || 'Unknown error'}`);
          ErrorHandler.logError(error, 'IndexedDB List', 'medium');
          resolve([]);
        };
      });
    } catch (error) {
      ErrorHandler.logError(
        error as Error, 
        'Get All Whiteboards', 
        'medium'
      );
      return [];
    }
  }

  /**
   * 删除白板
   */
  async deleteWhiteboard(id: string): Promise<boolean> {
    if (!this.db) {
      const initSuccess = await this.init();
      if (!initSuccess) return false;
    }
    
    try {
      return await new Promise<boolean>((resolve, reject) => {
        const transaction = this.db!.transaction([this.stores.whiteboards], 'readwrite');
        const store = transaction.objectStore(this.stores.whiteboards);
        const request = store.delete(id);
        
        request.onsuccess = () => {
          console.log(`🗑️ 白板 ${id} 已删除`);
          resolve(true);
        };
        
        request.onerror = () => {
          const error = new Error(`删除白板失败: ${request.error?.message || 'Unknown error'}`);
          ErrorHandler.logError(error, 'IndexedDB Delete', 'medium');
          resolve(false);
        };
      });
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
   * 保存文件资源
   */
  async saveAsset(file: File, metadata: Record<string, any> = {}): Promise<string | null> {
    if (!this.db) {
      const initSuccess = await this.init();
      if (!initSuccess) return null;
    }
    
    try {
      return await new Promise<string | null>((resolve, reject) => {
        const id = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const transaction = this.db!.transaction([this.stores.assets], 'readwrite');
        const store = transaction.objectStore(this.stores.assets);
        
        const assetData: AssetData = {
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          data: file,
          metadata,
          createdAt: new Date()
        };
        
        const request = store.put(assetData);
        
        request.onsuccess = () => {
          console.log(`📎 资源 "${file.name}" 已保存 (${(file.size / 1024).toFixed(1)}KB)`);
          resolve(id);
        };
        
        request.onerror = () => {
          const error = new Error(`保存资源失败: ${request.error?.message || 'Unknown error'}`);
          ErrorHandler.logError(error, 'IndexedDB Asset', 'medium');
          resolve(null);
        };
      });
    } catch (error) {
      ErrorHandler.logError(
        error as Error, 
        'Save Asset', 
        'medium'
      );
      return null;
    }
  }

  /**
   * 获取文件资源
   */
  async getAsset(id: string): Promise<{ file: Blob; metadata: Record<string, any> } | null> {
    if (!this.db) {
      const initSuccess = await this.init();
      if (!initSuccess) return null;
    }
    
    try {
      return await new Promise<{ file: Blob; metadata: Record<string, any> } | null>((resolve, reject) => {
        const transaction = this.db!.transaction([this.stores.assets], 'readonly');
        const store = transaction.objectStore(this.stores.assets);
        const request = store.get(id);
        
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            resolve({
              file: result.data,
              metadata: result.metadata
            });
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          const error = new Error(`获取资源失败: ${request.error?.message || 'Unknown error'}`);
          ErrorHandler.logError(error, 'IndexedDB Asset Load', 'low');
          resolve(null);
        };
      });
    } catch (error) {
      ErrorHandler.logError(
        error as Error, 
        'Get Asset', 
        'low'
      );
      return null;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    whiteboards: number;
    assets: number;
    totalSize: number;
    lastUpdated: Date | null;
  }> {
    try {
      const whiteboards = await this.getAllWhiteboards();
      
      const stats = {
        whiteboards: whiteboards.length,
        assets: 0,
        totalSize: JSON.stringify(whiteboards).length,
        lastUpdated: whiteboards.length > 0 ? 
          whiteboards.reduce((latest, wb) => 
            wb.updatedAt > latest ? wb.updatedAt : latest, 
            whiteboards[0].updatedAt
          ) : null
      };
      
      return stats;
    } catch (error) {
      ErrorHandler.logError(
        error as Error, 
        'Get Storage Stats', 
        'low'
      );
      return {
        whiteboards: 0,
        assets: 0,
        totalSize: 0,
        lastUpdated: null
      };
    }
  }

  /**
   * 导出数据备份
   */
  async exportBackup(): Promise<string> {
    try {
      const whiteboards = await this.getAllWhiteboards();
      const stats = await this.getStorageStats();
      
      const backup = {
        version: this.version,
        exportDate: new Date().toISOString(),
        stats,
        data: {
          whiteboards
        }
      };
      
      return JSON.stringify(backup, null, 2);
    } catch (error) {
      ErrorHandler.logError(
        error as Error, 
        'Export Backup', 
        'medium'
      );
      return JSON.stringify({ error: 'Export failed' });
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('📪 IndexedDB 连接已关闭');
    }
  }

  /**
   * 检查IndexedDB是否可用
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }
}

// 创建单例实例
export const indexedDBAdapter = new IndexedDBAdapter(); 