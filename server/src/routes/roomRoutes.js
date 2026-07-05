import { Router } from 'express';
import { RoomController } from '../controllers/RoomController.js';

export function createRoomRouter(manager) {
  const router = Router();
  const controller = new RoomController(manager);

  router.get('/health', controller.health);
  router.get('/api/rooms/:id', controller.getRoom);
  router.get('/api/public-rooms', controller.listPublicRooms);

  return router;
}
