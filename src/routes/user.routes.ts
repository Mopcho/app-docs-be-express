import express, { Router } from "express";
import userController from "../controllers/users.controller";
import { roleGuard } from "../middlewares/auth";

const userRouter: Router = express.Router();

userRouter.get('/', roleGuard.check('User'), userController.find);
userRouter.post('/', roleGuard.check('Admin'), userController.create);
userRouter.put('/users/:id', roleGuard.check('Admin'), userController.update);
userRouter.delete('/:id', roleGuard.check('Admin'), userController._delete);
userRouter.get('/by-token', roleGuard.check('User'), userController.getByToken);
userRouter.get('/:id', roleGuard.check('User'), userController.get);

export default userRouter;