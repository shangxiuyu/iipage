import React, { useState, useRef, useEffect } from 'react';

// 主题类型定义
export type InteractiveTheme = 'rainy' | 'campfire' | null;

interface InteractiveThemeBackgroundProps {
  theme: InteractiveTheme;
}

// 雨滴组件
const RainDrop: React.FC<{ x: number; delay: number; duration: number }> = ({ x, delay, duration }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x}%`,
      top: '-10px',
      width: '2px',
      height: '20px',
      background: 'linear-gradient(to bottom, rgba(174, 194, 224, 0.8), rgba(174, 194, 224, 0.3))',
      borderRadius: '1px',
      animation: `rainDrop ${duration}s linear ${delay}s infinite`,
    }}
  />
);

// 星星组件 - 暂时未使用
/*
const Star: React.FC<{ x: number; y: number; size: number; delay: number }> = ({ x, y, size, delay }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      background: '#fff',
      borderRadius: '50%',
      opacity: 0.7,
      animation: `starTwinkle ${3 + delay}s infinite`,
      pointerEvents: 'none',
    }}
  />
);
*/

const InteractiveThemeBackground: React.FC<InteractiveThemeBackgroundProps> = ({
  theme
}) => {
  // 雨天主题状态
  const [rainIntensity, setRainIntensity] = useState(1);
  const [isRainSoundOn, setIsRainSoundOn] = useState(true);
  const rainAudioRef = useRef<HTMLAudioElement>(null);

  // 火相关状态 - 暂时未使用
  // const [fireIntensity, setFireIntensity] = useState(1);
  // const [logs, setLogs] = useState(3);
  const fireAudioRef = useRef<HTMLAudioElement>(null);



  // 音频效果管理
  useEffect(() => {
    if (theme === 'rainy' && isRainSoundOn && rainAudioRef.current) {
      rainAudioRef.current.volume = 0.3;
      rainAudioRef.current.play().catch(console.error);
    } else if (rainAudioRef.current) {
      rainAudioRef.current.pause();
    }

    // 篝火模式自动播放音效，若失败则等待用户首次点击
    if (theme === 'campfire' && fireAudioRef.current) {
      const playAudio = () => {
        fireAudioRef.current!.volume = 0.4;
        fireAudioRef.current!.play().catch(console.error);
        document.removeEventListener('click', playAudio);
      };
      fireAudioRef.current.volume = 0.4;
      fireAudioRef.current.play().catch(() => {
        document.addEventListener('click', playAudio);
      });
    } else if (fireAudioRef.current) {
      fireAudioRef.current.pause();
    }

    return () => {
      [rainAudioRef, fireAudioRef].forEach(ref => {
        if (ref.current) {
          ref.current.pause();
        }
      });
    };
  }, [theme, isRainSoundOn]);

  // 生成雨滴
  const generateRainDrops = () => {
    const drops = [];
    const count = rainIntensity * 50;
    for (let i = 0; i < count; i++) {
      drops.push(
        <RainDrop
          key={i}
          x={Math.random() * 100}
          delay={Math.random() * 2}
          duration={1 + Math.random() * 1}
        />
      );
    }
    return drops;
  };

  // 生成星星 - 暂时未使用
  /*
  const generateStars = () => {
    const stars = [];
    for (let i = 0; i < 100; i++) {
      stars.push(
        <Star
          key={i}
          x={Math.random() * 100}
          y={Math.random() * 60}
          size={1 + Math.random() * 3}
          delay={Math.random() * 5}
        />
      );
    }
    return stars;
  };
  */

  if (!theme) return null;

  return (
    <>
      {/* CSS 动画定义 */}
      <style>{`
        @keyframes rainDrop {
          0% { transform: translateY(-20px); opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        
        @keyframes fireSpark {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-30px) scale(0.8); opacity: 0.8; }
          100% { transform: translateY(-60px) scale(0.3); opacity: 0; }
        }
        
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes fireFlicker {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.05) rotate(1deg); }
          50% { transform: scale(0.95) rotate(-1deg); }
          75% { transform: scale(1.02) rotate(0.5deg); }
        }
        
        @keyframes lampGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 223, 0, 0.6); }
          50% { box-shadow: 0 0 30px rgba(255, 223, 0, 0.8); }
        }
      `}</style>

      {/* 雨天主题 */}
      {theme === 'rainy' && (
        <>
          {/* 雨声视频背景 */}
          <video
            src={'/shiping.mp4'}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              objectFit: 'cover',
              zIndex: -21,
              opacity: 0.6, // 可调节透明度
              pointerEvents: 'none',
            }}
          />
          {/* 雨滴动画 */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: -15,
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          >
            {generateRainDrops()}
          </div>
          {/* 雨声音频 */}
          <audio ref={rainAudioRef} loop>
            <source src={'/rain.mp3'} type="audio/mp3" />
          </audio>
        </>
      )}

      {/* 篝火主题 */}
      {theme === 'campfire' && (
        <>
          {/* 篝火视频背景 */}
          <video
            src={'/182592-868916643_small.mp4'}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              objectFit: 'cover',
              zIndex: -21,
              opacity: 0.9, // 改为0.9
              pointerEvents: 'none',
            }}
          />
          {/* 篝火音效 */}
          <audio ref={fireAudioRef} loop>
            <source src={'/火声.mp3'} type="audio/mp3" />
          </audio>
        </>
      )}


    </>
  );
};

export default InteractiveThemeBackground; 