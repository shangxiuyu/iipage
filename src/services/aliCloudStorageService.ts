/**
 * 阿里云OSS存储服务
 * 提供白板数据的云端存储、读取、删除等功能
 */

import OSS from 'ali-oss';

interface AliCloudConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint?: string;
  // STS Token配置（推荐使用）
  stsToken?: string;
  // 是否使用STS Token
  useSTS?: boolean;
}

interface StorageResult {
  success: boolean;
  data?: any;
  error?: string;
  url?: string;
}

class AliCloudStorageService {
  private client: OSS | null = null;
  private config: AliCloudConfig | null = null;
  private isInitialized = false;

  /**
   * 初始化阿里云OSS客户端
   */
  async initialize(config: AliCloudConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // 根据配置选择认证方式
      const clientConfig: any = {
        region: config.region,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        bucket: config.bucket,
        endpoint: config.endpoint,
        // 开启HTTPS
        secure: true,
        // 设置超时时间
        timeout: 60000,
      };

      // 如果使用STS Token，添加stsToken配置
      if (config.useSTS && config.stsToken) {
        clientConfig.stsToken = config.stsToken;
        console.log('使用STS Token进行阿里云OSS认证（推荐方式）');
      } else {
        console.warn('使用AccessKey进行阿里云OSS认证，建议使用STS Token以提高安全性');
      }

      this.client = new OSS(clientConfig);

      // 测试连接
      await this.testConnection();
      this.isInitialized = true;
      
      console.log('阿里云OSS初始化成功');
      return true;
    } catch (error) {
      console.error('阿里云OSS初始化失败:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * 测试连接是否正常
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('OSS客户端未初始化');
    }

    try {
      // 尝试列出文件来测试连接（更安全的方式）
      await this.client.list({
        prefix: 'test/',
        'max-keys': 1,
      }, {});
      console.log('阿里云OSS连接测试成功');
    } catch (error: any) {
      console.error('阿里云OSS连接测试失败:', error);
      // 如果是权限相关错误，说明连接正常但权限不足
      if (error.code === 'AccessDenied' || error.code === 'InvalidAccessKeyId') {
        throw new Error(`OSS连接失败: ${error.message}`);
      }
      // 其他错误也抛出
      throw error;
    }
  }

