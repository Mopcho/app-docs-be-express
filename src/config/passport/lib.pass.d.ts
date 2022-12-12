import { Prisma, User } from '@prisma/client';

export type UsersWithRoles = Prisma.UserGetPayload<{
    include: { Roles: true };
}>;

declare global {
    namespace Express {
        interface User extends UsersWithRoles {
            id: string;
        }
    }
}

export {};
