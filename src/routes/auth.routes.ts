import { ApiError } from '../utils/errors';
import express, { Request, Response, NextFunction} from 'express';
import passport from 'passport';
import { logout, register, me } from '../controllers/auth.controller';
import { isAuth, roleGuard } from '../middlewares/authMiddleware';
import { HttpStatusCode } from '../interfaces/errors';

const router = express.Router();

// router.post(
// 	'/login/password', (req: Request,res: Response,next: NextFunction) => {
// 		passport.authenticate('local', (err,user,info) => {
// 			try {
// 				// If there is an error OR no user, throw an APIError
// 				if(err || !user) {
// 					throw new ApiError('Unuscessful authentication', info.message, HttpStatusCode.BAD_REQUEST);
// 				}

// 				// If user is successfully authenticated return Success message
// 				res.status(200).json({msg: 'Success'});
// 			} catch(err) {
// 				next(err);
// 			}
// 		})(req,res,next);
// 	}
// );

router.post(
	'/login/password', passport.authenticate('local'), (req,res,next) => {
		try {
			res.json({msg: 'Success'});
		} catch(err) {
			next(err);
		}
	}
);


router.get('/protected', isAuth, (req, res) => {
	res.send('Protected data');
});

router.get('/admin', isAuth, roleGuard(['Admin']), (req, res) => {
	res.send('Admin data');
});

router.post('/register', register);

router.delete('/logout', logout);

router.get('/me', me);

export default router;
