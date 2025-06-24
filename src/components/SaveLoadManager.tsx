import React, { useState, useRef } from 'react';
import { useBoardStore } from '../store/useBoardStore';

interface SaveLoadManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SaveLoadManager: React.FC<SaveLoadManagerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'save' | 'load' | 'settings'>('save');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const saveBoard = useBoardStore((s) => s.saveBoard);
  const loadBoard = useBoardStore((s) => s.loadBoard);
  const clearBoard = useBoardStore((s) => s.clearBoard);
  const nodes = useBoardStore((s) => s.nodes);
  const connections = useBoardStore((s) => s.connections);

  if (!isOpen) return null;

  // 手动保存
  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      saveBoard();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage('保存失败: ' + (error as Error).message);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // 文件上传处理
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadStatus('loading');
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const boardData = JSON.parse(content);
        
        // 验证数据格式
        if (!boardData.nodes || !Array.isArray(boardData.nodes)) {
          throw new Error('无效的白板文件格式');
        }
        
        loadBoard(boardData);
        setLoadStatus('success');
        setTimeout(() => {
          setLoadStatus('idle');
          onClose();
        }, 1500);
      } catch (error) {
        setLoadStatus('error');
        setErrorMessage('加载失败: ' + (error as Error).message);
        setTimeout(() => setLoadStatus('idle'), 3000);
      }
    };
    
    reader.readAsText(file);
  };

  // 从本地存储恢复
  const handleRestoreFromLocal = () => {
    try {
      const backup = localStorage.getItem('whiteboard-backup');
      if (!backup) {
        throw new Error('没有找到本地备份数据');
      }
      
      const boardData = JSON.parse(backup);
      loadBoard(boardData);
      setLoadStatus('success');
      setTimeout(() => {
        setLoadStatus('idle');
        onClose();
      }, 1500);
    } catch (error) {
      setLoadStatus('error');
      setErrorMessage('恢复失败: ' + (error as Error).message);
      setTimeout(() => setLoadStatus('idle'), 3000);
    }
  };

  // 清空白板
  const handleClearBoard = () => {
    if (window.confirm('确定要清空白板吗？此操作不可撤销！')) {
      clearBoard();
      onClose();
    }
  };

  // 统计信息
  const statsInfo = {
    cards: nodes.length,
    connections: connections.length,
    storageUsed: JSON.stringify({ nodes, connections }).length,
    lastSaved: localStorage.getItem('whiteboard-storage') ? '自动保存' : '未保存'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        width: '90%',
        maxWidth: 600,
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      }}>
        {/* 头部 */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#333' }}>💾 数据管理</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#999',
              padding: 0
            }}
          >
            ✕
          </button>
        </div>

        {/* 标签页 */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #eee'
        }}>
          {[
            { key: 'save', label: '💾 保存', icon: '💾' },
            { key: 'load', label: '📂 加载', icon: '📂' },
            { key: 'settings', label: '⚙️ 设置', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                background: activeTab === tab.key ? '#f8f9fa' : 'transparent',
                borderBottom: activeTab === tab.key ? '2px solid #667eea' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: 14,
                color: activeTab === tab.key ? '#667eea' : '#666',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div style={{ padding: 24, minHeight: 300 }}>
          {/* 保存标签页 */}
          {activeTab === 'save' && (
            <div>
              <h3 style={{ marginTop: 0, color: '#333' }}>保存白板数据</h3>
              
              <div style={{
                background: '#f8f9fa',
                padding: 16,
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 14,
                color: '#666'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>📊 卡片数量: <strong>{statsInfo.cards}</strong></div>
                  <div>🔗 连接数量: <strong>{statsInfo.connections}</strong></div>
                  <div>💿 数据大小: <strong>{(statsInfo.storageUsed / 1024).toFixed(1)} KB</strong></div>
                  <div>🕒 状态: <strong>{statsInfo.lastSaved}</strong></div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  style={{
                    padding: '12px 20px',
                    background: saveStatus === 'success' ? '#28a745' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: saveStatus === 'saving' ? 0.7 : 1
                  }}
                >
                  {saveStatus === 'saving' && '⏳ 保存中...'}
                  {saveStatus === 'success' && '✅ 保存成功'}
                  {saveStatus === 'error' && '❌ 保存失败'}
                  {saveStatus === 'idle' && '💾 下载白板文件'}
                </button>

                {saveStatus === 'error' && (
                  <div style={{ color: '#dc3545', fontSize: 14, marginTop: 8 }}>
                    {errorMessage}
                  </div>
                )}

                <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                  💡 提示：数据会自动保存到浏览器本地存储，同时生成备份文件下载
                </div>
              </div>
            </div>
          )}

          {/* 加载标签页 */}
          {activeTab === 'load' && (
            <div>
              <h3 style={{ marginTop: 0, color: '#333' }}>加载白板数据</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 文件上传 */}
                <div>
                  <label style={{ fontSize: 14, color: '#666', marginBottom: 8, display: 'block' }}>
                    📁 从文件加载
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loadStatus === 'loading'}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px dashed #ddd',
                      borderRadius: 8,
                      background: '#fafafa',
                      cursor: loadStatus === 'loading' ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      color: '#666',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (loadStatus !== 'loading') {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.background = '#f0f4ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#ddd';
                      e.currentTarget.style.background = '#fafafa';
                    }}
                  >
                    {loadStatus === 'loading' ? '⏳ 加载中...' : '📂 选择 JSON 文件'}
                  </button>
                </div>

                {/* 本地恢复 */}
                <div>
                  <label style={{ fontSize: 14, color: '#666', marginBottom: 8, display: 'block' }}>
                    🔄 从本地备份恢复
                  </label>
                  <button
                    onClick={handleRestoreFromLocal}
                    disabled={loadStatus === 'loading'}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: loadStatus === 'loading' ? 'not-allowed' : 'pointer',
                      opacity: loadStatus === 'loading' ? 0.7 : 1
                    }}
                  >
                    🔄 恢复最近备份
                  </button>
                </div>

                {loadStatus === 'success' && (
                  <div style={{ 
                    color: '#28a745', 
                    fontSize: 14, 
                    padding: 12, 
                    background: '#d4edda', 
                    borderRadius: 6,
                    border: '1px solid #c3e6cb'
                  }}>
                    ✅ 数据加载成功！
                  </div>
                )}

                {loadStatus === 'error' && (
                  <div style={{ 
                    color: '#dc3545', 
                    fontSize: 14,
                    padding: 12,
                    background: '#f8d7da',
                    borderRadius: 6,
                    border: '1px solid #f5c6cb'
                  }}>
                    ❌ {errorMessage}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 设置标签页 */}
          {activeTab === 'settings' && (
            <div>
              <h3 style={{ marginTop: 0, color: '#333' }}>数据设置</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 存储信息 */}
                <div>
                  <h4 style={{ color: '#666', fontSize: 14 }}>📊 存储信息</h4>
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: 16, 
                    borderRadius: 8, 
                    fontSize: 14,
                    color: '#666'
                  }}>
                    <div>• 自动保存：开启（1秒延迟）</div>
                    <div>• 存储位置：浏览器本地存储</div>
                    <div>• 数据版本：v1</div>
                    <div>• 支持格式：JSON</div>
                  </div>
                </div>

                {/* 危险操作 */}
                <div>
                  <h4 style={{ color: '#dc3545', fontSize: 14 }}>⚠️ 危险操作</h4>
                  <button
                    onClick={handleClearBoard}
                    style={{
                      padding: '12px 20px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    🗑️ 清空白板
                  </button>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                    ⚠️ 此操作将删除所有卡片和连接，且不可撤销
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaveLoadManager; 