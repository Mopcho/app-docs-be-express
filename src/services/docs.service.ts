import { CreateDataInput, DatabaseDocCreateData, DatabaseDocUpdateData, ReverseFunctions, UpdateDataInput } from "../interfaces/docsInterfaces/index";
import { validateDocumentCreateData } from "../validations/docs.validation";
import prisma from "../prisma/index";
import { ApiError } from "../utils/errors";
import { buildDateOrNumber, buildStringSector } from "../utils/helper-functions";
import queryParse from "../utils/query-Parser";
import { validateDocumentUpdateData } from "../validations/docs.validation";
import mime from "mime-types";
import { deleteObject, generateGetSignature, generateUploadSignature } from "./AWS/s3";
import { UsersWithRoles } from "../config/passport/lib.pass";
import { HttpStatusCode } from "../interfaces/errors";

const RESOURCE = 'Documents';

/**
 * TODO : Find is getting more xomplex by the time and it will becom impossible to manage it
 * Find must :
 * 1. Handle skip(page) , take(pageSize) , orderBy(numbers, alphabetically, dates) , select(param)
 * 2. Have a static where statement (so we can say stuff like, this user is not authorized so return only his documents)
 * 3. Fetch data
 * 4. Enrich data with presigned urls
 */

/**
 * Generic Actions
 */

/**
 * Create a document in database and return a PreSigned URL
 * @param {CreateDataInput} data
 */
async function create(data: CreateDataInput) {
	let reverseFunctions: ReverseFunctions = {};
	try {
		const { extName, fileName, user } = data;

		// Generate Upload Signature
		const s3Response = await generateUploadSignature(extName, fileName);

		const databaseData: DatabaseDocCreateData = {
			extName,
			fileName,
			user,
			key: s3Response.key,
		};

		const databaseResponse = await createInDatabase(databaseData);
		reverseFunctions.databaseReverse = databaseResponse.reverseChanges;

		return {
			databaseResponse: databaseResponse.dataResponse,
			preSignedUrl: s3Response.signedUrl,
		};
	} catch (error: any) {
		console.log(`[${RESOURCE}:create] controller error:${error}`);
		if (reverseFunctions.databaseReverse) {
			reverseFunctions.databaseReverse();
		}
		throw error;
	}
}

async function createInDatabase(data: DatabaseDocCreateData) {
	try {
		// Extract properties
		const { extName, fileName, user, key } = data;
		// Destructure
		const userRoles = user.Roles.map(x => x.title);
		const userId = user.id;

		// Check mime type
		const contentType = mime.lookup(extName);

		if (contentType === false || contentType.includes('video')) {
			throw new ApiError('Unsupported media type', 'This endpoint does not support video types. Refer to /media', HttpStatusCode.UNSUPPORTED_MEDIA_TYPE);
		}

		// Validate data
		const databaseValidate = validateDocumentCreateData(data);

		if (databaseValidate.error) {
			throw new ApiError('Validation Error', databaseValidate.error.message, HttpStatusCode.BAD_REQUEST);
		}

		// Check if user exists
		const fetchedUser = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if (!fetchedUser) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		// Create file and connect user with it in our DB
		await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				file: {
					create: {
						extName,
						key,
						name: fileName,
						contentType,
					},
				},
			},
		});

		const dataResponse = await prisma.file.findUnique({
			where: {
				key,
			},
		});

		const reverseChanges = async () => {
			await prisma.user.update({
				where: {
					id: userId,
				},
				data: {
					file: {
						disconnect: {
							key,
						},
					},
				},
			});

			const response = await prisma.file.delete({
				where: {
					key,
				},
			});

			return response;
		};

		return {
			dataResponse,
			reverseChanges,
		};
	} catch (error: any) {
		console.log(`[${RESOURCE}:create] controller error:${error}`);
		throw error;
	}
}

/**
 * Read
 * @param query - An object containing : A query object
 * @param auth - An object containing user info
 * @param auth.sub - Auth0Id of the user
 */
