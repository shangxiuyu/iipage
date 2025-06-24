import { useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * 防抖Hook - 延迟执行频繁触发的函数
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<number | undefined>(undefined);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    //@ts-ignore
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

/**
 * 节流Hook - 限制函数执行频率
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<number | undefined>(undefined);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;
    
    if (timeSinceLastRun >= delay) {
      lastRunRef.current = now;
      callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      //@ts-ignore
    timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastRun);
    }
  }, [callback, delay]) as T;
}

/**
 * 批量更新管理器
 */
class BatchUpdateManager {
  private pendingUpdates: Map<string, () => void> = new Map();
  private rafId: number | null = null;

  schedule(key: string, update: () => void) {
    this.pendingUpdates.set(key, update);
    
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  private flush() {
    for (const update of this.pendingUpdates.values()) {
      update();
    }
    
    this.pendingUpdates.clear();
    this.rafId = null;
  }

  cancel(key: string) {
    this.pendingUpdates.delete(key);
  }
}

const batchUpdateManager = new BatchUpdateManager();

/**
 * 批量更新Hook - 将多个同步更新合并为一次
 */
export function useBatchUpdate() {
  const keyRef = useRef<string | undefined>(undefined);
  
  if (!keyRef.current) {
    keyRef.current = `batch_${Math.random().toString(36).substr(2, 9)}`;
  }

  const schedule = useCallback((update: () => void) => {
    batchUpdateManager.schedule(keyRef.current!, update);
  }, []);

  const cancel = useCallback(() => {
    if (keyRef.current) {
      batchUpdateManager.cancel(keyRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (keyRef.current) {
        batchUpdateManager.cancel(keyRef.current);
      }
    };
  }, []);

  return { schedule, cancel };
}

/**
 * 记忆化计算Hook - 缓存昂贵的计算结果
 */
export function useMemoizedCalculation<T>(
  calculation: () => T,
  deps: React.DependencyList
): T {
  return useMemo(calculation, deps);
}

/**
 * 优化的事件处理器Hook
 */
export function useOptimizedEventHandler<T extends (...args: any[]) => any>(
  handler: T,
  deps: React.DependencyList,
  options: {
    debounce?: number;
    throttle?: number;
    batch?: boolean;
  } = {}
): T {
  const baseHandler = useCallback(handler, deps);
  const { schedule } = useBatchUpdate();
  
  return useMemo(() => {
    let optimizedHandler = baseHandler;
    
    // 应用批量更新
    if (options.batch) {
      const batchedHandler = (...args: Parameters<T>) => {
        schedule(() => baseHandler(...args));
      };
      optimizedHandler = batchedHandler as T;
    }
    
    // 应用防抖
    if (options.debounce) {
      const debouncedHandler = useDebounce(optimizedHandler, options.debounce);
      optimizedHandler = debouncedHandler;
    }
    
    // 应用节流
    if (options.throttle) {
      const throttledHandler = useThrottle(optimizedHandler, options.throttle);
      optimizedHandler = throttledHandler;
    }
    
    return optimizedHandler;
  }, [baseHandler, schedule, options.debounce, options.throttle, options.batch]);
}

/**
 * 性能监控Hook
 */
export function usePerformanceMonitor(name: string) {
  const startTimeRef = useRef<number | undefined>(undefined);
  
  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);
  
  const end = useCallback(() => {
    if (startTimeRef.current !== undefined) {
      const duration = performance.now() - startTimeRef.current;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      startTimeRef.current = undefined;
    }
  }, [name]);
  
  const measure = useCallback((fn: () => void) => {
    start();
    fn();
    end();
  }, [start, end]);
  
  return { start, end, measure };
}

/**
 * 虚拟化相关的计算优化
 */
export function useVirtualization(
  items: any[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number
) {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
    
    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;
    
    return {
      visibleItems,
      startIndex,
      endIndex,
      offsetY,
      totalHeight: items.length * itemHeight,
    };
  }, [items, containerHeight, itemHeight, scrollTop]);
}

/**
 * 内存使用优化Hook
 */
export function useMemoryOptimization() {
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  
  const addCleanup = useCallback((fn: () => void) => {
    cleanupFunctionsRef.current.push(fn);
  }, []);
  
  const runCleanup = useCallback(() => {
    cleanupFunctionsRef.current.forEach(fn => fn());
    cleanupFunctionsRef.current = [];
  }, []);
  
  useEffect(() => {
    return () => {
      runCleanup();
    };
  }, [runCleanup]);
  
  return { addCleanup, runCleanup };
} 