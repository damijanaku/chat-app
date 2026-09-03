import prisma from '../lib/prisma.js';

export function createMessageController(io) {
    const sendMessage = async (req, res) => {
        const {roomId, content} = req.body;
        const userId = req.user.userid;

        if (!roomId || !content?.trim()) {
            return res.status(400).json({message: 'roomid and content is required'});
        }

        try {
            const membership = await prisma.roomMember.findUnique({ 
                where: { roomId_userId: { roomId, userId } }
            });

            if(!membership) {
                return res.status(403).json({ message: 'You are not a member of this room' });
            }

            const message = await prisma.message.create({  
                data: { content: content.trim(), userId, roomId },
                include: {
                    user: { select: { id: true, username: true, name: true } }
                }
            });

            io.to(roomId).emit('chat_message', {
                id: message.id,
                content: message.content,
                createdAt: message.createdAt,
                roomId: message.roomId,
                user: message.user
            });

            return res.status(201).json({ message });
        } catch (error) {
            console.error('SEND MESSAGE ERROR:', error);
            return res.status(500).json({ message: 'Error sending message', error: error.message });
        }
    }

    const getRoomMessages = async (req,res) => {
        const {roomId} = req.params;
        const userId = req.user.userid;
        const { cursor, limit = 50 } = req.query;

        try {
            const membership = await prisma.roomMember.findUnique({  
                where: { roomId_userId: { roomId, userId } }
            });

            if (!membership) {
                return res.status(403).json({ message: 'You are not a member of this room' });
            }

            const messages = await prisma.message.findMany({  
                where: { roomId },
                take: Number(limit),
                ...(cursor && { skip: 1, cursor: { id: cursor } }),
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, username: true, name: true } }
                }
            });

            const nextCursor = messages.length === Number(limit)
                ? messages[messages.length - 1].id
                : null;
            
            return res.status(200).json({ messages: messages.reverse(), nextCursor });
        } catch (error) {
            return res.status(500).json({ message: 'Error fetching messages', error: error.message });
        }
    }
    return {sendMessage, getRoomMessages}
}