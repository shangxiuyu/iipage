import React, { useState, useEffect } from 'react';

/*
 * 快速添加新背景图片的方法：
 * 1. 将图片文件放入对应的分类文件夹（nature、abstract、minimal、textures、workspace）
 * 2. 在下面的 knownFiles 对象中添加文件信息：{ name: '文件名', ext: '扩展名' }
 * 
 * 例如：添加 nature/sunset.jpg
 * 在 nature 数组中添加：{ name: 'sunset', ext: 'jpg' }
 * 
 * 支持的扩展名：jpg, jpeg, png, webp, gif
 */

// 背景图片分类定义
export interface BackgroundCategory {
  id: string;
  name: string;
  icon: string;
  backgrounds: BackgroundImage[];
}

export interface BackgroundImage {
  id: string;
  name: string;
  path: string;
  category: string;
}

// 导入InteractiveTheme类型
import type { InteractiveTheme } from './InteractiveThemeBackground';
import type { BackgroundMode } from './BackgroundModeSelector';

interface BackgroundImageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (backgroundPath: string | null) => void;
  onSelectTheme?: (theme: InteractiveTheme | null) => void;
  onModeChange?: (mode: BackgroundMode) => void;
  currentBackground?: string | null;
  currentTheme?: InteractiveTheme | null;
  currentMode?: BackgroundMode;
  isDark?: boolean;
}

