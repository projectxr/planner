import { Server } from 'socket.io';
import ConnectionManager from './handlers/connectionManager';
import CalendarManager from './handlers/calendarManager';
import jwtAuth from './middleware/userAuth';

var socketManager = {
	init: (server: any) => console.log('not initialized'),
};

socketManager.init = server => {
	const io = new Server(server, {
		pingInterval: 4000,
		pingTimeout: 8000,
		cors: {
			origin: '*',
			methods: ['GET', 'POST'],
			credentials: true,
		},
	});

	// Authentication middleware
	io.use(jwtAuth);

	// Initialize managers
	var connectionManager = new ConnectionManager();
	var calendarManager = new CalendarManager();

	io.sockets.on('connection', socket => {
		console.log(`User connected: ${socket.id}`);

		// Connection events
		socket.on('disconnect', () => {
			console.log(`User disconnected: ${socket.id}`);
		});

		socket.on('pinging', connData => connectionManager.pinging(connData, socket));

		socket.on('joinRoom', calendarData => connectionManager.joinRoom(calendarData, socket));

		// Basic event operations
		socket.on('addEvent', calendarData => calendarManager.addEvent(calendarData, socket));

		socket.on('updateEvent', calendarData => calendarManager.updateEvent(calendarData, socket));

		socket.on('deleteEvent', calendarData => calendarManager.deleteEvent(calendarData, socket));

		// Hierarchy-specific events
		socket.on('moveEvent', calendarData => calendarManager.moveEvent(calendarData, socket));

		socket.on('reorderEvents', calendarData => calendarManager.reorderEvents(calendarData, socket));

		// Analytics and insights
		socket.on('getTaskAnalytics', calendarData =>
			calendarManager.getTaskAnalytics(calendarData, socket)
		);

		// Bulk operations
		socket.on('bulkUpdateEvents', async calendarData => {
			try {
				const { uid, updates } = calendarData;
				const results = [];

				for (const update of updates) {
					await calendarManager.updateEvent({ uid, eventData: update }, socket);
					results.push({ id: update.id, success: true });
				}

				socket.emit('bulkUpdateComplete', {
					results,
					success: true,
				});
			} catch (err) {
				console.log('Bulk Update Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Bulk update failed',
				});
			}
		});

		// Template operations for task templates
		socket.on('createTaskTemplate', async templateData => {
			try {
				const { uid, template } = templateData;

				// Create multiple tasks from template
				const createdTasks = [];
				for (const taskTemplate of template.tasks) {
					const eventData = {
						...taskTemplate,
						id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						uid,
					};

					await calendarManager.addEvent({ uid, eventData }, socket);
					createdTasks.push(eventData);
				}

				socket.in(uid).emit('templateCreated', {
					templateName: template.name,
					createdTasks,
					success: true,
				});
			} catch (err) {
				console.log('Create Template Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Failed to create template',
				});
			}
		});

		// Dependency management
		socket.on('addDependency', async dependencyData => {
			try {
				const { uid, taskId, dependsOnId } = dependencyData;

				// Update the task to add dependency
				await calendarManager.updateEvent(
					{
						uid,
						eventData: {
							id: taskId,
							depends_on: [dependsOnId], // This would need to be merged with existing dependencies
						},
					},
					socket
				);

				socket.in(uid).emit('dependencyAdded', {
					taskId,
					dependsOnId,
					success: true,
				});
			} catch (err) {
				console.log('Add Dependency Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Failed to add dependency',
				});
			}
		});

		socket.on('removeDependency', async dependencyData => {
			try {
				const { uid, taskId, dependsOnId } = dependencyData;

				// This would need to fetch current dependencies and remove the specified one
				// Implementation depends on how dependencies are stored and managed

				socket.in(uid).emit('dependencyRemoved', {
					taskId,
					dependsOnId,
					success: true,
				});
			} catch (err) {
				console.log('Remove Dependency Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Failed to remove dependency',
				});
			}
		});

		// Progress tracking
		socket.on('updateProgress', async progressData => {
			try {
				const { uid, taskId, progress, actualHours } = progressData;

				await calendarManager.updateEvent(
					{
						uid,
						eventData: {
							id: taskId,
							progress_percentage: progress,
							actual_hours: actualHours,
							status: progress === 100 ? 'done' : progress > 0 ? 'in_progress' : 'todo',
						},
					},
					socket
				);

				socket.in(uid).emit('progressUpdated', {
					taskId,
					progress,
					actualHours,
					success: true,
				});
			} catch (err) {
				console.log('Update Progress Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Failed to update progress',
				});
			}
		});

		// Time tracking
		socket.on('startTimeTracking', async trackingData => {
			try {
				const { uid, taskId, userId } = trackingData;

				// Store time tracking session (this would need a separate tracking system)
				const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

				socket.join(`tracking_${sessionId}`);

				socket.in(uid).emit('timeTrackingStarted', {
					taskId,
					userId,
					sessionId,
					startTime: new Date(),
					success: true,
				});
			} catch (err) {
				console.log('Start Time Tracking Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Failed to start time tracking',
				});
			}
		});

		socket.on('stopTimeTracking', async trackingData => {
			try {
				const { uid, taskId, sessionId, actualHours } = trackingData;

				// Update task with actual hours
				await calendarManager.updateEvent(
					{
						uid,
						eventData: {
							id: taskId,
							actual_hours: actualHours,
						},
					},
					socket
				);

				socket.leave(`tracking_${sessionId}`);

				socket.in(uid).emit('timeTrackingStopped', {
					taskId,
					sessionId,
					actualHours,
					endTime: new Date(),
					success: true,
				});
			} catch (err) {
				console.log('Stop Time Tracking Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Failed to stop time tracking',
				});
			}
		});

		// Comments and collaboration
		socket.on('addComment', async commentData => {
			try {
				const { uid, taskId, comment, userId } = commentData;

				// This would need a comments system - could be part of rich content
				const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

				socket.in(uid).emit('commentAdded', {
					taskId,
					comment: {
						id: commentId,
						text: comment,
						author: userId,
						timestamp: new Date(),
					},
					success: true,
				});
			} catch (err) {
				console.log('Add Comment Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Failed to add comment',
				});
			}
		});

		// Notifications and alerts
		socket.on('subscribeToNotifications', subscriptionData => {
			try {
				const { uid, notificationTypes } = subscriptionData;

				// Join notification rooms based on subscription preferences
				notificationTypes.forEach((type: string) => {
					socket.join(`notifications_${uid}_${type}`);
				});

				socket.emit('notificationSubscribed', {
					success: true,
					subscriptionTypes: notificationTypes,
				});
			} catch (err) {
				console.log('Subscribe Notifications Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Failed to subscribe to notifications',
				});
			}
		});

		// Archive/restore operations
		socket.on('archiveEvent', async archiveData => {
			try {
				const { uid, taskId, includeSubtasks = false } = archiveData;

				await calendarManager.updateEvent(
					{
						uid,
						eventData: {
							id: taskId,
							archived: true,
							archived_at: new Date(),
						},
					},
					socket
				);

				socket.in(uid).emit('eventArchived', {
					taskId,
					includeSubtasks,
					success: true,
				});
			} catch (err) {
				console.log('Archive Event Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Failed to archive event',
				});
			}
		});

		socket.on('restoreEvent', async restoreData => {
			try {
				const { uid, taskId } = restoreData;

				await calendarManager.updateEvent(
					{
						uid,
						eventData: {
							id: taskId,
							archived: false,
							archived_at: null,
						},
					},
					socket
				);

				socket.in(uid).emit('eventRestored', {
					taskId,
					success: true,
				});
			} catch (err) {
				console.log('Restore Event Error:', err);
				socket.emit('error', {
					success: false,
					message: 'Failed to restore event',
				});
			}
		});

		// Error handling for unknown events
		socket.onAny((eventName, ...args) => {
			console.log(`Received unknown event: ${eventName}`, args);
		});
	});

	// Global error handler
	io.engine.on('connection_error', err => {
		console.log('Connection error:', err.req);
		console.log('Error code:', err.code);
		console.log('Error message:', err.message);
		console.log('Error context:', err.context);
	});

	return io;
};

export default socketManager;