async function find(query: any, expressUser: UsersWithRoles) {
	try {
		// Destructure
		const userRoles = expressUser.Roles.map(x => x.title);
		const userId = expressUser.id;

		// Query parse handles skip , take , orderBy , select  , include
		let prismaQuery = queryParse(query);

		// Wе handle alone where clause ( Because it may be specific to product)
		if (!prismaQuery.where) {
			// Static where
			prismaQuery.where = {
				contentType: {
					not: {
						contains: 'video',
					},
				},
			};
		}

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if (!user) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		// We check if user is an admin
		const isAdmin = userRoles.includes('Admin');

		if (!isAdmin) {
			prismaQuery.where['userId'] = user.id;
		}

		for (const key in query) {
			let queryValue = query[key];
			if (key.toLowerCase() === 'contenttype') {
				if (queryValue !== 'all') {
					prismaQuery.where.contentType.contains = queryValue;
				}
			}
			else if(key.toLowerCase() === 'name') {
				prismaQuery.where.name = {
					contains : queryValue
				};
			} 
			else if (isDateSector(key) || isNumberSector(key)) {
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

		const enrichedData = await Promise.all(
			data.map(async (file) => {
				const preSignedUrl = await generateGetSignature(file.key);

				return {
					...file,
					preSignedUrl,
				};
			})
		);

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
		// Destructure
		const userRoles = expressUser.Roles.map(x => x.title);
		const userId = expressUser.id;

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: {
				id : userId,
			},
		});

		if (!user) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		// Check if file exists
		const file = await prisma.file.findUnique({
			where: {
				key,
			},
		});

		if (!file) {
			throw new ApiError('NOT FOUND', 'File does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		const isAdmin = userRoles.includes('Admin');
		const isOwner = file.userId === user.id;

		if (!isAdmin && !isOwner) {
			throw new ApiError('Unauthorized', 'User does not have access to to alter this file', HttpStatusCode.FORBIDDEN);
		}

		// Return presignedURL
		let presignedUrl = await generateGetSignature(key);

		// Get From our DB
		let dbResponse = await prisma.file.findUnique({
			where: { key },
		});

		return {
			databaseResponse: dbResponse,
			presignedUrl: presignedUrl,
		};
	} catch (error: any) {
		console.log(`[${RESOURCE}:get] controller error:${error}`);
		throw error;
	}
}

/**
 * Update
 */
async function update(data: UpdateDataInput) {
	let reverseFunctions: ReverseFunctions = {};
	try {
		// Destructure data
		const { fileName, user, key } = data;

		// Create databaseData
		const databaseData: DatabaseDocUpdateData = {
			fileName,
			user,
			key,
		};

		const databaseResponse = await updateInDatabase(databaseData);
		reverseFunctions.databaseReverse = databaseResponse.reverseChanges;

		return {
			datatabaseResponse: databaseResponse.dataResponse,
		};
	} catch (error: any) {
		console.log(`[${RESOURCE}:update] controller error:${error}`);
		throw error;
	}
}

/**
 * Update a document in the database
 * @param {DatabaseDocUpdateData} data
 * @returns
 * 1. Destructure data
 * 2. Validate data
 * 3. Check if user exists
 * 4. Check if document exists
 * 5. Check if use is either admin or owner of the document
 * 6. Update
 * 7. Create reverseChanges function
 */
async function updateInDatabase(data: DatabaseDocUpdateData) {
	try {
		// Destructure data
		const { fileName, user: expressUser, key } = data;
		// Destructure
		const userRoles = expressUser.Roles.map(x => x.title);
		const userId = expressUser.id;

		// Validate data
		const validate = validateDocumentUpdateData(data);

		if (validate.error) {
			throw new ApiError('Validation Error', validate.error.message, HttpStatusCode.BAD_REQUEST);
		}

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: {
				id : userId,
			},
		});

		if (!user) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		// Check if document exists
		const document = await prisma.file.findUnique({
			where: {
				key,
			},
		});

		if (!document) {
			throw new ApiError('NOT FOUND', 'Document does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		// Check if use is either admin or owner of the document
		const isAdmin = userRoles.includes('Admin');
		const isOwner = user.id === document.userId;

		if (!isAdmin && !isOwner) {
			throw new ApiError('Unauthorized', 'User does not have access to alter this file', HttpStatusCode.FORBIDDEN);
		}

		// Update
		const dataResponse = await prisma.file.update({
			where: {
				key,
			},
			data: {
				name: fileName,
			},
		});

		// Create reverseChanges function
		const reverseChanges = async () => {
			const response = await prisma.file.update({
				where: {
					key,
				},
				data: {
					...document,
				},
			});
		};

		return {
			dataResponse,
			reverseChanges,
		};
	} catch (error: any) {
		console.log(`[${RESOURCE}:update] controller error:${error}`);
		throw error;
	}
}

/**
 * Delete
 */
async function _delete(key: string, expressUser: UsersWithRoles) {
	try {
		// Destructure
		const userRoles = expressUser.Roles.map(x => x.title);
		const userId = expressUser.id;

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if (!user) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		// Check if file exists
		const file = await prisma.file.findUnique({
			where: {
				key,
			},
		});

		if (!file) {
			throw new ApiError('NOT FOUND', 'File does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		// Check if user is admin or owner o the object
		const isAdmin = userRoles.includes('Admin');
		const isOnwer = file.userId === user.id;

		if (!isAdmin && !isOnwer) {
			throw new ApiError('Unouthorized', 'User does not have permissions to alter this file', HttpStatusCode.FORBIDDEN);
		}

		// If file status is active change it to "deleted", else delete the file from the database and S3
		if (file.status === 'active') {
			const databaseResponse = await prisma.file.update({
				where: {
					key,
				},
				data: {
					status: 'deleted',
				},
			});

			return { databaseResponse };
		} else if (file.status === 'deleted') {
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