const BackgroundImageSelector: React.FC<BackgroundImageSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  onSelectTheme,
  onModeChange,
  currentBackground,
  currentTheme,
  currentMode,
  isDark = false
}) => {
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([]);
  const [loading, setLoading] = useState(true);

  // 背景图片分类文件夹
  const categories = ['nature', 'abstract', 'minimal', 'textures', 'workspace'];

    // 初始化背景图片数据 - 快速加载已知文件
  useEffect(() => {
    const loadBackgrounds = () => {
      const allBackgrounds: BackgroundImage[] = [];
      
      // 直接定义已知的文件列表，按分类组织
      const knownFiles = {
        abstract: [
          // 你实际的文件（从文件夹列表中提取）
          { name: '2621578', ext: 'jpg' },
          { name: '2621557', ext: 'jpg' },
          { name: '2621550', ext: 'jpg' },
          { name: '2621548', ext: 'jpg' },
          { name: '2621535', ext: 'jpg' },
          { name: '2621475', ext: 'jpg' },
          { name: '2621450', ext: 'jpg' },
          { name: '434615', ext: 'jpg' },
          { name: '2621446', ext: 'jpg' },
          { name: '2621444', ext: 'jpg' },
          { name: '1210708', ext: 'jpg' },
          { name: '52427', ext: 'jpg' },
          { name: '6602100', ext: 'jpg' },
          { name: '1540475', ext: 'jpg' },
          { name: '6142455', ext: 'jpg' },
          { name: '3876048', ext: 'jpg' },
          { name: '7614045', ext: 'jpg' },
          { name: '5225830', ext: 'jpg' },
          { name: '5225822', ext: 'jpg' },
          { name: '706183', ext: 'jpg' },
          { name: '706131', ext: 'jpg' },
          { name: '734506', ext: 'jpg' },
          { name: '734502', ext: 'jpg' },
          { name: '734497', ext: 'jpg' },
          { name: '1520657', ext: 'jpg' },
          { name: '1520656', ext: 'jpg' },
          { name: '819284', ext: 'jpg' },
          { name: '819274', ext: 'jpg' },
          { name: '819263', ext: 'jpg' },
          { name: '819259', ext: 'jpg' },
          { name: '799655', ext: 'jpg' },
          { name: '642880', ext: 'jpg' },
          { name: '642916', ext: 'jpg' },
          { name: '639686', ext: 'png' },
          { name: '642908', ext: 'jpg' },
          { name: '1078425', ext: 'jpg' },
          { name: '1078423', ext: 'jpg' },
          { name: '647904', ext: 'jpg' },
          { name: '921485', ext: 'jpg' },
          { name: '754903', ext: 'jpg' },
          { name: '647870', ext: 'png' },
          { name: '1077105', ext: 'jpg' },
          { name: '647874', ext: 'png' },
          { name: '754272', ext: 'jpg' },
          { name: '639663', ext: 'jpg' },
        ],
        nature: [
          // 如果你在nature文件夹中有文件，在这里添加
        ],
        minimal: [
          // 如果你在minimal文件夹中有文件，在这里添加
        ],
        textures: [
          // 如果你在textures文件夹中有文件，在这里添加
        ],
        workspace: [
          // 如果你在workspace文件夹中有文件，在这里添加
        ],
      };
      
      // 直接构建背景图片列表，无需网络请求
      Object.entries(knownFiles).forEach(([categoryId, files]) => {
        files.forEach(({ name, ext }) => {
          allBackgrounds.push({
            id: `${categoryId}-${name}`,
            name: name,
            path: `/backgrounds/${categoryId}/${name}.${ext}`,
            category: categoryId,
          });
        });
      });
      
      setBackgrounds(allBackgrounds);
      setLoading(false);
    };

    if (isOpen) {
      loadBackgrounds();
    }
  }, [isOpen]);

  // 处理背景选择
  const handleBackgroundSelect = (backgroundPath: string) => {
    onSelect(backgroundPath);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* 主弹框 */}
        <div
          style={{
            width: '90vw',
            maxWidth: '1000px',
            height: '80vh',
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: '16px',
            boxShadow: isDark 
              ? '0 25px 50px rgba(0, 0, 0, 0.6)' 
              : '0 25px 50px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: isDark ? '#F9FAFB' : '#111827',
              }}
            >
              选择背景图片
            </h2>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                color: isDark ? '#D1D5DB' : '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#4B5563' : '#E5E7EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F3F4F6';
              }}
            >
              ×
            </button>
          </div>

          {/* 内容区域 */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* 背景图片网格 */}
            <div
              style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
              }}
            >
              {/* 统一的背景选择网格 - 动态主题和背景图片融合 */}
              {loading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '200px',
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    fontSize: '16px',
                  }}
                >
                  加载中...
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {/* 雨天主题 */}
                  <div
                    onClick={() => {
                      if (onSelectTheme) {
                        onSelectTheme('rainy');
                        onSelect(null); // 清除图片背景
                      }
                      onClose();
                    }}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '150px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: currentTheme === 'rainy'
                        ? `3px solid ${isDark ? '#60A5FA' : '#3B82F6'}`
                        : `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                      transition: 'all 0.2s ease',
                      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      if (currentTheme !== 'rainy') {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = isDark 
                          ? '0 8px 24px rgba(0, 0, 0, 0.3)' 
                          : '0 8px 24px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* 雨天视频预览 */}
                    <video
                      src="/shiping.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none',
                      }}
                    />
                    

                    
                    {/* 选中状态指示器 */}
                    {currentTheme === 'rainy' && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: isDark ? '#60A5FA' : '#3B82F6',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>

                  {/* 篝火主题 */}
                  <div
                    onClick={() => {
                      if (onSelectTheme) {
                        onSelectTheme('campfire');
                        onSelect(null); // 清除图片背景
                      }
                      onClose();
                    }}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '150px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: currentTheme === 'campfire'
                        ? `3px solid ${isDark ? '#60A5FA' : '#3B82F6'}`
                        : `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                      transition: 'all 0.2s ease',
                      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      if (currentTheme !== 'campfire') {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = isDark 
                          ? '0 8px 24px rgba(0, 0, 0, 0.3)' 
                          : '0 8px 24px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* 篝火视频预览 */}
                    <video
                      src="/182592-868916643_small.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none',
                      }}
                    />
                    

                    
                    {/* 选中状态指示器 */}
                    {currentTheme === 'campfire' && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: isDark ? '#60A5FA' : '#3B82F6',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>

                  {/* 背景图片 */}
                  {backgrounds.map((background) => (
                    <div
                      key={background.id}
                      onClick={() => handleBackgroundSelect(background.path)}
                      style={{
                        border: currentBackground === background.path
                          ? `3px solid ${isDark ? '#60A5FA' : '#3B82F6'}`
                          : `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                      }}
                      onMouseEnter={(e) => {
                        if (currentBackground !== background.path) {
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = isDark 
                            ? '0 8px 24px rgba(0, 0, 0, 0.3)' 
                            : '0 8px 24px rgba(0, 0, 0, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* 背景图片预览 */}
                      <div
                        style={{
                          width: '100%',
                          height: '150px', // 增加高度，因为不需要显示名称了
                          backgroundImage: `url(${background.path})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          position: 'relative',
                        }}
                      >
                        {/* 选中状态指示器 */}
                        {currentBackground === background.path && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: isDark ? '#60A5FA' : '#3B82F6',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BackgroundImageSelector; 