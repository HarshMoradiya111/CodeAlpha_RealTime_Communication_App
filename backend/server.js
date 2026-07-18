const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');

const app = express();
const port = process.env.PORT || 5003;
const mongoUri = process.env.MONGO_URI;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: clientUrl,
  },
});

app.locals.io = io;

app.use(cors({ origin: clientUrl }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CodeAlpha RealTime Communication App API' });
});

app.get('/', (req, res) => {
  res.send('CodeAlpha RealTime Communication App backend is running.');
});

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId }) => {
    const existingRoom = io.sockets.adapter.rooms.get(roomId);
    const otherSocketIds = existingRoom ? [...existingRoom].filter((socketId) => socketId !== socket.id) : [];

    socket.join(roomId);
    socket.emit('all-users', otherSocketIds);
    socket.to(roomId).emit('user-joined', socket.id);
  });

  socket.on('signal', ({ targetId, signal }) => {
    socket.to(targetId).emit('signal', { senderId: socket.id, signal });
  });

  socket.on('draw', ({ roomId, data }) => {
    socket.to(roomId).emit('draw', data);
  });
});

async function startServer() {
  try {
    if (mongoUri) {
      await mongoose.connect(mongoUri);
      console.log('MongoDB connected');
    } else {
      console.log('MONGO_URI not set. Starting without database connection.');
    }

    httpServer.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
