import "dotenv/config";
import app from '../app.js';
import prisma from './lib/prisma.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await prisma.$connect();
        console.log('Database connected successfully');
        
        app.listen(PORT, () => {
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