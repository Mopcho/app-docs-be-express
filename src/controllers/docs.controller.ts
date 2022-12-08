import _errorHandler from '../utils/error-handler';
import docsService from '../services/docs.service';
import {Request, Response} from 'express';

const RESOURCE = 'Docs';
/**
 * Create
 */
async function create(req: Request, res: Response) {
	try {
		const data = req.body;
		let dataResponse = await docsService.create({
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
		const dataResponse = await docsService.find(
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
		const dataResponse = await docsService.get(
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
		const dataResponse = await docsService.update({
			key: req.params.key,
			...req.body,
			//@ts-ignore
			auth: req.auth,
		});

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
		const dataResponse = await docsService.delete(
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

const docsController = {
    create,
    find,
    _delete,
    update,
    get    
}

export default docsController;
