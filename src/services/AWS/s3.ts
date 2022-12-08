import S3, { GetObjectRequest, PutObjectRequest } from 'aws-sdk/clients/s3';
import mime from 'mime-types';

const bucketName = process.env.AWS_BUCKET_NAME || 'Undefined';
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new S3({
	region,
	accessKeyId,
	secretAccessKey,
});

const root = `AWS : Bucket Name : ${bucketName}`;

// Returns a signed signature and keyname
export async function generateUploadSignature(
	extName: string,
	fileName: string
) {
	if (!bucketName) {
		throw new Error('Not Found Error');
	}

	// Set ContentType based on extName
	let contentType = mime.lookup(extName);

	if (contentType === false) {
		throw new Error('Invalid mime type!');
	}

	const key = `${fileName}_${Math.ceil(Math.random() * 10 ** 10)}.${extName}`;

	const uploadParams: PutObjectRequest = {
		Bucket: bucketName,
		Key: key,
		//@ts-ignore
		Expires: 60,
		ContentType: contentType,
	};

	const signedUrl = await s3.getSignedUrlPromise('putObject', uploadParams);

	return {
		key,
		signedUrl,
	};
}

// Returns a signed signature
export async function generateGetSignature(key: string) {
	try {
		if (!bucketName) {
			throw new Error('Not Found Error');
		}

		const uploadParams: GetObjectRequest = {
			Bucket: bucketName,
			Key: key,
			//@ts-ignore
			Expires: 60,
		};

		const signedUrl = await s3.getSignedUrlPromise(
			'getObject',
			uploadParams
		);

		return signedUrl;
	} catch (err) {
		console.log(`Error in ${module} : generateGetSignature`);
		console.log(err);
	}
}

export async function deleteObject(key: string) {
	try {
		let params: S3.DeleteObjectRequest = { Bucket: bucketName, Key: key };

		let result = await new Promise((resolve, reject) => {
			s3.deleteObject(params, (err, data) => {
				if (err) {
					reject(err);
				}

				resolve(data);
			});
		});

		return result;
	} catch (err) {
		console.log(`Error in ${root} : generateGetSignature`);
		console.log(err);
	}
}

export async function generateEditSignature(
	key: string,
	fileName: string, // TODO : Find a way to change it's name too. (Probably not possible with presigned urls)
	extName: string
) {
	try {
		// Set ContentType based on extName
		let contentType = mime.lookup(extName);

		if (contentType === false) {
			throw new Error('Invalid mime type!');
		}

		let params: S3.PutObjectRequest = {
			Bucket: bucketName,
			Key: key,
			ContentType: contentType,
		};

		const signedUrl = await s3.getSignedUrlPromise('putObject', params);

		return signedUrl;
	} catch (err) {
		console.log(`Error in ${root} : generateGetSignature`);
		console.log(err);
	}
}
