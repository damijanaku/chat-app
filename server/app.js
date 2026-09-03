import express from "express";
import cors from "cors";
import prisma from './src/lib/prisma.js';
import UserRouter from './src/routes/user.routes.js';
import { createMessageRouter } from './src/routes/message.routes.js';
import { createRoomRouter } from './src/routes/room.routes.js';

export function createApp(io) {
    const app = express();

    app.use(cors({ 
        origin: true, 
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get('/health', async (req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            res.status(200).json({ status: 'OK', database: 'connected', timestamp: new Date().toISOString() });
        } catch (error) {
            res.status(500).json({ status: 'ERROR', database: 'disconnected', error: error.message });
        }
    });

    app.use("/api/v1/users", UserRouter);
    app.use('/api/v1/messages', createMessageRouter(io));
    app.use('/api/v1/rooms', createRoomRouter(io));

    app.use((req, res) => {
        res.status(404).json({ message: 'Route not found', path: req.originalUrl });
    });

    app.use((err, req, res, next) => {
        console.error('Error:', err.stack);
        if (err.code === 'P2002') return res.status(400).json({ message: 'Duplicate field value' });
        if (err.code === 'P2025') return res.status(404).json({ message: 'Record not found' });
        res.status(500).json({ message: 'Something went wrong!', error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' });
    });

    return app;
}