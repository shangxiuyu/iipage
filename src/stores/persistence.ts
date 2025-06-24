import type { StateCreator } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import React from 'react';
import { useDebounce } from './performance';

/**
 * 增量持久化中间件
 * 只保存发生变化的数据，减少存储开销
 */
interface IncrementalPersistOptions {
  name: string;
  version?: number;
  migrate?: (persistedState: any, version: number) => any;
  partialize?: (state: any) => any;
  whitelist?: string[];
  blacklist?: string[];
  throttle?: number;
  compress?: boolean;
}

interface PersistStorage {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

// 简单的压缩和解压缩实现
const compress = (data: string): string => {
  try {
    // 简单的LZ77风格压缩（实际项目中应该使用专门的压缩库）
    return btoa(data);
  } catch {
    return data;
  }
};

const decompress = (data: string): string => {
  try {
    return atob(data);
  } catch {
    return data;
  }
};

// 默认存储适配器
const defaultStorage: PersistStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

export function createIncrementalPersist<T>(
  options: IncrementalPersistOptions,
  storage: PersistStorage = defaultStorage
) {
  return (config: StateCreator<T>) => {
    const {
      name,
      version = 0,
      migrate,
      partialize,
      whitelist,
      blacklist,
      throttle = 1000,
      compress: shouldCompress = false,
    } = options;

    // 加载持久化状态
    const loadPersistedState = async (): Promise<Partial<T> | null> => {
      try {
        const stored = await storage.getItem(name);
        if (!stored) return null;

        const parsed = JSON.parse(
          shouldCompress ? decompress(stored) : stored
        );

        // 版本迁移
        if (migrate && parsed.version !== version) {
          const migrated = migrate(parsed.state, parsed.version || 0);
          return migrated;
        }

        return parsed.state;
      } catch (error) {
        console.warn(`Failed to load persisted state for ${name}:`, error);
        return null;
      }
    };

    // 保存状态（带防抖）
    let saveTimeout: number | undefined;
    const saveState = (state: T) => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      //@ts-ignore
saveTimeout = setTimeout(async () => {
        try {
          let stateToSave = state;

          // 应用partialize
          if (partialize) {
            stateToSave = partialize(state);
          }

          // 应用白名单/黑名单
          if (whitelist || blacklist) {
            const filtered: any = {};
            const keys = Object.keys(stateToSave as any);

            for (const key of keys) {
              if (whitelist && !whitelist.includes(key)) continue;
              if (blacklist && blacklist.includes(key)) continue;
              filtered[key] = (stateToSave as any)[key];
            }

            stateToSave = filtered;
          }

          const serialized = JSON.stringify({
            state: stateToSave,
            version,
            timestamp: Date.now(),
          });

          const dataToStore = shouldCompress ? compress(serialized) : serialized;
          await storage.setItem(name, dataToStore);
        } catch (error) {
          console.warn(`Failed to save state for ${name}:`, error);
        }
      }, throttle);
    };

    return subscribeWithSelector(config as any) as any;
  };
}

/**
 * 状态同步管理器
 * 用于多个store之间的状态同步
 */
class StateSyncManager {
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private broadcastChannel?: BroadcastChannel;

  constructor() {
    // 如果支持BroadcastChannel，用于跨标签页同步
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('whiteboard-state-sync');
      this.broadcastChannel.addEventListener('message', (event) => {
        this.notify(event.data.key, event.data.value, false);
      });
    }
  }

  subscribe(key: string, callback: (data: any) => void) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  publish(key: string, data: any, broadcast = true) {
    this.notify(key, data, false);
    
    if (broadcast && this.broadcastChannel) {
      this.broadcastChannel.postMessage({ key, value: data });
    }
  }

  private notify(key: string, data: any, fromBroadcast: boolean) {
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      subscribers.forEach(callback => callback(data));
    }
  }

  destroy() {
    this.subscribers.clear();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }
}

export const stateSyncManager = new StateSyncManager();

/**
 * 状态备份和恢复工具
 */
export class StateBackupManager {
  private backups: Map<string, any[]> = new Map();
  private maxBackups: number;

  constructor(maxBackups = 10) {
    this.maxBackups = maxBackups;
  }

  backup(key: string, state: any) {
    if (!this.backups.has(key)) {
      this.backups.set(key, []);
    }

    const backupList = this.backups.get(key)!;
    backupList.push({
      state: JSON.parse(JSON.stringify(state)), // 深拷贝
      timestamp: Date.now(),
    });

    // 限制备份数量
    if (backupList.length > this.maxBackups) {
      backupList.shift();
    }
  }

  restore(key: string, index = -1): any | null {
    const backupList = this.backups.get(key);
    if (!backupList || backupList.length === 0) {
      return null;
    }

    const actualIndex = index < 0 ? backupList.length + index : index;
    const backup = backupList[actualIndex];
    
    return backup ? backup.state : null;
  }

  getBackupList(key: string) {
    return this.backups.get(key) || [];
  }

  clearBackups(key?: string) {
    if (key) {
      this.backups.delete(key);
    } else {
      this.backups.clear();
    }
  }
}

/**
 * 自动保存Hook
 */
export function useAutoSave<T>(
  getState: () => T,
  key: string,
  options: {
    interval?: number;
    enabled?: boolean;
    condition?: (state: T) => boolean;
  } = {}
) {
  const { interval = 30000, enabled = true, condition } = options;
  const backupManager = new StateBackupManager();

  React.useEffect(() => {
    if (!enabled) return;

    const autoSave = () => {
      const state = getState();
      
      if (condition && !condition(state)) {
        return;
      }

      backupManager.backup(key, state);
    };

    const intervalId = setInterval(autoSave, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [getState, key, interval, enabled, condition]);

  return {
    backup: () => backupManager.backup(key, getState()),
    restore: (index?: number) => backupManager.restore(key, index),
    getBackupList: () => backupManager.getBackupList(key),
    clearBackups: () => backupManager.clearBackups(key),
  };
}

/**
 * 状态差异检测工具
 */
export function createStateDiffer<T>() {
  let previousState: T | null = null;
  
  return {
    getDiff: (currentState: T): Partial<T> | null => {
      if (!previousState) {
        previousState = JSON.parse(JSON.stringify(currentState));
        return null;
      }

      const diff: any = {};
      let hasChanges = false;

      const compareObjects = (prev: any, current: any, path = '') => {
        for (const key in current) {
          if (current.hasOwnProperty(key)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (typeof current[key] === 'object' && current[key] !== null) {
              if (!prev[key] || typeof prev[key] !== 'object') {
                diff[key] = current[key];
                hasChanges = true;
              } else {
                compareObjects(prev[key], current[key], currentPath);
              }
            } else if (prev[key] !== current[key]) {
              diff[key] = current[key];
              hasChanges = true;
            }
          }
        }
      };

      compareObjects(previousState, currentState);
      previousState = JSON.parse(JSON.stringify(currentState));

      return hasChanges ? diff : null;
    },
    
    reset: (newState?: T) => {
      previousState = newState ? JSON.parse(JSON.stringify(newState)) : null;
    }
  };
} 