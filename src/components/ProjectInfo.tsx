import React from 'react';
import { useBoardStore } from '../store/useBoardStore';

interface ProjectInfoProps {
  isDarkMode: boolean;
}

const ProjectInfo: React.FC<ProjectInfoProps> = ({ isDarkMode }) => {
  const { currentProjectName, nodes } = useBoardStore();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      backgroundColor: isDarkMode ? 'rgba(55,65,81,0.5)' : 'rgba(243,244,246,0.8)',
      borderRadius: 8,
      border: isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(209,213,219,0.5)',
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: isDarkMode ? '#10b981' : '#059669',
      }} />
      <div style={{
        fontSize: '14px',
        color: isDarkMode ? '#e5e7eb' : '#374151',
        fontWeight: 500,
      }}>
        {currentProjectName || '未命名项目'}
      </div>
      <div style={{
        fontSize: '12px',
        color: isDarkMode ? '#9ca3af' : '#6b7280',
        marginLeft: 4,
      }}>
        {nodes.length} 个节点
      </div>
    </div>
  );
};

export default ProjectInfo; 