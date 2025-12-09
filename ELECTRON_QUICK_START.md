# iiPage Electron 客户端 - 快速开始

## ⚡ 5 分钟快速上手

### 1️⃣ 依赖安装（正在进行中）

等待当前的 npm install 完成...

### 2️⃣ 开发环境测试

依赖安装完成后，运行：

```bash
npm run dev:electron
```

应该会：
- 启动 Vite 开发服务器
- 自动打开 Electron 窗口
- 在窗口中加载你的白板应用

### 3️⃣ 构建测试

```bash
# 构建所有代码
npm run build

# 查看构建结果
ls dist/           # Web 应用
ls dist-electron/  # Electron 代码
```

### 4️⃣ 打包应用

```bash
# 打包当前平台的应用
npm run dist
```

在 macOS 上会生成：
- `release/iiPage-1.0.0-mac-arm64.dmg` (Apple Silicon)
- `release/iiPage-1.0.0-mac-x64.dmg` (Intel)
- `release/iiPage-1.0.0-mac-arm64.zip`
- `release/iiPage-1.0.0-mac-x64.zip`

## 📁 项目文件说明

```
新增文件：
├── electron/                    # Electron 代码目录
│   ├── main.ts                 # 主进程（窗口管理、菜单等）
│   ├── preload.ts              # 预加载脚本（安全 API 桥接）
│   └── tsconfig.json           # Electron TypeScript 配置
├── vite-electron.config.ts     # Electron 构建配置
├── ELECTRON_README.md          # 简要说明（本文件）
├── ELECTRON_CLIENT_GUIDE.md    # 详细指南
└── ELECTRON_QUICK_START.md     # 快速开始

修改文件：
├── package.json                # 新增脚本和 Electron 配置
└── .gitignore                  # 忽略构建产物
```

## 🎯 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | Web 开发模式 |
| `npm run dev:electron` | Electron 开发模式 |
| `npm run build` | 构建所有代码 |
| `npm run dist` | 打包应用（当前平台） |
| `npm run dist:mac` | 打包 macOS 应用 |
| `npm run dist:win` | 打包 Windows 应用 |
| `npm run dist:linux` | 打包 Linux 应用 |

## ⚙️ 准备图标（可选）

打包前准备应用图标可以让应用更专业：

```bash
# 创建图标目录
mkdir -p build

# 放置图标文件
# macOS: build/icon.icns
# Windows: build/icon.ico  
# Linux: build/icon.png
```

没有图标也可以打包，Electron 会使用默认图标。

## 🔧 故障排查

### 问题：Electron 安装很慢

**解决方案**：配置国内镜像

```bash
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
```

### 问题：开发模式启动失败

**检查**：
1. Vite 服务器是否在 5173 端口运行
2. 终端是否有错误信息
3. 尝试先运行 `npm run dev` 确认 Web 版本正常

### 问题：打包后应用无法启动

**检查**：
1. 是否先执行了 `npm run build`
2. 查看 `dist/` 和 `dist-electron/` 是否有文件
3. 检查终端的构建日志

## 📚 下一步

- 📖 阅读完整指南：[ELECTRON_CLIENT_GUIDE.md](./ELECTRON_CLIENT_GUIDE.md)
- 🎨 准备应用图标
- 🚀 配置自动更新
- 📝 配置代码签名（用于发布）

## 🎉 完成！

你的白板应用现在是一个真正的桌面应用了！

可以独立运行，不需要浏览器，提供更好的用户体验。
