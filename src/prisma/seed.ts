import { deleteUser, registerUser } from '../services/auth-0';
import prisma from '../prisma/index';

async function seed(): Promise<void> {
	try {
		// User 1
		let userData1 = {
			email: 'valeri_petkov01@abv.bg',
			username: 'ValeriPow',
			password: '12345678',
			nickname: 'Mopcho',
		};

		let user1Auth = await registerUser(userData1);

		const user1 = await prisma.user.create({
			data: {
				email_verified: user1Auth.email_verified,
				email: user1Auth.email,
				auth0Id: user1Auth._id,
				seededUser: true,
			},
		});

		console.log('Registered user 1!');

		// User 2
		let userData2 = {
			email: 'admin@abv.bg',
			username: 'admin',
			password: '12345678',
		};

		let user2Auth = await registerUser(userData2);

		const user2 = await prisma.user.create({
			data: {
				email_verified: user2Auth.email_verified,
				email: user2Auth.email,
				auth0Id: user2Auth._id,
				seededUser: true,
			},
		});

		console.log('Registered user 2!');

		// User 3
		let userData3 = {
			email: 'user_123@abv.bg',
			username: 'user',
			password: '12345678',
		};

		let user3Auth = await registerUser(userData3);

		const user3 = await prisma.user.create({
			data: {
				email_verified: user3Auth.email_verified,
				email: user3Auth.email,
				auth0Id: user3Auth._id,
				seededUser: true,
			},
		});

		console.log('Registered user 3!');
	} catch (err: any) {
		console.log(err);
	}
}

async function clearDB() {
	try {
		//Delete seeded users from Auth0
		let seededUsers = await prisma.user.findMany({
			where: {
				seededUser: true,
			},
			select: {
				auth0Id: true,
			},
		});

		let seededIds: (string | undefined)[] = seededUsers.map((user) => {
			if (user.auth0Id && user.auth0Id != undefined) {
				return user.auth0Id;
			}
		});

		// @ts-ignore
		await Promise.all(seededIds.map((id) => deleteUser(id)));

		//Delete seeded users from our DB
		await prisma.user.deleteMany({
			where: {
				seededUser: true,
			},
		});

		Promise.all([seededUsers]);
	} catch (err) {
		console.log(err);
	}
}

async function clearAndSeedDB() {
	try {
		// Delete...
		console.log('Deleting...');
		await clearDB();
		console.log('Deleting Complete!');

		// Seed...
		console.log('Seeding...');
		await seed();
		console.log('Seeding Finished!');

		// Disconnect
		await prisma.$disconnect();
	} catch (err) {
		console.error(err);
		await prisma.$disconnect();
		process.exit(1);
	}
}

clearAndSeedDB();
