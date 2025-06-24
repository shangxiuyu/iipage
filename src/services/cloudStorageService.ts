import OSS from 'ali-oss';

// 阿里云OSS配置接口
interface OSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint?: string;
}

// 白板云存储数据结构
interface CloudBoardData {
  id: string;
  title: string;
  nodes: any[];
  connections: any[];
  settings: any;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    shareEnabled: boolean;
  };
}

export class CloudStorageService {
  private client: OSS | null = null;
  private config: OSSConfig | null = null;
  private initialized = false;

  /**
   * 初始化阿里云OSS客户端
   */
  async initialize(config: OSSConfig): Promise<boolean> {
    try {
      this.config = config;
      this.client = new OSS({
        region: config.region,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        bucket: config.bucket,
        endpoint: config.endpoint,
        secure: true, // 使用HTTPS
      });
      
      // 测试连接
      await this.testConnection();
      this.initialized = true;
      console.log('☁️ 阿里云OSS初始化成功');
      return true;
    } catch (error) {
      console.error('❌ 阿里云OSS初始化失败:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * 测试OSS连接
   */
  private async testConnection(): Promise<void> {
    if (!this.client) throw new Error('OSS客户端未初始化');
    
    try {
             // 尝试列出bucket来测试连接
       await this.client.getBucketInfo(this.config!.bucket);
    } catch (error) {
      throw new Error(`OSS连接测试失败: ${error}`);
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized && this.client !== null;
  }

  /**
   * 保存白板数据到云端
   */
  async saveBoard(boardId: string, boardData: any): Promise<{ success: boolean; shareUrl?: string; error?: string }> {
    if (!this.isInitialized()) {
      return { success: false, error: '云存储服务未初始化' };
    }

    try {
      const cloudData: CloudBoardData = {
        id: boardId,
        title: boardData.title || '未命名白板',
        nodes: boardData.nodes || [],
        connections: boardData.connections || [],
        settings: {
          currentBackground: boardData.currentBackground,
          showGrid: boardData.showGrid,
          backgroundMode: boardData.backgroundMode,
          videoBackgroundUrl: boardData.videoBackgroundUrl,
          imageBackgroundUrl: boardData.imageBackgroundUrl,
          imageBlurLevel: boardData.imageBlurLevel,
          builtinBackgroundPath: boardData.builtinBackgroundPath,
          interactiveTheme: boardData.interactiveTheme,
          scale: boardData.scale,
          panX: boardData.panX,
          panY: boardData.panY,
        },
        metadata: {
          createdAt: boardData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          shareEnabled: true,
        }
      };

      const objectKey = `whiteboards/${boardId}.json`;
      const result = await this.client!.put(objectKey, Buffer.from(JSON.stringify(cloudData, null, 2)));
      
      const shareUrl = this.generateShareUrl(boardId);
      console.log(`☁️ 白板 "${boardData.title || boardId}" 已保存到云端`);
      
      return {
        success: true,
        shareUrl
      };
    } catch (error) {
      console.error('❌ 保存到云端失败:', error);
      return {
        success: false,
        error: `保存失败: ${error}`
      };
    }
  }

  /**
   * 从云端加载白板数据
   */
  async loadBoard(boardId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.isInitialized()) {
      return { success: false, error: '云存储服务未初始化' };
    }

    try {
      const objectKey = `whiteboards/${boardId}.json`;
      const result = await this.client!.get(objectKey);
      
      const cloudData: CloudBoardData = JSON.parse(result.content.toString());
      
      // 转换为白板应用的数据格式
      const boardData = {
        nodes: cloudData.nodes,
        connections: cloudData.connections,
        title: cloudData.title,
        ...cloudData.settings,
        shareId: boardId,
        isCloudBoard: true,
        cloudMetadata: cloudData.metadata,
      };

      console.log(`☁️ 从云端加载白板: "${cloudData.title}"`);
      return {
        success: true,
        data: boardData
      };
    } catch (error) {
      console.error('❌ 从云端加载失败:', error);
      return {
        success: false,
        error: `加载失败: ${error}`
      };
    }
  }

  /**
   * 检查云端是否存在指定白板
   */
  async boardExists(boardId: string): Promise<boolean> {
    if (!this.isInitialized()) return false;

    try {
      const objectKey = `whiteboards/${boardId}.json`;
      await this.client!.head(objectKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 删除云端白板
   */
  async deleteBoard(boardId: string): Promise<boolean> {
    if (!this.isInitialized()) return false;

    try {
      const objectKey = `whiteboards/${boardId}.json`;
      await this.client!.delete(objectKey);
      console.log(`☁️ 已从云端删除白板: ${boardId}`);
      return true;
    } catch (error) {
      console.error('❌ 删除云端白板失败:', error);
      return false;
    }
  }

  /**
   * 生成分享链接
   */
  generateShareUrl(boardId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${boardId}`;
  }

  /**
   * 获取云端白板列表（可选功能）
   */
  async listBoards(): Promise<{ success: boolean; boards?: any[]; error?: string }> {
    if (!this.isInitialized()) {
      return { success: false, error: '云存储服务未初始化' };
    }

    try {
      const result = await this.client!.list({
        prefix: 'whiteboards/',
        'max-keys': 100
      });

      const boards = [];
      if (result.objects) {
        for (const obj of result.objects) {
          if (obj.name && obj.name.endsWith('.json')) {
            const boardId = obj.name.replace('whiteboards/', '').replace('.json', '');
            boards.push({
              id: boardId,
              lastModified: obj.lastModified,
              size: obj.size
            });
          }
        }
      }

      return {
        success: true,
        boards
      };
    } catch (error) {
      console.error('❌ 获取云端白板列表失败:', error);
      return {
        success: false,
        error: `获取列表失败: ${error}`
      };
    }
  }

    /**
   * 生成临时访问链接（可选）
   */
  async generateTempUrl(boardId: string, expireSeconds: number = 3600): Promise<string | null> {
    if (!this.isInitialized()) return null;

    try {
      const objectKey = `whiteboards/${boardId}.json`;
      // 使用标准的分享URL，避免API差异
      return this.generateShareUrl(boardId);
    } catch (error) {
      console.error('❌ 生成临时链接失败:', error);
      return null;
    }
  }
}

// 单例模式
let cloudStorageInstance: CloudStorageService | null = null;

export const getCloudStorageService = (): CloudStorageService => {
  if (!cloudStorageInstance) {
    cloudStorageInstance = new CloudStorageService();
  }
  return cloudStorageInstance;
};

// 配置管理
export const getOSSConfigFromEnv = (): OSSConfig | null => {
  const config = {
    region: import.meta.env.VITE_OSS_REGION,
    accessKeyId: import.meta.env.VITE_OSS_ACCESS_KEY_ID,
    accessKeySecret: import.meta.env.VITE_OSS_ACCESS_KEY_SECRET,
    bucket: import.meta.env.VITE_OSS_BUCKET,
    endpoint: import.meta.env.VITE_OSS_ENDPOINT,
  };

  if (!config.region || !config.accessKeyId || !config.accessKeySecret || !config.bucket) {
    console.warn('⚠️ 阿里云OSS配置不完整，云端分享功能将不可用');
    return null;
  }

  return config;
}; 