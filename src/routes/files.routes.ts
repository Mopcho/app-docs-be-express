import express, { Router } from "express";
import filesController from "../controllers/files.controller";
import { roleGuard } from "../middlewares/authMiddleware";

const filesRouter: Router = express.Router();

filesRouter.get('/', roleGuard(['User']), filesController.find);
filesRouter.put('/remove-from-trash/:key', roleGuard(['User']), filesController.removeFromTrash);
filesRouter.put('/:key', roleGuard(['User']), filesController.update);

export default filesRouter;