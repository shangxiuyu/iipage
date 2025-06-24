import React, { useRef, useState, useEffect } from 'react';

interface VideoBackgroundProps {
  isActive: boolean;
  videoUrl?: string | null;
  onVideoChange?: (url: string | null) => void;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({
  isActive,
  videoUrl,
  onVideoChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 添加调试日志
  useEffect(() => {
    // console.log('VideoBackground props changed:', { isActive, videoUrl });
  }, [isActive, videoUrl]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // console.log('Selected file:', file); // 调试日志
    
    if (file && file.type.startsWith('video/')) {
      setIsLoading(true);
      // console.log('File type:', file.type); // 调试日志
      // console.log('File size:', file.size); // 调试日志
      
      try {
        const url = URL.createObjectURL(file);
        // console.log('Created video URL:', url); // 调试日志
        onVideoChange?.(url);
        
        // 延迟一点时间确保状态更新
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      } catch (error) {
        console.error('Error creating video URL:', error);
        setIsLoading(false);
      }
    } else {
      // console.log('Invalid file type or no file selected');
      if (file) {
        alert('请选择有效的视频文件');
      }
    }
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    
    // 确保视频开始播放
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error('Error playing video:', error);
      });
    }
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video error:', e.currentTarget.error);
    setIsLoading(false);
  };

  const handleVideoLoadStart = () => {
    setIsLoading(true);
  };

  const handleVideoCanPlay = () => {
    setIsLoading(false);
    
    // 当视频可以播放时，立即播放
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error('Error playing video:', error);
      });
    }
  };

  const handleVideoLoadEnd = () => {
    setIsLoading(false);
  };

  // console.log('VideoBackground render:', { isActive, videoUrl, isLoading }); // 调试日志

  if (!isActive) return null;

  return (
    <>
      {/* 背景视频 */}
      {videoUrl && (
        <video
          ref={videoRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: -10, // 设置为更低的层级
            pointerEvents: 'none',
          }}
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          onLoadStart={handleVideoLoadStart}
          onCanPlay={handleVideoCanPlay}
          onLoadedMetadata={handleVideoLoadEnd}
        />
      )}

      {/* 视频上传控制 */}
      {!videoUrl && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 20px 64px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ marginBottom: '20px', color: '#374151', fontSize: '16px', fontWeight: '600' }}>
            上传雨天背景视频
          </div>
          <div style={{ marginBottom: '20px', color: '#6b7280', fontSize: '14px' }}>
            支持 MP4, WebM, MOV 等格式
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {isLoading ? '加载中...' : '选择视频文件'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* 添加一个透明的背景层，确保其他区域可以接收双击事件 */}
      {!videoUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 0,
            pointerEvents: 'none',
            background: 'transparent',
          }}
        />
      )}

      {/* 视频控制提示 */}
      {videoUrl && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            zIndex: 1,
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            backdropFilter: 'blur(10px)',
          }}
        >
          背景视频已加载 • 点击更换视频：
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              marginLeft: '8px',
              cursor: 'pointer',
            }}
          >
            更换
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </>
  );
};

export default VideoBackground; 