export type EventStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategory = 'task' | 'meeting' | 'deadline' | 'reminder' | 'project';
export type CalendarViewType = 'month' | 'week' | 'work_week' | 'day' | 'agenda' | 'hierarchy';

export interface CalendarEvent {
	// Core fields
	id: string;
	uid: string; // Calendar UID
	title: string;

	// Content
	content?: string; // MDX content
	description?: string;

	// Scheduling
	resourceId?: string;
	start?: Date;
	end?: Date;
	isAllDay: boolean;
	location?: string;

	// Hierarchy
	parentId?: string;
	hierarchyLevel: number;
	hierarchyPath?: string;
	sortOrder: number;

	// Task management
	status: EventStatus;
	priority: PriorityLevel;
	progressPercentage: number;

	// Time tracking
	estimatedHours?: number;
	actualHours?: number;

	// Dependencies
	dependsOn: string[];
	blocks: string[];

	// Assignment & collaboration
	assignee: string[];
	tags: string[];

	// Metadata
	createdBy?: string;
	updatedBy?: string;
	createdAt: Date;
	updatedAt: Date;
	archived: boolean;
	archivedAt?: Date;

	// Computed fields
	isDone: boolean;
	hasSubtasks: boolean;
	completedSubtasks: number;
	totalSubtasks: number;
	canHaveSubtasks: boolean;
	isSubtask: boolean;

	// Display properties
	color?: string;
	isVisible?: boolean;
}

export interface Task extends CalendarEvent {
	completed: boolean;
	dueDate?: Date;
	category: TaskCategory;
	isDraggable: boolean;
}

export interface CalendarData {
	id: string;
	uid: string;
	name: string;
	calendarName?: string;
	description: string;
	color: string;
	isPrivate: boolean;
	settings: CalendarSettings;
	users?: any[];
	owner?: any;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface CreateCalendarPayload {
	calendarName: string;
	description?: string;
	color?: string;
	isPrivate?: boolean;
	settings?: Partial<CalendarSettings>;
}

export interface CalendarUser {
	user: string;
	hasReadAccess: boolean;
	hasWriteAccess: boolean;
	name?: string;
	avatar?: string;
	email?: string;
}

export interface CalendarCollaborator {
	user: string;
	role: 'viewer' | 'editor' | 'admin';
	canRead: boolean;
	canWrite: boolean;
	canDelete: boolean;
	canManageUsers: boolean;
}

export interface CalendarSettings {
	defaultPriority: PriorityLevel;
	defaultStatus: EventStatus;
	allowSubtasks: boolean;
	maxHierarchyLevel: number;
	autoProgressFromSubtasks: boolean;
	defaultView: CalendarViewType;
	workingHours: {
		start: string;
		end: string;
	};
	timezone: string;
	enableTimeTracking: boolean;
	enableDependencies: boolean;
	enableRecurrence: boolean;
}

export interface User {
	id: string;
	name: string;
	userName: string;
	email: string;
	avatar: string;
	isAuthenticated: boolean;
	myCalendar?: CalendarData;
	myCalendars: {
		calendar: CalendarData;
		color: string;
		isVisible: boolean;
	}[];
	fullColoredTasks: boolean;
}

export interface FilterOptions {
	search?: string;
	category?: TaskCategory;
	priority?: PriorityLevel;
	status?: EventStatus;
	assignee?: string;
	dateRange?: {
		start: Date;
		end: Date;
	};
	showCompleted?: boolean;
	showArchived?: boolean;
}

export interface DragDropData {
	draggedItem: CalendarEvent | Task | null;
	dragFromOutsideItem: any;
}

export interface ContextMenuData {
	mouseX: number;
	mouseY: number;
	event: CalendarEvent | null;
}

export interface RepeatOptions {
	type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
	interval: number;
	endDate?: Date;
	count?: number;
}

export interface EventFormData {
	title: string;
	description?: string;
	content?: string;
	start?: Date;
	end?: Date;
	isAllDay: boolean;
	location?: string;
	priority: PriorityLevel;
	status: EventStatus;
	assignee: string[];
	tags: string[];
	parentId?: string;
	dependsOn: string[];
	blocks: string[];
	estimatedHours?: number;
	uid: string;
}

export interface CalendarFormData {
	title: string;
	description?: string;
	color: string;
	isPrivate: boolean;
}

export interface UserInviteData {
	userName: string;
	email?: string;
	role: 'viewer' | 'editor' | 'admin';
}

// API Response types
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	event?: T;
	events?: T[];
	message?: string;
	errors?: {
		msg: string;
		[key: string]: any;
	};
}

export interface AgendaData {
	events: CalendarEvent[];
	timeScheduledTasks: CalendarEvent[];
	currentTaskOngoing: boolean;
	currentTasks: CalendarEvent[];
	nextTask: CalendarEvent | null;
	isBacklog: boolean;
	isFuture: boolean;
}

// Default values
export const DEFAULT_VIEW = {
	type: 'month' as CalendarViewType,
	date: new Date(),
};

export const DEFAULT_EVENT_FORM: EventFormData = {
	title: '',
	description: '',
	isAllDay: false,
	priority: 'medium',
	status: 'todo',
	assignee: [],
	tags: [],
	dependsOn: [],
	blocks: [],
	uid: '',
};

export const DEFAULT_CALENDAR_FORM: CalendarFormData = {
	title: '',
	description: '',
	color: '#3174ad',
	isPrivate: false,
};

export const PRIORITY_COLORS = {
	low: '#10b981',
	medium: '#f59e0b',
	high: '#ef4444',
	urgent: '#dc2626',
};

export const STATUS_COLORS = {
	todo: '#6b7280',
	in_progress: '#3b82f6',
	review: '#f59e0b',
	done: '#10b981',
	cancelled: '#ef4444',
};
