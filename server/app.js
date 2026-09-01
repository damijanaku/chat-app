import express from "express";
import cors from "cors"; 
import UserRouter from './src/routes/user.routes.js';
import prisma from './src/lib/prisma.js'


const app = express();

app.use(cors({
    origin: true, 
    credentials: true, 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', async (req, res) => {
    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ 
            status: 'OK', 
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.use("/api/v1/users", UserRouter);

app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.originalUrl
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    if (err.code === 'P2002') {
        return res.status(400).json({
            message: 'Duplicate field value',
            error: 'A record with this value already exists',
            field: err.meta?.target
        });
    }
    
    if (err.code === 'P2025') {
        return res.status(404).json({
            message: 'Record not found',
            error: 'The requested record does not exist'
        });
    }
    
    if (err.code === 'P2003') {
        return res.status(400).json({
            message: 'Foreign key constraint failed',
            error: 'Referenced record does not exist'
        });
    }
    
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

export default app;