import express, { Router } from "express";
import mediaController from "../controllers/media.controller";
import { roleGuard } from "../middlewares/authMiddleware";

const mediaRouter: Router = express.Router();

mediaRouter.get('/', roleGuard(['User']), mediaController.find);
mediaRouter.post('/', roleGuard(['User']), mediaController.create);
mediaRouter.put('/:key', roleGuard(['User']), mediaController.update);
mediaRouter.delete('/:key', roleGuard(['User']), mediaController._delete);
mediaRouter.get('/:key', roleGuard(['User']), mediaController.get);

export default mediaRouter;