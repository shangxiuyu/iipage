import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BoardCanvas from './BoardCanvas';
import { useBoardStore } from '../store/useBoardStore';
import { cloudDataManager } from '../services/cloudDataManager';

const ShareBoardPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false); // 🔒 新增访问被拒绝状态
  const [boardData, setBoardData] = useState<any>(null);

  // 🚀 云端分享：从阿里云OSS加载分享的白板数据
  useEffect(() => {
    if (!shareId) return;
    
    const loadCloudShareData = async () => {
      setLoading(true);
      setNotFound(false);
      setAccessDenied(false);
      
      try {
        console.log(`🔍 正在从云端加载分享白板: ${shareId}`);
        
        // 检查 cloudDataManager 是否已初始化，如果没有则尝试初始化
        if (!cloudDataManager.isReady()) {
          console.warn('⚠️ cloudDataManager 未初始化，尝试初始化...');
          
          // 从环境变量初始化 cloudDataManager
          const config = {
            region: import.meta.env.VITE_ALICLOUD_REGION,
            accessKeyId: import.meta.env.VITE_ALICLOUD_ACCESS_KEY_ID,
            accessKeySecret: import.meta.env.VITE_ALICLOUD_ACCESS_KEY_SECRET,
            bucket: import.meta.env.VITE_ALICLOUD_BUCKET,
            autoSync: false, // 分享页面不需要自动同步
            syncInterval: 0,
          };
          
          if (config.region && config.accessKeyId && config.accessKeySecret && config.bucket) {
            console.log('🔄 正在初始化 cloudDataManager...');
            const initSuccess = await cloudDataManager.initialize(config);
            
            if (!initSuccess) {
              console.error('❌ cloudDataManager 初始化失败');
              // 跳转到本地查找逻辑
              console.log('🔄 尝试从本地localStorage查找...');
            } else {
              console.log('✅ cloudDataManager 初始化成功');
            }
          } else {
            console.warn('⚠️ 阿里云配置不完整，无法初始化 cloudDataManager');
            console.log('🔄 尝试从本地localStorage查找...');
          }
        }
        
        // 如果 cloudDataManager 仍未就绪，使用本地查找
        if (!cloudDataManager.isReady()) {
          console.log('🔄 使用本地localStorage查找...');
          // 直接跳到本地查找逻辑
          let found = false;
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('whiteboard-data-')) {
              const data = localStorage.getItem(key);
              if (data) {
                try {
                  const board = JSON.parse(data);
                  if (board.shareId === shareId) {
                    console.log(`✅ 本地找到分享白板: ${board.title || shareId}`);
                    setBoardData(board);
                    found = true;
                  }
                } catch {}
              }
            }
          });
          
          if (!found) {
            setNotFound(true);
          }
          return;
        }
        
        // 如果 cloudDataManager 已就绪，从云端加载数据
        if (cloudDataManager.isReady()) {
          console.log('📡 从阿里云OSS加载白板数据...');
          // 从阿里云OSS加载白板数据 (shareId 就是 boardId)
          const cloudData = await cloudDataManager.loadFromCloud(shareId);
          
          if (cloudData) {
            console.log(`✅ 云端分享白板加载成功: ${cloudData.title || shareId}`);
            
            // 🔒 检查访问权限
            if (cloudData.shareEnabled === false) {
              console.warn(`🚫 白板 ${shareId} 分享已被禁用，拒绝访问`);
              setAccessDenied(true);
              return;
            }
            
            setBoardData(cloudData);
          } else {
            console.log(`❌ 云端找不到分享白板: ${shareId}`);
            // 如果云端找不到，尝试从本地查找（向后兼容）
            console.log('🔄 尝试从本地localStorage查找...');
            let found = false;
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('whiteboard-data-')) {
                const data = localStorage.getItem(key);
                if (data) {
                  try {
                    const board = JSON.parse(data);
                    if (board.shareId === shareId) {
                      console.log(`✅ 本地找到分享白板: ${board.title || shareId}`);
                      setBoardData(board);
                      found = true;
                    }
                  } catch {}
                }
              }
            });
            
            if (!found) {
              setNotFound(true);
            }
          }
        }
      } catch (error) {
        console.error('❌ 加载分享白板失败:', error);
        setNotFound(true);
      }
      
      setLoading(false);
    };
    
    loadCloudShareData();
  }, [shareId]);

  // 加载只读白板数据到 store
  useEffect(() => {
    if (boardData) {
      useBoardStore.getState().loadBoard(boardData);
    }
  }, [boardData]);

  // 只读模式下，注入全局样式禁用所有编辑/交互
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .board-canvas * {
        user-select: none !important;
        cursor: default !important;
      }
      .board-canvas {
        cursor: default !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  let content: React.ReactNode = null;
  if (loading) {
    content = (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        fontSize: '16px',
        color: '#6c757d'
      }}>
        🔍 正在加载分享白板...
      </div>
    );
  } else if (accessDenied) {
    // 🔒 访问被拒绝的页面
    content = (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#fff5f5',
        padding: '40px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px'
          }}>🚫</div>
          <h2 style={{
            color: '#dc3545',
            fontSize: '24px',
            fontWeight: 600,
            marginBottom: '16px',
            margin: 0
          }}>
            访问已被限制
          </h2>
          <p style={{
            color: '#6c757d',
            fontSize: '16px',
            lineHeight: 1.6,
            margin: '16px 0 24px 0'
          }}>
            该白板的分享已被作者取消，您无法继续访问此内容。
            <br />
            如有疑问，请联系白板的创建者。
          </p>
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            color: '#495057'
          }}>
            💡 提示：即使取消分享，原作者仍可以重新启用分享功能
          </div>
        </div>
      </div>
    );
  } else if (notFound) {
    content = (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        padding: '40px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px'
          }}>🔍</div>
          <h2 style={{
            color: '#495057',
            fontSize: '24px',
            fontWeight: 600,
            marginBottom: '16px',
            margin: 0
          }}>
            白板不存在
          </h2>
          <p style={{
            color: '#6c757d',
            fontSize: '16px',
            lineHeight: 1.6,
            margin: '16px 0'
          }}>
            未找到该白板，分享链接可能无效或已失效。
            <br />
            请检查链接是否正确，或联系分享者获取新的链接。
          </p>
        </div>
      </div>
    );
  } else {
    content = <BoardCanvas readOnly />;
  }

  return content;
};

export default ShareBoardPage; 