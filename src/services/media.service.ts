import prisma from "../prisma";
import {ApiError } from "../utils/errors";
import { buildDateOrNumber, buildStringSector } from "../utils/helper-functions";
import queryParse from "../utils/query-Parser";
import Joi from "joi";
import mime from "mime-types";
import { deleteObject, generateEditSignature, generateGetSignature, generateUploadSignature } from "./AWS/mediaBucket";
import { UsersWithRoles } from "../config/passport/lib.pass";
import { HttpStatusCode } from "../interfaces/errors";

const RESOURCE = 'Documents';
const whitelist = [
	'video/x-msvideo',
	'video/mp4',
	'video/mpeg',
	'video/ogg',
	'video/mp2t',
	'video/webm',
	'video/3gpp',
	'video/3gpp2',
];

/**
 * Generic Actions
 */

/**
 * Create
 */
async function create(data: any) {
	try {
		const { extName, fileName, user } = data;

		const userRoles = user.Roles.map((x:any) => x.title);
		const userId = user.id;

		// Check if user exists
		const fetchedUser = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if (!fetchedUser) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		//Validate Input
		let schema = Joi.object({
			extName: Joi.string()
				.allow('mp4', 'mov', 'wmv', 'avi', 'mkv')
				.required(),
			fileName: Joi.string().required(),
			userId: Joi.string().required(),
		});

		schema.validate({ extName, fileName, userId: user.id });

		let contentType = mime.lookup(extName);

		if (contentType === false || !whitelist.includes(contentType)) {
			throw new ApiError('Unsupported Media Type', 'This files content type is not supported. This endpoint supports mainly video types', HttpStatusCode.UNSUPPORTED_MEDIA_TYPE);
		}

		// Generate Upload Signature
		let response = await generateUploadSignature(extName, fileName);

		const mediaFile = await prisma.file.create({
			data: {
				extName,
				key: response.key,
				name: fileName,
				contentType,
				user: {
					connect: {
						id: user.id,
					},
				},
			},
		});

		return {
			databaseResponse: mediaFile,
			preSignedUrl: response.signedUrl,
		};
	} catch (error: any) {
		console.log(`[${RESOURCE}:create] controller error:${error}`);
		throw error;
	}
}

/**
 * Read
 */

async function find(query: any, expressUser: UsersWithRoles) {
	try {
		const userRoles = expressUser.Roles.map(x => x.title);
		const userId = expressUser.id;

		// Query parse handles skip , take , orderBy , select  , include
		let prismaQuery = queryParse(query);

		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if (!user) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		// Wе handle alone where clause ( Because it may be specific to product)
		if (!prismaQuery.where) {
			prismaQuery.where = {
				contentType: {
					in: whitelist,
				},
			};
		}

		const isAdmin = userRoles.includes('Admin');
		
		if (!isAdmin) {
			prismaQuery.where['userId'] = user.id;
		}

		for (const key in query) {
			let queryValue = query[key];
			if (key.toLowerCase() === 'contenttype') {
				prismaQuery.where.contentType.contains = queryValue;
			} else if (isDateSector(key) || isNumberSector(key)) {
				prismaQuery.where[key] = buildDateOrNumber(queryValue);
			} else {
				prismaQuery.where[key] = buildStringSector(queryValue);
			}
		}

		let [total, data] = await prisma.$transaction([
			prisma.file.count({
				where: prismaQuery.where,
			}),
			prisma.file.findMany({
				...prismaQuery,
			}),
		]);

		const enrichedData = data.map((video) => {
			return {
				...video,
				url: `${process.env.AWS_MEDIABUCKET_DISTRIBUTION_DOMAIN}/${video.key}`,
			};
		});

		return {
			data: enrichedData,
			total,
		};
	} catch (error: any) {
		console.log(`[${RESOURCE}:find] controller error:${error}`);
		throw error;
	}
}

