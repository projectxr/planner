import { Socket } from 'socket.io';
import { Op } from 'sequelize';
import { EventDB } from '../../models/Calendar';

export default class CalendarManager {
	/**
	 * Add a new event with hierarchy support
	 */
	async addEvent(calendarData: any, socket: Socket) {
		try {
			const { uid, eventData } = calendarData;

			// Validate hierarchy if parent exists
			if (eventData.parent_id) {
				const parent = await EventDB.findByPk(eventData.parent_id);
				if (!parent) {
					socket.emit('error', {
						success: false,
						message: 'Parent task not found',
					});
					return;
				}
				if (parent.hierarchy_level >= 3) {
					socket.emit('error', {
						success: false,
						message: 'Maximum hierarchy depth exceeded',
					});
					return;
				}
			}

			// Create rich content from description if needed
			let content = eventData.content;
			if (!content && eventData.description) {
				content = {
					blocks: [
						{
							id: `block_${Date.now()}`,
							type: 'text',
							content: {
								text: eventData.description,
								formatting: {},
							},
						},
					],
					version: '1.0',
				};
			}

			// Create the event
			const newEvent = await EventDB.create({
				...eventData,
				uid,
				content,
				ending: eventData.end,
				resourceid: eventData.resourceId,
				assignee: eventData.assignee || [],
				priority: eventData.priority || 'medium',
				status: eventData.status || 'todo',
				tags: eventData.tags || [],
				depends_on: eventData.depends_on || [],
				time: Date.now(),
			});

			// Update parent progress if applicable
			if (eventData.parent_id) {
				await this.updateParentProgress(eventData.parent_id);

				// Notify about parent progress update
				const updatedParent = await EventDB.findByPk(eventData.parent_id);
				socket.in(uid).emit('eventProgressUpdated', {
					eventId: eventData.parent_id,
					progress: updatedParent?.progress_percentage,
					status: updatedParent?.status,
				});
			}

			// Transform event for client
			const clientEvent = this.transformEventForClient(newEvent);

			// Emit to all users in calendar
			socket.in(uid).emit('eventAdded', {
				eventData: clientEvent,
				success: true,
			});

			// If event has dependencies, check and notify
			if (eventData.depends_on && eventData.depends_on.length > 0) {
				await this.checkDependencies(uid, eventData.depends_on, socket);
			}
		} catch (err) {
			console.log('Add Event Error:', err);
			socket.emit('error', { success: false, message: 'Failed to add event' });
		}
	}

	/**
	 * Update an event with hierarchy considerations
	 */
	async updateEvent(calendarData: any, socket: Socket) {
		try {
			const { uid, eventData } = calendarData;

			const existingEvent = await EventDB.findByPk(eventData.id);
			if (!existingEvent) {
				socket.emit('error', {
					success: false,
					message: 'Event not found',
				});
				return;
			}

			// Handle parent change validation
			if (eventData.parent_id && eventData.parent_id !== existingEvent.parent_id) {
				const newParent = await EventDB.findByPk(eventData.parent_id);
				if (!newParent) {
					socket.emit('error', {
						success: false,
						message: 'New parent task not found',
					});
					return;
				}
				if (newParent.hierarchy_level >= 3) {
					socket.emit('error', {
						success: false,
						message: 'Maximum hierarchy depth exceeded',
					});
					return;
				}
			}

			const oldParentId = existingEvent.parent_id;
			const oldStatus = existingEvent.status;

			// Update the event
			const updatedEvent = await existingEvent.update({
				...eventData,
				ending: eventData.end,
				resourceid: eventData.resourceId,
				time: Date.now(),
			});

			// Handle parent progress updates
			const parentIds = new Set();
			if (oldParentId) parentIds.add(oldParentId);
			if (eventData.parent_id) parentIds.add(eventData.parent_id);

			for (const parentId of parentIds) {
				await this.updateParentProgress(parentId as string);

				// Notify about parent progress update
				const updatedParent = await EventDB.findByPk(parentId);
				if (updatedParent) {
					socket.in(uid).emit('eventProgressUpdated', {
						eventId: parentId,
						progress: updatedParent.progress_percentage,
						status: updatedParent.status,
					});
				}
			}

			// If status changed to 'done', update all subtasks
			if (eventData.status === 'done' && oldStatus !== 'done') {
				await this.markSubtasksComplete(eventData.id, socket, uid);
			}

			// Transform event for client
			const clientEvent = this.transformEventForClient(updatedEvent);

			socket.in(uid).emit('eventEdited', {
				eventData: clientEvent,
				success: true,
			});

			// Check dependencies if they changed
			if (eventData.depends_on) {
				await this.checkDependencies(uid, eventData.depends_on, socket);
			}
		} catch (err) {
			console.log('Update Event Error:', err);
			socket.emit('error', { success: false, message: 'Failed to update event' });
		}
	}

