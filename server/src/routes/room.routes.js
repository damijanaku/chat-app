import { Router } from 'express';
import { createRoomController } from '../controllers/room.controller.js';
import authenticateToken from '../middleware/auth.middleware.js';

export function createRoomRouter(io) {
    const router = Router();
    const roomController = createRoomController(io);

    router.get('/', authenticateToken, roomController.getRooms);
    router.post('/', authenticateToken, roomController.getOrCreateRoom);
    router.post('/:roomId/join', authenticateToken, roomController.joinRoom);
    router.delete('/:roomId/leave', authenticateToken, roomController.leaveRoom);

    return router;
}