import docsRouter from "./docs.routes";
import mediaRouter from "./media.routes";
import userRouter from "./user.routes";
import express, { Router } from "express";
import filesRouter from "./files.routes";
import authRouter from "./auth.routes";
import { isAuth } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.use('/documents',isAuth,docsRouter);
router.use('/media',isAuth,mediaRouter);
router.use('/users',isAuth,userRouter);
router.use('/all', isAuth,filesRouter);
router.use('/auth', authRouter);


export default router;

