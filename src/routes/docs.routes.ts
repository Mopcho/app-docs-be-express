import express, { Router } from "express";
import docsController from "../controllers/docs.controller";
import { roleGuard } from "../middlewares/auth";

const docsRouter: Router = express.Router();

docsRouter.get('/', roleGuard.check('User'), docsController.find);
docsRouter.post('/', roleGuard.check('User'), docsController.create);
docsRouter.put('/:key', roleGuard.check('User'), docsController.update);
docsRouter.delete('/:key', roleGuard.check('User'), docsController._delete);
docsRouter.get('/:key', roleGuard.check('User'), docsController.get);

export default docsRouter;