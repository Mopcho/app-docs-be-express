import express, { Express } from 'express';
import router from '../routes/index';
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import cors from 'cors';
import { jwtCheck } from '../middlewares/auth';
import localUser from '../middlewares/local-user';

// express rejects requests by default if there's no SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const app: Express = express();

// cors
app.use(cors());
// app.use(function (req: Request, res: Response, next: NextFunction) {
// 	res.header('Access-Control-Allow-Origin', '*');
// 	res.header(
// 		'Access-Control-Allow-Headers',
// 		'Content-Type,Content-Length, Authorization, Accept,X-Requested-With'
// 	);
// 	res.header(
// 		'Access-Control-Allow-Methods',
// 		'PUT,POST,GET,DELETE,OPTIONS'
// 	);
// 	next();
// });
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
const USE_AUTH = true;
if (USE_AUTH) {
	app.use(jwtCheck);
	// @ts-ignore
	app.use(localUser);
}

app.use('/api', router);

const port = process.env.PORT;

const isHttps = process.env.ISHTTPS === 'true' ? true : false;

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
