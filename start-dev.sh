#!/bin/bash

# 打印彩色文本的函数
print_color() {
  COLOR=$1
  TEXT=$2
  echo -e "\033[${COLOR}m${TEXT}\033[0m"
}

print_color "36" "===== 白板应用开发环境启动脚本 ====="
print_color "33" "1. 检查Docker状态..."

# 检查Docker是否正在运行
if ! docker info > /dev/null 2>&1; then
  print_color "31" "错误: Docker未运行，请先启动Docker应用"
  exit 1
fi

# 检查环境模式
MODE=${1:-"docker"}

if [ "$MODE" = "local" ]; then
  print_color "33" "2. 使用本地模式启动应用..."
  print_color "32" "启动本地开发服务器..."
  npm run dev
else
  print_color "33" "2. 使用Docker模式启动应用..."
  
  # 检查是否需要重新构建
  if [ "$2" = "rebuild" ]; then
    print_color "33" "重新构建Docker镜像..."
    docker-compose build
  fi
  
  print_color "32" "启动Docker容器..."
  docker-compose up -d
  
  print_color "32" "显示容器日志..."
  docker-compose logs -f
fi

print_color "36" "===== 开发环境启动完成 =====" 