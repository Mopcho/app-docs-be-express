import { HttpStatusCode } from "../interfaces/errors";
import { Response } from "express";

export class BaseError extends Error {
    public readonly name: string;
    public readonly httpCode: HttpStatusCode;
    public readonly isOperational: boolean;
    constructor(
        name: string,
        description: string,
        httpCode: HttpStatusCode,
        isOperational: boolean = true,
    ) {
        super(description);
        Object.setPrototypeOf(this, new.target.prototype);

        this.name = name;
        this.httpCode = httpCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this);
    }
}

export class ApiError extends BaseError {
    constructor(name:string,description:string = 'Internal Server Error', httpCode:HttpStatusCode = HttpStatusCode.INTERNAL_SERVER, isOperational: boolean = true) {
        super(name,description, httpCode,isOperational);
    } 
}

export class ErrorHandler {
    public async handleError(err: BaseError,res: Response): Promise<void> {
        console.error(err);
        res.status(err.httpCode).json({ ...err, message: err.message });
    }

    public isTrustedError(error: Error) {
        if (error instanceof BaseError) {
            return error.isOperational;
        }
        return false;
    }
}

export const errorHandler = new ErrorHandler();
