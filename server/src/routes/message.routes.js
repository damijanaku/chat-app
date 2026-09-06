import { Router } from 'express';
import { createMessageController } from '../controllers/message.controller.js';
import authenticateToken from '../middleware/auth.middleware.js';
import { uploadImage } from '../middleware/upload.js'; 

export function createMessageRouter(io) {
    const router = Router();
    const messageController = createMessageController(io);

    router.get('/:roomId', authenticateToken, messageController.getRoomMessages);
    
    router.post('/', authenticateToken, uploadImage.single('image'), messageController.sendMessage);
    
    router.put('/:roomId/read', authenticateToken, messageController.markMessagesAsRead);
    
    return router;
}