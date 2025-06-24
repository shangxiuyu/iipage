#!/bin/bash

# 更新依赖脚本
echo "开始更新依赖..."

# 更新 NPM 到最新版本
echo "更新 NPM..."
npm install -g npm@latest

# 检查过时的依赖
echo "检查过时的依赖..."
npm outdated

# 更新所有依赖到最新版本
echo "更新依赖到最新版本..."
npm update

# 可选：升级主要版本（可能有破坏性更改）
# echo "升级到最新主要版本..."
# npx npm-check-updates -u
# npm install

# 运行测试确保一切正常
echo "验证更新..."
npm run lint

echo "依赖更新完成！" 