import { DatabaseDocUpdateData, ReverseFunctions, UpdateDataInput } from "../interfaces/docsInterfaces";
import { validateDocumentUpdateData } from "../validations/docs.validation";
import prisma from "../prisma/index";
import { ApiError } from "../utils/errors";
import { buildDateOrNumber, buildStringSector } from "../utils/helper-functions";
import queryParse from "../utils/query-Parser";
import { generateGetSignature } from "./AWS/s3";
import { UsersWithRoles } from "../config/passport/lib.pass";
import { HttpStatusCode } from "../interfaces/errors";

const RESOURCE = 'Files';
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
			prismaQuery.where = {};
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

		// We check if user is admin
		const isAdmin = userRoles.includes('Admin');

		if (!isAdmin) {
			prismaQuery.where['userId'] = user.id;
		}

		for (const key in query) {
			let queryValue = query[key];
			if (key.toLowerCase() === 'contenttype') {
				if (queryValue !== 'all') {
					prismaQuery.where.contentType.contains = queryValue.toLowerCase();
				}
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

async function removeFromTrash(key:string, expressUser: UsersWithRoles) {
    try {
		// Destructure
		const userRoles = expressUser.Roles.map(x => x.title);
		const userId = expressUser.id;

		// Check if user exists
        const user  = await prisma.user.findUnique({
            where : {
                id: userId
            }
        });

        if(!user) {
            throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
        }

        // Check if file exists
        const file = await prisma.file.findUnique({
            where : {
                key
            }
        });

        if(!file) {
            throw new ApiError('NOT FOUND', 'File does not exists in the database', HttpStatusCode.NOT_FOUND);
        }

        // Check if user can access this file
        const isAdmin = userRoles.includes('Admin');
        const isOwner = file.userId === user.id;

        if(!isAdmin && !isOwner) {
            throw new ApiError('FORBIDDEN', 'This user has no access to alter this file', HttpStatusCode.FORBIDDEN);
        }

        // Change status to 'active'
        const databaseResponse = await prisma.file.update({
            where : {
                key
            },
            data : {
                status : 'active'
            }
        });

        return {databaseResponse};
	} catch (error: any) {
		console.log(`[${RESOURCE}:find] controller error:${error}`);
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
		const { fileName, user, key } = data;
		// Destructure
		const userRoles = user.Roles.map(x => x.title);
		const userId = user.id;

		// Validate data
		const validate = validateDocumentUpdateData(data);

		if (validate.error) {
			throw new ApiError('Validation Error', validate.error.message, HttpStatusCode.BAD_REQUEST);
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
		const isOwner = fetchedUser.id === document.userId;

		if (!isAdmin && !isOwner) {
			throw new ApiError('Unauthorized', 'User does not have permission to alter this file', HttpStatusCode.FORBIDDEN);
		}

		// Update
		const dataResponse = await prisma.file.update({
			where: {
				key,
			},
			data: {
				name: fileName
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

/* Helper Functions */
function isNumberSector(key: string) {
	return false;
}

function isDateSector(key: string) {
	return key == 'createdAt' || key == 'updatedAt';
}

/* Specific */

export default {
    find,
    removeFromTrash,
    update
};
