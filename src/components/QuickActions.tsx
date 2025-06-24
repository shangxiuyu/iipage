import React from 'react';
import { useBoardStore } from '../store/useBoardStore';

interface QuickActionsProps {
  isDarkMode: boolean;
  onOpenProjectManager: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ isDarkMode, onOpenProjectManager }) => {
  const { createNewProject, saveCurrentProject } = useBoardStore();

  const buttonStyle = {
    padding: '8px 12px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
    color: isDarkMode ? '#60a5fa' : '#3b82f6',
    border: isDarkMode ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(59,130,246,0.2)',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: isDarkMode ? 'rgba(75,85,99,0.3)' : 'rgba(243,244,246,0.8)',
    color: isDarkMode ? '#d1d5db' : '#374151',
    border: isDarkMode ? '1px solid rgba(75,85,99,0.4)' : '1px solid rgba(209,213,219,0.5)',
  };

  const handleNewProject = () => {
    const projectName = prompt('请输入新项目名称：', `新项目 ${new Date().toLocaleDateString()}`);
    if (projectName !== null && projectName.trim()) {
      createNewProject(projectName.trim());
      
      // 显示成功提示
      const toast = document.createElement('div');
      toast.textContent = `✨ 新项目"${projectName.trim()}"已创建`;
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
  };

  const handleSaveProject = () => {
    saveCurrentProject();
    
    // 显示保存成功提示
    const toast = document.createElement('div');
    toast.textContent = '💾 项目已保存';
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(59,130,246,0.9);
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
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={handleNewProject}
        style={primaryButtonStyle}
        title="创建新项目"
      >
        ✨ 新建
      </button>
      
      <button
        onClick={handleSaveProject}
        style={secondaryButtonStyle}
        title="保存当前项目"
      >
        💾 保存
      </button>
      
      <button
        onClick={onOpenProjectManager}
        style={secondaryButtonStyle}
        title="管理所有项目"
      >
        📁 项目
      </button>
    </div>
  );
};

export default QuickActions; 