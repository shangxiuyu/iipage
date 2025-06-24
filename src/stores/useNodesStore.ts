import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Descendant } from 'slate';

export interface NodeData {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: Descendant[];
  editing?: boolean;
  selected?: boolean;
  backgroundColor?: string;
  lightBackgroundColor?: string;
  darkBackgroundColor?: string;
  pinned?: boolean;
  pinnedX?: number;
  pinnedY?: number;
  
  // 卡片反转相关属性
  frontContent?: Descendant[];
  backContent?: Descendant[];
  isFlipped?: boolean;
  isFlipping?: boolean;
  
  // 代码编辑器相关属性
  isCodeMode?: boolean;
  codeContent?: string;
  codeLanguage?: string;
  userResized?: boolean;

  // 毛玻璃磨砂效果
  frosted?: boolean;
  
  // 标签功能
  tags?: string[];
  
  // 卡片形状
  shape?: 'rectangle' | 'circle' | 'table';
  
  // 网页渲染相关数据持久化
  webPageState?: any;
  webPageStateKey?: string;
}

// 默认内容
export const defaultContent: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
] as any;

interface NodesState {
  nodes: NodeData[];
  selectedNodes: string[];
  
  // 节点操作
  addNode: (x: number, y: number) => void;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  deleteSelectedNodes: () => void;
  setNodeEditing: (id: string, editing: boolean) => void;
  
  // 选择操作
  selectNode: (id: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  setSelectedNodes: (nodeIds: string[]) => void;
  
  // 移动操作
  moveSelectedNodes: (deltaX: number, deltaY: number) => void;
  
  // 卡片翻转操作
  flipCard: (id: string) => void;
  updateCardSide: (id: string, side: 'front' | 'back', content: Descendant[]) => void;
  
  // 图钉操作
  toggleNodePin: (id: string) => void;
  
  // 强制保存编辑中的节点
  saveEditingNodes: () => void;
}

export const useNodesStore = create<NodesState>()(
  persist(
    (set, get) => ({
      nodes: [],
      selectedNodes: [],

      addNode: (x, y) => {
        const newNode: NodeData = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          x,
          y,
          width: 324,
          height: 200,
          content: defaultContent,
          editing: true,
          lightBackgroundColor: 'default',
          darkBackgroundColor: 'dark-default',
          shape: 'rectangle',
          frosted: false,
          tags: [],
        };
        
        set((state) => ({
          nodes: [...state.nodes, newNode],
          selectedNodes: [newNode.id],
        }));
      },

      updateNode: (id, data) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, ...data } : node
          ),
        }));
      },

      deleteNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          selectedNodes: state.selectedNodes.filter((selectedId) => selectedId !== id),
        }));
      },

      deleteSelectedNodes: () => {
        const { selectedNodes, nodes } = get();
        set({
          nodes: nodes.filter((node) => !selectedNodes.includes(node.id)),
          selectedNodes: [],
        });
      },

      setNodeEditing: (id, editing) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, editing } : node
          ),
        }));
      },

      selectNode: (id, multiSelect = false) => {
        set((state) => {
          if (multiSelect) {
            const isSelected = state.selectedNodes.includes(id);
            return {
              selectedNodes: isSelected
                ? state.selectedNodes.filter((selectedId) => selectedId !== id)
                : [...state.selectedNodes, id],
            };
          } else {
            return { selectedNodes: [id] };
          }
        });
      },

      clearSelection: () => {
        set({ selectedNodes: [] });
      },

      setSelectedNodes: (nodeIds) => {
        set({ selectedNodes: nodeIds });
      },

      moveSelectedNodes: (deltaX, deltaY) => {
        const { selectedNodes } = get();
        set((state) => ({
          nodes: state.nodes.map((node) =>
            selectedNodes.includes(node.id)
              ? { ...node, x: node.x + deltaX, y: node.y + deltaY }
              : node
          ),
        }));
      },

      flipCard: (id) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, isFlipped: !node.isFlipped } : node
          ),
        }));
      },

      updateCardSide: (id, side, content) => {
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id === id) {
              if (side === 'front') {
                return { ...node, frontContent: content, content };
              } else {
                return { ...node, backContent: content };
              }
            }
            return node;
          }),
        }));
      },

      toggleNodePin: (id) => {
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.id === id) {
              if (node.pinned) {
                // 取消固定
                return { ...node, pinned: false, pinnedX: undefined, pinnedY: undefined };
              } else {
                // 固定到当前屏幕位置
                const rect = document.querySelector(`[data-node-id="${id}"]`)?.getBoundingClientRect();
                return {
                  ...node,
                  pinned: true,
                  pinnedX: rect?.left || node.x,
                  pinnedY: rect?.top || node.y,
                };
              }
            }
            return node;
          }),
        }));
      },

      saveEditingNodes: () => {
        set((state) => ({
          nodes: state.nodes.map((node) => ({ ...node, editing: false })),
        }));
      },
    }),
    {
      name: 'whiteboard-nodes-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,
      }),
    }
  )
); 