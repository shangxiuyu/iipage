# iiPage 桌面客户端使用指南

## 概述

iiPage 现在已经封装成 Electron 桌面应用，可以在 Windows、macOS 和 Linux 系统上作为独立应用运行。

## 开发环境

### 前置要求

- Node.js 16+ 
- npm 或 yarn

### 安装依赖

依赖已经在安装中，等待完成后即可使用。

```bash
npm install
```

### 启动开发环境

在桌面应用模式下运行开发环境：

```bash
npm run dev:electron
```

这个命令会：
1. 启动 Vite 开发服务器（端口 5173）
2. 等待服务器就绪
3. 启动 Electron 应用并加载开发服务器

### 仅 Web 开发

如果只需要 Web 版本开发：

```bash
npm run dev
```

## 构建打包

### 构建应用

构建 Web 和 Electron 代码：

```bash
npm run build
```

这会：
1. 构建 Web 应用到 `dist/` 目录
2. 构建 Electron 主进程和预加载脚本到 `dist-electron/` 目录

### 打包桌面应用

#### 打包所有平台

```bash
npm run dist
```

#### 打包特定平台

macOS：
```bash
npm run dist:mac
```

Windows：
```bash
npm run dist:win
```

Linux：
```bash
npm run dist:linux
```

打包后的应用会生成在 `release/` 目录下。

## 项目结构

```
iipage/
├── electron/              # Electron 相关代码
│   ├── main.ts           # 主进程
│   ├── preload.ts        # 预加载脚本
│   └── tsconfig.json     # Electron TypeScript 配置
├── src/                  # React 应用源码
├── dist/                 # Web 应用构建输出
├── dist-electron/        # Electron 构建输出
├── release/              # 打包后的应用
├── build/                # 应用图标资源（需要准备）
├── vite.config.ts        # Vite 配置（Web）
└── vite-electron.config.ts  # Vite 配置（Electron）
```

## 应用图标

打包前需要准备应用图标，放在 `build/` 目录：

- macOS: `build/icon.icns` (512x512 或 1024x1024)
- Windows: `build/icon.ico` (256x256)
- Linux: `build/icon.png` (512x512)

可以使用在线工具转换图标格式：
- https://iconverticons.com/online/
- https://www.icoconverter.com/

## 功能特性

### 桌面应用特性

1. **原生菜单**
   - 文件菜单：新建白板、退出
   - 编辑菜单：撤销、重做、复制、粘贴等
   - 视图菜单：缩放、全屏、开发者工具
   - 帮助菜单：关于、访问 GitHub

2. **快捷键**
   - `Cmd/Ctrl + N`: 新建白板
   - `Cmd/Ctrl + Q`: 退出应用
   - `Cmd/Ctrl + R`: 重新加载
   - `Cmd/Ctrl + Shift + I`: 开发者工具
   - `F11`: 全屏

3. **窗口管理**
   - 最小窗口尺寸：1000x600
   - 默认窗口尺寸：1400x900
   - 支持全屏模式

4. **安全性**
   - 启用上下文隔离
   - 禁用 Node 集成
   - 使用预加载脚本安全地暴露 API

### Web 版本兼容性

桌面应用和 Web 版本共享相同的代码，所有 Web 功能在桌面版本中都可以正常使用。

## 发布流程

### 1. 更新版本号

编辑 `package.json` 中的 `version` 字段：

```json
{
  "version": "1.0.1"
}
```

### 2. 构建应用

```bash
npm run build
```

### 3. 打包应用

```bash
npm run dist
```

### 4. 测试安装包

在 `release/` 目录找到生成的安装包，在目标系统上测试安装。

### 5. 发布

将生成的安装包上传到：
- GitHub Releases
- 官网下载页面
- 应用商店（可选）

## 常见问题

### Q: Electron 安装很慢怎么办？

A: Electron 二进制文件较大（约 200MB），首次安装需要下载。可以：
1. 等待自动下载完成
2. 使用国内镜像：`npm config set electron_mirror https://npmmirror.com/mirrors/electron/`

### Q: 如何调试 Electron 主进程？

A: 
1. 修改 `electron/main.ts` 添加断点
2. 在 VSCode 中添加调试配置
3. 或使用 `console.log()` 查看终端输出

### Q: 打包后应用无法启动？

A: 检查：
1. 是否正确构建了 Web 应用（`npm run build:web`）
2. 是否正确构建了 Electron 代码（`npm run build:electron`）
3. 查看构建日志中的错误信息
4. 检查 `package.json` 中的 `main` 字段是否正确

### Q: 如何减小应用体积？

A: 
1. 在 `package.json` 的 `build.files` 中只包含必要文件
2. 使用 `asar` 打包（默认已启用）
3. 配置 `extraResources` 而不是 `extraFiles`
4. 优化依赖，移除未使用的包

### Q: 如何添加自动更新功能？

A: 可以集成 `electron-updater`：
1. 安装：`npm install electron-updater`
2. 在主进程中配置自动更新
3. 设置更新服务器
4. 配置代码签名

## 技术栈

- **Electron**: 桌面应用框架
- **Vite**: 构建工具
- **React**: UI 框架
- **TypeScript**: 类型支持
- **Electron Builder**: 打包工具

## 相关资源

- [Electron 官方文档](https://www.electronjs.org/docs)
- [Electron Builder 文档](https://www.electron.build/)
- [Vite 官方文档](https://vitejs.dev/)

## 支持

如有问题，请访问：
- GitHub Issues: https://github.com/shangxiuyu/iipage/issues
- 项目主页: https://github.com/shangxiuyu/iipage
