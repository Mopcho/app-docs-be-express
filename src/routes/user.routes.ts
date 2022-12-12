import { roleGuard } from "../middlewares/authMiddleware";
import express, { Router } from "express";
import userController from "../controllers/users.controller";

const userRouter: Router = express.Router();

userRouter.get('/', roleGuard(['Admin']), userController.find);
// userRouter.post('/', roleGuard(['Admin']), userController.create);
userRouter.put('/users/:id', roleGuard(['Admin']), userController.update);
userRouter.delete('/:id', roleGuard(['Admin']), userController._delete);
userRouter.get('/by-token', roleGuard(['User']), userController.getByToken);
userRouter.get('/:id', roleGuard(['User']), userController.get);

export default userRouter;