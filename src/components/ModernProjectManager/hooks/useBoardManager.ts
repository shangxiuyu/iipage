import { useState, useCallback, useRef } from 'react';
import { useBoardStore } from '../../../store/useBoardStore';
import { getAllBoardsFromStorage, saveBoardData, deleteBoardData, type BoardInfo } from '../utils/boardStorage';
import { getRandomIcon } from '../utils/iconUtils';

// 生成默认白板名称
function getDefaultBoardName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${hour}:${minute}`;
}

export interface UseBoardManagerReturn {
    boardList: BoardInfo[];
    setBoardList: React.Dispatch<React.SetStateAction<BoardInfo[]>>;
    boardTitle: string;
    setBoardTitle: React.Dispatch<React.SetStateAction<string>>;
    getBoardCardCount: (boardId: string) => number;
    handleAddNewBoard: () => { defaultName: string };
    handleConfirmNewBoard: (name: string) => Promise<string>;
    handleSwitchBoard: (boardId: string) => Promise<void>;
    handleDeleteBoard: (boardId: string) => void;
    handleTogglePinBoard: (boardId: string) => void;
    handleRenameBoard: (boardId: string, newTitle: string) => void;
    notifyBoardUpdate: () => void;
    initializeBoardList: () => void;
}

export function useBoardManager(): UseBoardManagerReturn {
    const { nodes, clearBoard, loadBoard } = useBoardStore();
    const isInitialized = useRef(false);

    // 白板标题
    const [boardTitle, setBoardTitle] = useState(() => {
        try {
            const currentBoardData = localStorage.getItem('whiteboard-data-current');
            if (currentBoardData) {
                const boardData = JSON.parse(currentBoardData);
                if (boardData.title) return boardData.title;
            }
        } catch { /* ignore */ }
        return getDefaultBoardName();
    });

    // 白板列表
    const [boardList, setBoardList] = useState<BoardInfo[]>([]);

    // 计算白板卡片数量
    const getBoardCardCount = useCallback((boardId: string): number => {
        if (boardId === 'current') return nodes.length;
        try {
            const savedData = localStorage.getItem(`whiteboard-data-${boardId}`);
            if (savedData) {
                const boardData = JSON.parse(savedData);
                return (boardData.nodes || []).length;
            }
        } catch { /* ignore */ }
        return 0;
    }, [nodes]);

    // 通知更新
    const notifyBoardUpdate = useCallback(() => {
        window.dispatchEvent(new Event('board-update'));
    }, []);

    // 初始化白板列表
    const initializeBoardList = useCallback(() => {
        if (isInitialized.current) return;

        const boards = getAllBoardsFromStorage();
        if (boards.length === 0) {
            setBoardList([{
                id: 'current',
                title: boardTitle,
                cardCount: nodes.length,
                isActive: true,
                isPinned: false,
                createdAt: new Date(),
                icon: getRandomIcon(),
            }]);
        } else {
            const hasActiveBoard = boards.some(board => board.isActive);
            if (!hasActiveBoard) boards[0].isActive = true;
            setBoardList(boards);
        }
        isInitialized.current = true;
    }, [boardTitle, nodes.length]);

    // 添加新白板
    const handleAddNewBoard = useCallback(() => {
        return { defaultName: getDefaultBoardName() };
    }, []);

    // 确认创建新白板
    const handleConfirmNewBoard = useCallback(async (name: string): Promise<string> => {
        const newBoardId = `board_${Date.now()}`;
        const now = new Date();
        const newBoard: BoardInfo = {
            id: newBoardId,
            title: name.trim(),
            cardCount: 0,
            isActive: false,
            isPinned: false,
            createdAt: now,
            icon: getRandomIcon(),
        };

        setBoardList(prev => [...prev, newBoard]);
        saveBoardData(newBoardId, {
            title: newBoard.title,
            icon: newBoard.icon,
            isPinned: false,
            createdAt: now.toISOString(),
            nodes: [],
            connections: [],
            backgroundFrames: [],
        });

        setTimeout(notifyBoardUpdate, 100);
        return newBoardId;
    }, [notifyBoardUpdate]);

    // 切换白板
    const handleSwitchBoard = useCallback(async (boardId: string) => {
        // 保存当前白板
        const currentBoard = boardList.find(b => b.isActive);
        if (currentBoard) {
            const boardStore = useBoardStore.getState();
            saveBoardData(currentBoard.id, {
                title: boardTitle,
                nodes: boardStore.nodes,
                connections: boardStore.connections,
                backgroundFrames: boardStore.backgroundFrames,
            });
        }

        // 更新列表中的活跃状态
        setBoardList(prev => {
            const updated = prev.map(b => ({
                ...b,
                isActive: b.id === boardId,
                cardCount: getBoardCardCount(b.id),
            }));
            // 同步到 localStorage
            updated.forEach(b => {
                saveBoardData(b.id, { isActive: b.isActive });
            });
            return updated;
        });

        // 加载目标白板
        const savedData = localStorage.getItem(`whiteboard-data-${boardId}`);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                loadBoard({
                    nodes: data.nodes || [],
                    connections: data.connections || [],
                    backgroundFrames: data.backgroundFrames || [],
                });
                setBoardTitle(data.title || '未命名白板');
            } catch { /* ignore */ }
        }

        setTimeout(notifyBoardUpdate, 100);
    }, [boardList, boardTitle, getBoardCardCount, loadBoard, notifyBoardUpdate]);

    // 删除白板
    const handleDeleteBoard = useCallback((boardId: string) => {
        const isCurrentActive = boardList.find(b => b.id === boardId)?.isActive;

        if (isCurrentActive) {
            const remainingBoards = boardList.filter(b => b.id !== boardId);
            if (remainingBoards.length > 0) {
                handleSwitchBoard(remainingBoards[0].id);
            } else {
                clearBoard();
            }
        }

        setBoardList(prev => prev.filter(b => b.id !== boardId));
        deleteBoardData(boardId);
        setTimeout(notifyBoardUpdate, 100);
    }, [boardList, handleSwitchBoard, clearBoard, notifyBoardUpdate]);

    // 置顶/取消置顶
    const handleTogglePinBoard = useCallback((boardId: string) => {
        setBoardList(prev => prev.map(b =>
            b.id === boardId ? { ...b, isPinned: !b.isPinned } : b
        ));
        const board = boardList.find(b => b.id === boardId);
        if (board) {
            saveBoardData(boardId, { isPinned: !board.isPinned });
        }
        setTimeout(notifyBoardUpdate, 100);
    }, [boardList, notifyBoardUpdate]);

    // 重命名
    const handleRenameBoard = useCallback((boardId: string, newTitle: string) => {
        setBoardList(prev => prev.map(b =>
            b.id === boardId ? { ...b, title: newTitle } : b
        ));
        saveBoardData(boardId, { title: newTitle });

        const board = boardList.find(b => b.id === boardId);
        if (board?.isActive) {
            setBoardTitle(newTitle);
        }
        setTimeout(notifyBoardUpdate, 100);
    }, [boardList, notifyBoardUpdate]);

    return {
        boardList,
        setBoardList,
        boardTitle,
        setBoardTitle,
        getBoardCardCount,
        handleAddNewBoard,
        handleConfirmNewBoard,
        handleSwitchBoard,
        handleDeleteBoard,
        handleTogglePinBoard,
        handleRenameBoard,
        notifyBoardUpdate,
        initializeBoardList,
    };
}
