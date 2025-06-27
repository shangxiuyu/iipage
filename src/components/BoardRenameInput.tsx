import React, { useState, useEffect, useRef, useContext } from 'react';
import { ThemeContext } from '../App';

interface BoardRenameInputProps {
  initialValue: string;
  onSave: (newTitle: string) => void;
  onCancel: () => void;
  style?: React.CSSProperties;
}

const BoardRenameInput: React.FC<BoardRenameInputProps> = ({
  initialValue,
  onSave,
  onCancel,
  style = {}
}) => {
  const [value, setValue] = useState(initialValue);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDarkMode } = useContext(ThemeContext);

  // 自动聚焦
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // 处理保存
  const handleSave = () => {
    if (isComposing) return; // 中文输入过程中不保存
    
    const trimmedValue = value.trim();
    if (trimmedValue && trimmedValue !== initialValue) {
      onSave(trimmedValue);
    } else {
      onCancel();
    }
  };

  // 处理取消
  const handleCancel = () => {
    if (isComposing) return; // 中文输入过程中不取消
    onCancel();
  };

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 中文输入过程中，阻止所有快捷键
    if (isComposing) {
      return;
    }

    // 阻止事件冒泡，避免全局快捷键干扰
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // 中文输入法事件处理
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // 失焦事件处理
  const handleBlur = () => {
    if (!isComposing) {
      handleSave();
    }
  };

  // 点击事件处理（阻止冒泡）
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const defaultStyle: React.CSSProperties = {
    width: '100%',
    padding: '2px 4px',
    border: isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
    borderRadius: '4px',
    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
    color: isDarkMode ? '#F9FAFB' : '#111827',
    fontSize: '12px',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
    ...style
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
      onClick={handleClick}
      style={defaultStyle}
      placeholder="输入白板名称"
    />
  );
};

export default BoardRenameInput; 