import mediaService from "../services/media.service";
import {NextFunction, Request, Response} from 'express';

const RESOURCE = 'Media';
/**
 * Create
 */
async function create(req: Request, res: Response, next: NextFunction) {
	try {
		const data = req.body;
		let dataResponse = await mediaService.create({
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
async function find(req: Request, res: Response, next: NextFunction) {
	try {
		const dataResponse = await mediaService.find(
			req.query,
			// @ts-ignore
			req.user
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

async function get(req: Request, res: Response, next: NextFunction) {
	try {
		const dataResponse = await mediaService.get(
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
async function update(req: Request, res: Response, next: NextFunction) {
	try {
		const dataResponse = await mediaService.update(
			req.params.key,
			req.body,
			//@ts-ignore
			req.user
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

// /**
//  * Delete
//  */
async function _delete(req: Request, res: Response, next: NextFunction) {
	try {
		const dataResponse = await mediaService.delete(
			req.params.key,
			// @ts-ignore
			req.user
		);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
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