import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarEvent, Task, EventStatus, PriorityLevel, TaskCategory } from '@/lib/types';
import { PRIORITY_COLORS, STATUS_COLORS, TASK_CATEGORY_COLORS } from '@/lib/constants';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Event styling utilities
export function getEventStyle(event: CalendarEvent) {
	const baseStyle = {
		backgroundColor: event.color || '#3174ad',
		color: 'white',
		border: 'none',
		borderRadius: '4px',
		fontSize: '12px',
	};

	// Apply transparency for completed events
	if (event.isDone) {
		baseStyle.backgroundColor = `${event.color || '#3174ad'}80`; // 50% opacity
	}

	// Add priority border
	if (event.priority === 'urgent') {
		return {
			...baseStyle,
			borderLeft: `4px solid ${PRIORITY_COLORS.urgent}`,
		};
	} else if (event.priority === 'high') {
		return {
			...baseStyle,
			borderLeft: `4px solid ${PRIORITY_COLORS.high}`,
		};
	}

	return baseStyle;
}

// Time formatting utilities
export function formatTime(date: Date | string): string {
	try {
		const dateObj = typeof date === 'string' ? parseISO(date) : date;
		if (!isValid(dateObj)) return '';
		return format(dateObj, 'HH:mm');
	} catch {
		return '';
	}
}

export function formatDateTime(date: Date | string): string {
	try {
		const dateObj = typeof date === 'string' ? parseISO(date) : date;
		if (!isValid(dateObj)) return '';
		return format(dateObj, 'MMM dd, yyyy HH:mm');
	} catch {
		return '';
	}
}

export function formatDateRange(start: Date | string, end: Date | string): string {
	try {
		const startDate = typeof start === 'string' ? parseISO(start) : start;
		const endDate = typeof end === 'string' ? parseISO(end) : end;

		if (!isValid(startDate) || !isValid(endDate)) return '';

		const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');

		if (isSameDay) {
			return `${format(startDate, 'MMM dd, yyyy')} ${formatTime(startDate)} - ${formatTime(
				endDate
			)}`;
		} else {
			return `${formatDateTime(startDate)} - ${formatDateTime(endDate)}`;
		}
	} catch {
		return '';
	}
}

// Filtering utilities
export function filterEventsBySearch(events: CalendarEvent[], search: string): CalendarEvent[] {
	if (!search.trim()) return events;

	const searchLower = search.toLowerCase();
	return events.filter(
		event =>
			event.title.toLowerCase().includes(searchLower) ||
			event.description?.toLowerCase().includes(searchLower) ||
			event.content?.toLowerCase().includes(searchLower) ||
			event.location?.toLowerCase().includes(searchLower) ||
			event.tags.some(tag => tag.toLowerCase().includes(searchLower))
	);
}

export function filterEventsByCategory(
	events: CalendarEvent[],
	category: TaskCategory
): CalendarEvent[] {
	return events.filter(
		event => event.tags.includes(category) || (event.tags.length === 0 && category === 'task')
	);
}

export function filterEventsByPriority(
	events: CalendarEvent[],
	priority: PriorityLevel
): CalendarEvent[] {
	return events.filter(event => event.priority === priority);
}

export function filterEventsByStatus(
	events: CalendarEvent[],
	status: EventStatus
): CalendarEvent[] {
	return events.filter(event => event.status === status);
}

export function filterTodosBySearch(tasks: Task[], search: string): Task[] {
	if (!search.trim()) return tasks;

	const searchLower = search.toLowerCase();
	return tasks.filter(
		task =>
			task.title.toLowerCase().includes(searchLower) ||
			task.description?.toLowerCase().includes(searchLower) ||
			task.content?.toLowerCase().includes(searchLower) ||
			task.tags.some(tag => tag.toLowerCase().includes(searchLower))
	);
}

// Hierarchy utilities
export function buildEventHierarchy(events: CalendarEvent[]): CalendarEvent[] {
	const eventMap = new Map<string, CalendarEvent>();
	const rootEvents: CalendarEvent[] = [];

	// Create a map of all events
	events.forEach(event => {
		eventMap.set(event.id, { ...event });
	});

	// Build hierarchy
	eventMap.forEach(event => {
		if (event.parentId && eventMap.has(event.parentId)) {
			const parent: any = eventMap.get(event.parentId)!;
			if (!parent.subtasks) parent.subtasks = [];
			parent.subtasks.push(event);
		} else {
			rootEvents.push(event);
		}
	});

	return rootEvents;
}

