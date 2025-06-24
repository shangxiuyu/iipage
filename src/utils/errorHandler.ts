/**
 * 错误处理工具类
 * 提供统一的错误日志记录和处理机制
 */

export type ErrorLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  level: ErrorLevel;
  context: string;
  message: string;
  stack?: string;
  userAgent?: string;
  url?: string;
}

export class ErrorHandler {
  private static errorLog: ErrorLogEntry[] = [];
  private static maxLogSize = 100;

  /**
   * 记录错误日志
   */
  static logError(
    error: Error,
    context: string = 'Unknown',
    level: ErrorLevel = 'medium'
  ): void {
    const logEntry: ErrorLogEntry = {
      id: `error-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      level,
      context,
      message: error.message,
      stack: error.stack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    // 添加到错误日志
    this.errorLog.unshift(logEntry);
    
    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // 根据错误级别决定是否在控制台输出
    switch (level) {
      case 'critical':
        console.error(`🚨 [CRITICAL] ${context}:`, error);
        break;
      case 'high':
        console.error(`❌ [HIGH] ${context}:`, error);
        break;
      case 'medium':
        console.warn(`⚠️ [MEDIUM] ${context}:`, error);
        break;
      case 'low':
        console.log(`ℹ️ [LOW] ${context}:`, error);
        break;
    }

    // 在开发环境中，高级别错误抛出到控制台
    if (process.env.NODE_ENV === 'development' && level === 'critical') {
      throw error;
    }
  }

  /**
   * 记录信息日志
   */
  static logInfo(message: string, context: string = 'Info'): void {
    console.log(`ℹ️ [${context}] ${message}`);
  }

  /**
   * 记录警告日志
   */
  static logWarning(message: string, context: string = 'Warning'): void {
    console.warn(`⚠️ [${context}] ${message}`);
  }

  /**
   * 获取错误日志
   */
  static getErrorLog(): ErrorLogEntry[] {
    return [...this.errorLog];
  }

  /**
   * 清空错误日志
   */
  static clearErrorLog(): void {
    this.errorLog = [];
    console.log('🗑️ 错误日志已清空');
  }

  /**
   * 获取特定级别的错误
   */
  static getErrorsByLevel(level: ErrorLevel): ErrorLogEntry[] {
    return this.errorLog.filter(entry => entry.level === level);
  }

  /**
   * 导出错误日志
   */
  static exportErrorLog(): string {
    const logData = {
      exportTime: new Date().toISOString(),
      totalErrors: this.errorLog.length,
      errors: this.errorLog
    };
    
    return JSON.stringify(logData, null, 2);
  }

  /**
   * 包装异步函数以自动捕获错误
   */
  static async wrapAsync<T>(
    fn: () => Promise<T>,
    context: string,
    level: ErrorLevel = 'medium'
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.logError(error as Error, context, level);
      return null;
    }
  }

  /**
   * 包装同步函数以自动捕获错误
   */
  static wrapSync<T>(
    fn: () => T,
    context: string,
    level: ErrorLevel = 'medium'
  ): T | null {
    try {
      return fn();
    } catch (error) {
      this.logError(error as Error, context, level);
      return null;
    }
  }

  /**
   * 检查是否有关键错误
   */
  static hasCriticalErrors(): boolean {
    return this.errorLog.some(entry => entry.level === 'critical');
  }

  /**
   * 获取错误统计
   */
  static getErrorStats(): Record<ErrorLevel, number> {
    const stats: Record<ErrorLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    this.errorLog.forEach(entry => {
      stats[entry.level]++;
    });

    return stats;
  }
}

// 全局错误捕获
if (typeof window !== 'undefined') {
  // 捕获未处理的Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.logError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      'Global Promise',
      'high'
    );
  });

  // 捕获未处理的JavaScript错误
  window.addEventListener('error', (event) => {
    ErrorHandler.logError(
      new Error(`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`),
      'Global JavaScript',
      'high'
    );
  });

  // 将ErrorHandler暴露到window对象用于调试
  (window as any).ErrorHandler = ErrorHandler;
} 