import { Router } from "express";
import userController from '../controllers/user.controller.js';
import authenticateToken from "../middleware/auth.middleware.js";

const router = Router();

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/refreshToken', userController.handleRefreshToken);

router.get('/profile', authenticateToken, userController.profile);
router.get('/username/:username', authenticateToken, userController.getUserByUsername);

router.put('/', authenticateToken, userController.updateUser);
router.delete('/', authenticateToken, userController.removeUser);

export default router;