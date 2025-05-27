import { Request, Response, Router } from 'express';
import { check, validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../../models/User';
import { sign } from 'jsonwebtoken';
import { compare, genSalt, hash } from 'bcryptjs';
import userAuth from '../../middleware/userAuth';
import { Types } from 'mongoose';
import sendMail from '../../utils/mail/sendMail';
import { confirm, forgot } from '../../utils/mail/templateMail';
import { cleanMap, ErrorCode, errorWrapper } from '../../utils/consts';
import { nanoid } from 'nanoid';
import Calendar from '../../models/Calendar';
const config = require('config');
const router = Router();

// @route       POST api/user/register
// @desc        Create/Add a new user
// @access      Public
router.post(
	'/register',
	//**********************************Validations**********************************/
	[
		check('name', 'Name is required').not().isEmpty(),

		check('email', 'Please input valid email').isEmail(),

		check('password', 'Please enter a password with 6 or more characters').isLength({
			min: 6,
		}),
	],
	async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			console.log(errors);
			return res.status(ErrorCode.HTTP_BAD_REQ).json({ errors: errors.array() });
		}

		try {
			//**********************************Handler Code**********************************/
			const { email, name, password, userName, uid: requestedCalendarUid } = req.body;

			let existingUser = await User.findOne({ email });
			if (existingUser) {
				return res.status(ErrorCode.HTTP_BAD_REQ).json(errorWrapper('User Already Exists'));
			}

			const salt = await genSalt(10);
			const hashedPassword = await hash(password, salt);
			const avatar = config.get('avatarBaseURI') + name.replace(' ', '+');
			const verificationToken = crypto.randomBytes(128).toString('hex');

			// Create User first to get user._id
			let newUser = new User({
				name,
				email,
				password: hashedPassword,
				avatar,
				verificationToken,
				userName,
				verificationValid: Date.now() + 43200000,
			});
			await newUser.save();
			const userId = newUser._id;

			let calendarToUse: any;
			let finalCalendarUid: string;

			if (requestedCalendarUid) {
				const potentialCalendar = await Calendar.findOne({ uid: requestedCalendarUid });
				if (potentialCalendar && !potentialCalendar.owner) {
					// Claim existing unowned calendar
					potentialCalendar.owner = userId;
					potentialCalendar.collaborators.push({
						user: userId,
						role: 'admin', // Or 'owner' if you add it to the enum
						canRead: true,
						canWrite: true,
						canDelete: true,
						canManageUsers: true,
					});
					calendarToUse = potentialCalendar;
					finalCalendarUid = potentialCalendar.uid;
				}
			}

			if (!calendarToUse) {
				let newGeneratedUid = nanoid();
				let calendarWithGeneratedUid = await Calendar.findOne({ uid: newGeneratedUid });
				while (calendarWithGeneratedUid) {
					newGeneratedUid = nanoid();
					calendarWithGeneratedUid = await Calendar.findOne({ uid: newGeneratedUid });
				}
				calendarToUse = new Calendar({
					uid: newGeneratedUid,
					calendarName: 'Simple Calendar',
					owner: userId,
					collaborators: [
						{
							user: userId,
							role: 'admin', // Or 'owner' if you add it to the enum
							canRead: true,
							canWrite: true,
							canDelete: true,
							canManageUsers: true,
						},
					],
				});
				finalCalendarUid = newGeneratedUid;
			}

			await calendarToUse.save();

			// Update user with calendar reference
			newUser.myCalendar = calendarToUse._id;
			newUser.myCalendars = [
				{
					calendar: calendarToUse._id,
					color: '#0693E3', // Default color from UserSchema
					isVisible: true, // Default visibility from UserSchema
				},
			];
			await newUser.save();

			sendMail(email, confirm(verificationToken));
			const payload = {
				user: {
					id: userId,
					verified: false,
				},
			};

			sign(payload, config.get('jwtSecret'), { expiresIn: '30 days' }, (err, token) => {
				if (err) throw err;
				res.json({ token, uid: finalCalendarUid });
			});
		} catch (err) {
			console.error(`Err register:`, err);
			res.status(ErrorCode.HTTP_SERVER_ERROR).json(errorWrapper('Server Error'));
		}
	}
);

// @route       POST api/user/login
// @desc        Login/ Get auth token
// @access      Public
router.post(
	'/login',
	//**********************************Validations**********************************/
	[
		check('email', 'Please input valid email').isEmail(),
		check('password', 'Password is required').exists(),
	],

	async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(ErrorCode.HTTP_BAD_REQ).json(errorWrapper(errors.array().toString()));
		}

		//**********************************Handler Code**********************************/

		try {
			const { email, password } = req.body;
			let user = await User.findOne({ email });

			if (!user) {
				return res.status(ErrorCode.HTTP_BAD_REQ).json(errorWrapper('Invalid Credentials'));
			}

			const cresentialCheck = await compare(password, user.password);
			if (!cresentialCheck) {
				return res.status(ErrorCode.HTTP_BAD_REQ).json(errorWrapper('Invalid Credentials'));
			}
			const payload = {
				user: {
					id: user.id,
				},
			};
			sign(payload, config.get('jwtSecret'), { expiresIn: '30 days' }, (err, token) => {
				if (err) throw err;
				res.json({ token, emailVerified: user?.emailVerified });
			});
		} catch (err) {
			console.log('Login error' + err);
			res.status(ErrorCode.HTTP_SERVER_ERROR).json(errorWrapper('Server Error'));
		}
	}
);

