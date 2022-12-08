interface Entry {
    [index: string]: any
}

export function buildDateOrNumber(queryValue: string) {
	// If it is date range
	if (Array.isArray(queryValue)) {
		let filter: Entry = {};
		queryValue.forEach((element: string) => {
			let [param1, param2] = element.split(/:(.*)/s);
			// @ts-ignore
			if (!isNaN(param2)) {
				filter[param1] = Number(param2); //If value can be converted to number we do it
			} else {
				filter[param1] = param2;
			}
		});

		return filter;
	} else {
		// We get out value
		let [param1, param2] = queryValue.split(/:(.*)/s);

		// @ts-ignore
		if (!isNaN(param2)) {
			return { [param1]: Number(param2) }; //If value can be converted to number we do it
		}

		// We set our query params
		return { [param1]: param2 };
	}
}

export function buildStringSector(queryValue: string) {
	// We set our default mode to insensitive
	let mode = 'insensitive';

	// We handle different kind of situations here :
	let value: string;

	// Client wants Case Insensitive match
	if (queryValue.includes('cs:')) {
		value = queryValue.split(':')[1];
		mode = 'default';
	} else {
		value = queryValue;
	}

	// If the client wants a NOT match
	if (value.startsWith('!')) {
		value = value.substring(1, value.length);
		return {
			mode,
			not: value,
		};
	}

	return {
		equals: value,
		mode,
	};
}
