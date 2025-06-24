import React, { createContext, useContext, useState } from 'react';
import BoardCanvas from './components/BoardCanvas';
import SaveLoadManager from './components/SaveLoadManager';
import ProjectManager from './components/ProjectManager';
import ModernProjectManager from './components/ModernProjectManager';
import AutoSaveIndicator from './components/AutoSaveIndicator';
import { useBoardStore, LIGHT_CARD_COLORS, DARK_CARD_COLORS, defaultContent } from './store/useBoardStore';
import ProjectInfo from './components/ProjectInfo';
import QuickActions from './components/QuickActions';
import AIAssistant from './components/AIAssistant';
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
  const [showGlobalAIAssistant, setShowGlobalAIAssistant] = useState(false);

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

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {/* 主画布区域 - 移除顶部工具栏 */}
      <div>
        <BoardCanvas onOpenProjectCenter={() => setShowModernProjectManager(true)} />
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
      
      {/* 现代化项目管理面板 */}
      <ModernProjectManager 
        isOpen={showModernProjectManager} 
        onClose={() => setShowModernProjectManager(false)} 
        onShowAI={() => setShowGlobalAIAssistant(true)}
      />
      {/* AI助手弹窗（全局控制显示/隐藏） */}
      {showGlobalAIAssistant && (
        <AIAssistant 
          onAICommand={(cmd) => {
            // 日志：AI原始返回内容
            console.log('[AI助手] 原始返回内容:', cmd);
            // AI返回Markdown字符串，支持多卡片（---分割）或单卡片
            if (typeof cmd === 'string') {
              // 新增：支持EDGES混合格式
              let contentPart: string = cmd;
              let edges: Array<{from: number, to: number}> = [];
              // 检查是否有 EDGES: 标记
              const edgesMatch = contentPart.match(/---\s*EDGES\s*:?([\s\S]+)$/i);
              if (edgesMatch) {
                //@ts-ignore
                contentPart = cmd.slice(0, edgesMatch.index).trim();
                try {
                  // 只提取第一个合法的JSON数组
                  const jsonArrayMatch = edgesMatch[1].match(/\[[\s\S]*?\]/);
                  if (jsonArrayMatch) {
                    edges = JSON.parse(jsonArrayMatch[0]);
                  } else {
                    edges = [];
                  }
                } catch (e) {
                  console.warn('EDGES 解析失败:', e);
                  edges = [];
                }
              }
              let markdownBlocks = contentPart.split(/^---$/m).map(s => s.trim()).filter(Boolean);
              // 新增：如果最后一个block是合法的JSON数组（EDGES），只用于连线，不生成卡片
              if (markdownBlocks.length > 0) {
                const last = markdownBlocks[markdownBlocks.length - 1];
                try {
                  const parsed = JSON.parse(last);
                  if (Array.isArray(parsed) && parsed.every(e => typeof e.from !== 'undefined' && typeof e.to !== 'undefined')) {
                    edges = parsed;
                    markdownBlocks = markdownBlocks.slice(0, -1);
                  }
                } catch {}
              }
              // 日志：分割后的markdownBlocks
              console.log('[AI助手] 分割后的markdownBlocks:', markdownBlocks);

              // 清洗每个卡片内容，去除开头的 ```markdown、```md 或 ``` 标记
              function cleanMarkdown(md: string) {
                return md.replace(/^```(markdown|md)?\s*/i, '').replace(/```\s*$/g, '').trim();
              }
              markdownBlocks = markdownBlocks.map(cleanMarkdown);

              // 自动布局函数：根据edges和卡片数量，计算每个卡片的(x, y)
              function computeNodePositions(edges: any[], nodeCount: number) {
                // 1. 构建邻接表和入度表
                const children: number[][] = Array.from({length: nodeCount}, () => []);
                const inDegree: number[] = Array(nodeCount).fill(0);
                edges?.forEach((e: any) => {
                  if (typeof e.from === 'number' && typeof e.to === 'number') {
                    children[e.from].push(e.to);
                    inDegree[e.to]++;
                  }
                });
                // 2. 找根节点
                const roots: number[] = [];
                inDegree.forEach((deg: number, idx: number) => { if (deg === 0) roots.push(idx); });
                // 3. BFS分层
                const positions: any[] = Array(nodeCount);
                const queue: {id: number, depth: number, order: number}[] = [];
                const layerMap: Record<number, number[]> = {};
                roots.forEach((root: number, i: number) => queue.push({id: root, depth: 0, order: i}));
                const visited: boolean[] = Array(nodeCount).fill(false);
                while (queue.length) {
                  const {id, depth, order} = queue.shift()!;
                  if (visited[id]) continue;
                  visited[id] = true;
                  if (!layerMap[depth]) layerMap[depth] = [];
                  layerMap[depth].push(id);
                  // 在本层的顺序
                  const xOrder = layerMap[depth].length - 1;
                  positions[id] = {x: xOrder, y: depth};
                  children[id].forEach((child: number, i: number) => {
                    queue.push({id: child, depth: depth + 1, order: i});
                  });
                }
                // 4. 计算实际像素坐标
                // 每层最多卡片数
                const maxLayerLen = Math.max(...Object.values(layerMap).map((arr: number[]) => arr.length));
                const result = positions.map((pos, idx) => {
                  if (!pos) return {x: 200 + idx * 340, y: 200}; // fallback
                  // 居中分布
                  const layerLen = layerMap[pos.y].length;
                  const totalWidth = (layerLen - 1) * 340;
                  const x = 200 + pos.x * 340 - totalWidth / 2;
                  const y = 200 + pos.y * 260;
                  return {x, y};
                });
                return result;
              }

              // 生成卡片位置
              let nodePositions = [];
              if (edges && Array.isArray(edges) && markdownBlocks.length > 1) {
                nodePositions = computeNodePositions(edges, markdownBlocks.length);
              } else {
                // 没有edges或只有一个卡片，默认横向排列
                nodePositions = markdownBlocks.map((_, idx) => ({x: 200 + idx * 340, y: 200}));
              }
              const addNode = useBoardStore.getState().addNode;
              const updateNode = useBoardStore.getState().updateNode;
              markdownBlocks.forEach((md, idx) => {
                const pos = nodePositions[idx];
                addNode(pos.x, pos.y);
              });
              const nodesArr = useBoardStore.getState().nodes as any[];
              const allNodes = Array.isArray(nodesArr) ? nodesArr : [];
              const createdNodes = allNodes.slice(-markdownBlocks.length);
              markdownBlocks.forEach((md, idx) => {
                const realId = createdNodes[idx]?.id;
                // 日志：每个卡片内容和节点id
                console.log(`[AI助手] 卡片${idx} 节点id:`, realId, '内容:', md);
                if (realId) {
                  updateNode(realId, {
                    height: 300,
                    isAICreated: true,
                    editMode: 'markdown',
                    markdownContent: md,
                    backMarkdownContent: md,
                    backEditMode: 'markdown',
                    content: toSlateContent(md),
                    frontContent: toSlateContent(md),
                  });

                }
              });
              // 新增：根据edges自动连线
              if (Array.isArray(edges)) {
                const addConnection = useBoardStore.getState().addConnection;
                edges?.forEach(e => {
                  const from = createdNodes[e.from]?.id;
                  const to = createdNodes[e.to]?.id;
                  if (from && to) {
                    addConnection(from, to);
                  }
                });
              }
              return;
            }
            // 兼容老格式对象结构
            const { nodes, edges } = cmd;
            const addNode = useBoardStore.getState().addNode;
            const updateNode = useBoardStore.getState().updateNode;
            const addConnection = useBoardStore.getState().addConnection;
            const idMap: Record<string, string> = {};
            const startX = 200;
            const startY = 200;
            const gapX = 340;
            nodes.forEach((n, idx) => {
              addNode(startX + idx * gapX, startY);
            });
            const allNodes = useBoardStore.getState().nodes;
            const createdNodes = allNodes.slice(-nodes.length);
            nodes.forEach((n, idx) => {
              const realId = createdNodes[idx]?.id;
              if (realId) {
                idMap[n.id] = realId;
                const content = n.title + '\n' + n.desc + '\n' + (Array.isArray(n.details) ? n.details.join('\n') : '') + (n.conclusion ? ('\n' + n.conclusion) : '');
                updateNode(realId, { content: toSlateContent(content), frontContent: toSlateContent(content), height: 300 });
              }
            });
            edges?.forEach(e => {
              const from = idMap[e.from];
              const to = idMap[e.to];
              if (from && to) {
                addConnection(from, to);
              }
            });
          }}
          onClose={() => setShowGlobalAIAssistant(false)}
        />
      )}
    </ThemeContext.Provider>
  );
}

export default App;
