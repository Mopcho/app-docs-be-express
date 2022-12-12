import express, { Router } from "express";
import docsController from "../controllers/docs.controller";
import { roleGuard } from "../middlewares/authMiddleware";

const docsRouter: Router = express.Router();

docsRouter.get('/', roleGuard(['User']), docsController.find);
docsRouter.post('/', roleGuard(['User']), docsController.create);
docsRouter.put('/:key', roleGuard(['User']), docsController.update);
docsRouter.delete('/:key', roleGuard(['User']), docsController._delete);
docsRouter.get('/:key', roleGuard(['User']), docsController.get);

export default docsRouter;