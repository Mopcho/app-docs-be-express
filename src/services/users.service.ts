import { HttpStatusCode } from "../interfaces/errors";
import prisma from "../prisma";
import { ApiError } from "../utils/errors";
import { buildDateOrNumber, buildStringSector } from "../utils/helper-functions";
import queryParse from "../utils/query-Parser";
import { validateUserUpdate } from "../validations/users.validation";

const RESOURCE = 'Users';

/**
 * Generic Actions
 */

/**
 * Read
 */

async function find(query: any) {
	try {
		// Query parse handles skip , take , orderBy , select  , include
		let prismaQuery = queryParse(query);

		// Wе handle alone where clause ( Because it may be specific to product)
		if (!prismaQuery.where) {
			prismaQuery.where = {};
		}

		for (const key in query) {
			let queryValue = query[key];
			if (isDateSector(key) || isNumberSector(key)) {
				prismaQuery.where[key] = buildDateOrNumber(queryValue);
			} else {
				prismaQuery.where[key] = buildStringSector(queryValue);
			}
		}

		let [total, data] = await prisma.$transaction([
			prisma.user.count(),
			prisma.user.findMany({
				...prismaQuery,
			}),
		]);

		return {
			data,
			total,
		};
	} catch (error: any) {
		console.log(`[${RESOURCE}:find] controller error:${error}`);
		throw error;
	}
}

async function get(id: string) {
	try {
		const user = await prisma.user.findUnique({
			where: {
				id,
			},
		});

		if (!user) {
			throw new ApiError('NOT FOUND', 'User does not exists in the database', HttpStatusCode.NOT_FOUND);
		}

		return user;
	} catch (error: any) {
		console.log(`[${RESOURCE}:get] controller error:${error}`);
		throw error;
	}
}

/**
 * Update
 */
async function update(id: string, data: any) {
	try {
		validateUserUpdate(data);
		return await prisma.user.update({
			where: { id },
			data: {
				...data,
			},
		});
	} catch (error: any) {
		console.log(`[${RESOURCE}:update] controller error:${error}`);
		throw error;
	}
}

/**
 * Delete
 */
async function _delete(id: string) {
	try {
		return await prisma.user.delete({
			where: { id },
		});
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
	find,
	delete: _delete,
	get,
	update,
};
