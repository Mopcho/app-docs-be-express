import { NextFunction, Request,Response } from "express";
import usersService from "../services/users.service";


const RESOURCE = 'User';
/**
 * Create
 */
// async function create(req: Request, res: Response) {
// 	try {
// 		const data = req.body;
// 		let dataResponse = await usersService.create(data);
// 		res.status(201).json(dataResponse);
// 	} catch (error) {
// 		console.log(`[${RESOURCE}:create] route handler error:${error}`);
// 		_errorHandler(error as Error, res);
// 	}
// }

// /**
//  * Read
//  */
async function find(req: Request, res: Response, next: NextFunction) {
	try {
		const dataResponse = await usersService.find(req.query);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

async function get(req: Request, res: Response, next: NextFunction) {
	try {
		const dataResponse = await usersService.get(req.params.id);

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
		const dataResponse = await usersService.update(
			req.params.id,
			req.body
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
		const dataResponse = await usersService.delete(req.params.id);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

async function getByToken(req: Request, res: Response, next: NextFunction) {
	try {
		// @ts-ignore
		const dataResponse = await usersService.getByToken(req.auth);

		res.status(200).json(dataResponse);
	} catch (error) {
		next(error);
	}
}

const userController = {
    // create,
    get,
    find,
    _delete,
    update,
    getByToken
}

export default userController;
