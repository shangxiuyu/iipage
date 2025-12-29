// 图标工具函数

// 备用图标列表（防止动态加载失败）
const FALLBACK_ICONS = [
    '1F97F.png', '1F9A7.png', '1F96B.png', '1F958.png', '1F970.png', '1F9AA.png', '1F964.png',
    'E1D1.png', '23E9.png', '23FC.png', '1F596.png', '1F58D.png', '1F443-1F3FB.png', '2699.png',
    '1F642-200D-2194-FE0F.png', 'E318.png', 'E32B.png', '2666.png', '1F642-200D-2195-FE0F.png',
    '1F5C2.png', '1F55C.png', 'E324.png', '1F384.png', '1F390.png', '1F38B.png', '1F574-1F3FF.png',
    '2935.png', '1F39F.png', '1F347.png', 'E24B.png', '1F421.png', '1F3BF.png',
];

// 动态获取可用的图标列表
export const getAvailableIcons = (): string[] => {
    try {
        // 从 ModernProjectManager/utils/ 向上 3 级到 src/，然后进入 assets/icons/
        const iconModules = import.meta.glob('../../../assets/icons/*.png', { query: '?url', import: 'default', eager: true });
        const iconNames = Object.keys(iconModules).map(path => {
            return path.split('/').pop() || '';
        }).filter(name => name && name !== '.DS_Store');
        return iconNames.length > 0 ? iconNames : FALLBACK_ICONS;
    } catch {
        return FALLBACK_ICONS;
    }
};

// 可用的图标列表（缓存）
export const AVAILABLE_ICONS = getAvailableIcons();

// 随机选择一个图标
export const getRandomIcon = (): string => {
    const randomIndex = Math.floor(Math.random() * AVAILABLE_ICONS.length);
    return AVAILABLE_ICONS[randomIndex];
};

// 获取图标的完整路径
export const getIconPath = (iconFileName: string): string => {
    // 从 ModernProjectManager/utils/ 向上 3 级到 src/，然后进入 assets/icons/
    return new URL(`../../../assets/icons/${iconFileName}`, import.meta.url).href;
};