// @route       POST api/user/forgot
// @desc        Forgot password mail trigger
// @access      Public
router.post(
	'/forgot',
	//**********************************Validations**********************************/
	[check('email', 'Please input valid email').isEmail()],

	async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(ErrorCode.HTTP_BAD_REQ).json(errorWrapper(errors.array.toString()));
		}

		//**********************************Handler Code**********************************/
		try {
			const { email } = req.body;
			let user = await User.findOne({ email });
			if (!user) {
				return res.status(ErrorCode.HTTP_BAD_REQ).json(errorWrapper('Email Not Found'));
			}
			const verificationToken = crypto.randomBytes(128).toString('hex');
			user.verificationToken = verificationToken;
			await sendMail(email, forgot(verificationToken));
			await user.save();
			res.json({ success: 'Email Sent!' });
		} catch (err) {
			console.log('Forgot mail error' + err);
			res.status(ErrorCode.HTTP_SERVER_ERROR).json(errorWrapper('Server Error'));
		}
	}
);

// @route       GET api/user/confirm/:verificationToken
// @desc        Confirmation for verification and reset password
// @access      Public
router.get('/confirm/:verificationToken', async (req: Request, res: Response) => {
	try {
		const { verificationToken } = req.params;
		let user = await User.findOne({ verificationToken });

		if (!user) {
			return res.status(ErrorCode.HTTP_BAD_REQ).json(errorWrapper('Token Invalid'));
		}

		user.verificationToken = '';
		user.emailVerified = true;
		await user.save();
		return res.json({ emailVerification: !user.emailVerified });
	} catch (err) {
		console.log('Confirm Mail Error' + err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json(errorWrapper('Server Error'));
	}
});

// @route       GET api/user/
// @desc        Get user details
// @access      Private
router.get('/', userAuth, async (req: Request, res: Response) => {
	try {
		let user: any;
		if (req.user && req.user.id !== undefined && req.user.id !== null)
			user = await User.findById(new Types.ObjectId(req.user.id)).populate(
				'myCalendar myCalendars.calendar'
			);
		if (Object.keys(user).length === 0) {
			return res.status(ErrorCode.HTTP_NOT_FOUND).json(errorWrapper('User Not Found'));
		}
		res.json(user);
	} catch (err) {
		console.log('Load User' + err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json(errorWrapper('Server Error'));
	}
});

// @route       POST api/user/
// @desc        POST user details
// @access      Private
router.post('/getData', userAuth, async (req: Request, res: Response) => {
	try {
		const { users } = req.body;
		let user: any;
		if (req.user && req.user.id !== undefined && req.user.id !== null)
			user = await User.findById(new Types.ObjectId(req.user.id));
		if (Object.keys(user).length === 0) {
			return res.status(ErrorCode.HTTP_NOT_FOUND).json(errorWrapper('User Not Found'));
		}
		let userObjectIds = users.map((userId: string) => new Types.ObjectId(userId));
		const userData = await User.find({
			_id: {
				$in: userObjectIds,
			},
		}).select('avatar name');
		res.json(userData);
	} catch (err) {
		console.log('Get Data Error' + err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json(errorWrapper('Server Error'));
	}
});

// @route       POST api/user/update
// @desc        Update user details
// @access      Private
router.post('/update', userAuth, async (req: Request, res: Response) => {
	try {
		const { name, myCalendar, avatar, myCalendars, fullColoredTasks, userName } = req.body;
		let updateObject = {
			name,
			myCalendar,
			avatar,
			myCalendars,
			fullColoredTasks,
			userName,
		};
		cleanMap(updateObject);
		if (updateObject.name) {
			updateObject.avatar = config.get('avatarBaseURI') + name.replace(' ', '+');
		}
		let user: any;
		if (req.user && req.user.id !== undefined && req.user.id !== null)
			user = await User.findByIdAndUpdate(
				new Types.ObjectId(req.user.id),
				{
					$set: {
						...updateObject,
					},
				},
				{ new: true }
			);
		if (!user) {
			return res.status(ErrorCode.HTTP_NOT_FOUND).json(errorWrapper('User Not Found'));
		}
		res.json(user);
	} catch (err) {
		console.log('Update User Error' + err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json(errorWrapper('Server Error'));
	}
});

export default router;
