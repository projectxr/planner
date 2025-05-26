import { PriorityLevel, EventStatus, TaskCategory, CalendarViewType } from './types';

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
	urgent: '#dc2626', // Red
	high: '#ef4444', // Orange-Red
	medium: '#f59e0b', // Amber
	low: '#10b981', // Green
};

// Color constants for event status (matching your calendar implementation)
export const STATUS_COLORS: Record<EventStatus, string> = {
	todo: '#6b7280', // Gray
	in_progress: '#3b82f6', // Blue
	review: '#f59e0b', // Amber
	done: '#10b981', // Green
	cancelled: '#ef4444', // Red
};

// Color constants for task categories
export const TASK_CATEGORY_COLORS: Record<TaskCategory, string> = {
	task: '#3174ad', // Blue
	meeting: '#7c3aed', // Purple
	deadline: '#dc2626', // Red
	reminder: '#f59e0b', // Amber
	project: '#059669', // Emerald
};

// Icons for priority levels (Lucide React icon names)
export const PRIORITY_ICONS: Record<PriorityLevel, string> = {
	urgent: 'alert-triangle',
	high: 'alert-circle',
	medium: 'info',
	low: 'check-circle',
};

// Icons for event status (Lucide React icon names)
export const STATUS_ICONS: Record<EventStatus, string> = {
	todo: 'circle',
	in_progress: 'clock',
	review: 'eye',
	done: 'check-circle',
	cancelled: 'x-circle',
};

// Icons for task categories (Lucide React icon names)
export const TASK_CATEGORY_ICONS: Record<TaskCategory, string> = {
	task: 'check-square',
	meeting: 'users',
	deadline: 'alert-triangle',
	reminder: 'bell',
	project: 'folder',
};

// Calendar view types
export const CALENDAR_VIEWS: CalendarViewType[] = [
	'month',
	'week',
	'work_week',
	'day',
	'agenda',
	'hierarchy',
];

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
	// Event operations
	NEW_EVENT: 'n',
	DELETE: 'd',
	SAVE: 's',
	ESCAPE: 'Escape',

	// Navigation
	TODAY: 't',
	NEXT_DAY: 'ArrowRight',
	PREV_DAY: 'ArrowLeft',
	NEXT_WEEK: 'ArrowDown',
	PREV_WEEK: 'ArrowUp',
	NEXT_PERIOD: 'ArrowRight',
	PREV_PERIOD: 'ArrowLeft',

	// View switching
	DAY_VIEW: '1',
	WEEK_VIEW: '2',
	MONTH_VIEW: '3',
	AGENDA_VIEW: '4',

	// Other actions
	SEARCH: 'f',
	FILTER: 'ctrl+f',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
	EVENTS: 'calendar-events',
	TASKS: 'calendar-tasks', // Updated from TODOS
	SETTINGS: 'calendar-settings',
	USER_PREFERENCES: 'calendar-user-preferences',
	VIEW_STATE: 'calendar-view-state',
	FILTERS: 'calendar-filters',
	SIDEBAR_STATE: 'calendar-sidebar-state',
} as const;

// Default settings
export const DEFAULT_EVENT_DURATION = 60; // minutes
export const MIN_EVENT_DURATION = 15; // minutes
export const MAX_EVENT_DURATION = 480; // minutes (8 hours)

// Default view settings
export const DEFAULT_VIEW = {
	type: 'week' as CalendarViewType,
	date: new Date(),
} as const;

// Working hours
export const DEFAULT_WORKING_HOURS = {
	start: '09:00',
	end: '17:00',
} as const;

// Hierarchy settings
export const MAX_HIERARCHY_LEVELS = 3;

// UI Constants
export const SIDEBAR_CONFIG = {
	MIN_WIDTH: 250,
	MAX_WIDTH: 500,
	DEFAULT_WIDTH: 300,
} as const;

// Performance settings
export const PERFORMANCE_CONFIG = {
	DEBOUNCE_DELAY: 300, // milliseconds
	THROTTLE_DELAY: 100, // milliseconds
	AUTO_SAVE_DELAY: 1000, // milliseconds
	REFRESH_INTERVAL: 30000, // milliseconds (30 seconds)
} as const;

// Validation constants
export const VALIDATION_RULES = {
	MAX_TITLE_LENGTH: 200,
	MAX_DESCRIPTION_LENGTH: 1000,
	MAX_TAGS_COUNT: 10,
	MAX_ASSIGNEES_COUNT: 20,
	MIN_TITLE_LENGTH: 1,
} as const;

// Date format patterns
export const DATE_FORMATS = {
	DISPLAY_DATE: 'MMM dd, yyyy',
	DISPLAY_TIME: 'HH:mm',
	DISPLAY_DATETIME: 'MMM dd, yyyy HH:mm',
	ISO_DATE: 'yyyy-MM-dd',
	ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

// Event colors palette
export const EVENT_COLOR_PALETTE = [
	'#3174ad', // Blue
	'#dc2626', // Red
	'#16a34a', // Green
	'#ca8a04', // Yellow
	'#7c3aed', // Purple
	'#ea580c', // Orange
	'#0891b2', // Cyan
	'#be185d', // Pink
	'#059669', // Emerald
	'#7c2d12', // Brown
	'#4338ca', // Indigo
	'#9333ea', // Violet
] as const;

// Drag and drop settings
export const DRAG_DROP_CONFIG = {
	LONG_PRESS_THRESHOLD: 500, // milliseconds
	DRAG_THRESHOLD: 10, // pixels
	AUTO_SCROLL_THRESHOLD: 50, // pixels from edge
	AUTO_SCROLL_SPEED: 10, // pixels per frame
} as const;

// Toast notification durations
export const TOAST_DURATIONS = {
	SUCCESS: 3000, // milliseconds
	ERROR: 5000, // milliseconds
	WARNING: 4000, // milliseconds
	INFO: 3000, // milliseconds
} as const;
