import Joi from 'joi';

const validator = (schema: any) => (payload: any) =>
	schema.validate(payload, { abortEarly: false });

const userCreateSchema = Joi.object({
	username: Joi.string().required(),
	email: Joi.string().required().email(),
	email_verified: Joi.bool(),
});

const userUpdateSchema = Joi.object({
	username: Joi.string(),
	email: Joi.string().email(),
	email_verified: Joi.bool().falsy(),
	seededUser: Joi.bool(),
	profileImageKey: Joi.string(),
});

export const validateUserCreate = validator(userCreateSchema);
export const validateUserUpdate = validator(userUpdateSchema);