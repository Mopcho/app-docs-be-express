import express, { Router } from "express";
import filesController from "../controllers/files.controller";
import { roleGuard } from "../middlewares/auth";

const filesRouter: Router = express.Router();

filesRouter.get('/', roleGuard.check('User'), filesController.find);

export default filesRouter;