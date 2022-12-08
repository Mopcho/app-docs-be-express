import { expressjwt as jwt } from 'express-jwt';
import jwks from 'jwks-rsa';
import jwtPermissions from 'express-jwt-permissions';

export var jwtCheck = jwt({
	//@ts-ignore
	secret: jwks.expressJwtSecret({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
	}),
	audience: process.env.API_AUDIENCE,
	issuer: process.env.ISSUER,
	algorithms: ['RS256'],
});

export var roleGuard = jwtPermissions({
	requestProperty: 'auth',
	permissionsProperty: 'roles/roles',
});

export var permissionGuard = jwtPermissions({
	requestProperty: 'auth',
	permissionsProperty: 'access',
});

/* 
function (user, context, callback) {
  const namespace = 'http://demozero.net';
  const assignedRoles = (context.authorization || {}).roles;

  let idTokenClaims = context.idToken || {};
  let accessTokenClaims = context.accessToken || {};

  idTokenClaims[`${namespace}/roles`] = assignedRoles;
  accessTokenClaims[`${namespace}/roles`] = assignedRoles;

  context.idToken = idTokenClaims;
  context.accessToken = accessTokenClaims;

  callback(null, user, context);
}
*/
