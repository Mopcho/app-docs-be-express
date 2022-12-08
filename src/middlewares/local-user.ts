import { getUserById } from '../services/auth-0';
import { Request, Response } from 'express';
import prisma from '../prisma';

export default async function localUser(
	req: Request,
	res: Response,
	next: any
) {
	try {
		// @ts-ignore
		let auth0Id = req.auth.sub;

		let userCheck = await prisma.user.findFirst({
			where: {
				auth0Id,
			},
		});

		if (userCheck) {
			return next();
		}

		// @ts-ignore
		let user = await getUserById(req.auth.sub);

		if (!user) {
			throw new Error('Token is either expired or user doesnt exist!');
		}

		const newUser = await prisma.user.create({
			data: {
				// @ts-ignore
				auth0Id: req.auth.sub,
				email: user.email,
				username: user.name,
				email_verified: user.email_verified,
			},
		});

		next();
	} catch (err) {
		console.log(err);
		res.status(404).json(err);
	}
}
