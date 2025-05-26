import { NextFunction, Request, Response } from 'express';
import { verify } from 'jsonwebtoken';
import { ErrorCode, errorWrapper } from '../utils/consts';
const config = require('config');

let userAuth = async (req: Request, res: Response, next: NextFunction) => {
	const token = req.header('x-auth-token');

	if (!token) {
		return res.status(ErrorCode.HTTP_UNAUTHORIZED).json(errorWrapper('Token Not Found'));
	}

	try {
		verify(token, config.get('jwtSecret'), (error: any, decoded: any) => {
			if (error) {
				res.status(ErrorCode.HTTP_UNAUTHORIZED).json(errorWrapper('Token is not valid'));
			} else {
				req.user = decoded.user;
				next();
			}
		});
	} catch (err: any) {
		console.error('Token Error ' + err.message);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json(errorWrapper('Server Error'));
	}
};

export default userAuth;
