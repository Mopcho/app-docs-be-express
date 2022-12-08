import mediaService from "../services/media.service";
import {Request, Response} from 'express';
import _errorHandler from "../utils/error-handler";

const RESOURCE = 'Media';
/**
 * Create
 */
async function create(req: Request, res: Response) {
	try {
		const data = req.body;
		let dataResponse = await mediaService.create({
			...data,
			// @ts-ignore
			auth0Id: req.auth.sub,
		});
		res.status(201).json(dataResponse);
	} catch (error) {
		console.log(`[${RESOURCE}:create] route handler error:${error}`);
		_errorHandler(error as Error, res);
	}
}

// /**
//  * Read
//  */
async function find(req: Request, res: Response) {
	try {
		const dataResponse = await mediaService.find(
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

async function get(req: Request, res: Response) {
	try {
		const dataResponse = await mediaService.get(
			req.params.key,
			// @ts-ignore
			req.auth
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		console.log(`[${RESOURCE}:get] route handler error:${error}`);
		_errorHandler(error as Error, res);
	}
}
// /**
//  * Update
//  */
async function update(req: Request, res: Response) {
	try {
		const dataResponse = await mediaService.update(
			req.params.key,
			req.body,
			//@ts-ignore
			req.auth
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		console.log(`[${RESOURCE}:update] route handler error:${error}`);
		_errorHandler(error as Error, res);
	}
}

// /**
//  * Delete
//  */
async function _delete(req: Request, res: Response) {
	try {
		const dataResponse = await mediaService.delete(
			req.params.key,
			// @ts-ignore
			req.auth
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		console.log(`[${RESOURCE}:_delete] route handler error:${error}`);
		_errorHandler(error as Error, res);
	}
}

const mediaController = {
    find,
    get,
    _delete,
    update,
    create
}

export default mediaController;