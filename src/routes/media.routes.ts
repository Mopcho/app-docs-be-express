import express, { Router } from "express";
import mediaController from "../controllers/media.controller";
import { roleGuard } from "../middlewares/auth";

const mediaRouter: Router = express.Router();

mediaRouter.get('/', roleGuard.check('User'), mediaController.find);
mediaRouter.post('/', roleGuard.check('User'), mediaController.create);
mediaRouter.put('/:key', roleGuard.check('User'), mediaController.update);
mediaRouter.delete('/:key', roleGuard.check('User'), mediaController._delete);
mediaRouter.get('/:key', roleGuard.check('User'), mediaController.get);

export default mediaRouter;