async function get(key: string, expressUser: UsersWithRoles) {
	try {
		const userRoles = expressUser.Roles.map(x => x.title);
		const userId = expressUser.id;

		//Get user
		const fetchedUser = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if(!fetchedUser) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		//If this user id and key are not present in files throw an error
		const file = await prisma.file.findUnique({
			where: {
				key,
			},
		});

		const isAdmin = userRoles.includes('Admin');
		const isOwner = file?.userId == userId;

		// If user isnt admin check if it is his file
		if (!isAdmin && !isOwner) {
			throw new ApiError('Unaothorized', 'User does not have access to alter this file', HttpStatusCode.FORBIDDEN);
		}

		// Get From our DB
		const dbResponse = await prisma.file.findUnique({
			where: { key },
		});

		const presignedUrl = await generateGetSignature(key);

		return {
			databaseResponse: dbResponse,
			presignedUrl
		};
	} catch (error: any) {
		console.log(`[${RESOURCE}:get] controller error:${error}`);
		throw error;
	}
}

/**
 * Update
 */
async function update(key: string, data: any, user: Express.User) {
	try {
		let { extName, fileName } = data;
		const userRoles = user.Roles.map(role => role.title);
		const userId = user.id;

		// Check if user exists
		const fetchedUser = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if(!fetchedUser) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		//If this user id and key are not present in files throw an error
		const file = await prisma.file.findUnique({
			where: {
				key: key,
			},
		});

		if(!file) {
			throw new ApiError('NOT FOUND', 'File does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		//Validate Input
		const schema = Joi.object({
			extName: Joi.string().required(),
			name: Joi.string().required(),
			userId: Joi.string().required(),
		});

		schema.validate({ extName, fileName, userId });

		const isAdmin = userRoles.includes('Admin');
		const isOwner = file.userId === userId;

		//Only object's owner can update it
		if (!isAdmin && !isOwner) {
			throw new ApiError('Unauthorized','User does not have permissions to alter this file' , HttpStatusCode.FORBIDDEN);
		}

		//Get Signed Url
		const awsResponse = await generateEditSignature(key, fileName, extName);

		//Update our DB
		const dbResponse = await prisma.file.update({
			where: { key },
			data: {
				extName: extName,
				name: fileName,
			},
		});

		return { databaseResponse: dbResponse, presignedUrl: awsResponse };
	} catch (error: any) {
		console.log(`[${RESOURCE}:update] controller error:${error}`);
		throw error;
	}
}

/**
 * Delete
 */
async function _delete(key: string, user: Express.User) {
	try {
		const userRoles = user.Roles.map(role => role.title);
		const userId = user.id;

		//Check if user exists
		const fetchedUser = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if(!fetchedUser) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		// Check if file exists
		const file = await prisma.file.findUnique({
			where: {
				key,
			},
		});

		if(!file) {
			throw new ApiError('NOT FOUND', 'File does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		const isAdmin = userRoles.includes('Admin');
		const isOwner = file.userId === userId;

		if(!isOwner && !isAdmin) {
			throw new ApiError('Unauthorized','User does not have permissions to alter this file' , HttpStatusCode.FORBIDDEN);
		}

		if(file.status === 'active') {
			const databaseResponse = await prisma.file.update({
				where: {
					key,
				},
				data: {
					status: 'deleted',
				},
			});

			return { databaseResponse };
		} else if(file.status === 'deleted') {
			// Delete from AWS S3 Bucket
			const awsResponse = await deleteObject(key);

			// Delete from DB
			const databaseResponse = await prisma.file.delete({
				where: {
					key: key,
				},
			});

			return { databaseResponse, awsResponse };
		}

	} catch (error: any) {
		console.log(`[${RESOURCE}:delete] controller error:${error}`);
		throw error;
	}
}

/* Helper Functions */
function isNumberSector(key: string) {
	return false;
}

function isDateSector(key: string) {
	return key == 'createdAt' || key == 'updatedAt';
}

/* Specific */

export default {
	create,
	find,
	delete: _delete,
	get,
	update,
};
