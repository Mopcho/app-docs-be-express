import { PrismaQuery } from '../../utils/query-Parser';

export type ReverseFunctions = {
	databaseReverse?: () => {};
};

export type FindQuery = {
	[key: string]: keyof Partial<File & PrismaQuery>;
};

export type CreateDataInput = {
	extName: string;
	fileName: string;
	auth0Id: string;
};

export type DatabaseDocCreateData = {
	extName: string;
	fileName: string;
	auth0Id: string;
	key: string;
};

export type UpdateDataInput = {
	fileName?: string;
	auth: any;
	key: string;
};

export type DatabaseDocUpdateData = {
	fileName?: string;
	auth: any;
	key: string;
};
