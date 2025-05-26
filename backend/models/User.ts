import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
	email: {
		type: String,
		required: true,
		tokenization: 'edgeGram',
		minGrams: 3,
	},
	name: {
		type: String,
		required: true,
		tokenization: 'edgeGram',
		minGrams: 3,
	},
	password: {
		type: String,
		required: true,
	},
	userName: {
		type: String,
	},
	emailVerified: {
		type: Boolean,
		default: false,
	},
	myCalendar: {
		type: Schema.Types.ObjectId,
		ref: 'calendar',
	},
	myCalendars: [
		{
			calendar: {
				type: Schema.Types.ObjectId,
				ref: 'calendar',
			},
			color: {
				type: String,
				default: '#0693E3',
			},
			isVisible: {
				type: Boolean,
				default: true,
			},
		},
	],
	fullColoredTasks: {
		type: Boolean,
		default: false,
	},
	myTemplates: [
		{
			templateName: {
				type: String,
				required: true,
			},
			calendars: [
				{
					calendar: {
						type: Schema.Types.ObjectId,
						ref: 'calendar',
					},
					isVisible: {
						type: Boolean,
						default: true,
					},
				},
			],
		},
	],
	avatar: {
		type: String,
	},
	verificationToken: {
		type: String,
	},
	verificationValid: {
		type: Date,
	},
});

/*
 * TODO: Add relevant middleware here to speed up and simplify processes
 * Also look at relevant virtuals!
 */

export default model('user', UserSchema);
