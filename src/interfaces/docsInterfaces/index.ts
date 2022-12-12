import { File } from '@prisma/client';
import { UsersWithRoles } from '@src/config/passport/lib.pass';
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
	user: Express.User;
};

export type DatabaseDocCreateData = {
	extName: string;
	fileName: string;
	user: Express.User;
	key: string;
};

export type UpdateDataInput = {
	fileName?: string;
	user: Express.User;
	key: string;
};

export type DatabaseDocUpdateData = {
	fileName?: string;
	user: Express.User;
	key: string;
};
