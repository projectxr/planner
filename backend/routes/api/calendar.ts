import { Request, Response, Router } from 'express';
const router = Router();
import Calendar from '../../models/Calendar';
import User from '../../models/User';
import { cleanMap, errorWrapper, ErrorCode } from '../../utils/consts';
import userAuth from '../../middleware/userAuth';
import { Types } from 'mongoose';

// @route       POST api/calendar/create
// @desc        Create/Add a new calendar
// @access      Public
//TODO: SECURE THIS SOMEHOW?
router.post('/create', async (req: Request, res: Response) => {
	try {
		//**********************************Handler Code**********************************/
		let { uid, calendarName } = req.body;
		if (!calendarName) calendarName = 'Simple Calendar';
		let calendar = await Calendar.findOne({ uid });

		if (calendar) {
			return res
				.status(ErrorCode.HTTP_BAD_REQ)
				.json({ errors: { msg: 'Calendar Already Exists' } });
		}

		calendar = new Calendar({
			uid,
			calendarName,
		});

		await calendar.save();
		res.json(calendar);
	} catch (err) {
		console.log('Create Calendar Error' + err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({ errors: { msg: 'Server Error!' } });
	}
});

// @route       POST api/calendar/createPersonal
// @desc        Create/Add a new personal calendar for user
// @access      Private
router.post('/createPersonal', userAuth, async (req: Request, res: Response) => {
	try {
		//**********************************Handler Code**********************************/
		let { uid, calendarName, description, color, isPrivate, settings } = req.body;
		let user;
		if (req.user && req.user.id !== undefined && req.user.id !== null)
			user = await User.findById(Types.ObjectId(req.user.id));
		if (!user) {
			return res.status(ErrorCode.HTTP_NOT_FOUND).json(errorWrapper('User Not Found'));
		}

		if (!calendarName) calendarName = 'Simple Calendar';

		let calendar = await Calendar.findOne({ uid });

		if (calendar) {
			return res
				.status(ErrorCode.HTTP_BAD_REQ)
				.json({ errors: { msg: 'Calendar Already Exists' } });
		}
		calendar = new Calendar({
			uid,
			calendarName,
			description,
			color: color || '#3174ad',
			isPrivate,
			settings,
			owner: user._id,
			collaborators: [
				{
					user: user._id,
					role: 'admin',
					canRead: true,
					canWrite: true,
					canDelete: true,
					canManageUsers: true,
				},
			],
		});
		await calendar.save();
		user.myCalendars.push({ calendar: calendar._id, color: calendar.color });
		await user.save();
		res.json(calendar);
	} catch (err) {
		console.log('Create Personal Calendar Error' + err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({ errors: { msg: 'Server Error!' } });
	}
});

// @route       POST api/caelndar/getData
// @desc        Get Data for a calendar
// @access      Public
router.post('/getData', async (req: Request, res: Response) => {
	try {
		const { uid } = req.body;
		let calendar = await Calendar.findOne({ uid }).select('-_id').populate('users');
		if (!calendar) {
			return res.status(ErrorCode.HTTP_BAD_REQ).json({ errors: { msg: 'Invalid Calendar Id' } });
		}
		res.json(calendar);
	} catch (err) {
		console.log('Get Data Error' + err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({ errors: { msg: 'Server Error!' } });
	}
});

// @route       POST api/calendar/update
// @desc        Update Calendar Data
// @access      Private
router.post('/update', userAuth, async (req: Request, res: Response) => {
	try {
		const { uid, calendarName, description, color, isPrivate, settings } = req.body;

		const updateObject: any = {
			calendarName,
			description,
			color,
			isPrivate,
			settings, // Add the settings object
		};

		cleanMap(updateObject);

		let calendar = await Calendar.findOneAndUpdate(
			{ uid },
			{ $set: { ...updateObject } },
			{
				new: true,
			}
		);
		if (!calendar) {
			return res.status(404).json({ errors: { msg: 'Calendar Not Found!' } });
		}
		return res.json(calendar);
	} catch (err) {
		console.log('Update Calendar Error' + err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({ errors: { msg: 'Server Error!' } });
	}
});

// @route       POST api/calendar/update
// @desc        Update Calendar Data
// @access      Private
router.get('/getusers/:searchString', userAuth, async (req: Request, res: Response) => {
	try {
		const { searchString } = req.params;
		let users = await User.find({
			userName: { $regex: RegExp(searchString, 'i') },
		}).limit(20);
		if (!users || users.length === 0) {
			res.status(ErrorCode.HTTP_BAD_REQ).json({ errors: { msg: 'No users till now!' } });
		}
		return res.json(users.map((user: any) => user.userName));
	} catch (err) {
		console.log('Get Calendar Users Error' + err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({ errors: { msg: 'Server Error!' } });
	}
});

// @route       POST api/calendar/addUser
// @desc        Add User to Calendar
// @access      Private
router.post('/addUser', userAuth, async (req: Request, res: Response) => {
	try {
		let { uid, userName } = req.body;
		let requestUserData;
		if (req.user && req.user.id !== undefined && req.user.id !== null)
			requestUserData = await User.findById(Types.ObjectId(req.user.id));
		if (!requestUserData) {
			return res.status(ErrorCode.HTTP_NOT_FOUND).json(errorWrapper('User Not Found'));
		} else {
			//we could return for permission not enough by performing permission check, but make function for that
		}
		let user = await User.findOne({ userName });
		let calendar = await Calendar.findOne({ uid });

		if (!calendar) {
			return res
				.status(ErrorCode.HTTP_NOT_FOUND)
				.json({ errors: { msg: "Calendar Doesn't Exist" } });
		} else if (!user) {
			return res.status(ErrorCode.HTTP_NOT_FOUND).json({ errors: { msg: "User Doesn't Exist" } });
		} else if (
			calendar.users.findIndex((userObj: any) => userObj.user == user._id.toString()) !== -1
		) {
			return res
				.status(ErrorCode.HTTP_BAD_REQ)
				.json({ errors: { msg: 'User Already Has Access' } });
		}
		const userIndex = calendar.users.length;
		calendar.users.push({
			user: user._id,
			hasReadAccess: true,
			hasWriteAccess: true,
		});
		await calendar.save();
		user.myCalendars.push({ calendar: calendar._id });
		await user.save();
		res.json(calendar.users[userIndex]);
	} catch (err) {
		console.log('Add Calendar User Error' + err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({ errors: { msg: 'Server Error!' } });
	}
});

export default router;
