import { Router } from "express";
import userController from '../controllers/user.controller.js';
import authenticateToken from "../middleware/auth.middleware.js";
import { uploadAvatar } from '../middleware/upload.js';

const router = Router();

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/refreshToken', userController.handleRefreshToken);

router.get('/profile', authenticateToken, userController.profile);
router.get('/username/:username', authenticateToken, userController.getUserByUsername);
router.post('/profile-picture', 
    authenticateToken, 
    uploadAvatar.single('profilePicture'), 
    userController.changeProfilePicture
);

router.put('/', authenticateToken, userController.updateUser);
router.delete('/', authenticateToken, userController.removeUser);

export default router;