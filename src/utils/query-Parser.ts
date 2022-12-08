interface Entry {
    [index: string]: any
}

export type PrismaQuery = {
	orderBy?: Entry;
	take?: number;
	skip?: number;
	select?: Entry;
	where?: Entry;
	// include?: Entry;
};

export default function queryParse(query: any): PrismaQuery {
	let queryBuilder: PrismaQuery = {};

	// Sorting Sector
	if (query.orderBy) {
		queryBuilder.orderBy = buildOrderBy(query.orderBy);
		delete query.orderBy;
	}
	// Take Sector
	if (query.pageSize) {
		queryBuilder.take = Number(query.pageSize);
		delete query.pageSize;
	}
	// Skip Sector
	if (query.page) {
		if (!queryBuilder.take) {
			queryBuilder.skip = Number(query.page);
		} else {
			queryBuilder.skip = Number((query.page - 1) * queryBuilder.take);
		}
		delete query.page;
	}
	// Select Sector
	if (query.select) {
		queryBuilder.select = buildSelect(query.select);
		delete query.select;
	}

	// if (query.include) {
	// 	queryBuilder.include = buildInclude(query.include);
	// 	delete query.include;
	// }

	return queryBuilder;
}

function buildOrderBy(value: string): object {
	// Better with regex match
	let orderBy;
	let cmd, val;
	[cmd, val] = value.split(':');

	return {
		[val]: cmd,
	};
}

function buildSelect(value: string | string[]) {
	if (Array.isArray(value)) {
		let select: Entry = {};
		value.forEach((element) => {
			select[element] = true;
		});

		return select;
	}

	return {
		[value]: true,
	};
}

function buildInclude(value: string | string[]) {
	if (Array.isArray(value)) {
		let include: Entry = {};
		value.forEach((element) => {
			include[element] = true;
		});

		return include;
	}

	return {
		[value]: true,
	};
}
