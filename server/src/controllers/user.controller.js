import prisma from '../lib/prisma.js'
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const registerUser = async (req, res) => {
    if (!req.body.username || !req.body.email || !req.body.password) {
        return res.status(400).json({
            message: 'Username, email, and password are required'
        });
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
        })

        const userToReturn = {
            _id: savedUser.id,
            name: savedUser.name,
            username: savedUser.username,
            birthday: savedUser.birthday,
            createdAt: savedUser.createdAt
        }

        return res.status(201).json({user: userToReturn});
    } catch (error) {
        if (error.code === 'P2002'){
            return res.status(400).json({
                message: 'Username or email already exists'
            });
        }

        return res.status(500).json({
            message: 'Error when creating user',
            error: error.message
        })
    }
}

const loginUser = async function (req, res) {
    if (!req.body.username || !req.body.password){
        return res.status(400).json({
            message: 'Username and password are required'
        });
    }

    try {
        const user = await prisma.user.findUnique({
            where : {
                username: req.body.username
            }
        });

        if (!user) {
            return res.status(401).json({
                message: 'Wrong username or password'
            });
        }

        const match = await bcrypt.compare(req.body.password, user.password);

        if (!match) {
            return res.status(401).json({
                message: 'Wrong username or password'
            })
        }

        const payload = {
            userid: user.id,
            email: user.email,
            username: user.username
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

        const userToReturn = {
            _id: user.id,
            name: user.name,
            username: user.username,
            birthday: user.birthday,
            createdAt: user.createdAt
        }

        return res.status(200).json({message: "User logged in successfully", user: userToReturn, token});
    } catch (error) {
        return res.status(500).json({
            message: 'Error when logging in user',
            error: error.message
        });
    }
}

const profile = async function (req, res) {
    try{
        const user = await prisma.user.findUnique({
            where : {
                id: req.user.userid
            }
        })

        if (!user){
            return res.status(404).json({
                message: "user not found"
            })
        }

        const userToReturn = {
            _id: user.id,
            name: user.name,
            username: user.username,
            birthday: user.birthday,
            createdAt: user.createdAt
        }

        return res.status(200).json({userToReturn});

    } catch (error) {
        return res.status(500).json({
            message: 'Error when fetching user profile',
            error: error.message
        })
    }
}

const getUserByUsername = async function (req, res) {
    try {
        const usernameQuery = req.params.username;
        const user = await prisma.user.findUnique({
            where: {
                username : usernameQuery
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "user not found"
            })
        }

        const userToReturn = {
            _id: user.id,
            name: user.name,
            username: user.username,
            birthday: user.birthday,
            createdAt: user.createdAt
        }

        return res.status(200).json({userToReturn});
    } catch (error) {
        return res.status(500).json({
            message: 'Error when getting user',
            error: error.message
        });
    }
    
}

const updateUser = async function (req, res) {
    const userId = req.user.userId;

    try {
        const updateData = {};

        if (req.body.username) updateData.username = req.body.username;
        if (req.body.email) updateData.email = req.body.email;
        if (req.body.password) updateData.password = await bcrypt.hash(req.body.password, 10);
        if (req.body.birthday) updateData.birthday = new Date(req.body.birthday);

        const updatedUser = await prisma.user.update({
            where : {id: userId},
            data: updateData
        })

        const userToReturn = {
            _id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            birthday: updatedUser.birthday, 
            createdAt: updatedUser.createdAt
        };

        return res.status(200).json({
            message: 'User updated successfully',
            user: userToReturn
        });

    } catch (error) {
        if (err.code === 'P2002') {
            return res.status(400).json({
                message: 'Username or email already exists'
            });
        }

        return res.status(500).json({
            message: 'Error when getting user',
            error: error.message
        })
    }
}

const removeUser = async function (req, res) {
    try {
        const userId = req.user.userId;
        
        const user = await prisma.user.delete({
            where: { id: userId }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        return res.status(200).json({
            message: 'User and all associated data deleted successfully'
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Error when getting user',
            error: error.message
        })
    }
}


export default {
    registerUser,
    loginUser,
    profile,
    getUserByUsername,
    updateUser,
    removeUser
}