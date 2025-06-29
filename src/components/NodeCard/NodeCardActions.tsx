import React from 'react';
import type { NodeData } from '../../store/useBoardStore';

interface NodeCardActionsProps {
  node: NodeData;
  readOnly?: boolean;
  showActionMenu: boolean;
  onToggleActionMenu: () => void;
  onFlipCard: (e: React.MouseEvent) => void;
  onShowColorPicker: (e: React.MouseEvent) => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onShowDeleteModal: (e: React.MouseEvent) => void;
  onOpenUrlInNewWindow?: (e: React.MouseEvent) => void;
  onCopyAsImage?: (e: React.MouseEvent) => void;
  detectedUrl?: string | null;
  isWebPageMode?: boolean;
  hasBackContent?: boolean;
}

const NodeCardActions: React.FC<NodeCardActionsProps> = ({
  node,
  readOnly = false,
  showActionMenu,
  onToggleActionMenu,
  onFlipCard,
  onShowColorPicker,
  onTogglePin,
  onShowDeleteModal,
  onOpenUrlInNewWindow,
  onCopyAsImage,
  detectedUrl,
  isWebPageMode = false,
  hasBackContent = false,
}) => {
  return (
    <>
      {/* 固定图钉图标 - 仅当卡片被固定时显示 */}
      {node.pinned && !node.editing && !readOnly && (
        <div
          onClick={(e) => {
            if (readOnly) return;
            e.stopPropagation();
            e.preventDefault();
            onTogglePin(e);
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            color: '#dc2626',
            zIndex: 10,
            cursor: readOnly ? 'not-allowed' : 'pointer',
            transition: 'transform 0.2s ease',
            opacity: readOnly ? 0.7 : 1,
          }}
          title={readOnly ? "只读模式下不可操作" : "点击取消固定"}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M16,12V4A1,1 0 0,0 15,3H9A1,1 0 0,0 8,4V12L6,14V16H11V21.5C11,21.78 11.22,22 11.5,22A0.5,0.5 0 0,0 12,21.5V16H17V14L16,12Z" />
          </svg>
        </div>
      )}

      {/* 翻转指示器 - 正面显示，当有背面内容或网页内容时 */}
      {!node.editing && !node.isFlipped && (hasBackContent || detectedUrl) && (
        <div
          onClick={onFlipCard}
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            width: detectedUrl ? 24 : 20,
            height: detectedUrl ? 24 : 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: detectedUrl ? '#f0f9ff' : 'transparent',
            border: detectedUrl ? '1.8px solid #0ea5e9' : '1.8px solid #3b82f6',
            color: detectedUrl ? '#0ea5e9' : '#3b82f6',
            fontSize: detectedUrl ? 12 : 11,
            fontWeight: 'bold',
            zIndex: 10,
            cursor: 'pointer',
            transition: 'transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
          }}
          title={detectedUrl ? `点击查看网页: ${detectedUrl}` : "翻转到背面"}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            if (detectedUrl) {
              e.currentTarget.style.borderColor = '#0284c7';
              e.currentTarget.style.backgroundColor = '#e0f2fe';
            } else {
              e.currentTarget.style.borderColor = '#2563eb';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            if (detectedUrl) {
              e.currentTarget.style.borderColor = '#0ea5e9';
              e.currentTarget.style.backgroundColor = '#f0f9ff';
            } else {
              e.currentTarget.style.borderColor = '#3b82f6';
            }
          }}
        >
          {detectedUrl ? '🌐' : 'A'}
        </div>
      )}

      {/* 背面操作按钮区域 */}
      {!node.editing && node.isFlipped && (
        <>
          {/* 翻转到正面按钮 */}
          <div
            onClick={onFlipCard}
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'transparent',
              border: '1.8px solid #8b5cf6',
              color: '#8b5cf6',
              fontSize: 11,
              fontWeight: 'bold',
              zIndex: 10,
              cursor: 'pointer',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
            title="翻转到正面"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.borderColor = '#7c3aed';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = '#8b5cf6';
            }}
          >
            B
          </div>
          
          {/* 在网页模式下显示新窗口打开按钮 */}
          {isWebPageMode && detectedUrl && onOpenUrlInNewWindow && (
            <div
              onClick={onOpenUrlInNewWindow}
              style={{
                position: 'absolute',
                bottom: 8,
                right: 32,
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'rgba(14, 165, 233, 0.1)',
                border: '1.8px solid #0ea5e9',
                color: '#0ea5e9',
                fontSize: 10,
                fontWeight: 'bold',
                zIndex: 10,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, background-color 0.2s ease',
              }}
              title={`在新窗口打开: ${detectedUrl}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.1)';
              }}
            >
              ↗
            </div>
          )}
        </>
      )}

      {/* 动作按钮组 - 只在非编辑且选中状态下显示 */}
      {!readOnly && !node.editing && node.selected && (
        <>
          {/* 主按钮 - 三个点 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActionMenu();
            }}
            style={{
              position: 'absolute',
              top: -32,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: 12,
              border: `2px solid #ffffff`,
              background: showActionMenu ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 8px rgba(0,0,0,0.2)`,
              transition: 'all 0.2s ease',
              zIndex: 1000,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="更多操作"
          >
            <div
              style={{
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 'bold',
                lineHeight: 1,
                transform: showActionMenu ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              ⋯
            </div>
          </button>

          {/* 展开的动作菜单 */}
          {showActionMenu && (
            <>
              {/* 颜色选择按钮 */}
              <button
                onClick={onShowColorPicker}
                style={{
                  position: 'absolute',
                  top: -32,
                  right: 36,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  border: `2px solid #ffffff`,
                  background: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 3px 12px rgba(0,0,0,0.15)`,
                  transition: 'all 0.3s ease',
                  animation: 'slideIn 0.2s ease-out',
                  zIndex: 999,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.15)';
                }}
                title="更改颜色"
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 11,
                      background: '#f8f9fa',
                      border: '1.5px solid #dee2e6',
                      borderRadius: '12px 12px 2px 12px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        right: 1,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: '1px solid #dee2e6',
                      }}
                    />
                    <div style={{ position: 'absolute', top: 1, left: 2, width: 2, height: 2, borderRadius: '50%', background: '#dc3545' }} />
                    <div style={{ position: 'absolute', top: 1, left: 5, width: 2, height: 2, borderRadius: '50%', background: '#fd7e14' }} />
                    <div style={{ position: 'absolute', top: 4, left: 2, width: 2, height: 2, borderRadius: '50%', background: '#ffc107' }} />
                    <div style={{ position: 'absolute', top: 4, left: 5, width: 2, height: 2, borderRadius: '50%', background: '#198754' }} />
                    <div style={{ position: 'absolute', top: 7, left: 2, width: 2, height: 2, borderRadius: '50%', background: '#0d6efd' }} />
                    <div style={{ position: 'absolute', top: 7, left: 5, width: 2, height: 2, borderRadius: '50%', background: '#6f42c1' }} />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      right: 0,
                      width: 4,
                      height: 1.5,
                      background: '#8b5cf6',
                      borderRadius: '0.5px',
                      transform: 'rotate(30deg)',
                    }}
                  />
                </div>
              </button>

              {/* 图钉按钮 */}
              <button
                onClick={onTogglePin}
                style={{
                  position: 'absolute',
                  top: -32,
                  right: 68,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  border: `2px solid #ffffff`,
                  background: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 3px 12px rgba(0,0,0,0.15)`,
                  transition: 'all 0.3s ease',
                  animation: 'slideIn 0.2s ease-out 0.05s both',
                  zIndex: 998,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.15)';
                }}
                title={node.pinned ? "取消固定" : "固定位置"}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{
                    color: '#dc2626',
                  }}
                >
                  <path d="M16,12V4A1,1 0 0,0 15,3H9A1,1 0 0,0 8,4V12L6,14V16H11V21.5C11,21.78 11.22,22 11.5,22A0.5,0.5 0 0,0 12,21.5V16H17V14L16,12Z" />
                </svg>
              </button>

              {/* 删除按钮 */}
              <button
                onClick={onShowDeleteModal}
                style={{
                  position: 'absolute',
                  top: -32,
                  right: 100,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  border: `2px solid #ffffff`,
                  background: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 3px 12px rgba(239,68,68,0.3)`,
                  transition: 'all 0.3s ease',
                  animation: 'slideIn 0.2s ease-out 0.1s both',
                  zIndex: 997,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,38,38,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.boxShadow = '0 3px 12px rgba(239,68,68,0.3)';
                }}
                title="删除卡片"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"
                    fill="#ffffff"
                  />
                  <path
                    d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                    fill="#ffffff"
                  />
                </svg>
              </button>

              {/* 复制为图片按钮 */}
              {onCopyAsImage && (
                <button
                  onClick={onCopyAsImage}
                  style={{
                    position: 'absolute',
                    top: -32,
                    right: 132,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    border: `2px solid #ffffff`,
                    background: '#10b981',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 3px 12px rgba(16,185,129,0.3)`,
                    transition: 'all 0.3s ease',
                    animation: 'slideIn 0.2s ease-out 0.15s both',
                    zIndex: 995,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 3px 12px rgba(16,185,129,0.3)';
                  }}
                  title="复制为图片"
                >
                  <div
                    style={{
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 'bold',
                      lineHeight: 1,
                    }}
                  >
                    📷
                  </div>
                </button>
              )}

              {/* 翻转按钮 */}
              <button
                onClick={onFlipCard}
                style={{
                  position: 'absolute',
                  top: -32,
                  right: 164,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  border: `2px solid #ffffff`,
                  background: '#8b5cf6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 3px 12px rgba(139,92,246,0.3)`,
                  transition: 'all 0.3s ease',
                  animation: 'slideIn 0.2s ease-out 0.05s both',
                  zIndex: 999,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,92,246,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 3px 12px rgba(139,92,246,0.3)';
                }}
                title="翻转卡片"
              >
                <div style={{
                  position: 'relative',
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{
                    position: 'absolute',
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    transform: 'translateX(-4px)',
                  }}>
                    A
                  </span>
                  <span style={{
                    position: 'absolute',
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    transform: 'rotate(25deg)',
                  }}>
                    /
                  </span>
                  <span style={{
                    position: 'absolute',
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    transform: 'translateX(4px)',
                  }}>
                    B
                  </span>
                </div>
              </button>
            </>
          )}
        </>
      )}
    </>
  );
};

export default NodeCardActions; 