#!/bin/bash

# 打印彩色文本的函数
print_color() {
  COLOR=$1
  TEXT=$2
  echo -e "\033[${COLOR}m${TEXT}\033[0m"
}

print_color "36" "===== 停止白板应用开发环境 ====="

# 停止可能正在运行的本地开发服务器
print_color "33" "停止可能正在运行的本地开发服务器..."
pkill -f "node.*vite" || true

# 停止Docker容器
print_color "33" "停止Docker容器..."
docker-compose down

print_color "32" "所有开发环境已停止"
print_color "36" "===== 操作完成 =====" 