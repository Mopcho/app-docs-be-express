import Joi, { ObjectSchema } from 'joi';

const validator = (schema: ObjectSchema) => (payload: any) =>
	schema.validate(payload, { abortEarly: false });

// *** Create Schemas ***
const documentCreateSchema = Joi.object({
	fileName: Joi.string().required(),
	extName: Joi.string().required(),
	key: Joi.string().required(),
	user: Joi.object({
		Roles: Joi.array().required(),
		id: Joi.string().required()
	}).required().unknown()
});

const documentUpdateSchema = Joi.object({
	fileName: Joi.string(),
	key: Joi.string().required(),
	user: Joi.object({
		Roles: Joi.array().required(),
		id: Joi.string().required()
	}).required().unknown()
});

// *** Validator functions ***

// Create
export const validateDocumentCreateData = validator(documentCreateSchema);
export const validateDocumentUpdateData = validator(documentUpdateSchema);
