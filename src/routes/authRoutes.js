import { Router } from "express";
import { 
    login,
    registerUser, 
    changePassword, 
    refreshToken, 
    logout, 
    forgotPassword,
    resetPassword,
    verifyEmail
} from "../controller/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post('/register', registerUser);
router.post('/login', login);
router.patch('/change-password', protect, changePassword);
router.post('/refresh-token', refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-email", verifyEmail);

export default router;
