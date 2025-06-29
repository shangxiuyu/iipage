import { LIGHT_CARD_COLORS, DARK_CARD_COLORS } from '../store/useBoardStore';
import type { CardColor, NodeData } from '../store/useBoardStore';

export function getCurrentCardBackground(node: NodeData, isDarkMode: boolean): CardColor {
  let colorValue;
  const colorList = isDarkMode ? DARK_CARD_COLORS : LIGHT_CARD_COLORS;
  if (isDarkMode && node.darkBackgroundColor && node.darkBackgroundColor.startsWith('rgba')) {
    colorValue = node.darkBackgroundColor;
  } else if (!isDarkMode && node.lightBackgroundColor && node.lightBackgroundColor.startsWith('rgba')) {
    colorValue = node.lightBackgroundColor;
  } else {
    let colorId = isDarkMode ? node.darkBackgroundColor : node.lightBackgroundColor;
    if (!colorId) colorId = node.backgroundColor;
    const foundColor = colorList.find(c => c.id === colorId);
    if (foundColor) return foundColor;
    return colorList[0];
  }
  return {
    id: 'custom',
    name: '自定义',
    color: colorValue,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    textColor: isDarkMode ? '#e2e8f0' : '#222',
  };
}

export function getBorderRadius(node: NodeData): string | number {
  if (node.shape === 'circle') {
    return '50%';
  } else if (node.shape === 'table') {
    return 4;
  } else {
    return 8;
  }
}

export function getCircleCardStyles(node: NodeData): React.CSSProperties {
  if (node.shape === 'circle') {
    const size = Math.min(node.width || 200, node.height || 200);
    return {
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    };
  }
  return {};
}

export function getFrostedStyle(node: NodeData, isDarkMode: boolean): React.CSSProperties {
  if (!node.frosted) return {};
  return {
    background: isDarkMode
      ? 'rgba(30, 32, 40, 0.45)'
      : 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: node.selected
      ? (isDarkMode ? '0 4px 16px rgba(0,0,0,0.45)' : '0 4px 16px rgba(0,0,0,0.10)')
      : undefined,
    border: node.selected
      ? (isDarkMode ? '2px dashed #fff' : '2px dashed #000')
      : 'none',
  };
}

export function getCardBorderStyle(node: NodeData, isDarkMode: boolean): React.CSSProperties {
  // 只读/图片导出时不考虑editing/selected
  if (node.showBorder) {
    return {
      border: `2px solid ${node.borderColor || '#D1D5DB'}`
    };
  }
  return {
    border: 'none'
  };
} 