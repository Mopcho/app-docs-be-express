import express, { Router } from "express";
import filesController from "../controllers/files.controller";
import { roleGuard } from "../middlewares/auth";

const filesRouter: Router = express.Router();

filesRouter.get('/', roleGuard.check('User'), filesController.find);
filesRouter.put('/remove-from-trash/:key', roleGuard.check('User'), filesController.removeFromTrash);

export default filesRouter;