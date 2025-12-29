// 白板存储工具函数
import { getRandomIcon } from './iconUtils';

// 白板数据接口
export interface BoardInfo {
    id: string;
    title: string;
    cardCount: number;
    isActive: boolean;
    isPinned?: boolean;
    createdAt: Date;
    icon: string;
    shareId?: string;
}

// 标签icon持久化工具
export function getTagIcon(tagName: string): string {
    return localStorage.getItem(`tag-icon-${tagName}`) || '';
}

export function setTagIcon(tagName: string, icon: string): void {
    localStorage.setItem(`tag-icon-${tagName}`, icon);
}

// 生成唯一shareId
export function generateShareId(length = 16): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 从 localStorage 读取所有白板元数据
export function getAllBoardsFromStorage(): BoardInfo[] {
    const boards: BoardInfo[] = [];
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('whiteboard-data-')) {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const boardData = JSON.parse(data);
                    boards.push({
                        id: key.replace('whiteboard-data-', ''),
                        title: boardData.title || '未命名白板',
                        cardCount: (boardData.nodes || []).length,
                        isActive: boardData.isActive || false,
                        isPinned: boardData.isPinned || false,
                        createdAt: boardData.createdAt ? new Date(boardData.createdAt) : new Date(),
                        icon: boardData.icon || getRandomIcon(),
                        shareId: boardData.shareId,
                    });
                } catch { /* ignore parse errors */ }
            }
        }
    });
    return boards;
}

// 保存白板数据到 localStorage
export function saveBoardData(boardId: string, data: Record<string, unknown>): void {
    const storageKey = `whiteboard-data-${boardId}`;
    const existingData = localStorage.getItem(storageKey);
    const merged = existingData ? { ...JSON.parse(existingData), ...data } : data;
    localStorage.setItem(storageKey, JSON.stringify(merged));
}

// 删除白板数据
export function deleteBoardData(boardId: string): void {
    localStorage.removeItem(`whiteboard-data-${boardId}`);
}

// 获取白板的卡片数量
export function getBoardCardCountFromStorage(boardId: string): number {
    try {
        const storageKey = `whiteboard-data-${boardId}`;
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            const boardData = JSON.parse(savedData);
            return (boardData.nodes || []).length;
        }
    } catch { /* ignore */ }
    return 0;
}
