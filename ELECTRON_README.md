# iiPage - 桌面客户端版本

## 🎉 新功能：桌面客户端

iiPage 现在已经封装成桌面应用！可以在 Windows、macOS 和 Linux 上作为独立应用运行。

## 快速开始

### 开发模式

```bash
# 安装依赖（首次运行）
npm install

# 启动桌面客户端开发环境
npm run dev:electron
```

### 构建和打包

```bash
# 构建应用
npm run build

# 打包桌面应用（当前平台）
npm run dist

# 针对特定平台打包
npm run dist:mac     # macOS
npm run dist:win     # Windows
npm run dist:linux   # Linux
```

打包后的安装程序在 `release/` 目录。

## 主要特性

✅ **跨平台支持** - Windows、macOS、Linux  
✅ **原生菜单** - 完整的应用菜单和快捷键  
✅ **离线可用** - 无需浏览器，独立运行  
✅ **原生体验** - 更好的性能和用户体验  
✅ **自动更新** - 支持应用自动更新（可配置）  

## 技术架构

- **Electron** - 桌面应用框架
- **React + TypeScript** - UI 层
- **Vite** - 快速构建工具
- **Electron Builder** - 打包工具

## 详细文档

完整的使用指南请查看：[ELECTRON_CLIENT_GUIDE.md](./ELECTRON_CLIENT_GUIDE.md)

## Web 版本

如果只需要 Web 版本：

```bash
npm run dev       # 开发环境
npm run build     # 构建生产版本
```

## 注意事项

1. **首次安装** Electron 依赖较大（约 200MB），请耐心等待
2. **打包前** 需要准备应用图标，放在 `build/` 目录
3. **代码签名** 正式发布前建议配置代码签名证书

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

请查看项目根目录的 LICENSE 文件