	/**
	 * Delete an event and handle subtasks
	 */
	async deleteEvent(calendarData: any, socket: Socket) {
		try {
			const { uid, eventId, deleteSubtasks = false } = calendarData;

			const event = await EventDB.findByPk(eventId, {
				include: [
					{
						model: EventDB,
						as: 'subtasks',
					},
				],
			});

			if (!event) {
				socket.emit('error', {
					success: false,
					message: 'Event not found',
				});
				return;
			}

			const parentId = event.parent_id;
			const deletedEventIds = [eventId];

			if (deleteSubtasks) {
				// Get all nested subtasks
				const allSubtasks = await EventDB.findAll({
					where: {
						hierarchy_path: {
							[Op.like]: `%${eventId}%`,
						},
					},
				});

				deletedEventIds.push(...allSubtasks.map((task: any) => task.id));

				// Delete all subtasks
				await EventDB.destroy({
					where: {
						hierarchy_path: {
							[Op.like]: `%${eventId}%`,
						},
					},
				});
			} else {
				// Move direct subtasks up one level
				await EventDB.update(
					{
						parent_id: parentId,
						hierarchy_level: EventDB.sequelize?.literal('hierarchy_level - 1'),
					},
					{
						where: { parent_id: eventId },
					}
				);

				// Notify about subtask reparenting
				const reparentedTasks = await EventDB.findAll({
					where: { parent_id: parentId || null },
				});

				reparentedTasks.forEach((task: any) => {
					const clientTask = this.transformEventForClient(task);
					socket.in(uid).emit('eventReparented', {
						eventData: clientTask,
						oldParentId: eventId,
						newParentId: parentId,
					});
				});
			}

			// Delete the main event
			await event.destroy();

			// Update parent progress if applicable
			if (parentId) {
				await this.updateParentProgress(parentId);

				const updatedParent = await EventDB.findByPk(parentId);
				if (updatedParent) {
					socket.in(uid).emit('eventProgressUpdated', {
						eventId: parentId,
						progress: updatedParent.progress_percentage,
						status: updatedParent.status,
					});
				}
			}

			// Notify about deletions
			deletedEventIds.forEach(id => {
				socket.in(uid).emit('eventDeleted', { eventId: id });
			});
		} catch (err) {
			console.log('Delete Event Error:', err);
			socket.emit('error', { success: false, message: 'Failed to delete event' });
		}
	}

	/**
	 * Move task to different parent (drag & drop)
	 */
	async moveEvent(calendarData: any, socket: Socket) {
		try {
			const { uid, taskId, newParentId, newSortOrder = 0 } = calendarData;

			const task = await EventDB.findOne({
				where: { id: taskId, uid },
			});

			if (!task) {
				socket.emit('error', {
					success: false,
					message: 'Task not found',
				});
				return;
			}

			// Validate new parent
			if (newParentId) {
				const newParent = await EventDB.findByPk(newParentId);
				if (!newParent || newParent.hierarchy_level >= 3) {
					socket.emit('error', {
						success: false,
						message: 'Invalid parent or maximum depth exceeded',
					});
					return;
				}
			}

			const oldParentId = task.parent_id;

			await task.update({
				parent_id: newParentId,
				sort_order: newSortOrder,
			});

			// Update progress for both parents
			const parentIds = new Set();
			if (oldParentId) parentIds.add(oldParentId);
			if (newParentId) parentIds.add(newParentId);

			for (const parentId of parentIds) {
				await this.updateParentProgress(parentId as string);

				const updatedParent = await EventDB.findByPk(parentId);
				if (updatedParent) {
					socket.in(uid).emit('eventProgressUpdated', {
						eventId: parentId,
						progress: updatedParent.progress_percentage,
						status: updatedParent.status,
					});
				}
			}

			const clientTask = this.transformEventForClient(task);
			socket.in(uid).emit('eventMoved', {
				eventData: clientTask,
				oldParentId,
				newParentId,
			});
		} catch (err) {
			console.log('Move Event Error:', err);
			socket.emit('error', { success: false, message: 'Failed to move event' });
		}
	}

