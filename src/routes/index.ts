import docsRouter from "./docs.routes";
import mediaRouter from "./media.routes";
import userRouter from "./user.routes";
import express, { Router } from "express";

const router: Router = express.Router();

router.use('/documents',docsRouter);
router.use('/media',mediaRouter);
router.use('/users',userRouter);


export default router;

