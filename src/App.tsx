import React, { createContext, useContext, useState, useEffect } from 'react';
import BoardCanvas from './components/BoardCanvas';
import SaveLoadManager from './components/SaveLoadManager';
import ProjectManager from './components/ProjectManager';
import ModernProjectManager from './components/ModernProjectManager';
import AutoSaveIndicator from './components/AutoSaveIndicator';
import { useBoardStore, LIGHT_CARD_COLORS, DARK_CARD_COLORS, defaultContent } from './store/useBoardStore';
import ProjectInfo from './components/ProjectInfo';
import QuickActions from './components/QuickActions';
import AIBrainstormChat from './components/AIBrainstormChat';
import QuickInputModal from './components/QuickInputModal';
import type { Descendant } from 'slate';
import ReactMarkdown from 'react-markdown';

// 云端存储初始化
import { cloudDataManager } from './services/cloudDataManager';

// 1. 创建主题上下文
export const ThemeContext = createContext({
  isDarkMode: false,
  toggleDarkMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// 富文本类型兼容转换函数
function normalizeSlateBlocks(blocks: any[]): any[] {
  return blocks.map(block => {
    let newBlock = { ...block };
    // 处理heading(level)
    if (newBlock.type === 'heading') {
      if (newBlock.level === 1) newBlock.type = 'heading-one';
      else if (newBlock.level === 2) newBlock.type = 'heading-two';
      else if (newBlock.level === 3) newBlock.type = 'heading-three';
      delete newBlock.level;
    }
    if (newBlock.type === 'ul_list') newBlock.type = 'bulleted-list';
    if (newBlock.type === 'ol_list') newBlock.type = 'numbered-list';
    if (newBlock.type === 'list_item') newBlock.type = 'list-item';
    if (newBlock.type === 'hr') newBlock.type = 'divider';
    // 递归children
    if (Array.isArray(newBlock.children)) {
      newBlock.children = normalizeSlateBlocks(newBlock.children);
    }
    return newBlock;
  });
}

// 工具函数：将字符串转为Slate段落
function toSlateContent(content: string): Descendant[] {
  return [{ type: 'paragraph', children: [{ text: content }] }] as any;
}

function App() {
  // 初始化时从 localStorage 读取主题
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('whiteboard-theme');
    return saved === 'dark';
  });
  const [showDataManager, setShowDataManager] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showModernProjectManager, setShowModernProjectManager] = useState(false);
  const [showAIBrainstormChat, setShowAIBrainstormChat] = useState(false);
  const [showQuickInputModal, setShowQuickInputModal] = useState(false);
  
  // 鼠标靠近左侧自动显示侧边栏
  const [isHoveringLeftEdge, setIsHoveringLeftEdge] = useState(false);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 鼠标距离左侧小于20px时显示
      if (e.clientX < 20) {
        setIsHoveringLeftEdge(true);
      } else if (e.clientX > 300) {
        // 鼠标离开侧边栏区域时隐藏
        setIsHoveringLeftEdge(false);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // 当鼠标靠近左侧时显示侧边栏
  useEffect(() => {
    if (isHoveringLeftEdge) {
      setShowModernProjectManager(true);
    }
  }, [isHoveringLeftEdge]);

  // 监听 Electron 全局快捷键事件
  React.useEffect(() => {
    console.log('🔍 检查 Electron API:', window.electronAPI);
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('✅ Electron API 已找到，注册快捷键监听器');
      window.electronAPI.onQuickInput(() => {
        console.log('🎯 收到 quick-input 事件，打开弹窗');
        setShowQuickInputModal(true);
      });
    } else {
      console.log('❌ 未找到 Electron API');
    }
  }, []);
  
  // 🔥 暴露 useBoardStore 到 window 对象供 Electron IPC 使用
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.useBoardStore = useBoardStore;
      console.log('✅ useBoardStore 已暴露到 window 对象');
    }
  }, []);
  
  // 🔥 云端存储初始化
  React.useEffect(() => {
    const initCloudStorage = async () => {
      try {
        // 尝试从环境变量获取阿里云配置
        const config = {
          region: import.meta.env.VITE_ALICLOUD_REGION || '',
          accessKeyId: import.meta.env.VITE_ALICLOUD_ACCESS_KEY_ID || '',
          accessKeySecret: import.meta.env.VITE_ALICLOUD_ACCESS_KEY_SECRET || '',
          bucket: import.meta.env.VITE_ALICLOUD_BUCKET || '',
          autoSync: import.meta.env.VITE_ALICLOUD_AUTO_SYNC === 'true',
          syncInterval: parseInt(import.meta.env.VITE_ALICLOUD_SYNC_INTERVAL || '5'),
        };

        // 只有在配置了基本参数时才初始化
        if (config.region && config.accessKeyId && config.accessKeySecret && config.bucket) {
          console.log('🔄 正在初始化阿里云OSS存储...');
          const success = await cloudDataManager.initialize(config);
          
          if (success) {
            console.log('✅ 阿里云OSS存储初始化成功');
            
            // 获取存储统计信息
            const stats = await cloudDataManager.getStorageStats();
            if (stats) {
              console.log('📊 云端存储统计:', stats);
            }


          } else {
            console.warn('⚠️ 阿里云OSS存储初始化失败');
          }
        } else {
          console.log('ℹ️ 阿里云OSS配置未设置，将仅使用本地存储');
        }
      } catch (error) {
        console.warn('⚠️ 云端存储初始化异常:', error);
      }
    };

    initCloudStorage();
  }, []);
  
  // 切换主题时写入 localStorage
  const toggleDarkMode = () => {
    setIsDarkMode((v) => {
      const next = !v;
      localStorage.setItem('whiteboard-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // 切换body的className
  React.useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // 主题切换时自动批量切换所有卡片颜色
  React.useEffect(() => {
    const nodes = useBoardStore.getState().nodes;
    const updateNode = useBoardStore.getState().updateNode;
    nodes.forEach((node) => {
      const colorList = isDarkMode ? LIGHT_CARD_COLORS : DARK_CARD_COLORS;
      const nextColorList = isDarkMode ? DARK_CARD_COLORS : LIGHT_CARD_COLORS;
      const idx = colorList.findIndex(c => c.id === node.backgroundColor);
      const nextIdx = idx >= 0 ? idx : 0;
      const nextColor = nextColorList[nextIdx];
      updateNode(node.id, { backgroundColor: nextColor.id });
    });
  }, [isDarkMode]);

  const undo = useBoardStore(state => state.undo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 🔥 修复：如果事件来源于输入框、textarea或contenteditable，直接跳过
      if (
        e.target instanceof HTMLElement &&
        (
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable
        )
      ) {
        return;
      }
      
      // 支持Ctrl+Z和Command+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {/* 主容器：左侧边栏 + 右侧画布 */}
      <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {/* 左侧项目管理侧边栏 */}
        {showModernProjectManager && (
          <div 
            style={{ 
              width: '280px', 
              flexShrink: 0,
              height: '100vh',
              overflow: 'hidden',
              position: 'fixed',
              left: 0,
              top: 0,
              zIndex: 1000,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isHoveringLeftEdge ? 'translateX(0)' : 'translateX(-280px)',
            }}
            onMouseLeave={() => setIsHoveringLeftEdge(false)}
          >
            <ModernProjectManager 
              isOpen={showModernProjectManager} 
              onClose={() => {
                setShowModernProjectManager(false);
                setIsHoveringLeftEdge(false);
              }}
            />
          </div>
        )}
        
        {/* 右侧主画布区域 */}
        <div 
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          onClick={(e) => {
            // 点击画布区域关闭侧边栏
            if (showModernProjectManager && isHoveringLeftEdge) {
              const target = e.target as HTMLElement;
              // 确保点击的不是侧边栏内容
              if (!target.closest('[data-sidebar]')) {
                setIsHoveringLeftEdge(false);
              }
            }
          }}
        >
          <BoardCanvas 
            onOpenProjectCenter={() => {
              setShowModernProjectManager(true);
              setIsHoveringLeftEdge(true);
            }}
            onOpenAIChat={() => setShowAIBrainstormChat(true)}
          />
        </div>
      </div>
      
      {/* 自动保存状态指示器 - 已隐藏 */}
      {/* <AutoSaveIndicator /> */}
      
      {/* 项目管理面板 */}
      <ProjectManager 
        isOpen={showProjectManager} 
        onClose={() => setShowProjectManager(false)} 
      />
      
      {/* 数据管理弹窗 */}
      <SaveLoadManager 
        isOpen={showDataManager}
        onClose={() => setShowDataManager(false)}
      />
      
      {/* AI思维梳理聊天侧边栏 */}
      <AIBrainstormChat
        isOpen={showAIBrainstormChat}
        onClose={() => setShowAIBrainstormChat(false)}
      />
      
      {/* 快速输入弹窗 */}
      <QuickInputModal
        isOpen={showQuickInputModal}
        onClose={() => setShowQuickInputModal(false)}
      />
    </ThemeContext.Provider>
  );
}

export default App;
