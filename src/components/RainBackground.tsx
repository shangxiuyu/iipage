import React, { useEffect, useState, useRef } from 'react';

interface RainDrop {
  id: number;
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
}

interface RainBackgroundProps {
  isActive: boolean;
  intensity?: 'light' | 'medium' | 'heavy';
}

const RainBackground: React.FC<RainBackgroundProps> = ({ 
  isActive, 
  intensity = 'medium' 
}) => {
  const [rainDrops, setRainDrops] = useState<RainDrop[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // 根据强度设置雨滴数量和速度
  const getIntensityConfig = () => {
    switch (intensity) {
      case 'light':
        return { dropCount: 50, speedMultiplier: 0.8, opacityRange: [0.3, 0.6] };
      case 'heavy':
        return { dropCount: 200, speedMultiplier: 1.5, opacityRange: [0.6, 0.9] };
      default: // medium
        return { dropCount: 100, speedMultiplier: 1, opacityRange: [0.4, 0.7] };
    }
  };

  // 创建雨滴
  const createRainDrop = (id: number): RainDrop => {
    const config = getIntensityConfig();
    return {
      id,
      x: Math.random() * window.innerWidth,
      y: -Math.random() * 100,
      speed: (Math.random() * 3 + 2) * config.speedMultiplier,
      length: Math.random() * 20 + 10,
      opacity: Math.random() * (config.opacityRange[1] - config.opacityRange[0]) + config.opacityRange[0]
    };
  };

  // 初始化雨滴
  useEffect(() => {
    if (!isActive) {
      setRainDrops([]);
      return;
    }

    const config = getIntensityConfig();
    const initialDrops = Array.from({ length: config.dropCount }, (_, i) => 
      createRainDrop(i)
    );
    setRainDrops(initialDrops);
  }, [isActive, intensity]);

  // 动画循环
  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      setRainDrops(prevDrops => 
        prevDrops.map(drop => {
          let newY = drop.y + drop.speed;
          let newX = drop.x;

          // 如果雨滴落到底部，重新从顶部开始
          if (newY > window.innerHeight + 50) {
            newY = -Math.random() * 100;
            newX = Math.random() * window.innerWidth;
          }

          return {
            ...drop,
            x: newX,
            y: newY
          };
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (isActive) {
        setRainDrops(prevDrops => 
          prevDrops.map(drop => ({
            ...drop,
            x: Math.min(drop.x, window.innerWidth)
          }))
        );
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {/* 雨滴 */}
      {rainDrops.map(drop => (
        <div
          key={drop.id}
          style={{
            position: 'absolute',
            left: drop.x,
            top: drop.y,
            width: 1,
            height: drop.length,
            background: `linear-gradient(to bottom, 
              rgba(173, 216, 230, ${drop.opacity}) 0%, 
              rgba(173, 216, 230, ${drop.opacity * 0.8}) 50%, 
              rgba(173, 216, 230, 0) 100%)`,
            borderRadius: '0 0 1px 1px',
            transform: 'rotate(10deg)', // 轻微倾斜模拟风的效果
          }}
        />
      ))}

      {/* 雨天氛围遮罩 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom, rgba(100, 120, 140, 0.1) 0%, rgba(80, 100, 120, 0.05) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default RainBackground; 