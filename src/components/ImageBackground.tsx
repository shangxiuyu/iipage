import React, { useRef, useState } from 'react';

interface ImageBackgroundProps {
  isActive: boolean;
  imageUrl?: string | null;
  blurLevel?: number; // 0-20
  onImageChange?: (url: string | null) => void;
  onBlurChange?: (blur: number) => void;
}

const ImageBackground: React.FC<ImageBackgroundProps> = ({
  isActive,
  imageUrl,
  blurLevel = 0,
  onImageChange,
  onBlurChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file && file.type.startsWith('image/')) {
      setIsLoading(true);
      
      try {
        const url = URL.createObjectURL(file);
        onImageChange?.(url);
        
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      } catch (error) {
        console.error('Error creating image URL:', error);
        setIsLoading(false);
      }
    } else {
      if (file) {
        alert('请选择有效的图片文件');
      }
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    console.error('Error loading image');
    setIsLoading(false);
  };

  if (!isActive) return null;

  return (
    <>
      {/* 背景图片 */}
      {imageUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -10,
            pointerEvents: 'none',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: `blur(${blurLevel}px)`,
            transition: 'filter 0.3s ease',
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* 图片上传控制 */}
      {!imageUrl && (
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
            上传背景图片
          </div>
          <div style={{ marginBottom: '20px', color: '#6b7280', fontSize: '14px' }}>
            支持 JPG, PNG, GIF, WebP 等格式
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
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
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {isLoading ? '加载中...' : '选择图片文件'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* 图片控制提示和模糊调节 */}
      {imageUrl && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            zIndex: 1,
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span>背景图片已加载</span>
          
          {/* 模糊调节 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>模糊:</span>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={blurLevel}
              onChange={(e) => onBlurChange?.(parseInt(e.target.value))}
              style={{
                width: '80px',
                height: '4px',
                borderRadius: '2px',
                background: '#374151',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <span style={{ minWidth: '20px' }}>{blurLevel}px</span>
          </div>
          
          {/* 更换按钮 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            更换
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </>
  );
};

export default ImageBackground; 