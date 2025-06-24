import React, { useState, useEffect, useRef, useCallback } from 'react';

// 全局状态管理器 - 控制同时渲染的iframe数量
class WebPageManager {
  private static instance: WebPageManager;
  private activeIframes = new Set<string>();
  private waitingQueue: Array<{ nodeId: string; callback: () => void }> = [];
  private readonly maxConcurrentIframes = 6; // 最多同时加载6个iframe
  private readonly maxTotalIframes = 12; // 最多保持12个活跃iframe

  static getInstance(): WebPageManager {
    if (!WebPageManager.instance) {
      WebPageManager.instance = new WebPageManager();
    }
    return WebPageManager.instance;
  }

  requestRender(nodeId: string, callback: () => void): boolean {
    if (this.activeIframes.size < this.maxConcurrentIframes) {
      this.activeIframes.add(nodeId);
      callback();
      return true;
    } else {
      // 加入等待队列
      this.waitingQueue.push({ nodeId, callback });
      return false;
    }
  }

  releaseRender(nodeId: string): void {
    this.activeIframes.delete(nodeId);
    
    // 处理等待队列中的下一个
    if (this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift();
      if (next) {
        this.activeIframes.add(next.nodeId);
        next.callback();
      }
    }
  }

  shouldPause(): boolean {
    return this.activeIframes.size >= this.maxTotalIframes;
  }

  getActiveCount(): number {
    return this.activeIframes.size;
  }
}

interface WebPageRendererProps {
  url: string;
  width: number;
  height: number;
  nodeId: string;
  disabled?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

const WebPageRenderer: React.FC<WebPageRendererProps> = ({
  url,
  width,
  height,
  nodeId,
  disabled = false,
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stableUrl, setStableUrl] = useState<string>('');
  const [iframeKey, setIframeKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stableUrlRef = useRef<string>('');
  const retryCountRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const manager = WebPageManager.getInstance();

  // 可见性检测
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isCurrentlyVisible = entry.isIntersecting;
          setIsVisible(isCurrentlyVisible);
          
          // 当变为可见时，请求渲染
          if (isCurrentlyVisible && !shouldRender && !isInQueue) {
            setIsInQueue(true);
            const granted = manager.requestRender(nodeId, () => {
              setShouldRender(true);
              setIsInQueue(false);
            });
            
            if (!granted) {
              console.log(`网页 ${nodeId} 加入渲染队列`);
            }
          }
          
          // 当变为不可见时，考虑释放资源
          if (!isCurrentlyVisible && shouldRender) {
            // 延迟释放，避免频繁切换
            setTimeout(() => {
              if (!isVisible) {
                manager.releaseRender(nodeId);
                setShouldRender(false);
                setIsInQueue(false);
              }
            }, 2000);
          }
        });
      },
      {
        rootMargin: '100px', // 提前100px开始加载
        threshold: 0.1
      }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      manager.releaseRender(nodeId);
    };
  }, [nodeId, shouldRender, isInQueue, isVisible]);

  // URL稳定化处理
  useEffect(() => {
    if (!url) return;
    
    let processedUrl = url.trim();
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = 'https://' + processedUrl;
    }
    
    if (processedUrl !== stableUrlRef.current) {
      stableUrlRef.current = processedUrl;
      setStableUrl(processedUrl);
      retryCountRef.current = 0;
    }
  }, [url]);

  // 阻止事件冒泡
  const handleIframeEvent = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  // iframe加载处理
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
    onLoad?.();
  }, [onLoad]);

  // iframe错误处理
  const handleIframeError = useCallback(async () => {
    console.error('iframe加载失败:', stableUrl);
    
    // 重试逻辑
    retryCountRef.current += 1;
    if (retryCountRef.current <= 2) {
      console.log(`重试加载 iframe (${retryCountRef.current}/2):`, stableUrl);
      setTimeout(() => {
        setIframeKey(prev => prev + 1);
      }, 1000 * retryCountRef.current);
    } else {
      setError('网页加载失败，请检查网络连接或URL是否正确');
      onError?.('网页加载失败');
    }
  }, [stableUrl, onError]);

  // 渲染加载状态
  if (!shouldRender && isInQueue) {
    return (
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          color: '#64748b',
          fontSize: '14px',
          textAlign: 'center',
          padding: '20px',
          borderRadius: '8px'
        }}
      >
        <div>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <div>等待渲染队列中...</div>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
            当前活跃: {manager.getActiveCount()}个网页
          </div>
        </div>
      </div>
    );
  }

  // 渲染不可见状态
  if (!shouldRender) {
    return (
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          color: '#64748b',
          fontSize: '14px',
          textAlign: 'center',
          padding: '20px',
          borderRadius: '8px'
        }}
      >
        <div>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>👁️</div>
          <div>网页准备就绪</div>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
            滚动到此处自动加载
          </div>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        fontSize: '14px',
        textAlign: 'center',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>❌</div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>网页加载失败</div>
        <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
          {error}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.6, wordBreak: 'break-all' }}>
          {stableUrl}
        </div>
        {retryCountRef.current < 2 && (
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              setIframeKey(prev => prev + 1);
            }}
            style={{
              marginTop: '12px',
              padding: '6px 12px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            重试加载
          </button>
        )}
      </div>
    );
  }

  // 渲染iframe
  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
        overflow: 'hidden'
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          color: '#64748b',
          fontSize: '14px',
          zIndex: 1
        }}>
          <div>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌐</div>
            <div>加载网页中...</div>
          </div>
        </div>
      )}
      
      <iframe
        key={`${nodeId}-${iframeKey}`}
        ref={iframeRef}
        src={stableUrl}
        width="100%"
        height="100%"
        style={{
          border: 'none',
          borderRadius: 'inherit',
          display: 'block',
          pointerEvents: disabled ? 'none' : 'auto',
          opacity: disabled ? 0.5 : 1,
          transition: disabled ? 'none' : 'opacity 0.2s ease'
        }}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        onClick={handleIframeEvent}
        onMouseDown={handleIframeEvent}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
        title={`网页内容: ${url}`}
      />
    </div>
  );
};

export default React.memo(WebPageRenderer); 