/**
 * 统一存储服务 - 使用IndexedDB完全替代localStorage
 * 彻底解决双重持久化冲突问题
 */

import { IndexedDBAdapter } from '../utils/indexedDBAdapter';
import type { WhiteboardData } from '../utils/indexedDBAdapter';
import type { NodeData, Connection } from '../store/useBoardStore';

export interface BoardMetadata {
  id: string;
  title: string;
  cardCount: number;
  isActive: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  icon: string;
  shareId?: string;
}

export interface UnifiedBoardData {
  // 基础信息
  id: string;
  title: string;
  icon: string;
  isPinned: boolean;
  shareId?: string;
  
  // 白板内容
  nodes: NodeData[];
  connections: Connection[];
  
  // 视图状态
  currentBackground: string;
  showGrid: boolean;
  backgroundMode: string;
  videoBackgroundUrl: string | null;
  imageBackgroundUrl: string | null;
  imageBlurLevel: number;
  builtinBackgroundPath: string | null;
  interactiveTheme: any;
  scale: number;
  panX: number;
  panY: number;
  
  // 配置
  defaultCardConfig: any;
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export class UnifiedStorageService {
  private dbAdapter: IndexedDBAdapter;
  private isInitialized = false;
  private currentBoardId: string | null = null;
  
  // 缓存当前白板数据，避免频繁读写IndexedDB
  private currentBoardCache: UnifiedBoardData | null = null;
  private autoSaveTimer: number | null = null;
  private readonly AUTO_SAVE_DELAY = 1000; // 1秒自动保存

  constructor() {
    this.dbAdapter = new IndexedDBAdapter();
  }

  /**
   * 初始化服务
   */
  async init(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    try {
      const success = await this.dbAdapter.init();
      if (success) {
        this.isInitialized = true;
        console.log('✅ 统一存储服务初始化成功');
        
        // 清理旧的localStorage数据
        await this.migrateFromLocalStorage();
      }
      return success;
    } catch (error) {
      console.error('❌ 统一存储服务初始化失败:', error);
      return false;
    }
  }

  /**
   * 从localStorage迁移数据到IndexedDB
   */
  private async migrateFromLocalStorage(): Promise<void> {
    console.log('🔄 开始从localStorage迁移数据...');
    
    let migratedCount = 0;
    const keysToRemove: string[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('whiteboard-data-')) continue;
        
        const data = localStorage.getItem(key);
        if (!data) continue;
        
        try {
          const boardData = JSON.parse(data);
          const boardId = key.replace('whiteboard-data-', '');
          
          // 转换为统一格式
          const unifiedData: UnifiedBoardData = {
            id: boardId,
            title: boardData.title || '未命名白板',
            icon: boardData.icon || '1F4C4.png',
            isPinned: boardData.isPinned || false,
            shareId: boardData.shareId,
            
            nodes: boardData.nodes || [],
            connections: boardData.connections || [],
            
            currentBackground: boardData.currentBackground || 'default',
            showGrid: boardData.showGrid ?? true,
            backgroundMode: boardData.backgroundMode || 'grid',
            videoBackgroundUrl: boardData.videoBackgroundUrl || null,
            imageBackgroundUrl: boardData.imageBackgroundUrl || null,
            imageBlurLevel: boardData.imageBlurLevel || 0,
            builtinBackgroundPath: boardData.builtinBackgroundPath || null,
            interactiveTheme: boardData.interactiveTheme || null,
            scale: boardData.scale || 1,
            panX: boardData.panX || 0,
            panY: boardData.panY || 0,
            
            defaultCardConfig: boardData.defaultCardConfig || {},
            
            createdAt: boardData.createdAt ? new Date(boardData.createdAt) : new Date(),
            updatedAt: new Date(),
            version: 1
          };
          
          // 保存到IndexedDB
          const whiteboardData: Partial<WhiteboardData> = {
            id: unifiedData.id,
            title: unifiedData.title,
            nodes: unifiedData.nodes,
            connections: unifiedData.connections,
            currentBackground: unifiedData.currentBackground,
            showGrid: unifiedData.showGrid,
            backgroundMode: unifiedData.backgroundMode,
            videoBackgroundUrl: unifiedData.videoBackgroundUrl,
            imageBackgroundUrl: unifiedData.imageBackgroundUrl,
            imageBlurLevel: unifiedData.imageBlurLevel,
            interactiveTheme: unifiedData.interactiveTheme,
            scale: unifiedData.scale,
            panX: unifiedData.panX,
            panY: unifiedData.panY,
            defaultCardConfig: unifiedData.defaultCardConfig,
            createdAt: unifiedData.createdAt,
            version: unifiedData.version
          };
          
          const success = await this.dbAdapter.saveWhiteboard(whiteboardData);
          if (success) {
            migratedCount++;
            keysToRemove.push(key);
            console.log(`✅ 迁移白板: ${unifiedData.title} (${boardId})`);
          }
        } catch (parseError) {
          console.warn(`⚠️ 跳过损坏的白板数据: ${key}`, parseError);
          keysToRemove.push(key); // 清理损坏的数据
        }
      }
      
      // 清理已迁移的localStorage数据
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ 清理localStorage键: ${key}`);
      });
      
      // 清理其他白板相关的localStorage键
      const conflictKeys = ['whiteboard-storage', 'whiteboard-current-board'];
      conflictKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`🗑️ 清理冲突键: ${key}`);
        }
      });
      
      console.log(`✅ 数据迁移完成！共迁移 ${migratedCount} 个白板`);
      
    } catch (error) {
      console.error('❌ 数据迁移失败:', error);
    }
  }

  /**
   * 获取所有白板的元数据
   */
  async getAllBoards(): Promise<BoardMetadata[]> {
    if (!this.isInitialized && !(await this.init())) {
      return [];
    }
    
    try {
      const whiteboards = await this.dbAdapter.getAllWhiteboards();
      return whiteboards.map(wb => ({
        id: wb.id,
        title: wb.title,
        cardCount: wb.nodes.length,
        isActive: wb.id === this.currentBoardId,
        isPinned: false, // TODO: 从扩展数据中读取
        createdAt: wb.createdAt,
        updatedAt: wb.updatedAt,
        icon: '1F4C4.png', // TODO: 从扩展数据中读取
        shareId: undefined // TODO: 从扩展数据中读取
      }));
    } catch (error) {
      console.error('❌ 获取白板列表失败:', error);
      return [];
    }
  }

  /**
   * 保存白板数据（带缓存和防抖）
   */
  async saveBoard(boardData: Partial<UnifiedBoardData>): Promise<boolean> {
    if (!this.isInitialized && !(await this.init())) {
      return false;
    }
    
    try {
      // 更新缓存
      if (this.currentBoardCache && boardData.id === this.currentBoardCache.id) {
        this.currentBoardCache = { ...this.currentBoardCache, ...boardData, updatedAt: new Date() };
      }
      
      // 防抖保存
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
      }
      
      this.autoSaveTimer = window.setTimeout(async () => {
        const dataToSave = this.currentBoardCache || boardData;
        const whiteboardData: Partial<WhiteboardData> = {
          id: dataToSave.id,
          title: dataToSave.title,
          nodes: dataToSave.nodes,
          connections: dataToSave.connections,
          currentBackground: dataToSave.currentBackground,
          showGrid: dataToSave.showGrid,
          backgroundMode: dataToSave.backgroundMode,
          videoBackgroundUrl: dataToSave.videoBackgroundUrl,
          imageBackgroundUrl: dataToSave.imageBackgroundUrl,
          imageBlurLevel: dataToSave.imageBlurLevel,
          interactiveTheme: dataToSave.interactiveTheme,
          scale: dataToSave.scale,
          panX: dataToSave.panX,
          panY: dataToSave.panY,
          defaultCardConfig: dataToSave.defaultCardConfig,
          version: dataToSave.version
        };
        
        const success = await this.dbAdapter.saveWhiteboard(whiteboardData);
        if (success) {
          console.log(`💾 白板已保存: ${dataToSave.title} (防抖)`);
        }
      }, this.AUTO_SAVE_DELAY);
      
      return true;
    } catch (error) {
      console.error('❌ 保存白板失败:', error);
      return false;
    }
  }

  /**
   * 立即保存白板数据（无防抖）
   */
  async saveBoardImmediately(boardData: Partial<UnifiedBoardData>): Promise<boolean> {
    if (!this.isInitialized && !(await this.init())) {
      return false;
    }
    
    // 清除防抖计时器
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    
    try {
      const whiteboardData: Partial<WhiteboardData> = {
        id: boardData.id,
        title: boardData.title,
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
        defaultCardConfig: boardData.defaultCardConfig,
        version: boardData.version
      };
      
      const success = await this.dbAdapter.saveWhiteboard(whiteboardData);
      if (success) {
        console.log(`💾 白板已立即保存: ${boardData.title}`);
        
        // 更新缓存
        if (boardData.id === this.currentBoardId) {
          this.currentBoardCache = { ...boardData, updatedAt: new Date() } as UnifiedBoardData;
        }
      }
      return success;
    } catch (error) {
      console.error('❌ 立即保存白板失败:', error);
      return false;
    }
  }

  /**
   * 加载白板数据
   */
  async loadBoard(boardId: string): Promise<UnifiedBoardData | null> {
    if (!this.isInitialized && !(await this.init())) {
      return null;
    }
    
    try {
      // 检查缓存
      if (this.currentBoardCache && this.currentBoardCache.id === boardId) {
        console.log(`📋 从缓存加载白板: ${this.currentBoardCache.title}`);
        return this.currentBoardCache;
      }
      
      const whiteboardData = await this.dbAdapter.loadWhiteboard(boardId);
      if (!whiteboardData) {
        console.log(`📋 白板不存在: ${boardId}`);
        return null;
      }
      
      const unifiedData: UnifiedBoardData = {
        id: whiteboardData.id,
        title: whiteboardData.title,
        icon: '1F4C4.png', // TODO: 从扩展数据读取
        isPinned: false, // TODO: 从扩展数据读取
        shareId: undefined, // TODO: 从扩展数据读取
        
        nodes: whiteboardData.nodes,
        connections: whiteboardData.connections,
        
        currentBackground: whiteboardData.currentBackground,
        showGrid: whiteboardData.showGrid,
        backgroundMode: whiteboardData.backgroundMode,
        videoBackgroundUrl: whiteboardData.videoBackgroundUrl,
        imageBackgroundUrl: whiteboardData.imageBackgroundUrl,
        imageBlurLevel: whiteboardData.imageBlurLevel,
        builtinBackgroundPath: null, // TODO: 添加到WhiteboardData接口
        interactiveTheme: whiteboardData.interactiveTheme,
        scale: whiteboardData.scale,
        panX: whiteboardData.panX,
        panY: whiteboardData.panY,
        
        defaultCardConfig: whiteboardData.defaultCardConfig,
        
        createdAt: whiteboardData.createdAt,
        updatedAt: whiteboardData.updatedAt,
        version: whiteboardData.version
      };
      
      // 更新缓存和当前白板ID
      this.currentBoardId = boardId;
      this.currentBoardCache = unifiedData;
      
      console.log(`📋 白板已加载: ${unifiedData.title} (${boardId})`);
      return unifiedData;
      
    } catch (error) {
      console.error(`❌ 加载白板失败: ${boardId}`, error);
      return null;
    }
  }

  /**
   * 删除白板
   */
  async deleteBoard(boardId: string): Promise<boolean> {
    if (!this.isInitialized && !(await this.init())) {
      return false;
    }
    
    try {
      const success = await this.dbAdapter.deleteWhiteboard(boardId);
      if (success) {
        // 清理缓存
        if (this.currentBoardId === boardId) {
          this.currentBoardId = null;
          this.currentBoardCache = null;
        }
        console.log(`🗑️ 白板已删除: ${boardId}`);
      }
      return success;
    } catch (error) {
      console.error(`❌ 删除白板失败: ${boardId}`, error);
      return false;
    }
  }

  /**
   * 设置当前活跃白板
   */
  setCurrentBoard(boardId: string): void {
    this.currentBoardId = boardId;
    console.log(`📌 设置当前白板: ${boardId}`);
  }

  /**
   * 获取当前活跃白板ID
   */
  getCurrentBoardId(): string | null {
    return this.currentBoardId;
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    boardCount: number;
    totalSize: number;
    lastUpdated: Date | null;
  }> {
    if (!this.isInitialized && !(await this.init())) {
      return { boardCount: 0, totalSize: 0, lastUpdated: null };
    }
    
    try {
      const stats = await this.dbAdapter.getStorageStats();
      return {
        boardCount: stats.whiteboards,
        totalSize: stats.totalSize,
        lastUpdated: stats.lastUpdated
      };
    } catch (error) {
      console.error('❌ 获取存储统计失败:', error);
      return { boardCount: 0, totalSize: 0, lastUpdated: null };
    }
  }

  /**
   * 清理所有数据
   */
  async clearAllData(): Promise<boolean> {
    if (!this.isInitialized && !(await this.init())) {
      return false;
    }
    
    try {
      const boards = await this.getAllBoards();
      let successCount = 0;
      
      for (const board of boards) {
        if (await this.deleteBoard(board.id)) {
          successCount++;
        }
      }
      
      // 清理缓存
      this.currentBoardId = null;
      this.currentBoardCache = null;
      
      console.log(`🗑️ 已清理 ${successCount}/${boards.length} 个白板`);
      return successCount === boards.length;
    } catch (error) {
      console.error('❌ 清理数据失败:', error);
      return false;
    }
  }
}

// 创建单例实例
export const unifiedStorageService = new UnifiedStorageService();

// 在页面加载时自动初始化
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    unifiedStorageService.init().then(success => {
      if (success) {
        console.log('🚀 统一存储服务已就绪');
      } else {
        console.error('💥 统一存储服务初始化失败');
      }
    });
  });
} 