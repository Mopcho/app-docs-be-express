import { NextFunction, Request, Response } from 'express';

export const isAuth = (req: Request, res: Response, next: NextFunction) => {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.status(403).json({
			msg: 'You are not authorized to view this resource',
		});
	}
};

export const roleGuard = (roles: string[]) => {
	return function (req: Request, res: Response, next: NextFunction) {
		try {
			const userRoles = req.user?.Roles;

			// We check if the userRoles are the same length as the roles
			if (userRoles?.length !== roles.length) {
				return res.status(403).json({ msg: 'You are not authrorized' });
			}

			// We check if roles contains every userRoles
			const areEqual = userRoles?.every((element) => {
				if (roles.includes(element.title)) {
					return true;
				}

				return false;
			});

			if (!areEqual) {
				return res.status(403).json({ msg: 'You are not authorized' });
			}

			next();
		} catch (err) {
			res.json(err);
		}
	};
};
