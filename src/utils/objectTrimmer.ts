export function trimObjValues(obj: any) {
	if (obj && typeof obj === 'object') {
		Object.keys(obj).map((key) => {
			if (typeof obj[key] === 'object') {
				trimObjValues(obj[key]);
			} else if (typeof obj[key] === 'string') {
				obj[key] = obj[key].trim();
			}
		});
	}
	return obj;
}
