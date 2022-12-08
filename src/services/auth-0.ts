import axios from 'axios';
import request from 'request';
import jwt_decode from 'jwt-decode';
import NodeCache from 'node-cache';

const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

async function retrieveManagementApiAccessToken() {
	try {
		return new Promise((res, rej) => {
			var options = {
				method: 'POST',
				url: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
				headers: { 'content-type': 'application/json' },
				body: `{"client_id":"${process.env.AUTH0_CLIENT_ID}","client_secret":"${process.env.AUTH0_CLIENT_SECRET}","audience":"https://${process.env.AUTH0_DOMAIN}/api/v2/","grant_type":"client_credentials"}`,
			};

			request(options, function (error, response, body) {
				if (error) {
					rej(error);
				} else {
					res(JSON.parse(body).access_token);
				}
			});
		});
	} catch (err) {
		console.log(err);
	}
}

module.exports.retrieveManagementApiAccessToken =
	retrieveManagementApiAccessToken;

function checkIsExpired(token: any) {
	try {
		var decoded: any = jwt_decode(token);

		// check for an expiration date
		let now = Date.now() / 1000;
		let minutes = 2;
		let inMinutes = (Date.now() + minutes * 60000) / 1000;

		if (decoded.exp < inMinutes) {
			return true;
		}
		return false;
	} catch (err) {
		console.log(err);
	}
}

module.exports.checkIsExpired = checkIsExpired;

async function getAccessToken() {
	try {
		const TOKEN_CACHE_KEY = 'mgmntToken';

		let existingToken = await myCache.get(TOKEN_CACHE_KEY);
		let isValid = existingToken && !checkIsExpired(existingToken);

		if (existingToken && isValid) {
			console.log('RETURNING EXISTING');
			return existingToken;
		}

		let token = await retrieveManagementApiAccessToken();
		let success = await myCache.set(TOKEN_CACHE_KEY, token, 10000);
		console.log('SAVED TOKEN');
		return await myCache.get(TOKEN_CACHE_KEY);
	} catch (err) {
		console.log(err);
	}
}

module.exports.getMgmntAccessToken = getAccessToken;

const magicLink = async (name: string, email: string) => {
	try {
		let token = await getAccessToken();

		var options = {
			method: 'POST',
			url: `https://${process.env.AUTH0_DOMAIN}/passwordless/start`,
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			data: {
				client_id: process.env.AUTH0_CLIENT_ID,
				client_secret:
					'BVzviif__eBFXcV8MOVbgS30kZ5nU3kDkFpy_XkrYqgSUjLNA1wii9XMK-VVWym5',
				connection: 'email',
				email: email,
				send: 'link',
			},
		};

		axios
			.request(options)
			.then(function (response: any) {})
			.catch(function (error: any) {});
	} catch (err) {
		console.log(err);
	}
};

module.exports.magicLink = magicLink;

export var getUsers = async function getUsers() {
	try {
		let token = await getAccessToken();

		let options = {
			method: 'GET',
			url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
			headers: {
				authorization: `Bearer ${token}`,
			},
		};

		let response = await axios(options);

		response.data.data = response.data.users;
		return response.data;
	} catch (err) {
		console.log(err);
	}
};

export async function getUserById(id: string) {
	try {
		let token = await getAccessToken();

		let options = {
			method: 'GET',
			url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${id}`,
			headers: {
				authorization: `Bearer ${token}`,
			},
		};

		let response = await axios(options);

		response.data.data = response.data.users;
		return response.data;
	} catch (err) {
		console.log(err);
	}
}

export async function getUserRoles(id: string) {
	try {
		let token = await getAccessToken();

		let options = {
			method: 'GET',
			url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${id}/roles`,
			headers: {
				authorization: `Bearer ${token}`,
			},
		};

		let response = await axios(options);

		response.data.data = response.data.users;
		return response.data;
	} catch (err) {
		console.log(err);
	}
}

type userRegisterData = {
	email: string;
	password: string;
	username: string;
	given_name?: string;
	family_name?: string;
	name?: string;
	nickname?: string;
	picture?: string;
};

export async function registerUser(data: userRegisterData) {
	try {
		//Registers users and hashes his pass
		let token = await getAccessToken();

		let options = {
			method: 'POST',
			url: `https://${process.env.AUTH0_DOMAIN}/dbconnections/signup`,
			headers: {
				authorization: `Bearer ${token}`,
			},
			data: {
				client_id: process.env.AUTH0_CLIENT_ID,
				connection: process.env.AUTH0_DATABASE_CONNECTION_STRING,
				email: data.email,
				password: data.password,
				username: data.username,
				given_name: data.given_name,
				family_name: data.family_name,
				name: data.name,
				nickname: data.nickname,
				picture: data.picture,
			},
		};

		let response = await axios(options);

		response.data.data = response.data.users;
		return response.data;
	} catch (err) {
		console.log(err);
	}
}

export async function deleteUser(id: string) {
	try {
		let token = await getAccessToken();

		let options = {
			method: 'DELETE',
			url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users/auth0|${id}`,
			headers: {
				authorization: `Bearer ${token}`,
			},
		};

		let response = await axios(options);

		return response.data;
	} catch (err) {
		console.log(err);
	}
}
