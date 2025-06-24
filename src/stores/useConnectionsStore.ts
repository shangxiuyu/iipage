import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Connection {
  from: string;
  to: string;
  fromAnchor?: 'top' | 'right' | 'bottom' | 'left';
  toAnchor?: 'top' | 'right' | 'bottom' | 'left';
}

interface ConnectionsState {
  connections: Connection[];
  isConnecting: boolean;
  connectingFrom: string | null;
  fromAnchor?: 'top' | 'right' | 'bottom' | 'left';
  tempConnection: { x: number; y: number } | null;
  
  // 连线操作
  addConnection: (from: string, to: string, fromAnchor?: 'top' | 'right' | 'bottom' | 'left', toAnchor?: 'top' | 'right' | 'bottom' | 'left') => void;
  removeConnection: (from: string, to: string) => void;
  
  // 连线模式操作
  startConnecting: (nodeId: string, fromAnchor?: 'top' | 'right' | 'bottom' | 'left') => void;
  updateTempConnection: (x: number, y: number) => void;
  finishConnecting: (nodeId?: string, toAnchor?: 'top' | 'right' | 'bottom' | 'left') => void;
  cancelConnecting: () => void;
  
  // 查询操作
  getNodeConnections: (nodeId: string) => Connection[];
  
  // 清理操作
  removeNodeConnections: (nodeId: string) => void;
}

export const useConnectionsStore = create<ConnectionsState>()(
  persist(
    (set, get) => ({
      connections: [],
      isConnecting: false,
      connectingFrom: null,
      fromAnchor: undefined,
      tempConnection: null,

      addConnection: (from, to, fromAnchor, toAnchor) => {
        // 检查连接是否已存在
        const { connections } = get();
        const exists = connections.some(
          (conn) => conn.from === from && conn.to === to
        );
        
        if (!exists && from !== to) {
          set((state) => ({
            connections: [
              ...state.connections,
              { from, to, fromAnchor, toAnchor },
            ],
          }));
        }
      },

      removeConnection: (from, to) => {
        set((state) => ({
          connections: state.connections.filter(
            (conn) => !(conn.from === from && conn.to === to)
          ),
        }));
      },

      startConnecting: (nodeId, fromAnchor) => {
        set({
          isConnecting: true,
          connectingFrom: nodeId,
          fromAnchor,
          tempConnection: null,
        });
      },

      updateTempConnection: (x, y) => {
        set({ tempConnection: { x, y } });
      },

      finishConnecting: (nodeId, toAnchor) => {
        const { connectingFrom, fromAnchor } = get();
        
        if (connectingFrom && nodeId && connectingFrom !== nodeId) {
          // 完成连线
          get().addConnection(connectingFrom, nodeId, fromAnchor, toAnchor);
        }
        
        // 重置连线状态
        set({
          isConnecting: false,
          connectingFrom: null,
          fromAnchor: undefined,
          tempConnection: null,
        });
      },

      cancelConnecting: () => {
        set({
          isConnecting: false,
          connectingFrom: null,
          fromAnchor: undefined,
          tempConnection: null,
        });
      },

      getNodeConnections: (nodeId) => {
        const { connections } = get();
        return connections.filter(
          (conn) => conn.from === nodeId || conn.to === nodeId
        );
      },

      removeNodeConnections: (nodeId) => {
        set((state) => ({
          connections: state.connections.filter(
            (conn) => conn.from !== nodeId && conn.to !== nodeId
          ),
        }));
      },
    }),
    {
      name: 'whiteboard-connections-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        connections: state.connections,
      }),
    }
  )
); 