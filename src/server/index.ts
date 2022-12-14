import express, { Express, NextFunction,Response , Request } from 'express';
import router from '../routes/index';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import cors from 'cors';
import session from 'express-session';
import { sessionSecret } from '../config/constants';
import passport from 'passport';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import prisma from '../prisma/index';
import { BaseError, errorHandler } from '../utils/errors';

// express rejects requests by default if there's no SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const app: Express = express();

// ------------ CORS -------------
app.use(cors({
	credentials: true,
	origin: 'https://mopdocs.xyz'
}));

// ----------- BODY PARSER --------------
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// --- Express Session Setup --- //
app.use(
    session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: true,
        store: new PrismaSessionStore(prisma, {
            checkPeriod: 2 * 60 * 1000, //ms
            dbRecordIdIsSessionId: true,
            dbRecordIdFunction: undefined,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24,
        },
    }),
);

// --- PassPort.JS Setup --- //
require('../config/passport/passport');
app.use(passport.initialize());
app.use(passport.session());

app.use('/api', router);

app.use(async (err: BaseError, req: Request, res: Response, next: NextFunction) => {
	if (!errorHandler.isTrustedError(err)) {
	  next(err);
	}
	await errorHandler.handleError(err,res);
});

// process.on('uncaughtException', (error: Error) => {
// 	errorHandler.handleError(error);
// 	if (!errorHandler.isTrustedError(error)) {
// 	  process.exit(1);
// 	}
// });

const port = process.env.PORT;

const isHttps = process.env.ISHTTPS === 'true' ? true : false;

// ------------ END OF SETUP ------------------ //

if (isHttps) {
	// HTTPS server
	const keyLocation = process.env.HTTPS_PRIVATE_KEY_LOCATION;
	const certificateLocation = process.env.HTTPS_CERTIFICATE_LOCATION;
	if (!keyLocation) {
		throw new Error(
			'You are trying to start server in HTTPS but HTTPS_PRIVATE_KEY_LOCATION is empty'
		);
	}
	if (!certificateLocation) {
		throw new Error(
			'You are trying to start server in HTTPS but HTTPS_CERTIFICATE_LOCATION is empty'
		);
	}

	const privateKey = fs.readFileSync(keyLocation);
	const certificate = fs.readFileSync(certificateLocation);
	const httpsConfig = { key: privateKey, cert: certificate };

	https.createServer(httpsConfig, app).listen(port, () => {
		console.log(
			`⚡️[server]: Server is running at https://localhost:${port}`
		);
	});
} else {
	app.listen(port, () => {
		console.log(
			`⚡️[server]: Server is running at http://localhost:${port}`
		);
	});
}
