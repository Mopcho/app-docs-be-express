import { DatabaseDocUpdateData, ReverseFunctions, UpdateDataInput } from "../interfaces/docsInterfaces";
import { validateDocumentUpdateData } from "../validations/docs/docs.validation";
import prisma from "../prisma/index";
import { NotFoundError, ValidationError } from "../utils/errors";
import { buildDateOrNumber, buildStringSector } from "../utils/helper-functions";
import queryParse from "../utils/query-Parser";
import { generateGetSignature } from "./AWS/s3";

const RESOURCE = 'Files';
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
			prismaQuery.where = {};
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

		// We check if user is admin
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

async function removeFromTrash(key:string, auth: any) {
    try {
		// Destructure
		let userRoles = auth['roles/roles'];
		let auth0Id = auth.sub;

		// Check if user exists
        const user  = await prisma.user.findUnique({
            where : {
                auth0Id
            }
        });

        if(!user) {
            throw new NotFoundError('User does not exist');
        }

        // Check if file exists
        const file = await prisma.file.findUnique({
            where : {
                key
            }
        });

        if(!file) {
            throw new NotFoundError('File does not exist');
        }

        // Check if user can access this file
        const isAdmin = userRoles.includes('Admin');
        const isOwner = file.userId === user.id;

        if(!isAdmin && !isOwner) {
            throw new ValidationError('User does not have the permissions needed to alter this file');
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
