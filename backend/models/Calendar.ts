import { Sequelize, STRING, DATE, BOOLEAN, ARRAY, INTEGER, TEXT } from 'sequelize';
import { Schema, model } from 'mongoose';
import { PrivacyType } from '../utils/consts';

// Event Database Model (Sequelize/PostgreSQL)
let EventDB: any;

const EventData = (sequelize: Sequelize) => {
	EventDB = sequelize.define(
		'events',
		{
			// Core Fields
			id: {
				type: STRING,
				primaryKey: true,
			},
			uid: {
				type: STRING,
				allowNull: false,
				comment: 'Calendar UID this event belongs to',
			},
			title: {
				type: STRING,
				allowNull: false,
			},

			// Content (MDX)
			content: {
				type: TEXT,
				allowNull: true,
				comment: 'MDX content for rich text and components',
			},
			description: {
				type: TEXT,
				allowNull: true,
				comment: 'Plain text summary/description',
			},

			// Scheduling
			resourceId: {
				type: STRING,
				allowNull: true,
				comment: 'Resource/calendar resource ID',
			},
			start: {
				type: DATE,
				allowNull: true,
			},
			end: {
				type: DATE,
				allowNull: true,
			},
			isAllDay: {
				type: BOOLEAN,
				defaultValue: false,
				allowNull: false,
			},

			// Hierarchy
			parentId: {
				type: STRING,
				allowNull: true,
				references: {
					model: 'events',
					key: 'id',
				},
			},
			hierarchyLevel: {
				type: INTEGER,
				defaultValue: 0,
				comment: '0 = root, 1 = subtask, 2 = sub-subtask (max 3 levels)',
			},
			hierarchyPath: {
				type: STRING,
				allowNull: true,
				comment: 'Materialized path for efficient querying',
			},
			sortOrder: {
				type: INTEGER,
				defaultValue: 0,
			},

			// Task Management
			status: {
				type: STRING,
				defaultValue: 'todo',
				validate: {
					isIn: [['todo', 'in_progress', 'review', 'done', 'cancelled']],
				},
			},
			priority: {
				type: STRING,
				defaultValue: 'medium',
				validate: {
					isIn: [['low', 'medium', 'high', 'urgent']],
				},
			},
			progressPercentage: {
				type: INTEGER,
				defaultValue: 0,
				validate: { min: 0, max: 100 },
			},

			// Time Tracking
			estimatedHours: {
				type: INTEGER,
				allowNull: true,
			},
			actualHours: {
				type: INTEGER,
				allowNull: true,
			},

			// Dependencies
			dependsOn: {
				type: ARRAY(STRING),
				defaultValue: [],
				comment: 'Task IDs this depends on',
			},
			blocks: {
				type: ARRAY(STRING),
				defaultValue: [],
				comment: 'Task IDs this blocks',
			},

			// Assignment & Collaboration
			assignee: {
				type: ARRAY(STRING),
				defaultValue: [],
			},
			tags: {
				type: ARRAY(STRING),
				defaultValue: [],
			},

			// Metadata
			createdBy: {
				type: STRING,
				allowNull: true,
			},
			updatedBy: {
				type: STRING,
				allowNull: true,
			},
			archived: {
				type: BOOLEAN,
				defaultValue: false,
			},
			archivedAt: {
				type: DATE,
				allowNull: true,
			},
		},
		{
			timestamps: true,
			underscored: true, // Use snake_case for DB columns
			freezeTableName: true,
			tableName: 'events',

			indexes: [
				{ fields: ['uid', 'parent_id'] },
				{ fields: ['hierarchy_path'] },
				{ fields: ['status', 'priority'] },
				{ fields: ['assignee'], using: 'gin' },
				{ fields: ['depends_on'], using: 'gin' },
				{ fields: ['start', 'end'] },
				{ fields: ['archived'] },
			],

			hooks: {
				beforeCreate: async (event: any) => {
					await updateHierarchyPath(event);
				},

				beforeUpdate: async (event: any) => {
					// Update hierarchy if parent changed
					if (event.changed('parentId')) {
						await updateHierarchyPath(event);
					}

					// Auto-update progress and status
					if (event.changed('status') && event.status === 'done') {
						event.progressPercentage = 100;
					} else if (event.changed('progressPercentage') && event.progressPercentage === 100) {
						event.status = 'done';
					}
				},
			},
		}
	);

	// Associations
	EventDB.hasMany(EventDB, {
		as: 'subtasks',
		foreignKey: 'parentId',
		onDelete: 'CASCADE',
	});

	EventDB.belongsTo(EventDB, {
		as: 'parent',
		foreignKey: 'parentId',
	});

	return EventDB;
};

