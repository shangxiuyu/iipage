const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// 配置CORS
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
  methods: ["GET", "POST"]
}));

// 创建Socket.IO服务器
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    methods: ["GET", "POST"]
  }
});

// 存储房间和用户信息
const rooms = new Map(); // boardId -> Set<socketId>
const users = new Map(); // socketId -> { userId, userName, userColor, boardId }

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log(`🔌 用户连接: ${socket.id}`);

  // 用户加入
  socket.on('user_join', (data) => {
    const { userId, userName, userColor } = data;
    
    // 存储用户信息
    users.set(socket.id, {
      userId,
      userName,
      userColor,
      boardId: null
    });
    
    console.log(`👤 用户信息设置: ${userName} (${userId})`);
  });

  // 加入白板房间
  socket.on('join_board', (data) => {
    const { boardId } = data;
    const user = users.get(socket.id);
    
    if (!user) {
      console.warn(`⚠️ 用户未设置信息: ${socket.id}`);
      return;
    }
    
    // 离开之前的房间
    if (user.boardId && rooms.has(user.boardId)) {
      socket.leave(user.boardId);
      rooms.get(user.boardId).delete(socket.id);
      
      // 通知其他用户
      socket.to(user.boardId).emit('user_left', { userId: user.userId });
    }
    
    // 加入新房间
    socket.join(boardId);
    user.boardId = boardId;
    
    // 初始化房间
    if (!rooms.has(boardId)) {
      rooms.set(boardId, new Set());
    }
    rooms.get(boardId).add(socket.id);
    
    // 通知房间内其他用户
    socket.to(boardId).emit('user_joined', { user });
    
    console.log(`🚀 用户 ${user.userName} 加入白板: ${boardId}`);
  });

  // 离开白板房间
  socket.on('leave_board', (data) => {
    const { boardId } = data;
    const user = users.get(socket.id);
    
    if (user && user.boardId === boardId) {
      socket.leave(boardId);
      user.boardId = null;
      
      if (rooms.has(boardId)) {
        rooms.get(boardId).delete(socket.id);
        if (rooms.get(boardId).size === 0) {
          rooms.delete(boardId);
        }
      }
      
      // 通知其他用户
      socket.to(boardId).emit('user_left', { userId: user.userId });
      
      console.log(`👋 用户 ${user.userName} 离开白板: ${boardId}`);
    }
  });

  // 处理实时事件
  socket.on('realtime_event', (event) => {
    const user = users.get(socket.id);
    
    if (!user || !user.boardId) {
      console.warn(`⚠️ 用户未在白板中: ${socket.id}`);
      return;
    }
    
    // 广播事件给房间内其他用户
    socket.to(user.boardId).emit('realtime_event', {
      ...event,
      userId: user.userId
    });
    
    console.log(`📡 转发事件: ${event.type} (${user.userName})`);
  });

  // 连接断开
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    
    if (user && user.boardId) {
      // 通知其他用户
      socket.to(user.boardId).emit('user_left', { userId: user.userId });
      
      // 清理房间
      if (rooms.has(user.boardId)) {
        rooms.get(user.boardId).delete(socket.id);
        if (rooms.get(user.boardId).size === 0) {
          rooms.delete(user.boardId);
        }
      }
      
      console.log(`🔌 用户断开连接: ${user.userName} (${user.userId})`);
    }
    
    // 清理用户信息
    users.delete(socket.id);
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
    rooms: rooms.size,
    users: users.size
  });
});

// 房间状态端点
app.get('/rooms', (req, res) => {
  const roomStats = Array.from(rooms.entries()).map(([boardId, socketIds]) => ({
    boardId,
    userCount: socketIds.size,
    users: Array.from(socketIds).map(socketId => {
      const user = users.get(socketId);
      return user ? { id: user.userId, name: user.userName } : null;
    }).filter(Boolean)
  }));
  
  res.json({
    rooms: roomStats,
    totalUsers: users.size
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 实时同步服务器启动成功`);
  console.log(`📍 服务器地址: http://localhost:${PORT}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
  console.log(`📊 房间状态: http://localhost:${PORT}/rooms`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
}); 