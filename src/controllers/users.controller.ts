import { NextFunction, Request,Response } from "express";
import usersService from "../services/users.service";

const RESOURCE = 'User';
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

const userController = {
    get,
    find,
    _delete,
    update
}

export default userController;
