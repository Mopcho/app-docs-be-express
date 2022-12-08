import Joi, { ObjectSchema } from 'joi';

const validator = (schema: ObjectSchema) => (payload: any) =>
	schema.validate(payload, { abortEarly: false });

// *** Create Schemas ***
const documentCreateSchema = Joi.object({
	fileName: Joi.string().required(),
	extName: Joi.string().required(),
	auth0Id: Joi.string().required(),
	key: Joi.string().required(),
});

const documentUpdateSchema = Joi.object({
	fileName: Joi.string(),
	auth: Joi.object().required(),
	key: Joi.string().required(),
});

// *** Validator functions ***

// Create
export const validateDocumentCreateData = validator(documentCreateSchema);
export const validateDocumentUpdateData = validator(documentUpdateSchema);
