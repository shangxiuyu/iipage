import React, { useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { NodeData } from '../../store/useBoardStore';
import { useBoardStore } from '../../store/useBoardStore';

interface NodeConnectionProps {
  node: NodeData;
  cardRef: RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
}

// 四个锚点方向
const ANCHORS = [
  { key: 'top', style: { top: -8, left: '50%', transform: 'translateX(-50%)' } },
  { key: 'right', style: { right: -8, top: '50%', transform: 'translateY(-50%)' } },
  { key: 'bottom', style: { bottom: -8, left: '50%', transform: 'translateX(-50%)' } },
  { key: 'left', style: { left: -8, top: '50%', transform: 'translateY(-50%)' } },
];
const ANCHOR_RADIUS = 20; // px，鼠标距离锚点中心小于此值才显示

const NodeConnection: React.FC<NodeConnectionProps> = ({ node, cardRef, readOnly }) => {
  if (readOnly) return null;
  const store = useBoardStore();
  const draggingAnchor = useRef<string | null>(null);
  const [hoveredAnchor, setHoveredAnchor] = useState<string | null>(null);

  // 获取锚点的画布绝对坐标
  const getAnchorPosition = (anchorKey: string) => {
    const card = cardRef.current;
    if (!card) return { x: 0, y: 0 };
    const rect = card.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    let x = rect.left + scrollX;
    let y = rect.top + scrollY;
    const width = rect.width;
    const height = rect.height;
    switch (anchorKey) {
      case 'top':
        x += width / 2;
        break;
      case 'right':
        x += width;
        y += height / 2;
        break;
      case 'bottom':
        x += width / 2;
        y += height;
        break;
      case 'left':
        y += height / 2;
        break;
      default:
        break;
    }
    return { x, y };
  };

  // 鼠标按下锚点，进入连线模式
  const handleMouseDown = (anchorKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    draggingAnchor.current = anchorKey;
    const { x, y } = getAnchorPosition(anchorKey);
    store.startConnecting(node.id, anchorKey as any);
    store.updateTempConnection(x, y, x, y, anchorKey as any);
    // 监听全局鼠标移动和松开
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 鼠标拖动，实时更新临时连线
  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingAnchor.current) return;
    const { x, y } = getAnchorPosition(draggingAnchor.current);
    store.updateTempConnection(x, y, e.clientX + window.scrollX, e.clientY + window.scrollY, draggingAnchor.current as any);
  };

  // 鼠标松开，判断是否吸附到其他锚点
  const handleMouseUp = (e: MouseEvent) => {
    if (!draggingAnchor.current) return;
    // 遍历所有卡片，判断鼠标是否在卡片范围内
    const allCards = document.querySelectorAll('[data-node-id]');
    let found = false;
    allCards.forEach(card => {
      const cardId = card.getAttribute('data-node-id');
      if (!cardId || cardId === node.id) return;
      const rect = card.getBoundingClientRect();
      const mouseX = e.clientX + window.scrollX;
      const mouseY = e.clientY + window.scrollY;
      if (
        mouseX >= rect.left + window.scrollX &&
        mouseX <= rect.right + window.scrollX &&
        mouseY >= rect.top + window.scrollY &&
        mouseY <= rect.bottom + window.scrollY
      ) {
        // 鼠标在卡片内，找最近锚点
        let minDist = Infinity;
        let nearestAnchor = 'top';
        ANCHORS.forEach(anchor => {
          const anchorPos = (() => {
            let x = rect.left + window.scrollX;
            let y = rect.top + window.scrollY;
            const width = rect.width;
            const height = rect.height;
            switch (anchor.key) {
              case 'top': x += width / 2; break;
              case 'right': x += width; y += height / 2; break;
              case 'bottom': x += width / 2; y += height; break;
              case 'left': y += height / 2; break;
              default: break;
            }
            return { x, y };
          })();
          const dx = anchorPos.x - mouseX;
          const dy = anchorPos.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            nearestAnchor = anchor.key;
          }
        });
        store.finishConnecting(cardId, nearestAnchor as any);
        found = true;
      }
    });
    if (!found) {
      store.cancelConnecting();
    }
    draggingAnchor.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  // 只有选中卡片时才监听鼠标移动
  React.useEffect(() => {
    if (!node.selected) return;
    const handleMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const mouseX = e.clientX + window.scrollX;
      const mouseY = e.clientY + window.scrollY;
      let foundAnchor: string | null = null;
      ANCHORS.forEach(anchor => {
        const { x, y } = getAnchorPosition(anchor.key);
        const dx = x - mouseX;
        const dy = y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ANCHOR_RADIUS) {
          foundAnchor = anchor.key;
        }
      });
      setHoveredAnchor(foundAnchor);
    };
    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      setHoveredAnchor(null);
    };
  }, [node.selected, cardRef.current]);

  // 只有靠近锚点时才显示该锚点, 且不在编辑模式下
  if (!node.selected || !hoveredAnchor || node.editing) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
      {ANCHORS.map(anchor => (
        hoveredAnchor === anchor.key && (
          <div
            key={anchor.key}
            style={{
              position: 'absolute',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#3b82f6',
              border: '2px solid #fff',
              boxShadow: '0 2px 8px rgba(59,130,246,0.15)',
              cursor: 'crosshair',
              zIndex: 1000,
              pointerEvents: 'auto',
              ...anchor.style,
            }}
            title={`锚点：${anchor.key}`}
            onMouseDown={e => handleMouseDown(anchor.key, e)}
          />
        )
      ))}
    </div>
  );
};

export default NodeConnection; 