  /**
   * 检查服务是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * 保存白板数据到云端（支持访问权限控制）
   */
  async saveBoard(boardId: string, boardData: any, shareEnabled: boolean = true): Promise<StorageResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: '阿里云OSS服务未初始化'
      };
    }

    try {
      const key = `whiteboards/${boardId}.json`;
      
      // 添加访问权限控制字段
      const enhancedBoardData = {
        ...boardData,
        shareEnabled: shareEnabled, // 🔑 访问权限控制字段
        lastModified: new Date().toISOString(),
        shareId: boardId // 确保包含shareId
      };
      
      const content = JSON.stringify(enhancedBoardData, null, 2);
      
      // 在浏览器环境中使用Blob对象代替Buffer
      const blob = new Blob([content], { type: 'application/json' });
      
      // 上传到OSS
      const result = await this.client!.put(key, blob, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      // 生成访问URL
      const url = this.client!.signatureUrl(key, {
        method: 'GET',
        expires: 3600 * 24 * 7, // 7天有效期
      });

      console.log(`白板 ${boardId} 保存到阿里云OSS成功，分享状态: ${shareEnabled ? '启用' : '禁用'}`);
      
      return {
        success: true,
        data: enhancedBoardData,
        url: url,
      };
    } catch (error: any) {
      console.error('保存白板到阿里云OSS失败:', error);
      return {
        success: false,
        error: error.message || '保存失败',
      };
    }
  }

  /**
   * 从云端加载白板数据
   */
  async loadBoard(boardId: string): Promise<StorageResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: '阿里云OSS服务未初始化'
      };
    }

    try {
      const key = `whiteboards/${boardId}.json`;
      
      // 从OSS获取数据
      const result = await this.client!.get(key);
      
      if (!result.content) {
        return {
          success: false,
          error: '白板数据为空'
        };
      }

      // 解析JSON数据
      const boardData = JSON.parse(result.content.toString());
      
      console.log(`从阿里云OSS加载白板 ${boardId} 成功`);
      
      return {
        success: true,
        data: boardData,
      };
    } catch (error: any) {
      console.error('从阿里云OSS加载白板失败:', error);
      
      // 如果是文件不存在的错误
      if (error.code === 'NoSuchKey') {
        return {
          success: false,
          error: '白板不存在'
        };
      }
      
      return {
        success: false,
        error: error.message || '加载失败',
      };
    }
  }

  /**
   * 删除云端白板数据（增强版：包含删除后验证）
   */
  async deleteBoard(boardId: string): Promise<StorageResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: '阿里云OSS服务未初始化'
      };
    }

    try {
      const key = `whiteboards/${boardId}.json`;
      
      // 🔍 第一步：检查文件是否存在
      const existsBefore = await this.boardExists(boardId);
      if (!existsBefore) {
        console.log(`白板 ${boardId} 在云端不存在，删除操作视为成功`);
        return {
          success: true,
        };
      }
      
      // 🗑️ 第二步：执行删除操作
      console.log(`正在从阿里云OSS删除白板 ${boardId}...`);
      await this.client!.delete(key);
      
      // ✅ 第三步：验证删除是否成功
      const existsAfter = await this.boardExists(boardId);
      if (existsAfter) {
        console.error(`删除验证失败：白板 ${boardId} 仍然存在于云端`);
        return {
          success: false,
          error: '删除操作未生效，文件仍然存在于云端'
        };
      }
      
      console.log(`从阿里云OSS删除白板 ${boardId} 成功，已验证文件不存在`);
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('从阿里云OSS删除白板失败:', error);
      
      // 🚨 处理CORS错误 - 这是严重的配置问题
      if (error.message && (
        error.message.includes('CORS') || 
        error.message.includes('Access-Control-Allow-Origin') ||
        error.message.includes('preflight')
      )) {
        return {
          success: false,
          error: 'CORS配置错误：需要在阿里云OSS控制台配置跨域规则允许DELETE请求'
        };
      }
      
      // 🔌 处理网络连接错误
      if (error.message && (
        error.message.includes('XHR error') || 
        error.message.includes('RequestError') ||
        error.message.includes('connected: false')
      )) {
        return {
          success: false,
          error: '网络连接失败：请检查网络连接和OSS服务状态'
        };
      }
      
      // 📁 如果是文件不存在的错误，视为成功
      if (error.code === 'NoSuchKey') {
        console.log(`白板 ${boardId} 不存在，删除操作视为成功`);
        return {
          success: true,
        };
      }
      
      return {
        success: false,
        error: error.message || '删除失败',
      };
    }
  }

  /**
   * 列出所有云端白板
   */
  async listBoards(): Promise<StorageResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: '阿里云OSS服务未初始化'
      };
    }

    try {
      // 列出白板文件
      const result = await this.client!.list({
        prefix: 'whiteboards/',
        'max-keys': 1000,
      }, {});

      const boards: any[] = [];
      
      if (result.objects) {
        for (const object of result.objects) {
          // 只处理.json文件
          if (object.name && object.name.endsWith('.json')) {
            const boardId = object.name.replace('whiteboards/', '').replace('.json', '');
            boards.push({
              id: boardId,
              name: `白板 ${boardId}`,
              lastModified: object.lastModified,
              size: object.size,
            });
          }
        }
      }

      console.log(`从阿里云OSS列出 ${boards.length} 个白板`);
      
      return {
        success: true,
        data: boards,
      };
    } catch (error: any) {
      console.error('从阿里云OSS列出白板失败:', error);
      return {
        success: false,
        error: error.message || '列出失败',
      };
    }
  }

  /**
   * 检查白板是否存在于云端
   */
  async boardExists(boardId: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const key = `whiteboards/${boardId}.json`;
      await this.client!.head(key);
      return true;
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        return false;
      }
      console.error('检查白板存在性失败:', error);
      return false;
    }
  }

  /**
   * 上传文件到OSS
   */
  async uploadFile(filePath: string, file: File | Blob): Promise<StorageResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: '阿里云OSS服务未初始化'
      };
    }

    try {
      console.log(`🔄 正在上传文件: ${filePath} (${(file.size / 1024).toFixed(1)}KB)`);
      
      const result = await this.client!.put(filePath, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (result && result.url) {
        console.log(`✅ 文件上传成功: ${result.url}`);
        return {
          success: true,
          url: result.url,
          data: {
            name: result.name,
            url: result.url,
            size: file.size,
          }
        };
      } else {
        return {
          success: false,
          error: '上传成功但未返回URL'
        };
      }
    } catch (error: any) {
      console.error('文件上传失败:', error);
      return {
        success: false,
        error: error.message || '文件上传失败',
      };
    }
  }

  /**
   * 删除OSS文件
   */
  async deleteFile(filePath: string): Promise<StorageResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: '阿里云OSS服务未初始化'
      };
    }

    try {
      await this.client!.delete(filePath);
      console.log(`🗑️ 文件删除成功: ${filePath}`);
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('文件删除失败:', error);
      return {
        success: false,
        error: error.message || '文件删除失败',
      };
    }
  }

  /**
   * 获取文件的签名URL
   */
  async getFileUrl(filePath: string, expires: number = 3600): Promise<string | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const url = this.client!.signatureUrl(filePath, {
        method: 'GET',
        expires: expires,
      });
      return url;
    } catch (error) {
      console.error('生成文件URL失败:', error);
      return null;
    }
  }

  /**
   * 批量保存多个白板
   */
  async saveBatchBoards(boards: Array<{ id: string; data: any }>): Promise<StorageResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: '阿里云OSS服务未初始化'
      };
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const board of boards) {
      try {
        const result = await this.saveBoard(board.id, board.data);
        if (result.success) {
          results.push({ id: board.id, success: true });
        } else {
          errors.push({ id: board.id, error: result.error });
        }
      } catch (error: any) {
        errors.push({ id: board.id, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      data: {
        successful: results,
        failed: errors,
        total: boards.length,
        successCount: results.length,
        failureCount: errors.length,
      },
      error: errors.length > 0 ? `${errors.length} 个白板保存失败` : undefined,
    };
  }

  /**
   * 获取白板的公共访问URL
   */
  async getBoardPublicUrl(boardId: string, expires: number = 3600): Promise<string | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const key = `whiteboards/${boardId}.json`;
      const url = this.client!.signatureUrl(key, {
        method: 'GET',
        expires: expires,
      });
      return url;
    } catch (error) {
      console.error('生成公共URL失败:', error);
      return null;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<StorageResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: '阿里云OSS服务未初始化'
      };
    }

    try {
      const result = await this.client!.list({
        prefix: 'whiteboards/',
        'max-keys': 1000,
      }, {});

      let totalSize = 0;
      let fileCount = 0;

      if (result.objects) {
        for (const object of result.objects) {
          if (object.name && object.name.endsWith('.json')) {
            totalSize += object.size || 0;
            fileCount++;
          }
        }
      }

      return {
        success: true,
        data: {
          fileCount,
          totalSize,
          totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
          bucket: this.config?.bucket,
          region: this.config?.region,
        },
      };
    } catch (error: any) {
      console.error('获取存储统计失败:', error);
      return {
        success: false,
        error: error.message || '获取统计失败',
      };
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.client = null;
    this.config = null;
    this.isInitialized = false;
    console.log('阿里云OSS连接已断开');
  }

  /**
   * 禁用分享（不删除文件，只修改访问权限）
   */
  async disableShare(boardId: string): Promise<StorageResult> {
    if (!this.isReady()) {
      return {
        success: false,
        error: '阿里云OSS服务未初始化'
      };
    }

    try {
      const key = `whiteboards/${boardId}.json`;
      
      // 🔍 第一步：获取现有数据
      console.log(`正在获取白板 ${boardId} 的现有数据...`);
      const existingResult = await this.loadBoard(boardId);
      
      if (!existingResult.success) {
        console.log(`白板 ${boardId} 在云端不存在，无需禁用分享`);
        return {
          success: true,
        };
      }
      
      // 🔒 第二步：修改分享权限为禁用
      const updatedData = {
        ...existingResult.data,
        shareEnabled: false, // 🔑 禁用分享访问
        lastModified: new Date().toISOString(),
        shareDisabledAt: new Date().toISOString() // 记录禁用时间
      };
      
      const content = JSON.stringify(updatedData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      
      // 🔄 第三步：更新云端文件
      console.log(`正在更新白板 ${boardId} 的分享权限...`);
      await this.client!.put(key, blob, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
      
      console.log(`白板 ${boardId} 分享权限已禁用，文件仍保存在云端但访问被阻断`);
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('禁用分享失败:', error);
      
      // 🚨 即使是CORS错误也能成功处理，因为不需要DELETE操作
      if (error.message && (
        error.message.includes('CORS') || 
        error.message.includes('Access-Control-Allow-Origin') ||
        error.message.includes('preflight')
      )) {
        return {
          success: false,
          error: 'CORS配置错误：需要在阿里云OSS控制台配置跨域规则允许PUT请求'
        };
      }
      
      return {
        success: false,
        error: error.message || '禁用分享失败',
      };
    }
  }
}

// 创建单例实例
export const aliCloudStorage = new AliCloudStorageService();
export default aliCloudStorage; 