// Helper function to update hierarchy path
async function updateHierarchyPath(event: any): Promise<void> {
	if (event.parentId) {
		const parent = await EventDB.findByPk(event.parentId);
		if (parent) {
			event.hierarchyLevel = (parent.hierarchyLevel || 0) + 1;
			event.hierarchyPath = parent.hierarchyPath
				? `${parent.hierarchyPath}/${event.id}`
				: `${parent.id}/${event.id}`;

			// Enforce max hierarchy depth
			if (event.hierarchyLevel > 3) {
				throw new Error('Maximum hierarchy depth (3 levels) exceeded');
			}
		}
	} else {
		event.hierarchyLevel = 0;
		event.hierarchyPath = event.id;
	}
}

// Calendar Model (MongoDB)
const CalendarSchema = new Schema(
	{
		uid: {
			type: String,
			required: true,
			unique: true,
		},
		calendarName: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			default: '',
		},
		owner: {
			type: Schema.Types.ObjectId,
			ref: 'user',
			required: true,
		},

		// Privacy & Access
		isPrivate: {
			type: Boolean,
			default: false,
		},
		privacyType: {
			type: String,
			enum: Object.values(PrivacyType),
			default: PrivacyType.WRITE,
		},
		collaborators: [
			{
				user: {
					type: Schema.Types.ObjectId,
					ref: 'user',
				},
				role: {
					type: String,
					enum: ['viewer', 'editor', 'admin'],
					default: 'viewer',
				},
				canRead: { type: Boolean, default: true },
				canWrite: { type: Boolean, default: false },
				canDelete: { type: Boolean, default: false },
				canManageUsers: { type: Boolean, default: false },
			},
		],

		// Calendar Settings
		settings: {
			// Task Defaults
			defaultPriority: {
				type: String,
				default: 'medium',
				enum: ['low', 'medium', 'high', 'urgent'],
			},
			defaultStatus: {
				type: String,
				default: 'todo',
				enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'],
			},

			// Hierarchy Settings
			allowSubtasks: { type: Boolean, default: true },
			maxHierarchyLevel: { type: Number, default: 3, max: 5 },
			autoProgressFromSubtasks: { type: Boolean, default: true },

			// Display Settings
			defaultView: {
				type: String,
				default: 'month',
				enum: ['day', 'week', 'month', 'agenda', 'hierarchy'],
			},
			workingHours: {
				start: { type: String, default: '09:00' },
				end: { type: String, default: '17:00' },
			},
			timezone: { type: String, default: 'UTC' },

			// Features
			enableTimeTracking: { type: Boolean, default: true },
			enableDependencies: { type: Boolean, default: true },
			enableRecurrence: { type: Boolean, default: true },
		},

		// Metadata
		color: {
			type: String,
			default: '#3174ad',
			validate: {
				validator: (v: string) => /^#[0-9A-F]{6}$/i.test(v),
				message: 'Color must be a valid hex color code',
			},
		},
		archived: { type: Boolean, default: false },
		archivedAt: { type: Date },
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// Indexes
CalendarSchema.index({ owner: 1, archived: 1 });
CalendarSchema.index({ 'collaborators.user': 1 });
CalendarSchema.index({ uid: 1 }, { unique: true });

// Virtual for checking if user has access
CalendarSchema.virtual('userAccess').get(function (this: any) {
	return (userId: string) => {
		if (this.owner.toString() === userId) {
			return {
				canRead: true,
				canWrite: true,
				canDelete: true,
				canManageUsers: true,
				role: 'owner',
			};
		}

		const collaborator = this.collaborators.find((c: any) => c.user.toString() === userId);
		return (
			collaborator || {
				canRead: false,
				canWrite: false,
				canDelete: false,
				canManageUsers: false,
				role: null,
			}
		);
	};
});

// Types for frontend
export interface EventData {
	id: string;
	uid: string;
	title: string;
	content?: string; // MDX content
	description?: string;
	resourceId?: string;
	start?: Date;
	end?: Date;
	isAllDay: boolean;
	parentId?: string;
	hierarchyLevel: number;
	sortOrder: number;
	status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
	priority: 'low' | 'medium' | 'high' | 'urgent';
	progressPercentage: number;
	estimatedHours?: number;
	actualHours?: number;
	dependsOn: string[];
	blocks: string[];
	assignee: string[];
	tags: string[];
	archived: boolean;

	// Computed fields
	isDone: boolean;
	hasSubtasks: boolean;
	completedSubtasks: number;
	totalSubtasks: number;
	canHaveSubtasks: boolean;
	isSubtask: boolean;
}

export interface CalendarData {
	id: string;
	uid: string;
	calendarName: string;
	description: string;
	color: string;
	isPrivate: boolean;
	settings: {
		defaultPriority: string;
		defaultStatus: string;
		allowSubtasks: boolean;
		maxHierarchyLevel: number;
		autoProgressFromSubtasks: boolean;
		defaultView: string;
		workingHours: { start: string; end: string };
		timezone: string;
		enableTimeTracking: boolean;
		enableDependencies: boolean;
		enableRecurrence: boolean;
	};
}

export { EventDB, EventData };
export default model('calendar', CalendarSchema);
