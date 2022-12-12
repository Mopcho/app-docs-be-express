import filesService from '../services/files.service';
import {NextFunction, Request, Response} from 'express';

const RESOURCE = 'Docs';

async function find(req: Request, res: Response, next: NextFunction) {
	try {
		const dataResponse = await filesService.find(
			req.query,
			// @ts-ignore
			req.user
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

async function removeFromTrash(req: Request, res: Response, next: NextFunction) {
    try {
		const dataResponse = await filesService.removeFromTrash(
			req.params.key,
			// @ts-ignore
			req.user
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

async function update(req: Request, res: Response, next: NextFunction) {
    try {
		const dataResponse = await filesService.update({
            ...req.body,
            key: req.params.key,
            //@ts-ignore
            user: req.user
        });

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

const filesController = {
    find,
    removeFromTrash,
    update
}

export default filesController;
