import http from 'http';
import { pathToFileURL } from 'url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameManager } from './game/GameManager.js';
import { SocketHandler } from './socket/SocketHandler.js';
import { createRoomRouter } from './routes/roomRoutes.js';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

export function createServer() {
  const app = express();
  app.use(cors({ origin: CLIENT_ORIGIN }));
  app.use(express.json());

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  });

  const manager = new GameManager(io);

  app.use('/', createRoomRouter(manager));

  io.on('connection', (socket) => {
    new SocketHandler(io, socket, manager).register();
  });

  return { app, server, io, manager };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const PORT = process.env.PORT || 4000;
  const { server } = createServer();
  server.listen(PORT, () => {
    console.log(`Skribbl server listening on port ${PORT}`);
  });
}
