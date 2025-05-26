/**
 * Enum for privacy types
 * @readonly
 * @enum {int}
 */
export const PrivacyType = Object.freeze({
	PRIVATE: 'private',
	READ: 'read',
	WRITE: 'write',
});

/**
 * Enum for error codes
 * @readonly
 * @enum {int}
 */
export const ErrorCode = Object.freeze({
	DB_CONN_ERR: 1,
	HTTP_BAD_REQ: 400,
	HTTP_UNAUTHORIZED: 401,
	HTTP_FORBIDDEN: 403,
	HTTP_NOT_FOUND: 404,
	HTTP_SERVER_ERROR: 500,
});

export const errorWrapper = (message: string) => ({ errors: { message } });

export const cleanMap = (obj: { [x: string]: any }) =>
	Object.keys(obj).forEach(k => (obj[k] === null || obj[k] === undefined) && delete obj[k]);
