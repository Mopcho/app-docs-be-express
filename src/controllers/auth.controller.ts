import { NextFunction, Request, Response } from 'express';
import authService from '../services/auth.service';

export async function register(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const data = await authService.register(req.body);
        res.json(data);
    } catch (err) {
        next(err);
    }
}

export async function logout(req: Request, res: Response,next: NextFunction) {
    try {
        req.logOut({}, (err) => {
            res.json(err);
        });
    
        res.json({ msg: 'Logout complete' });
    } catch(err) {
        next(err);
    }
    
}

export async function me(req: Request, res: Response,next: NextFunction) {
    try {
        if(!req.user) {
            return res.json({msg : 'No user'});
        }

        const user = req.user;

        res.json({
            username : user.username,
            email: user.email,
            id: user.id
        });
    }catch(err) {
        next(err);
    }
}
