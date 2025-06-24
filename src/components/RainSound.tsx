import React, { useEffect, useRef, useState } from 'react';

interface RainSoundProps {
  isActive: boolean;
  volume?: number; // 0-1
  intensity?: 'light' | 'medium' | 'heavy';
}

const RainSound: React.FC<RainSoundProps> = ({ 
  isActive, 
  volume = 0.3, 
  intensity = 'medium' 
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // 根据强度获取音频参数
  const getIntensityConfig = () => {
    switch (intensity) {
      case 'light':
        return { 
          baseVolume: volume * 0.6, 
          frequencies: [100, 200, 400, 800], 
          noiseIntensity: 0.3 
        };
      case 'heavy':
        return { 
          baseVolume: volume * 1.2, 
          frequencies: [80, 150, 300, 600, 1200], 
          noiseIntensity: 0.8 
        };
      default: // medium
        return { 
          baseVolume: volume, 
          frequencies: [100, 200, 400, 800, 1000], 
          noiseIntensity: 0.5 
        };
    }
  };

  // 创建白噪音
  const createWhiteNoise = (audioContext: AudioContext) => {
    const bufferSize = audioContext.sampleRate * 2; // 2秒的缓冲区
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // 生成白噪音
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1; // 降低白噪音强度
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    return source;
  };

  // 创建雨声滤波器
  const createRainFilter = (audioContext: AudioContext, frequency: number) => {
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1;
    return filter;
  };

  // 启动雨声
  const startRainSound = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const config = getIntensityConfig();

      // 创建主增益节点
      gainNodeRef.current = audioContext.createGain();
      gainNodeRef.current.gain.value = config.baseVolume;
      gainNodeRef.current.connect(audioContext.destination);

      // 创建多个白噪音源和滤波器来模拟雨声
      const oscillators: OscillatorNode[] = [];

      config.frequencies.forEach((freq) => {
        // 创建白噪音源
        const whiteNoise = createWhiteNoise(audioContext);
        
        // 创建滤波器
        const filter = createRainFilter(audioContext, freq);
        
        // 创建该频段的增益节点
        const bandGain = audioContext.createGain();
        bandGain.gain.value = 0.2 / config.frequencies.length; // 平均分配音量
        
        // 连接音频节点
        whiteNoise.connect(filter);
        filter.connect(bandGain);
        if (gainNodeRef.current) {
          bandGain.connect(gainNodeRef.current);
        }
        
        // 启动音源
        whiteNoise.start();
        oscillators.push(whiteNoise as any); // 类型转换，因为BufferSource也可以存储
      });

      // 添加低频雷声效果（可选）
      if (intensity === 'heavy') {
        const thunderGain = audioContext.createGain();
        thunderGain.gain.value = 0.05;
        
        const thunderOsc = audioContext.createOscillator();
        thunderOsc.type = 'sine';
        thunderOsc.frequency.value = 60;
        
        thunderOsc.connect(thunderGain);
        thunderGain.connect(gainNodeRef.current);
        thunderOsc.start();
        
        // 随机雷声效果
        setInterval(() => {
          if (Math.random() < 0.1) { // 10% 概率
            const now = audioContext.currentTime;
            thunderGain.gain.setValueAtTime(0.05, now);
            thunderGain.gain.exponentialRampToValueAtTime(0.2, now + 0.1);
            thunderGain.gain.exponentialRampToValueAtTime(0.05, now + 2);
          }
        }, 10000); // 每10秒检查一次
        
        oscillators.push(thunderOsc);
      }

      oscillatorsRef.current = oscillators;
      setIsPlaying(true);

    } catch (error) {
      console.error('启动雨声失败:', error);
    }
  };

  // 停止雨声
  const stopRainSound = () => {
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // 忽略已经停止的振荡器错误
      }
    });
    oscillatorsRef.current = [];
    
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    
    setIsPlaying(false);
  };

  // 更新音量
  useEffect(() => {
    if (gainNodeRef.current && isPlaying) {
      const config = getIntensityConfig();
      gainNodeRef.current.gain.value = config.baseVolume;
    }
  }, [volume, intensity, isPlaying]);

  // 控制播放状态
  useEffect(() => {
    if (isActive && !isPlaying) {
      startRainSound();
    } else if (!isActive && isPlaying) {
      stopRainSound();
    }

    return () => {
      if (isPlaying) {
        stopRainSound();
      }
    };
  }, [isActive]);

  // 清理资源
  useEffect(() => {
    return () => {
      stopRainSound();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return null; // 这个组件不渲染任何视觉内容
};

export default RainSound; 