export function flattenEventHierarchy(events: CalendarEvent[]): CalendarEvent[] {
	const flattened: CalendarEvent[] = [];

	function flatten(eventList: CalendarEvent[], level = 0) {
		eventList.forEach((event: any) => {
			flattened.push({ ...event, hierarchyLevel: level });
			if (event.subtasks && event.subtasks.length > 0) {
				flatten(event.subtasks, level + 1);
			}
		});
	}

	flatten(events);
	return flattened;
}

// Progress calculation utilities
export function calculateProgress(event: CalendarEvent): number {
	if (!event.hasSubtasks || event.totalSubtasks === 0) {
		return event.isDone ? 100 : 0;
	}

	return Math.round((event.completedSubtasks / event.totalSubtasks) * 100);
}

export function getProgressColor(percentage: number): string {
	if (percentage === 100) return 'text-green-600';
	if (percentage >= 75) return 'text-blue-600';
	if (percentage >= 50) return 'text-yellow-600';
	if (percentage >= 25) return 'text-orange-600';
	return 'text-gray-600';
}

// Validation utilities
export function validateEventDates(start?: Date, end?: Date): string | null {
	if (!start || !end) return null;

	if (start >= end) {
		return 'End date must be after start date';
	}

	const now = new Date();
	const maxFutureDate = new Date();
	maxFutureDate.setFullYear(now.getFullYear() + 10);

	if (start > maxFutureDate) {
		return 'Start date cannot be more than 10 years in the future';
	}

	return null;
}

export function validateEventTitle(title: string): string | null {
	if (!title.trim()) {
		return 'Title is required';
	}

	if (title.length > 200) {
		return 'Title must be less than 200 characters';
	}

	return null;
}

// Sorting utilities
export function sortEventsByDate(events: CalendarEvent[], ascending = true): CalendarEvent[] {
	return [...events].sort((a, b) => {
		const dateA = a.start ? new Date(a.start) : new Date(0);
		const dateB = b.start ? new Date(b.start) : new Date(0);

		return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
	});
}

export function sortEventsByPriority(events: CalendarEvent[], ascending = false): CalendarEvent[] {
	const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };

	return [...events].sort((a, b) => {
		const priorityA = priorityOrder[a.priority] || 0;
		const priorityB = priorityOrder[b.priority] || 0;

		return ascending ? priorityA - priorityB : priorityB - priorityA;
	});
}

export function sortEventsByStatus(events: CalendarEvent[]): CalendarEvent[] {
	const statusOrder = { todo: 1, in_progress: 2, review: 3, done: 4, cancelled: 5 };

	return [...events].sort((a, b) => {
		const statusA = statusOrder[a.status] || 0;
		const statusB = statusOrder[b.status] || 0;

		return statusA - statusB;
	});
}

// Export utilities
export function exportEventsToCSV(events: CalendarEvent[]): string {
	const headers = [
		'Title',
		'Description',
		'Start Date',
		'End Date',
		'Status',
		'Priority',
		'Tags',
		'Location',
		'Assignees',
	].join(',');

	const rows = events.map(event =>
		[
			`"${event.title.replace(/"/g, '""')}"`,
			`"${(event.description || '').replace(/"/g, '""')}"`,
			event.start ? format(new Date(event.start), 'yyyy-MM-dd HH:mm') : '',
			event.end ? format(new Date(event.end), 'yyyy-MM-dd HH:mm') : '',
			event.status,
			event.priority,
			`"${event.tags.join(', ')}"`,
			`"${(event.location || '').replace(/"/g, '""')}"`,
			`"${event.assignee.join(', ')}"`,
		].join(',')
	);

	return [headers, ...rows].join('\n');
}

// Color utilities
export function generateCalendarColor(): string {
	const colors = [
		'#3174ad',
		'#dc2626',
		'#16a34a',
		'#ca8a04',
		'#7c3aed',
		'#ea580c',
		'#0891b2',
		'#be185d',
		'#059669',
		'#7c2d12',
		'#4338ca',
		'#9333ea',
	];

	return colors[Math.floor(Math.random() * colors.length)];
}

export function getContrastColor(backgroundColor: string): string {
	// Remove # if present
	const hex = backgroundColor.replace('#', '');

	// Convert to RGB
	const r = parseInt(hex.substr(0, 2), 16);
	const g = parseInt(hex.substr(2, 2), 16);
	const b = parseInt(hex.substr(4, 2), 16);

	// Calculate luminance
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Get color for priority level
export function getPriorityColor(priority: PriorityLevel): string {
	return PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
}

// Get color for status
export function getStatusColor(status: EventStatus): string {
	return STATUS_COLORS[status] || STATUS_COLORS.todo;
}

// Get color for task category
export function getTaskCategoryColor(category: TaskCategory): string {
	return TASK_CATEGORY_COLORS[category] || TASK_CATEGORY_COLORS.task;
}
