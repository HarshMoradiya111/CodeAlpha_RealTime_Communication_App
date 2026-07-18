const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CodeAlpha RealTime Communication App API' });
});

app.get('/', (req, res) => {
  res.send('CodeAlpha RealTime Communication App backend is running.');
});

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
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