	/**
	 * Reorder tasks within same parent
	 */
	async reorderEvents(calendarData: any, socket: Socket) {
		try {
			const { uid, taskIds, parentId = null } = calendarData;

			// Update sort order for all tasks
			const updates = taskIds.map((taskId: string, index: number) =>
				EventDB.update(
					{ sort_order: index },
					{
						where: {
							id: taskId,
							uid,
							parent_id: parentId,
						},
					}
				)
			);

			await Promise.all(updates);

			socket.in(uid).emit('eventsReordered', {
				taskIds,
				parentId,
				success: true,
			});
		} catch (err) {
			console.log('Reorder Events Error:', err);
			socket.emit('error', { success: false, message: 'Failed to reorder events' });
		}
	}

	/**
	 * Get task analytics for calendar
	 */
	async getTaskAnalytics(calendarData: any, socket: Socket) {
		try {
			const { uid } = calendarData;

			const analytics = await EventDB.findAll({
				where: { uid, archived: false },
				attributes: [
					'status',
					'priority',
					'hierarchy_level',
					[EventDB.sequelize?.fn('COUNT', '*'), 'count'],
				],
				group: ['status', 'priority', 'hierarchy_level'],
				raw: true,
			});

			const totalTasks = await EventDB.count({
				where: { uid, archived: false },
			});

			const overdueTasks = await EventDB.count({
				where: {
					uid,
					archived: false,
					ending: { [Op.lt]: new Date() },
					status: { [Op.not]: 'done' },
				},
			});

			socket.emit('taskAnalytics', {
				analytics,
				totalTasks,
				overdueTasks,
				success: true,
			});
		} catch (err) {
			console.log('Get Task Analytics Error:', err);
			socket.emit('error', { success: false, message: 'Failed to get analytics' });
		}
	}

	/**
	 * Update parent task progress based on subtasks
	 */
	private async updateParentProgress(parentId: string): Promise<void> {
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

		if (!parent || !parent.subtasks || parent.subtasks.length === 0) {
			return;
		}

		const subtasks = parent.subtasks;
		const completedSubtasks = subtasks.filter((sub: any) => sub.status === 'done').length;
		const totalSubtasks = subtasks.length;
		const progressPercentage = Math.round((completedSubtasks / totalSubtasks) * 100);

		let newStatus = parent.status;
		if (progressPercentage === 100) {
			newStatus = 'done';
		} else if (progressPercentage > 0 && parent.status === 'todo') {
			newStatus = 'in_progress';
		}

		await parent.update({
			progress_percentage: progressPercentage,
			status: newStatus,
		});
	}

	/**
	 * Mark all subtasks as complete when parent is completed
	 */
	private async markSubtasksComplete(parentId: string, socket: Socket, uid: string): Promise<void> {
		const subtasks = await EventDB.findAll({
			where: {
				parent_id: parentId,
				status: { [Op.not]: 'done' },
			},
		});

		for (const subtask of subtasks) {
			await subtask.update({
				status: 'done',
				progress_percentage: 100,
			});

			const clientSubtask = this.transformEventForClient(subtask);
			socket.in(uid).emit('eventEdited', {
				eventData: clientSubtask,
				success: true,
				reason: 'parent_completed',
			});

			// Recursively mark nested subtasks
			await this.markSubtasksComplete(subtask.id, socket, uid);
		}
	}

	/**
	 * Check task dependencies and notify about blocking issues
	 */
	private async checkDependencies(
		uid: string,
		dependencyIds: string[],
		socket: Socket
	): Promise<void> {
		const dependencies = await EventDB.findAll({
			where: {
				id: { [Op.in]: dependencyIds },
				status: { [Op.not]: 'done' },
			},
		});

		if (dependencies.length > 0) {
			socket.in(uid).emit('dependencyWarning', {
				incompleteDependencies: dependencies.map((dep: any) => ({
					id: dep.id,
					title: dep.title,
					status: dep.status,
				})),
			});
		}
	}

	/**
	 * Transform database event to client format
	 */
	private transformEventForClient(event: any): any {
		const eventData = event.toJSON ? event.toJSON() : event;

		return {
			...eventData,
			end: eventData.ending,
			resourceId: eventData.resourceid,
			isDone: eventData.status === 'done',
			// Remove internal fields
			ending: undefined,
			resourceid: undefined,
			isdone: undefined,
		};
	}
}
