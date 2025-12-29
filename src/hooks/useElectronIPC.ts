import { useEffect, useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';

export function useElectronIPC() {
    const [showQuickInputModal, setShowQuickInputModal] = useState(false);

    useEffect(() => {
        // console.log('🔍 检查 Electron API:', window.electronAPI);
        if (typeof window !== 'undefined' && window.electronAPI) {
            // console.log('✅ Electron API 已找到，注册快捷键监听器');

            // 监听快速输入快捷键
            const cleanupQuickInput = window.electronAPI.onQuickInput(() => {
                // console.log('🎯 收到 quick-input 事件，打开弹窗');
                setShowQuickInputModal(true);
            });

            // 监听浮窗创建卡片请求
            const cleanupCreateCard = window.electronAPI.onCreateCardFromFloating((_event, content) => {
                // console.log('📝 收到浮窗创建卡片请求:', content);
                if (!content || !content.trim()) return;

                const state = useBoardStore.getState();
                const { addNode, panX, panY, scale } = state;

                // 计算屏幕中心位置
                const containerWidth = window.innerWidth;
                const containerHeight = window.innerHeight;

                // 将屏幕中心坐标转换为画布坐标
                const randomOffsetX = (Math.random() - 0.5) * 200;
                const randomOffsetY = (Math.random() - 0.5) * 200;

                const x = (containerWidth / 2 - panX) / scale + randomOffsetX;
                const y = (containerHeight / 2 - panY) / scale + randomOffsetY;

                // 添加节点
                addNode(x, y);

                // 获取刚刚创建的节点并更新内容
                const newState = useBoardStore.getState();
                const newNodes = newState.nodes;
                const newNode = newNodes[newNodes.length - 1];

                if (newNode) {
                    // 工具函数：将字符串转为Slate段落 (简单的本地实现，避免循环依赖)
                    const slateContent = [{ type: 'paragraph', children: [{ text: content }] }];
                    newState.updateNode(newNode.id, {
                        content: slateContent as any,
                        frontContent: slateContent as any
                    });

                    // 显示成功提示
                    const toast = document.createElement('div');
                    toast.textContent = '✨ 已从浮窗创建卡片';
                    toast.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(34,197,94,0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            backdrop-filter: blur(10px);
          `;
                    document.body.appendChild(toast);
                    setTimeout(() => document.body.removeChild(toast), 3000);
                }
            });

            // 辅助函数：从 localStorage 获取所有白板
            const getAllBoards = () => {
                const boards: any[] = [];
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('whiteboard-data-')) {
                        try {
                            const data = JSON.parse(localStorage.getItem(key) || '{}');
                            boards.push({
                                id: key.replace('whiteboard-data-', ''),
                                title: data.title || '未命名白板',
                                isActive: data.isActive || false
                            });
                        } catch (e) {
                            // console.error('解析白板数据失败:', e);
                        }
                    }
                });
                return boards;
            };

            // 辅助函数：获取当前白板ID
            const getCurrentBoardId = () => {
                const boards = getAllBoards();
                const active = boards.find(b => b.isActive);
                return active ? active.id : 'current';
            };

            // 监听浮窗请求获取白板名称
            const cleanupGetBoardName = window.electronAPI.onGetBoardName(() => {
                const boards = getAllBoards();
                const activeBoard = boards.find(b => b.isActive);
                let name = activeBoard ? activeBoard.title : '未命名白板';

                if (!activeBoard) {
                    try {
                        const currentData = JSON.parse(localStorage.getItem('whiteboard-data-current') || '{}');
                        if (currentData.title) name = currentData.title;
                    } catch (e) { }
                }

                // console.log('📤 [App] 发送白板名称到浮窗:', name);
                window.electronAPI.sendBoardName(name);
            });

            // 监听浮窗请求获取白板列表
            const cleanupGetBoardList = window.electronAPI.onGetBoardList(() => {
                const boards = getAllBoards();
                boards.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
                // console.log('📤 [App] 发送白板列表到浮窗:', boards);
                window.electronAPI.sendBoardList(boards);
            });

            // 监听浮窗切换白板请求
            const cleanupSwitchBoard = window.electronAPI.onSwitchBoard((_event, boardId) => {
                // console.log('🔄 [App] 收到切换白板请求:', boardId);
                const store = useBoardStore.getState() as any;
                const currentId = getCurrentBoardId();

                if (currentId === boardId) {
                    // console.log('⚠️ [App] 已经是当前白板，跳过切换');
                    return;
                }

                try {
                    // 1. 保存当前白板数据
                    const currentKey = `whiteboard-data-${currentId}`;
                    const currentMeta = JSON.parse(localStorage.getItem(currentKey) || '{}');
                    const newCurrentData = {
                        ...currentMeta,
                        nodes: store.nodes,
                        connections: store.connections,
                        backgroundFrames: store.backgroundFrames,
                        isActive: false
                    };
                    localStorage.setItem(currentKey, JSON.stringify(newCurrentData));

                    // 2. 加载新白板数据
                    const newKey = `whiteboard-data-${boardId}`;
                    const newData = JSON.parse(localStorage.getItem(newKey) || '{}');

                    // 更新所有白板的 isActive 状态
                    const allBoards = getAllBoards();
                    allBoards.forEach(b => {
                        const key = `whiteboard-data-${b.id}`;
                        const d = JSON.parse(localStorage.getItem(key) || '{}');
                        if (d.isActive !== (b.id === boardId)) {
                            d.isActive = (b.id === boardId);
                            localStorage.setItem(key, JSON.stringify(d));
                        }
                    });

                    // 3. 更新 Store
                    if (store.loadBoard) {
                        store.loadBoard(newData);
                        // console.log('✅ [App] Store 数据已更新');
                    }

                    // 4. 发送新名称
                    window.electronAPI.sendBoardName(newData.title || '未命名白板');

                    // 5. 触发自定义事件通知 ModernProjectManager 更新
                    const event = new CustomEvent('external-switch', { detail: { boardId } });
                    window.dispatchEvent(event);
                    // console.log('📢 [App] 触发 external-switch 事件');

                } catch (error) {
                    console.error('❌ [App] 切换白板失败:', error);
                }
            });

            // 监听来自 ModernProjectManager 的更新事件
            const handleBoardUpdate = () => {
                // console.log('📢 [App] 收到 board-update 事件，同步浮窗数据');

                const boards = getAllBoards();
                const activeBoard = boards.find(b => b.isActive);
                let name = activeBoard ? activeBoard.title : '未命名白板';
                if (!activeBoard) {
                    try {
                        const currentData = JSON.parse(localStorage.getItem('whiteboard-data-current') || '{}');
                        if (currentData.title) name = currentData.title;
                    } catch (e) { }
                }
                window.electronAPI.sendBoardName(name);

                boards.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
                window.electronAPI.sendBoardList(boards);
            };

            window.addEventListener('board-update', handleBoardUpdate);

            // 初始化时主动发送一次名称
            const initTimer = setTimeout(() => {
                const boards = getAllBoards();
                const active = boards.find(b => b.isActive);
                let name = active ? active.title : '未命名白板';
                if (!active) {
                    try {
                        const currentData = JSON.parse(localStorage.getItem('whiteboard-data-current') || '{}');
                        if (currentData.title) name = currentData.title;
                    } catch (e) { }
                }
                // console.log('🚀 [App] 初始化发送白板名称:', name);
                window.electronAPI.sendBoardName(name);
            }, 1000);

            // 清理函数
            return () => {
                cleanupQuickInput();
                cleanupGetBoardName();
                cleanupCreateCard();
                cleanupGetBoardList();
                cleanupSwitchBoard();
                window.removeEventListener('board-update', handleBoardUpdate);
                clearTimeout(initTimer);
            };

        } else {
            // console.log('❌ 未找到 Electron API');
        }
    }, []);

    // 暴露 useBoardStore 到 window 对象供 Electron IPC 使用
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.useBoardStore = useBoardStore;
            // console.log('✅ useBoardStore 已暴露到 window 对象');
        }
    }, []);

    return { showQuickInputModal, setShowQuickInputModal };
}
