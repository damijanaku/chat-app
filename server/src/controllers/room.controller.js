import prisma from '../lib/prisma.js';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export function createRoomController(io) {

    const getOrCreateRoom = async (req, res) => {
        const { participantId } = req.body;
        const userId = req.user.userid;
      
        if (!participantId) {
          return res.status(400).json({ message: 'Participant ID is required' });
        }
      
        try {
          const existingRoom = await prisma.room.findFirst({
            where: {
              AND: [
                { members: { some: { userId } } },
                { members: { some: { userId: participantId } } },
                { members: { every: { userId: { in: [userId, participantId] } } } } // exactly these two
              ]
            },
            include: { members: true }
          });
      
          if (existingRoom) {
            return res.status(200).json({ roomId: existingRoom.id, room: existingRoom });
          }
      
          const room = await prisma.room.create({
            data: {
              name: `Chat between ${userId} and ${participantId}`,
              ownerId: userId,
              members: {
                create: [
                  { userId, role: 'owner' },
                  { userId: participantId, role: 'member' }
                ]
              }
            },
            include: { members: true }
          });
      
          return res.status(201).json({ roomId: room.id, room });
        } catch (error) {
          return res.status(500).json({ message: 'Error finding/creating room', error: error.message });
        }
    };

    const joinRoom = async (req, res) => {
        const {roomId} = req.params;
        const userId = req.user.userid;

        try {
            const room = await prisma.room.findUnique({where: {id:roomId}});
            if (!room) return res.status(404).json({ message: 'Room not found' });

            await prisma.roomMember.create({
                data: {roomId, userId, role: 'member'}
            });

            io.to(roomId).emit('member_joined', {roomId, userId});
            return res.status(200).json({ message: 'Joined room successfully' });

        } catch (error) {
            if (error.code === 'P2002') return res.status(400).json({ message: 'Already a member' });
            return res.status(500).json({ message: 'Error joining room', error: error.message });
        }
    }

    const leaveRoom = async (req, res) => {
        const { roomId } = req.params;
        const userId = req.user.userid;

        try {
            await prisma.roomMember.delete({
                where: { roomId_userId: { roomId, userId } }
            });

            io.to(roomId).emit('member_left', { roomId, userId });

            return res.status(200).json({ message: 'Left room successfully' });
        } catch (error) {
            return res.status(500).json({ message: 'Error leaving room', error: error.message });
        }
    };

    const getRooms = async (req, res) => {
        const userId = req.user.userid;
        try {
            const rooms = await prisma.room.findMany({
                where: { members: { some: { userId } } },
                include: { _count: { select: { members: true, messages: true } } }
            });
            return res.status(200).json({ rooms });
        } catch (error) {
            return res.status(500).json({ message: 'Error fetching rooms', error: error.message });
        }
    };

    return { getOrCreateRoom, joinRoom, leaveRoom, getRooms };

}