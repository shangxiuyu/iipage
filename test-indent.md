# Shift+Tab 竖线删除功能测试指南

## 测试步骤

1. **创建多级缩进内容**
   - 输入一些文本
   - 按 Tab 键增加缩进，创建 2-3 级缩进
   - 观察竖线是否正确显示

2. **测试 Shift+Tab 删除竖线**
   - 将光标放在有缩进的行上
   - 按 Shift+Tab 减少缩进
   - **关键检查点**：竖线应该立即消失，不应该有延迟

3. **边界情况测试**
   - 在最高级缩进(4级)减少缩进
   - 在无缩进行尝试 Shift+Tab
   - 快速连续按 Shift+Tab

## 优化内容

✅ **多重强制更新机制**
- 立即执行：`forceUpdateIndentLines()`
- 0ms 延迟：`setTimeout(() => forceUpdateIndentLines(), 0)`
- 10ms 延迟：`setTimeout(() => forceUpdateIndentLines(), 10)`
- 50ms 延迟：`setTimeout(() => forceUpdateIndentLines(), 50)`

✅ **内容变化监听**
- handleChange 函数中立即更新竖线
- 编辑器 onChange 事件监听
- updateIndentLines 依赖变化自动更新

✅ **直接访问更新函数**
- 在 handleKeyDown 中直接调用 forceUpdateIndentLines
- 避免依赖循环问题
- 确保函数可访问性

## 预期效果

用户按 Shift+Tab 时，对应的竖线应该立即消失，提供流畅的编辑体验。 