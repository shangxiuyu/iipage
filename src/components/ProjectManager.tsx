import React, { useState, useContext } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { ThemeContext } from '../App';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ isOpen, onClose }) => {
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const theme = useContext(ThemeContext);
  const isDark = theme.isDarkMode;
  
  const { 
    currentProjectId,
    currentProjectName,
    projectList,
    createNewProject,
    saveCurrentProject,
    loadProject,
    deleteProject,
    renameProject,
    duplicateProject,
    exportProject,
  } = useBoardStore();

  if (!isOpen) return null;

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createNewProject(newProjectName.trim());
      setNewProjectName('');
      setShowNewProjectDialog(false);
      
      // 显示成功提示
      const toast = document.createElement('div');
      toast.textContent = `✨ 新项目"${newProjectName.trim()}"已创建`;
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

  const handleRename = (projectId: string, newName: string) => {
    if (newName.trim() && newName.trim() !== projectList.find(p => p.id === projectId)?.name) {
      renameProject(projectId, newName.trim());
      setRenamingProjectId(null);
      setRenameValue('');
      
      // 显示成功提示
      const toast = document.createElement('div');
      toast.textContent = `✏️ 项目已重命名为"${newName.trim()}"`;
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
    } else {
      setRenamingProjectId(null);
      setRenameValue('');
    }
  };

  const handleDelete = (projectId: string, projectName: string) => {
    if (confirm(`确定要删除项目"${projectName}"吗？\n\n这个操作不可撤销，所有项目数据将被永久删除。`)) {
      deleteProject(projectId);
      
      // 显示成功提示
      const toast = document.createElement('div');
      toast.textContent = `🗑️ 项目"${projectName}"已删除`;
      toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(239,68,68,0.9);
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

  const handleDuplicate = (projectId: string, projectName: string) => {
    duplicateProject(projectId);
    
    // 显示成功提示
    const toast = document.createElement('div');
    toast.textContent = `�� 项目"${projectName}"已复制`;
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(139,69,19,0.9);
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

  const handleExport = (projectId: string, projectName: string) => {
    exportProject(projectId);
    
    // 显示成功提示
    const toast = document.createElement('div');
    toast.textContent = `📤 项目"${projectName}"已导出`;
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(168,85,247,0.9);
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

  const handleLoad = (projectId: string, projectName: string) => {
    if (currentProjectId && currentProjectId !== projectId) {
      if (confirm(`确定要切换到项目"${projectName}"吗？\n\n当前项目的修改将被自动保存。`)) {
        loadProject(projectId);
        onClose();
        
        // 显示成功提示
        const toast = document.createElement('div');
        toast.textContent = `📂 已切换到项目"${projectName}"`;
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
    } else {
      loadProject(projectId);
      onClose();
    }
  };

  const sortedProjects = [...projectList].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '90%',
        maxWidth: 800,
        height: '80%',
        maxHeight: 600,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* 头部 */}
        <div style={{
          padding: '20px 24px',
          borderBottom: isDark ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(229,231,235,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: isDark ? '#f9fafb' : '#111827',
            }}>
              📁 项目管理
            </h2>
            <div style={{
              fontSize: '14px',
              color: isDark ? '#9ca3af' : '#6b7280',
              marginTop: 4,
            }}>
              管理您的白板项目，支持创建、保存、加载和导出
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              border: 'none',
              borderRadius: 8,
              backgroundColor: isDark ? 'rgba(75,85,99,0.3)' : 'rgba(243,244,246,0.8)',
              color: isDark ? '#d1d5db' : '#374151',
              cursor: 'pointer',
              fontSize: '18px',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* 工具栏 */}
        <div style={{
          padding: '16px 24px',
          borderBottom: isDark ? '1px solid rgba(75,85,99,0.2)' : '1px solid rgba(229,231,235,0.6)',
          display: 'flex',
          gap: 12,
        }}>
          <button
            onClick={() => setShowNewProjectDialog(true)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 8,
              backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
              color: isDark ? '#60a5fa' : '#3b82f6',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ✨ 新建项目
          </button>
          
          <button
            onClick={() => {
              saveCurrentProject();
              
              // 显示保存成功提示
              const toast = document.createElement('div');
              toast.textContent = '💾 当前项目已保存';
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
            }}
            disabled={!currentProjectId}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 8,
              backgroundColor: currentProjectId 
                ? (isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)')
                : (isDark ? 'rgba(75,85,99,0.2)' : 'rgba(243,244,246,0.5)'),
              color: currentProjectId 
                ? (isDark ? '#4ade80' : '#16a34a')
                : (isDark ? '#6b7280' : '#9ca3af'),
              cursor: currentProjectId ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            💾 保存当前
          </button>
        </div>

        {/* 项目列表 */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px 24px',
        }}>
          {sortedProjects.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: isDark ? '#9ca3af' : '#6b7280',
            }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>📝</div>
              <div style={{ fontSize: '18px', marginBottom: 8 }}>还没有项目</div>
              <div style={{ fontSize: '14px' }}>点击"新建项目"创建您的第一个白板项目</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}>
              {sortedProjects.map((project) => (
                <div
                  key={project.id}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(55,65,81,0.5)' : 'rgba(249,250,251,0.8)',
                    border: currentProjectId === project.id 
                      ? (isDark ? '2px solid #3b82f6' : '2px solid #2563eb')
                      : (isDark ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(229,231,235,0.8)'),
                    position: 'relative',
                  }}
                >
                  {/* 当前项目标识 */}
                  {currentProjectId === project.id && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      padding: '2px 8px',
                      borderRadius: 12,
                      backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 500,
                    }}>
                      当前
                    </div>
                  )}

                  {/* 项目名称 */}
                  {renamingProjectId === project.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(project.id, renameValue)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRename(project.id, renameValue);
                        } else if (e.key === 'Escape') {
                          setRenamingProjectId(null);
                          setRenameValue('');
                        }
                      }}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: isDark ? '1px solid #4b5563' : '1px solid #d1d5db',
                        borderRadius: 4,
                        backgroundColor: isDark ? '#374151' : '#ffffff',
                        color: isDark ? '#f9fafb' : '#111827',
                        fontSize: '16px',
                        fontWeight: 600,
                      }}
                    />
                  ) : (
                    <h3
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '16px',
                        fontWeight: 600,
                        color: isDark ? '#f9fafb' : '#111827',
                        cursor: 'pointer',
                        paddingRight: currentProjectId === project.id ? 60 : 0,
                      }}
                      onClick={() => {
                        setRenamingProjectId(project.id);
                        setRenameValue(project.name);
                      }}
                      title="点击重命名"
                    >
                      {project.name}
                    </h3>
                  )}

                  {/* 项目信息 */}
                  <div style={{
                    fontSize: '12px',
                    color: isDark ? '#9ca3af' : '#6b7280',
                    marginBottom: 12,
                  }}>
                    <div>创建：{new Date(project.createdAt).toLocaleString()}</div>
                    <div>更新：{new Date(project.updatedAt).toLocaleString()}</div>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}>
                    <button
                      onClick={() => handleLoad(project.id, project.name)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: 6,
                        backgroundColor: isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)',
                        color: isDark ? '#4ade80' : '#16a34a',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      📂 打开
                    </button>
                    
                    <button
                      onClick={() => handleDuplicate(project.id, project.name)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: 6,
                        backgroundColor: isDark ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.1)',
                        color: isDark ? '#d97706' : '#92400e',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      📋 复制
                    </button>
                    
                    <button
                      onClick={() => handleExport(project.id, project.name)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: 6,
                        backgroundColor: isDark ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.1)',
                        color: isDark ? '#a855f7' : '#7c3aed',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      📤 导出
                    </button>
                    
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: 6,
                        backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.1)',
                        color: isDark ? '#f87171' : '#dc2626',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      🗑️ 删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新建项目对话框 */}
      {showNewProjectDialog && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1010,
        }}>
          <div style={{
            width: 400,
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              color: isDark ? '#f9fafb' : '#111827',
            }}>
              ✨ 新建项目
            </h3>
            
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="请输入项目名称"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject();
                } else if (e.key === 'Escape') {
                  setShowNewProjectDialog(false);
                  setNewProjectName('');
                }
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                border: isDark ? '1px solid #4b5563' : '1px solid #d1d5db',
                borderRadius: 8,
                backgroundColor: isDark ? '#374151' : '#ffffff',
                color: isDark ? '#f9fafb' : '#111827',
                fontSize: '14px',
                marginBottom: 20,
                boxSizing: 'border-box',
              }}
            />
            
            <div style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => {
                  setShowNewProjectDialog(false);
                  setNewProjectName('');
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  backgroundColor: isDark ? 'rgba(75,85,99,0.3)' : 'rgba(243,244,246,0.8)',
                  color: isDark ? '#d1d5db' : '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                取消
              </button>
              
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  backgroundColor: newProjectName.trim()
                    ? (isDark ? '#3b82f6' : '#2563eb')
                    : (isDark ? 'rgba(75,85,99,0.3)' : 'rgba(243,244,246,0.8)'),
                  color: newProjectName.trim() ? 'white' : (isDark ? '#6b7280' : '#9ca3af'),
                  cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManager; 