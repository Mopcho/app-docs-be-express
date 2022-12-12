import docsService from '../services/docs.service';
import {NextFunction, Request, Response} from 'express';

const RESOURCE = 'Docs';
/**
 * Create
 */
async function create(req: Request, res: Response,next: NextFunction) {
	try {
		const data = req.body;
		let dataResponse = await docsService.create({
			...data,
			// @ts-ignore
			user: req.user
		});
		res.status(201).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

// /**
//  * Read
//  */
async function find(req: Request, res: Response,next: NextFunction) {
	try {
		const dataResponse = await docsService.find(
			req.query,
			// @ts-ignore
			req.user
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

async function get(req: Request, res: Response,next: NextFunction) {
	try {
		const dataResponse = await docsService.get(
			req.params.key,
			// @ts-ignore
			req.user
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}
// /**
//  * Update
//  */
async function update(req: Request, res: Response,next: NextFunction) {
	try {
		const dataResponse = await docsService.update({
			key: req.params.key,
			...req.body,
			//@ts-ignore
			aexpressUser: req.user
		});

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

// /**
//  * Delete
//  */
async function _delete(req: Request, res: Response,next: NextFunction) {
	try {
		const dataResponse = await docsService.delete(
			req.params.key,
			// @ts-ignore
			req.user
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
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
