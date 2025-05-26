import { Request, Response, Router } from 'express';
import { EventDB } from '../../models/Calendar';
import calendarUserAuth from '../../middleware/calendarUserAuth';
import userAuth from '../../middleware/userAuth';
import { ErrorCode } from '../../utils/consts';
import User from '../../models/User';
import { Types } from 'mongoose';
import { Op } from 'sequelize';

const router = Router();

// Helper function to transform event data for client
const transformEventForClient = (event: any) => {
	const eventData = event.toJSON ? event.toJSON() : event;

	return {
		...eventData,
		// Computed fields
		isDone: eventData.status === 'done',
		hasSubtasks: eventData.subtasks?.length > 0,
		completedSubtasks: eventData.subtasks?.filter((sub: any) => sub.status === 'done').length || 0,
		totalSubtasks: eventData.subtasks?.length || 0,
		canHaveSubtasks: eventData.hierarchyLevel < 3,
		isSubtask: !!eventData.parentId,
		isAllDay:
			eventData.isAllDay ||
			(eventData.end &&
				eventData.start &&
				new Date(eventData.end).getTime() - new Date(eventData.start).getTime() >= 86400000),
	};
};

// @route   GET /api/events/agenda
// @desc    Get agenda view with current/next tasks
// @access  Private
router.get('/agenda', userAuth, async (req: Request, res: Response) => {
	try {
		// Get user's calendars
		const user = await User.findById(new Types.ObjectId(req.user!.id)).populate(
			'myCalendars.calendar'
		);
		if (!user) {
			return res.status(ErrorCode.HTTP_UNAUTHORIZED).json({
				errors: { msg: 'User not found' },
			});
		}

		const calendarUids = user.myCalendars.map((cal: any) => cal.calendar.uid);

		// Get active events with hierarchy
		const events = await EventDB.findAll({
			where: {
				status: { [Op.not]: 'done' },
				archived: false,
				uid: { [Op.in]: calendarUids },
			},
			include: [
				{
					model: EventDB,
					as: 'subtasks',
					required: false,
					where: { archived: false },
				},
				{
					model: EventDB,
					as: 'parent',
					required: false,
				},
			],
			order: [
				['hierarchyLevel', 'ASC'],
				['sortOrder', 'ASC'],
				['start', 'ASC'],
			],
		});

		const processedEvents = events.map(transformEventForClient);

		// Get time-scheduled tasks for agenda logic
		const timeScheduledTasks = processedEvents.filter(
			(event: any) => event.start && event.end && !event.isAllDay
		);

		// Determine current and next tasks
		const now = Date.now();
		let currentTasks: any[] = [];
		let nextTask = null;
		let currentTaskOngoing = false;

		for (let i = 0; i < timeScheduledTasks.length; i++) {
			const task = timeScheduledTasks[i];
			const startTime = new Date(task.start).getTime();
			const endTime = new Date(task.end).getTime();

			// Current task
			if (now >= startTime && now < endTime) {
				currentTaskOngoing = true;
				currentTasks.push(task);
				nextTask = timeScheduledTasks[i + 1] || null;
			}

			// Next task (when no current task)
			if (!currentTaskOngoing && startTime > now) {
				nextTask = task;
				break;
			}
		}

		// Status flags
		const isBacklog = timeScheduledTasks.length > 0 && timeScheduledTasks[0].start > now;
		const isFuture =
			timeScheduledTasks.length > 0 && timeScheduledTasks[timeScheduledTasks.length - 1].end < now;

		res.json({
			events: processedEvents,
			timeScheduledTasks,
			currentTaskOngoing,
			currentTasks,
			nextTask,
			isBacklog,
			isFuture,
		});
	} catch (err) {
		console.error('Get Agenda Error:', err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({
			errors: { msg: 'Failed to fetch agenda' },
		});
	}
});

// @route   GET /api/events/:uid
// @desc    Get all events for a calendar
// @access  Private
router.get('/:uid', calendarUserAuth, async (req: Request, res: Response) => {
	try {
		const { uid } = req.params;
		const {
			includeArchived = 'false',
			hierarchyOnly = 'false',
			status,
			priority,
			assignee,
			scheduled, // New query parameter
		} = req.query;

		// Build where clause
		const whereClause: any = { uid };

		if (includeArchived !== 'true') {
			whereClause.archived = false;
		}

		// Handle the 'scheduled' query parameter
		if (scheduled === 'true') {
			whereClause.start = { [Op.ne]: null }; // start IS NOT NULL
		} else if (scheduled === 'false') {
			whereClause.start = { [Op.is]: null }; // start IS NULL
			// If fetching unscheduled, typically status might be 'todo' or 'in_progress'
			// This can be combined with existing status filters if provided
			if (status) {
				// If status is a string, convert to array if multiple statuses are supported by query (e.g. status=todo,in_progress)
				// For now, assuming status is a single value or an array if client sends it like that
				whereClause.status = status;
			} else {
				// Default statuses for unscheduled items if not specified
				whereClause.status = { [Op.in]: ['todo', 'in_progress'] };
			}
		} else {
			// If 'scheduled' is not provided, and a specific status is, use it.
			// Otherwise, no specific filter on start/end based on 'scheduled' param.
			if (status) {
				whereClause.status = status;
			}
		}

		if (priority) {
			whereClause.priority = priority;
		}

		if (assignee) {
			whereClause.assignee = { [Op.contains]: [assignee] };
		}

		// Get events with relationships
		const events = await EventDB.findAll({
			where: whereClause,
			include: [
				{
					model: EventDB,
					as: 'subtasks',
					required: false,
					where: includeArchived === 'true' ? {} : { archived: false },
					include: [
						{
							model: EventDB,
							as: 'subtasks',
							required: false,
						},
					],
				},
				{
					model: EventDB,
					as: 'parent',
					required: false,
				},
			],
			order: [
				['hierarchyLevel', 'ASC'],
				['sortOrder', 'ASC'],
				['start', 'ASC'], // Keep sorting by start, NULLs will be handled by DB default (usually first or last)
				[{ model: EventDB, as: 'subtasks' }, 'sortOrder', 'ASC'],
			],
		});

		const transformedEvents = events.map(transformEventForClient);

		if (hierarchyOnly === 'true') {
			// Return only root tasks with nested structure
			const rootTasks = transformedEvents.filter((event: any) => !event.parentId);
			res.json(rootTasks);
		} else {
			// Return flat list
			res.json(transformedEvents);
		}
	} catch (err) {
		console.error('Get Events Error:', err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({
			errors: { msg: 'Failed to fetch events' },
		});
	}
});

// @route   POST /api/events/add
// @desc    Create a new event
// @access  Private
router.post('/add', calendarUserAuth, async (req: Request, res: Response) => {
	try {
		const { uid, eventData } = req.body;

		// Validate parent if specified
		if (eventData.parentId) {
			const parent = await EventDB.findByPk(eventData.parentId);
			if (!parent) {
				return res.status(ErrorCode.HTTP_BAD_REQ).json({
					errors: { msg: 'Parent task not found' },
				});
			}
			if (parent.hierarchyLevel >= 3) {
				return res.status(ErrorCode.HTTP_BAD_REQ).json({
					errors: { msg: 'Maximum hierarchy depth (3 levels) exceeded' },
				});
			}
		}

		// Create event
		const newEvent = await EventDB.create({
			id: eventData.id,
			uid,
			title: eventData.title,
			content: eventData.content, // MDX content
			description: eventData.description,
			resourceId: eventData.resourceId,
			start: eventData.start,
			end: eventData.end,
			isAllDay: typeof eventData.isAllDay === 'boolean' ? eventData.isAllDay : false,
			parentId: eventData.parentId,
			sortOrder: eventData.sortOrder || 0,
			priority: eventData.priority || 'medium',
			status: eventData.status || 'todo',
			estimatedHours: eventData.estimatedHours,
			assignee: eventData.assignee || [],
			tags: eventData.tags || [],
			dependsOn: eventData.dependsOn || [],
			blocks: eventData.blocks || [],
			createdBy: req.user?.id,
		});

		// Update parent progress if applicable
		if (eventData.parentId) {
			await updateParentProgress(eventData.parentId);
		}

		res.json({
			success: true,
			event: transformEventForClient(newEvent),
		});
	} catch (err) {
		console.error('Add Event Error:', err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({
			errors: { msg: 'Failed to create event' },
		});
	}
});

// @route   PUT /api/events/:eventId
// @desc    Update an event
// @access  Private
router.put('/:eventId', calendarUserAuth, async (req: Request, res: Response) => {
	try {
		const { eventId } = req.params;
		const { eventData } = req.body;

		const existingEvent = await EventDB.findByPk(eventId);
		if (!existingEvent) {
			return res.status(ErrorCode.HTTP_NOT_FOUND).json({
				errors: { msg: 'Event not found' },
			});
		}

		// Validate parent change
		if (eventData.parentId && eventData.parentId !== existingEvent.parentId) {
			const newParent = await EventDB.findByPk(eventData.parentId);
			if (!newParent) {
				return res.status(ErrorCode.HTTP_BAD_REQ).json({
					errors: { msg: 'New parent task not found' },
				});
			}
			if (newParent.hierarchyLevel >= 3) {
				return res.status(ErrorCode.HTTP_BAD_REQ).json({
					errors: { msg: 'Maximum hierarchy depth exceeded' },
				});
			}
		}

		const oldParentId = existingEvent.parentId;

		// Update event
		const updatedEvent = await existingEvent.update({
			title: eventData.title,
			content: eventData.content,
			description: eventData.description,
			resourceId: eventData.resourceId,
			start: eventData.start,
			end: eventData.end,
			isAllDay: typeof eventData.isAllDay === 'boolean' ? eventData.isAllDay : false,
			parentId: eventData.parentId,
			sortOrder: eventData.sortOrder,
			priority: eventData.priority,
			status: eventData.status,
			estimatedHours: eventData.estimatedHours,
			actualHours: eventData.actualHours,
			progressPercentage: eventData.progressPercentage,
			assignee: eventData.assignee,
			tags: eventData.tags,
			dependsOn: eventData.dependsOn,
			blocks: eventData.blocks,
			updatedBy: req.user?.id,
			uid: eventData.uid, // Ensure the event's calendar UID can be updated
		});

		// Update parent progress for both old and new parents
		if (oldParentId && oldParentId !== eventData.parentId) {
			await updateParentProgress(oldParentId);
		}
		if (eventData.parentId) {
			await updateParentProgress(eventData.parentId);
		}

		res.json({
			success: true,
			event: transformEventForClient(updatedEvent),
		});
	} catch (err) {
		console.error('Update Event Error:', err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({
			errors: { msg: 'Failed to update event' },
		});
	}
});

// @route   DELETE /api/events/:eventId
// @desc    Delete event and handle subtasks
// @access  Private
router.delete('/:eventId', calendarUserAuth, async (req: Request, res: Response) => {
	try {
		const { eventId } = req.params;
		const { deleteSubtasks = 'false' } = req.query;

		const event = await EventDB.findByPk(eventId, {
			include: [{ model: EventDB, as: 'subtasks' }],
		});

		if (!event) {
			return res.status(ErrorCode.HTTP_NOT_FOUND).json({
				errors: { msg: 'Event not found' },
			});
		}

		const parentId = event.parentId;

		if (deleteSubtasks === 'true') {
			// Delete entire subtree
			await EventDB.destroy({
				where: {
					hierarchyPath: { [Op.like]: `%${eventId}%` },
				},
			});
		} else {
			// Move subtasks up one level
			await EventDB.update(
				{
					parentId: parentId,
					hierarchyLevel: EventDB.sequelize.literal('hierarchy_level - 1'),
				},
				{
					where: { parentId: eventId },
				}
			);
		}

		await event.destroy();

		// Update parent progress
		if (parentId) {
			await updateParentProgress(parentId);
		}

		res.json({ success: true });
	} catch (err) {
		console.error('Delete Event Error:', err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({
			errors: { msg: 'Failed to delete event' },
		});
	}
});

// @route   POST /api/events/reorder
// @desc    Reorder tasks within same parent
// @access  Private
router.post('/reorder', calendarUserAuth, async (req: Request, res: Response) => {
	try {
		const { uid, taskIds, parentId = null } = req.body;

		// Update sort order for all tasks
		const updatePromises = taskIds.map((taskId: string, index: number) =>
			EventDB.update(
				{ sortOrder: index },
				{
					where: {
						id: taskId,
						uid,
						parentId: parentId,
					},
				}
			)
		);

		await Promise.all(updatePromises);

		res.json({ success: true });
	} catch (err) {
		console.error('Reorder Events Error:', err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({
			errors: { msg: 'Failed to reorder events' },
		});
	}
});

// @route   POST /api/events/move
// @desc    Move task to different parent
// @access  Private
router.post('/move', calendarUserAuth, async (req: Request, res: Response) => {
	try {
		const { uid, taskId, newParentId, newSortOrder = 0 } = req.body;

		const task = await EventDB.findOne({
			where: { id: taskId, uid },
		});

		if (!task) {
			return res.status(ErrorCode.HTTP_NOT_FOUND).json({
				errors: { msg: 'Task not found' },
			});
		}

		// Validate new parent
		if (newParentId) {
			const newParent = await EventDB.findByPk(newParentId);
			if (!newParent || newParent.hierarchyLevel >= 3) {
				return res.status(ErrorCode.HTTP_BAD_REQ).json({
					errors: { msg: 'Invalid parent or maximum depth exceeded' },
				});
			}
		}

		const oldParentId = task.parentId;

		await task.update({
			parentId: newParentId,
			sortOrder: newSortOrder,
		});

		// Update progress for both parents
		if (oldParentId) {
			await updateParentProgress(oldParentId);
		}
		if (newParentId) {
			await updateParentProgress(newParentId);
		}

		res.json({ success: true });
	} catch (err) {
		console.error('Move Event Error:', err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({
			errors: { msg: 'Failed to move event' },
		});
	}
});

// @route   GET /api/events/dependencies/:eventId
// @desc    Get task dependencies and relationships
// @access  Private
router.get('/dependencies/:eventId', calendarUserAuth, async (req: Request, res: Response) => {
	try {
		const { eventId } = req.params;

		const event = await EventDB.findByPk(eventId);
		if (!event) {
			return res.status(ErrorCode.HTTP_NOT_FOUND).json({
				errors: { msg: 'Event not found' },
			});
		}

		// Get dependencies (tasks this depends on)
		const dependencies = await EventDB.findAll({
			where: { id: { [Op.in]: event.dependsOn || [] } },
			attributes: ['id', 'title', 'status', 'progressPercentage'],
		});

		// Get blocked tasks (tasks this blocks)
		const blockedTasks = await EventDB.findAll({
			where: { id: { [Op.in]: event.blocks || [] } },
			attributes: ['id', 'title', 'status', 'progressPercentage'],
		});

		// Get dependent tasks (tasks that depend on this one)
		const dependentTasks = await EventDB.findAll({
			where: { dependsOn: { [Op.contains]: [eventId] } },
			attributes: ['id', 'title', 'status', 'progressPercentage'],
		});

		res.json({
			dependencies,
			blockedTasks,
			dependentTasks,
		});
	} catch (err) {
		console.error('Get Dependencies Error:', err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({
			errors: { msg: 'Failed to fetch dependencies' },
		});
	}
});

// @route   POST /api/events/bulk-update
// @desc    Bulk update multiple events
// @access  Private
router.post('/bulk-update', calendarUserAuth, async (req: Request, res: Response) => {
	try {
		const { uid, eventIds, updates } = req.body;

		// Validate that all events belong to the calendar
		const events = await EventDB.findAll({
			where: {
				id: { [Op.in]: eventIds },
				uid,
			},
		});

		if (events.length !== eventIds.length) {
			return res.status(ErrorCode.HTTP_BAD_REQ).json({
				errors: { msg: 'Some events not found or access denied' },
			});
		}

		// Perform bulk update
		await EventDB.update(
			{ ...updates, updatedBy: req.user?.id },
			{
				where: {
					id: { [Op.in]: eventIds },
					uid,
				},
			}
		);

		// Update parent progress for affected parents
		const parentIds = [...new Set(events.map((e: any) => e.parentId).filter(Boolean))];
		await Promise.all(parentIds.map(updateParentProgress as any));

		res.json({ success: true, updatedCount: events.length });
	} catch (err) {
		console.error('Bulk Update Error:', err);
		res.status(ErrorCode.HTTP_SERVER_ERROR).json({
			errors: { msg: 'Failed to bulk update events' },
		});
	}
});

// Helper function to update parent task progress
async function updateParentProgress(parentId: string): Promise<void> {
	try {
		const parent = await EventDB.findByPk(parentId, {
			include: [
				{
					model: EventDB,
					as: 'subtasks',
					where: { archived: false },
					required: false,
				},
			],
		});

		if (!parent?.subtasks?.length) return;

		const subtasks = parent.subtasks;
		const completedCount = subtasks.filter((sub: any) => sub.status === 'done').length;
		const totalCount = subtasks.length;
		const progressPercentage = Math.round((completedCount / totalCount) * 100);

		// Determine new status
		let newStatus = parent.status;
		if (progressPercentage === 100) {
			newStatus = 'done';
		} else if (progressPercentage > 0 && parent.status === 'todo') {
			newStatus = 'in_progress';
		} else if (progressPercentage === 0 && parent.status === 'done') {
			newStatus = 'todo';
		}

		await parent.update({
			progressPercentage,
			status: newStatus,
		});

		// Recursively update parent's parent
		if (parent.parentId) {
			await updateParentProgress(parent.parentId);
		}
	} catch (err) {
		console.error('Update Parent Progress Error:', err);
	}
}

export default router;
