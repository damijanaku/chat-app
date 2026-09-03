import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import prisma from './lib/prisma.js';
import { createApp } from '../app.js' 

interface EventResponse {
    status: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await prisma.$connect();
        console.log('Database connected successfully');

        const httpServer = createServer();

        const io = new Server(httpServer, {
            cors: { origin: true, credentials: true }
        });
        
        const app = createApp(io);
        httpServer.on('request', app);

        io.on('connection', (socket) => {
            console.log('a user connected');
            
            socket.on('join_room', async (roomId: string, callback?: ({ status }: EventResponse) => void) => {
                await socket.join(roomId);
                callback?.({ status: 'room join acknowledged' });
              });
              socket.on('leave_room', async (roomId: string, callback?: ({ status }: EventResponse) => void) => {
                await socket.leave(roomId);
                callback?.({ status: 'room leave acknowledged' });
              });
          
            socket.on('disconnect', () => console.log('user disconnected'));
        });


        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`http://localhost:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    console.log('Database disconnected');
    process.exit(0);
});

startServer();