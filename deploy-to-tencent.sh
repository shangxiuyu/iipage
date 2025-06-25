#!/bin/bash

echo "🚀 腾讯云静态网站托管一键部署脚本"
echo "======================================"

# 1. 构建项目
echo "📦 正在构建项目..."
pnpm run build

# 2. 检查构建结果
if [ ! -d "dist" ]; then
    echo "❌ 构建失败，dist目录不存在"
    exit 1
fi

echo "✅ 构建完成！"

# 3. 压缩dist目录
echo "📦 正在压缩文件..."
cd dist
zip -r ../website.zip .
cd ..

echo "�� 部署包已生成：website.zip"
echo ""
echo "📋 接下来的步骤："
echo "1. 访问：https://console.cloud.tencent.com/tcb"
echo "2. 创建云开发环境（选择静态网站托管）"
echo "3. 进入「静态网站托管」→「文件管理」"
echo "4. 上传 website.zip 并解压"
echo "5. 设置默认首页为 index.html"
echo "6. 复制访问链接即可使用！"
echo ""
echo "�� 费用：基本免费（每月5GB流量免费）"
echo "🚄 速度：国内CDN加速，访问极快"
echo ""

# 4. 可选：自动打开腾讯云控制台
read -p "是否自动打开腾讯云控制台？(y/n): " open_console
if [ "$open_console" = "y" ] || [ "$open_console" = "Y" ]; then
    open "https://console.cloud.tencent.com/tcb"
fi

echo "🎯 部署包位置：$(pwd)/website.zip"
