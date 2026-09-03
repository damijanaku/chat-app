import prisma from '../lib/prisma.js';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const generateTokens = (user) => {
    const payload = {
        userid: user.id,
        email: user.email,
        username: user.username
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userid: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return { accessToken, refreshToken };
};

const registerUser = async (req, res) => {
    if (!req.body.username || !req.body.email || !req.body.password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        const savedUser = await prisma.user.create({ 
            data: {
                name: req.body.name,
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword,
                birthday: req.body.birthday ? new Date(req.body.birthday) : null,
            }
        });

        const userToReturn = {
            _id: savedUser.id,
            name: savedUser.name,
            username: savedUser.username,
            birthday: savedUser.birthday,
            createdAt: savedUser.createdAt
        };

        return res.status(201).json({ user: userToReturn });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Username or email already exists' });
        }
        return res.status(500).json({ message: 'Error when creating user', error: error.message });
    }
};

const loginUser = async (req, res) => {
    if (!req.body.username || !req.body.password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const user = await prisma.user.findUnique({  
            where: { username: req.body.username }
        });

        console.log('User found:', user ? 'Yes' : 'No'); 

        if (!user) {
            return res.status(401).json({ message: 'Wrong username or password' });
        }

        const match = await bcrypt.compare(req.body.password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Wrong username or password' });
        }

        const { accessToken, refreshToken } = generateTokens(user);

        await prisma.user.update({  
            where: { id: user.id },
            data: { refreshToken }
        });

        const userToReturn = {
            _id: user.id,
            name: user.name,
            username: user.username,
            birthday: user.birthday,
            createdAt: user.createdAt
        };

        const response = {  
            message: "User logged in successfully",
            user: userToReturn,
            accessToken,
            refreshToken
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error('Login error:', error); 
        return res.status(500).json({ message: 'Error when logging in user', error: error.message });
    }
};

const handleRefreshToken = async (req, res) => {
    const authHeader = req.headers['authorization'];
    const refreshToken = authHeader && authHeader.split(' ')[1];

    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token is required' });
    }

    try {
        const user = await prisma.user.findFirst({ 
            where: { refreshToken }
        });

        if (!user) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        if (user.id !== decoded.userid) {
            return res.status(403).json({ message: 'Invalid token payload' });
        }

        const accessToken = jwt.sign(
            { userid: user.id, email: user.email, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const newRefreshToken = jwt.sign(
            { userid: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        await prisma.user.update({  
            where: { id: user.id },
            data: { refreshToken: newRefreshToken }
        });

        return res.status(200).json({ 
            accessToken, 
            refreshToken: newRefreshToken 
        });
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
};

const logoutUser = async (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) return res.status(204).send();

    try {
        const user = await prisma.user.findFirst({  
            where: { refreshToken }
        });

        if (user) {
            await prisma.user.update({  
                where: { id: user.id },
                data: { refreshToken: null }
            });
        }

        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Error logging out', error: error.message });
    }
};

const profile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ 
            where: { id: req.user.userid }
        });

        if (!user) {
            return res.status(404).json({ message: "user not found" });
        }

        const userToReturn = {
            _id: user.id,
            name: user.name,
            username: user.username,
            birthday: user.birthday,
            createdAt: user.createdAt
        };

        return res.status(200).json({ user: userToReturn });
    } catch (error) {
        return res.status(500).json({ message: 'Error when fetching user profile', error: error.message });
    }
};

const getUserByUsername = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ 
            where: { username: req.params.username }
        });

        if (!user) {
            return res.status(404).json({ message: "user not found" });
        }

        const userToReturn = {
            _id: user.id,
            name: user.name,
            username: user.username,
            birthday: user.birthday,
            createdAt: user.createdAt
        };

        return res.status(200).json({ userToReturn });
    } catch (error) {
        return res.status(500).json({ message: 'Error when getting user', error: error.message });
    }
};

const updateUser = async (req, res) => {
    const userId = req.user.userid;

    try {
        const updateData = {};

        if (req.body.username) updateData.username = req.body.username;
        if (req.body.email) updateData.email = req.body.email;
        if (req.body.password) updateData.password = await bcrypt.hash(req.body.password, 10);
        if (req.body.birthday) updateData.birthday = new Date(req.body.birthday);

        const updatedUser = await prisma.user.update({  
            where: { id: userId },
            data: updateData
        });

        const userToReturn = {
            _id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            birthday: updatedUser.birthday,
            createdAt: updatedUser.createdAt
        };

        return res.status(200).json({ message: 'User updated successfully', user: userToReturn });
    } catch (error) {
        if (error.code === 'P2002') { 
            return res.status(400).json({ message: 'Username or email already exists' });
        }
        return res.status(500).json({ message: 'Error when updating user', error: error.message });
    }
};

const removeUser = async (req, res) => {
    try {
        const userId = req.user.userid; 
        
        await prisma.user.delete({  
            where: { id: userId }
        });
        
        return res.status(200).json({ message: 'User and all associated data deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Error when deleting user', error: error.message });
    }
};

export default {
    registerUser,
    loginUser,
    handleRefreshToken,
    logoutUser,
    profile,
    getUserByUsername,
    updateUser,
    removeUser
};