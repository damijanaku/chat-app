import { Router } from 'express';
import { createMessageController } from '../controllers/message.controller.js';
import authenticateToken from '../middleware/auth.middleware.js';

export function createMessageRouter(io) {
    const router = Router();
    const messageController = createMessageController(io);

    router.get('/:roomId', authenticateToken, messageController.getRoomMessages);
    router.post('/', authenticateToken, messageController.sendMessage);

    return router;
}