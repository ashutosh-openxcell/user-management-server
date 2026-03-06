import { Router } from 'express';
import {
    getAllUsers,
    getUserById,
    getProfile,
    editUser,
    deleteUser,
    updateUserStatus
} from '../controller/userController.js';
import { authorizeRoles } from "../middleware/roleMiddleware.js"

const router = Router();

router.get('/users', authorizeRoles("admin"),getAllUsers);
router.get('/user/profile', getProfile);
router.get('/user/:id', getUserById);
router.patch('/user/:id', editUser);
router.delete('/user/:id', authorizeRoles("admin"),deleteUser)
router.patch('/user/:id/status',authorizeRoles("admin"),updateUserStatus)

export default router;
