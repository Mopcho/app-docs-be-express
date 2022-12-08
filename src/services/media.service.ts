import prisma from "../prisma";
import { NotFoundError, ValidationError } from "../utils/errors";
import { buildDateOrNumber, buildStringSector } from "../utils/helper-functions";
import queryParse from "../utils/query-Parser";
import Joi from "joi";
import mime from "mime-types";
import { deleteObject, generateEditSignature, generateGetSignature, generateUploadSignature } from "./AWS/mediaBucket";

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
		const { extName, fileName, auth0Id } = data;

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: {
				auth0Id,
			},
		});

		if (!user) {
			throw new NotFoundError('User not found');
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
			throw new ValidationError('Invalid mime type!');
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

async function find(query: any, auth: any) {
	try {
		let userRoles = auth['roles/roles'];

		let auth0Id = auth.sub;

		// Query parse handles skip , take , orderBy , select  , include
		let prismaQuery = queryParse(query);

		// Wе handle alone where clause ( Because it may be specific to product)
		if (!prismaQuery.where) {
			prismaQuery.where = {
				contentType: {
					in: whitelist,
				},
			};
			if (!userRoles.includes('Admin')) {
				let user = await prisma.user.findUnique({
					where: {
						auth0Id,
					},
				});

				if (!user) {
					throw new Error('Invalid User');
				}
				prismaQuery.where['userId'] = user.id;
			}
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

async function get(key: string, auth: any) {
	try {
		// Only user's files
		const userRoles = auth['roles/roles'];

		const auth0Id = auth.sub;

		// If user isnt admin check if it is his file
		if (!userRoles.includes('Admin')) {
			//Get user
			let user = await prisma.user.findUniqueOrThrow({
				where: {
					auth0Id: auth0Id,
				},
			});

			//If this user id and key are not present in files throw an error
			await prisma.file.findFirstOrThrow({
				where: {
					userId: user.id,
					key: key,
				},
			});
		}

		// Get From our DB
		let dbResponse = await prisma.file.findUnique({
			where: { key },
		});

		let presignedUrl = await generateGetSignature(key);

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
async function update(key: string, data: any, auth: any) {
	try {
		let { extName, fileName } = data;
		let userRoles = auth['roles/roles'];
		let auth0Id = auth.sub;

		// Check if user exists
		let user = await prisma.user.findUniqueOrThrow({
			where: {
				auth0Id,
			},
		});

		//Validate Input
		let schema = Joi.object({
			extName: Joi.string().required(),
			name: Joi.string().required(),
			userId: Joi.string().required(),
		});

		schema.validate({ extName, fileName, userId: user.id });

		//Only object's owner can update it
		if (!userRoles.includes('Admin')) {
			//Get user or throw
			let user = await prisma.user.findUniqueOrThrow({
				where: {
					auth0Id,
				},
			});

			//If this user id and key are not present in files throw an error
			await prisma.file.findFirstOrThrow({
				where: {
					userId: user.id,
					key: key,
				},
			});
		}
		//Get Signed Url
		let awsResponse = await generateEditSignature(key, fileName, extName);

		//Update our DB
		let dbResponse = await prisma.file.update({
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
async function _delete(key: string, auth: any) {
	try {
		// User can delete only his files
		let userRoles = auth['roles/roles'];

		let auth0Id = auth.sub;

		if (!userRoles.includes('Admin')) {
			//Get user
			let user = await prisma.user.findUniqueOrThrow({
				where: {
					auth0Id,
				},
			});

			//If this user id and key are not present in files throw an error
			await prisma.file.findFirstOrThrow({
				where: {
					userId: user.id,
					key: key,
				},
			});
		}
		// Delete from AWS S3 Bucket
		let awsResponse = await deleteObject(key);

		// Delete from DB
		let dbResponse = await prisma.file.delete({
			where: {
				key: key,
			},
		});

		return { databaseResponse: dbResponse, awsResponse: awsResponse };
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
