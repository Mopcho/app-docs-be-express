import { CreateDataInput, DatabaseDocCreateData, DatabaseDocUpdateData, ReverseFunctions, UpdateDataInput } from "../interfaces/docsInterfaces/index";
import { validateDocumentCreateData } from "../validations/docs/docs.validation";
import prisma from "../prisma/index";
import { NotFoundError, ValidationError } from "../utils/errors";
import { buildDateOrNumber, buildStringSector } from "../utils/helper-functions";
import queryParse from "../utils/query-Parser";
import { validateDocumentUpdateData } from "../validations/docs/docs.validation";
import mime from "mime-types";
import { deleteObject, generateGetSignature, generateUploadSignature } from "./AWS/s3";

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
		const { extName, fileName, auth0Id } = data;

		// Generate Upload Signature
		const s3Response = await generateUploadSignature(extName, fileName);

		const databaseData: DatabaseDocCreateData = {
			extName,
			fileName,
			auth0Id,
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
		const { extName, fileName, auth0Id, key } = data;

		// Check mime type
		const contentType = mime.lookup(extName);

		if (contentType === false || contentType.includes('video')) {
			throw new ValidationError(
				'This endpoint is for documents only. Use the /media endpoint for videos'
			);
		}

		// Validate data
		const databaseValidate = validateDocumentCreateData(data);

		if (databaseValidate.error) {
			throw new ValidationError(databaseValidate.error.message);
		}

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: {
				auth0Id,
			},
		});

		if (!user) {
			throw new NotFoundError('User does not exist!');
		}

		// Create file and connect user with it in our DB
		await prisma.user.update({
			where: {
				auth0Id,
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
					auth0Id,
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
async function find(query: any, auth: any) {
	try {
		// Destructure
		let userRoles = auth['roles/roles'];
		let auth0Id = auth.sub;

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
				auth0Id,
			},
		});

		if (!user) {
			throw new NotFoundError('User not found');
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

		console.log(prismaQuery);

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

async function get(key: string, auth: any) {
	try {
		// Only user's files
		let userRoles = auth['roles/roles'];
		let auth0Id = auth.sub;

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: {
				auth0Id,
			},
		});

		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Check if file exists
		const file = await prisma.file.findUnique({
			where: {
				key,
			},
		});

		if (!file) {
			throw new NotFoundError('File not found');
		}

		const isAdmin = userRoles.includes('Admin');
		const isOwner = file.userId === user.id;

		if (!isAdmin && !isOwner) {
			throw new ValidationError(
				'User doesnt have permissions to access this file'
			);
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
		const { fileName, auth, key } = data;

		// Create databaseData
		const databaseData: DatabaseDocUpdateData = {
			fileName,
			auth,
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
		const { fileName, auth, key } = data;
		const auth0Id = auth.sub;
		const userRoles: string[] = auth['roles/roles'];

		// Validate data
		const validate = validateDocumentUpdateData(data);

		if (validate.error) {
			throw new ValidationError(validate.error.message);
		}

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: {
				auth0Id,
			},
		});

		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Check if document exists
		const document = await prisma.file.findUnique({
			where: {
				key,
			},
		});

		if (!document) {
			throw new NotFoundError('Document not found');
		}

		// Check if use is either admin or owner of the document
		const isAdmin = userRoles.includes('Admin');
		const isOwner = user.id === document.userId;

		if (!isAdmin && !isOwner) {
			throw new ValidationError(
				'User doesnt have permission yo update this document'
			);
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
async function _delete(key: string, auth: any) {
	try {
		// Destructure data
		const userRoles: string[] = auth['roles/roles'];
		const auth0Id = auth.sub;

		// Check if user exists
		const user = await prisma.user.findUnique({
			where: {
				auth0Id,
			},
		});

		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Check if file exists
		const file = await prisma.file.findUnique({
			where: {
				key,
			},
		});

		if (!file) {
			throw new NotFoundError('File not found');
		}

		// Check if user is admin or owner o the object
		const isAdmin = userRoles.includes('Admin');
		const isOnwer = file.userId === user.id;

		if (!isAdmin && !isOnwer) {
			throw new ValidationError(
				'User doesnt have permission to edit this file'
			);
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
