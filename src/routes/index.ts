import docsRouter from "./docs.routes";
import mediaRouter from "./media.routes";
import userRouter from "./user.routes";
import express, { Router } from "express";
import filesRouter from "./files.routes";

const router: Router = express.Router();

router.use('/documents',docsRouter);
router.use('/media',mediaRouter);
router.use('/users',userRouter);
router.use('/all', filesRouter);


export default router;

