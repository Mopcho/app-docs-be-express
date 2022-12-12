import bcrypt from 'bcrypt';
import { saltRounds } from '../config/constants';

export async function validatePassword(
	password: string,
	hash: string,
	salt: number
) {
	try {
		const isValid = await bcrypt.compare(password, hash);
		return isValid;
	} catch (err) {
		return err;
	}
}

export async function generatePassword(password: string) {
	return await bcrypt.hash(password, saltRounds);
}
