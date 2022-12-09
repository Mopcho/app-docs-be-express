import _errorHandler from '../utils/error-handler';
import filesService from '../services/files.service';
import {Request, Response} from 'express';

const RESOURCE = 'Docs';

async function find(req: Request, res: Response) {
	try {
		const dataResponse = await filesService.find(
			req.query,
			// @ts-ignore
			req.auth
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		console.log(`[${RESOURCE}:find] route handler error:${error}`);
		_errorHandler(error as Error, res);
	}
}

async function removeFromTrash(req: Request, res: Response) {
    try {
		const dataResponse = await filesService.removeFromTrash(
			req.params.key,
			// @ts-ignore
			req.auth
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		console.log(`[${RESOURCE}:find] route handler error:${error}`);
		_errorHandler(error as Error, res);
	}
}

async function update(req: Request, res: Response) {
    try {
		const dataResponse = await filesService.update({
            ...req.body,
            key: req.params.key,
            //@ts-ignore
            auth: req.auth
        });

		res.status(200).json(dataResponse);
	} catch (error) {
		console.log(`[${RESOURCE}:find] route handler error:${error}`);
		_errorHandler(error as Error, res);
	}
}

const filesController = {
    find,
    removeFromTrash,
    update
}

export default filesController;
