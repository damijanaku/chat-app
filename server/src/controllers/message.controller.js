import prisma from '../lib/prisma.js';

export function createMessageController(io) {
    const sendMessage = async (req, res) => {
    const { roomId, content } = req.body;
        const userId = req.user.userid;
        const imageFile = req.file; 

        console.log('Received:', { roomId, content, hasFile: !!imageFile });

        // validating roomId
        if (!roomId) {
            return res.status(400).json({ message: 'roomId is required' });
        }

        // validating at least content or image
        if (!content && !imageFile) {
            return res.status(400).json({ message: 'Content or image is required' });
        }

        let messageType = 'text';
        let imageUrl = null;

        // determining message type based on what was sent
        if (imageFile && content) {
            messageType = 'mixed';
            imageUrl = `/uploads/images/${imageFile.filename}`;
        } else if (imageFile) {
            messageType = 'image';
            imageUrl = `/uploads/images/${imageFile.filename}`;
        } else if (content) {
            messageType = 'text';
        }

        try {
            const membership = await prisma.roomMember.findUnique({
                where: { 
                    roomId_userId: { 
                        roomId, 
                        userId 
                    } 
                }
            });

            if (!membership) {
                return res.status(403).json({ 
                    message: 'You are not a member of this room' 
                });
            }

            const message = await prisma.message.create({
                data: {
                    content: content || null,
                    imageUrl: imageUrl,
                    messageType: messageType,
                    userId,
                    roomId
                },
                include: {
                    user: { 
                        select: { 
                            id: true, 
                            username: true, 
                            name: true,
                            avatarUrl: true 
                        } 
                    }
                }
            });

            io.to(roomId).emit('chat_message', {
                id: message.id,
                content: message.content,
                imageUrl: message.imageUrl,
                messageType: message.messageType,
                isRead: message.isRead,
                createdAt: message.createdAt,
                user: {
                    id: message.user.id,
                    username: message.user.username,
                    name: message.user.name,
                    avatarUrl: message.user.avatarUrl
                }
            });

            return res.status(201).json({ 
                success: true,
                message 
            });

        } catch (error) {
            console.error('SEND MESSAGE ERROR:', error);
            return res.status(500).json({ 
                message: 'Error sending message', 
                error: error.message 
            });
        }
    };

        const getRoomMessages = async (req, res) => {
            const { roomId } = req.params;
            const userId = req.user.userid;
            const { cursor, limit = 50 } = req.query;

            try {
                const membership = await prisma.roomMember.findUnique({
                    where: { 
                        roomId_userId: { 
                            roomId, 
                            userId 
                        } 
                    }
                });

                if (!membership) {
                    return res.status(403).json({ 
                        message: 'You are not a member of this room' 
                    });
                }

                const messages = await prisma.message.findMany({
                    where: { roomId },
                    take: Number(limit),
                    ...(cursor && { 
                        skip: 1, 
                        cursor: { id: cursor } 
                    }),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: { 
                            select: { 
                                id: true, 
                                username: true, 
                                name: true,
                                avatarUrl: true 
                            } 
                        }
                    }
                });

                // marking messages as read
                if (messages.length > 0) {
                    await prisma.message.updateMany({
                        where: {
                            roomId,
                            userId: { not: userId }, 
                            isRead: false
                        },
                        data: { isRead: true }
                    });
                }

                const nextCursor = messages.length === Number(limit)
                    ? messages[messages.length - 1].id
                    : null;

                return res.status(200).json({ 
                    messages: messages.reverse(), 
                    nextCursor 
                });

            } catch (error) {
                console.error('GET MESSAGES ERROR:', error);
                return res.status(500).json({ 
                    message: 'Error fetching messages', 
                    error: error.message 
                });
            }
        };

    const markMessagesAsRead = async (req, res) => {
        const { roomId } = req.params;
        const userId = req.user.userid;

        try {
            const result = await prisma.message.updateMany({
                where: {
                    roomId,
                    userId: { not: userId },
                    isRead: false
                },
                data: { isRead: true }
            });

            // Emit read status update
            io.to(roomId).emit('messages_read', {
                userId,
                roomId,
                count: result.count
            });

            return res.status(200).json({ 
                success: true,
                count: result.count 
            });

        } catch (error) {
            console.error('MARK READ ERROR:', error);
            return res.status(500).json({ 
                message: 'Error marking messages as read', 
                error: error.message 
            });
        }
    };

    return { 
        sendMessage, 
        getRoomMessages,
        markMessagesAsRead 
    };
}