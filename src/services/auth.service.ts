import { PrismaClient, Prisma } from '@prisma/client';
import { HttpStatusCode } from '../interfaces/errors';
import { ApiError } from '../utils/errors';
import { generatePassword } from '../utils/passwordUtils';

const prisma = new PrismaClient();

async function register(user: Prisma.UserCreateInput) {
    try {
        user.password.trim();
        user.email.trim();
        if(user.password.length < 8) {
            throw new ApiError('Password too weak', 'Your password must be at least 8 characters long', HttpStatusCode.BAD_REQUEST);
        }

        const hash = await generatePassword(user.password);
        user.password = hash;

        const userCheck = await prisma.user.findUnique({
            where : {
                email: user.email
            }
        });

        if(userCheck) {
            throw new ApiError('User exists', 'User with this email already exists', HttpStatusCode.CONFLICT);
        }

        const response = await prisma.user.create({
            data: {
                ...user,
                Roles : {
                    connectOrCreate: {
                        where : {
                            title: 'User'
                        },
                        create: {
                            title: 'User'
                        }
                    }
                }
            },
        });

        return response;
    } catch (err) {
        throw err;
    }
}

async function me(user: Express.User) {
    try {
        const {email, id, username} = user;
        return {
            email, id, username
        }
        
    } catch (err) {
        throw err;
    }
}

export default { register,me };
