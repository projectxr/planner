import { NextFunction, Request, Response } from 'express';

let calendarUserAuth = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	next();
	return;
};

export default calendarUserAuth;
