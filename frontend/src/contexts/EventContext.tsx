import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
	CalendarEvent,
	Task,
	FilterOptions,
	CalendarViewType,
	EventStatus,
	EventFormData,
	AgendaData,
	ContextMenuData,
	DragDropData,
	DEFAULT_VIEW,
} from '@/lib/types';
import apiClient from '@/services/api';
import { useUser } from './UserContext';
import { useCalendars } from './CalendarContext';
import { useToast } from '@/components/ui/use-toast';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

interface CalendarEventContextType {
	// Data
	events: CalendarEvent[];
	tasks: Task[];
	filteredEvents: CalendarEvent[];
	filteredTasks: Task[];
	agendaData: AgendaData | null;

	// Multi-calendar management
	visibleCalendars: Set<string>;
	calendarColors: Map<string, string>;
	syncStatus: SyncStatus;
	lastSyncTime: Date | null;

	// View state
	currentView: CalendarViewType;
	currentDate: Date;
	selectedEvent: CalendarEvent | null;

	// Modal and UI state
	isAddModalOpen: boolean;
	isEditModalOpen: boolean;
	slotSelectionStartDate: Date | null;
	slotSelectionEndDate: Date | null;
	isCalendarModalOpen: boolean;
	isUserModalOpen: boolean;
	contextMenu: ContextMenuData | null;

	// Drag and drop
	dragDropData: DragDropData;

	// Filters and loading
	filters: FilterOptions;
	loading: boolean;
	error: string | null;
	hasActiveFilters: boolean;
	activeFilterCount: number;

	// Multi-calendar operations
	toggleCalendarVisibility: (calendarUid: string) => void;
	setCalendarColor: (calendarUid: string, color: string) => void;
	refreshAll: (force?: boolean) => Promise<void>;
	refreshCalendar: (calendarUid: string) => Promise<void>;

	// Data operations
	fetchEvents: (calendarUid?: string) => Promise<void>;
	fetchTasks: (calendarUid?: string) => Promise<void>;
	fetchAgenda: () => Promise<void>;
	addEvent: (eventData: EventFormData, calendarUid?: string) => Promise<void>;
	updateEvent: (eventData: CalendarEvent) => Promise<void>;
	deleteEvent: (id: string) => Promise<void>;
	toggleEventDone: (id: string) => Promise<void>;
	repeatEvent: (id: string, repeatCount: number) => Promise<void>;
	bulkUpdateEvents: (eventIds: string[], updates: Partial<CalendarEvent>) => Promise<void>;

	// View and navigation
	setCurrentView: (view: CalendarViewType) => void;
	setCurrentDate: (date: Date) => void;
	navigateToToday: () => void;

	// Selection and modals
	selectEvent: (event: CalendarEvent | null) => void;
	openAddModal: (startDate?: Date, endDate?: Date) => void;
	openEditModal: (event: CalendarEvent) => void;
	closeAllModals: () => void;

	// Context menu
	setContextMenu: (data: ContextMenuData | null) => void;

	// Drag and drop
	setDraggedItem: (item: CalendarEvent | Task | null) => void;
	handleDrop: (dropData: { start: Date; end: Date; allDay?: boolean }) => void;

	isDragging: boolean;
	draggedItem: CalendarEvent | Task | null;
	dragType: 'calendar-event' | 'unscheduled-task' | null;

	// Drag and drop methods
	startDrag: (item: CalendarEvent | Task, type: 'calendar-event' | 'unscheduled-task') => void;
	endDrag: () => void;
	handleCalendarDrop: (dropInfo: { start: Date; end: Date; allDay?: boolean }) => Promise<void>;
	handleSidebarDrop: (dragData: any) => Promise<void>;

	scheduleTask: (taskId: string, start: Date, end: Date, isAllDay?: boolean) => Promise<void>;
	unscheduleEvent: (eventId: string) => Promise<void>;

	// Filters
	setFilters: (filters: FilterOptions) => void;
	clearFilters: () => void;
	updateEventOptimistic: (eventData: CalendarEvent, isOptimistic?: boolean) => Promise<void>;

	// Add this new property
	updatingEvents: Set<string>;
}

const CalendarEventContext = createContext<CalendarEventContextType | undefined>(undefined);

export function CalendarEventProvider({ children }: { children: ReactNode }) {
	// Data state
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [agendaData, setAgendaData] = useState<AgendaData | null>(null);

	// Multi-calendar state
	const [visibleCalendars, setVisibleCalendars] = useState<Set<string>>(new Set());
	const [calendarColors, setCalendarColors] = useState<Map<string, string>>(new Map());
	const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
	const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

	// View state
	const [currentView, setCurrentView] = useState<CalendarViewType>(DEFAULT_VIEW.type);
	const [currentDate, setCurrentDate] = useState<Date>(DEFAULT_VIEW.date);
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

	// Modal state
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [slotSelectionStartDate, setSlotSelectionStartDate] = useState<Date | null>(null);
	const [slotSelectionEndDate, setSlotSelectionEndDate] = useState<Date | null>(null);
	const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
	const [isUserModalOpen, setIsUserModalOpen] = useState(false);
	const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);

	const [isDragging, setIsDragging] = useState(false);
	const [draggedItem, setDraggedItem] = useState<CalendarEvent | Task | null>(null);
	const [dragType, setDragType] = useState<'calendar-event' | 'unscheduled-task' | null>(null);
	const [updatingEvents, setUpdatingEvents] = useState<Set<string>>(new Set());

	const [dragDropData, setDragDropData] = useState<DragDropData>({
		draggedItem: null,
		dragFromOutsideItem: null,
	});

	const [filters, setFilters] = useState<FilterOptions>({});
	const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
	const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { user } = useUser();
	const { activeCalendar, calendars: allUserCalendars } = useCalendars();
	const { toast } = useToast();

	const isAllCalendarsView = useCallback(() => {
		const path = window.location.pathname;
		return path === '/home' || path === '/' || (!activeCalendar && path.includes('/home'));
	}, [activeCalendar]);

	const startDrag = useCallback(
		(item: CalendarEvent | Task, type: 'calendar-event' | 'unscheduled-task') => {
			console.log('Starting drag:', { item: item.title, type });
			setIsDragging(true);
			setDraggedItem(item);
			setDragType(type);
		},
		[]
	);

	const endDrag = useCallback(() => {
		console.log('Ending drag');
		setIsDragging(false);
		setDraggedItem(null);
		setDragType(null);
	}, []);

	const getCurrentCalendarInfo = useCallback(
		(calendarUid?: string) => {
			if (calendarUid) {
				const color = calendarColors.get(calendarUid) || '#3174ad';
				return { uid: calendarUid, color };
			}

			if (activeCalendar) {
				const color = calendarColors.get(activeCalendar.uid) || activeCalendar.color || '#3174ad';
				return { uid: activeCalendar.uid, color };
			}

			// Fallback logic
			let uid = 'default';
			let color = '#3174ad';
			if (user?.myCalendar) {
				uid = user.myCalendar.uid;
				color = calendarColors.get(uid) || user.myCalendar.color || '#3174ad';
			} else if (user?.myCalendars?.[0]?.calendar) {
				uid = user.myCalendars[0].calendar.uid;
				color =
					calendarColors.get(uid) ||
					user.myCalendars[0].color ||
					user.myCalendars[0].calendar.color ||
					'#3174ad';
			}
			return { uid, color };
		},
		[activeCalendar, user, calendarColors]
	);

	const scheduleTask = useCallback(
		async (taskId: string, start: Date, end: Date, isAllDay = false) => {
			const task = tasks.find(t => t.id === taskId);
			if (!task) {
				console.error('Task not found:', taskId);
				return;
			}

			setError(null);
			const { uid, color } = getCurrentCalendarInfo(task.uid);

			let finalEndDate = end;
			if (!isAllDay && start) {
				finalEndDate = new Date(start.getTime() + 60 * 60 * 1000);
			}

			try {
				const updatedEvent: CalendarEvent = {
					...task,
					start,
					end: finalEndDate,
					isAllDay,
					updatedAt: new Date(),
					color: task.color || color,
				};

				const response = await apiClient.put(`/api/events/${taskId}`, {
					uid,
					eventData: updatedEvent,
				});

				const updatedEventFromApi = response.data.event;
				const finalUpdatedEvent = {
					...updatedEventFromApi,
					start: new Date(updatedEventFromApi.start),
					end: new Date(updatedEventFromApi.end),
					createdAt: new Date(updatedEventFromApi.createdAt),
					updatedAt: new Date(updatedEventFromApi.updatedAt),
					color: updatedEvent.color,
				};

				setTasks(prev => prev.filter(t => t.id !== taskId));
				setEvents(prev => [...prev, finalUpdatedEvent]);

				toast({
					title: 'Task Scheduled',
					description: `"${task.title}" has been scheduled`,
				});
			} catch (err: any) {
				console.error('Failed to schedule task:', err);
				setError(err.response?.data?.errors?.msg || 'Failed to schedule task');
				toast({
					title: 'Error',
					description: 'Failed to schedule task',
					variant: 'destructive',
				});
				throw err;
			}
		},
		[tasks, getCurrentCalendarInfo, toast]
	);

	const unscheduleEvent = useCallback(
		async (eventId: string) => {
			const event = events.find(e => e.id === eventId);
			if (!event) {
				console.error('Event not found:', eventId);
				return;
			}

			setError(null);
			const { uid, color } = getCurrentCalendarInfo(event.uid);

			try {
				const updatedTask = {
					...event,
					start: null,
					end: null,
					isAllDay: false,
					updatedAt: new Date(),
				};

				const response = await apiClient.put(`/api/events/${eventId}`, {
					uid,
					eventData: updatedTask,
				});

				const updatedTaskFromApi = response.data.event;
				const finalUpdatedTask: Task = {
					...updatedTaskFromApi,
					id: updatedTaskFromApi.id,
					title: updatedTaskFromApi.title,
					completed: updatedTaskFromApi.status === 'done',
					dueDate: updatedTaskFromApi.end ? new Date(updatedTaskFromApi.end) : undefined,
					createdAt: new Date(updatedTaskFromApi.createdAt),
					updatedAt: new Date(updatedTaskFromApi.updatedAt),
					isDraggable: true,
					category: updatedTaskFromApi.tags?.[0] || 'task',
					isDone: updatedTaskFromApi.status === 'done',
					hasSubtasks: updatedTaskFromApi.subtasks?.length > 0,
					completedSubtasks:
						updatedTaskFromApi.subtasks?.filter((sub: any) => sub.status === 'done').length || 0,
					totalSubtasks: updatedTaskFromApi.subtasks?.length || 0,
					canHaveSubtasks: updatedTaskFromApi.hierarchyLevel < 3,
					isSubtask: !!updatedTaskFromApi.parentId,
					color: event.color || color,
					description: updatedTaskFromApi.description,
					priority: updatedTaskFromApi.priority || 'medium',
					status: updatedTaskFromApi.status,
					tags: updatedTaskFromApi.tags || [],
					assignee: updatedTaskFromApi.assignee || [],
					uid: updatedTaskFromApi.uid,
					resourceId: updatedTaskFromApi.resourceId,
					parentId: updatedTaskFromApi.parentId,
					content: updatedTaskFromApi.content,
					archived: updatedTaskFromApi.archived || false,
					hierarchyLevel: updatedTaskFromApi.hierarchyLevel || 0,
					sortOrder: updatedTaskFromApi.sortOrder || 0,
					dependsOn: updatedTaskFromApi.dependsOn || [],
					blocks: updatedTaskFromApi.blocks || [],
					progressPercentage: updatedTaskFromApi.progressPercentage || 0,
					start: undefined,
					end: undefined,
				};

				// Move from events to tasks
				setEvents(prev => prev.filter(e => e.id !== eventId));
				setTasks(prev => [...prev, finalUpdatedTask]);

				toast({
					title: 'Event Unscheduled',
					description: `"${event.title}" has been moved to unscheduled tasks`,
				});
			} catch (err: any) {
				console.error('Failed to unschedule event:', err);
				setError(err.response?.data?.errors?.msg || 'Failed to unschedule event');
				toast({
					title: 'Error',
					description: 'Failed to unschedule event',
					variant: 'destructive',
				});
				throw err;
			}
		},
		[events, getCurrentCalendarInfo, toast]
	);

	// Handle drop on calendar
	const handleCalendarDrop = useCallback(
		async (dropInfo: { start: Date; end: Date; allDay?: boolean }) => {
			if (dragType === 'unscheduled-task' && draggedItem) {
				try {
					console.log('Scheduling task:', draggedItem.id);
					await scheduleTask(
						draggedItem.id,
						dropInfo.start,
						dropInfo.end,
						dropInfo.allDay || false
					);
					toast({
						title: 'Task Scheduled',
						description: `"${draggedItem.title}" has been scheduled`,
					});
				} catch (error) {
					console.error('Failed to schedule task:', error);
					toast({
						title: 'Error',
						description: 'Failed to schedule task',
						variant: 'destructive',
					});
				}
			}
			endDrag();
		},
		[dragType, draggedItem, scheduleTask, toast, endDrag]
	);

	// Handle drop on sidebar
	const handleSidebarDrop = useCallback(
		async (dragData: any) => {
			if (dragData.type === 'calendar-event' && dragData.event) {
				try {
					console.log('Unscheduling event:', dragData.event.id);
					await unscheduleEvent(dragData.event.id);
					toast({
						title: 'Event Unscheduled',
						description: `"${dragData.event.title}" moved to unscheduled tasks`,
					});
				} catch (error) {
					console.error('Failed to unschedule event:', error);
					toast({
						title: 'Error',
						description: 'Failed to unschedule event',
						variant: 'destructive',
					});
				}
			}
		},
		[unscheduleEvent, toast]
	);

	const updateEventOptimistic = useCallback(
		async (eventData: CalendarEvent, isOptimistic = true, retryCount = 0) => {
			const maxRetries = 2;
			setError(null);

			// Add to updating set
			setUpdatingEvents(prev => new Set(prev).add(eventData.id));

			const targetCalendarUid = eventData.uid;
			const { color: eventColor } = getCurrentCalendarInfo(eventData.uid);

			const optimisticEvent = {
				...eventData,
				color: eventData.color || eventColor,
				updatedAt: new Date(),
			};

			let previousEvents: CalendarEvent[] = [];
			let previousTasks: Task[] = [];

			if (isOptimistic) {
				setEvents(prev => {
					previousEvents = [...prev];
					return prev.map(e => (e.id === eventData.id ? optimisticEvent : e));
				});

				setTasks((prev: any) => {
					previousTasks = [...prev];
					return prev.map((t: any) =>
						t.id === eventData.id
							? {
									...optimisticEvent,
									completed: optimisticEvent.status === 'done',
									isDraggable: true,
									category: optimisticEvent.tags?.[0] || 'task',
							  }
							: t
					);
				});
			}

			try {
				const response = await apiClient.put(`/api/events/${eventData.id}`, {
					uid: targetCalendarUid,
					eventData,
				});

				const updatedEventDataFromApi = response.data.event;
				const serverEvent = {
					...updatedEventDataFromApi,
					start: updatedEventDataFromApi.start ? new Date(updatedEventDataFromApi.start) : null,
					end: updatedEventDataFromApi.end ? new Date(updatedEventDataFromApi.end) : null,
					createdAt: new Date(updatedEventDataFromApi.createdAt),
					updatedAt: new Date(updatedEventDataFromApi.updatedAt),
					color: eventData.color || eventColor,
				};

				setEvents(prev => prev.map(e => (e.id === eventData.id ? serverEvent : e)));
				setTasks(prev =>
					prev.map(t =>
						t.id === eventData.id
							? {
									...serverEvent,
									completed: serverEvent.status === 'done',
									isDraggable: true,
									category: serverEvent.tags?.[0] || 'task',
							  }
							: t
					)
				);

				// Only show success toast for non-drag operations to avoid spam
				if (!isOptimistic || retryCount > 0) {
					toast({
						title: 'Success',
						description: 'Event updated successfully',
					});
				}
			} catch (err: any) {
				console.error('Failed to update event:', err);

				// Retry logic for network errors
				if (
					retryCount < maxRetries &&
					(err.code === 'NETWORK_ERROR' || err.response?.status >= 500)
				) {
					console.log(`Retrying update (attempt ${retryCount + 1}/${maxRetries})`);
					setTimeout(() => {
						updateEventOptimistic(eventData, false, retryCount + 1);
					}, Math.pow(2, retryCount) * 1000); // Exponential backoff
					return;
				}

				if (isOptimistic) {
					setEvents(previousEvents);
					setTasks(previousTasks);
				}

				setError(err.response?.data?.errors?.msg || 'Failed to update event');
				toast({
					title: 'Error',
					description:
						retryCount > 0 ? 'Failed to update event after retries' : 'Failed to update event',
					variant: 'destructive',
				});
				throw err;
			} finally {
				// Remove from updating set
				setUpdatingEvents(prev => {
					const newSet = new Set(prev);
					newSet.delete(eventData.id);
					return newSet;
				});
			}
		},
		[getCurrentCalendarInfo, toast]
	);

	const activeFilterCount = Object.keys(filters).filter(key => {
		const filterKey = key as keyof FilterOptions;
		if (filterKey === 'showCompleted' || filterKey === 'showArchived') {
			return filters[filterKey] !== undefined;
		}
		return !!filters[filterKey];
	}).length;
	const hasActiveFilters = activeFilterCount > 0;

	// Initialize visible calendars when user calendars load
	useEffect(() => {
		if (allUserCalendars && allUserCalendars.length > 0) {
			const newVisibleCalendars = new Set<string>();
			const newCalendarColors = new Map<string, string>();

			allUserCalendars.forEach(cal => {
				newVisibleCalendars.add(cal.uid);
				// Use calendar's database color as default, allow user customization
				const defaultColor = cal.color || '#3174ad';
				const userColor = localStorage.getItem(`calendar-color-${cal.uid}`) || defaultColor;
				newCalendarColors.set(cal.uid, userColor);
			});

			setVisibleCalendars(newVisibleCalendars);
			setCalendarColors(newCalendarColors);
		}
	}, [allUserCalendars]);

	const toggleCalendarVisibility = useCallback((calendarUid: string) => {
		setVisibleCalendars(prev => {
			const newSet = new Set(prev);
			if (newSet.has(calendarUid)) {
				newSet.delete(calendarUid);
			} else {
				newSet.add(calendarUid);
			}
			return newSet;
		});
	}, []);

	const setCalendarColor = useCallback((calendarUid: string, color: string) => {
		setCalendarColors(prev => {
			const newMap = new Map(prev);
			newMap.set(calendarUid, color);
			return newMap;
		});

		// Persist user color preference to localStorage
		localStorage.setItem(`calendar-color-${calendarUid}`, color);

		// Update events and tasks with new color
		setEvents(prev => prev.map(event => (event.uid === calendarUid ? { ...event, color } : event)));
		setTasks(prev => prev.map(task => (task.uid === calendarUid ? { ...task, color } : task)));
	}, []);

	// Fetch events for specific calendar or all calendars
	const fetchEvents = useCallback(
		async (calendarUidToFetch?: string, silent = false) => {
			if (!user) {
				setEvents([]);
				if (!silent) setLoading(false);
				return;
			}

			if (!silent) {
				setSyncStatus('syncing');
				setLoading(true);
			}
			setError(null);

			// Capture the view state at the time of fetch initiation for later comparison
			const fetchInitiatedForCalendarUid = calendarUidToFetch;
			const fetchInitiatedInAllCalendarsView = !calendarUidToFetch && isAllCalendarsView();

			try {
				let allEvents: CalendarEvent[] = [];

				if (calendarUidToFetch) {
					// Fetch single calendar
					console.log('Fetching events for single calendar:', calendarUidToFetch);
					const { color: calendarColor } = getCurrentCalendarInfo(calendarUidToFetch);
					const response = await apiClient.get(`/api/events/${calendarUidToFetch}?scheduled=true`);
					allEvents = (response.data || []).map((event: any) => ({
						...event,
						start: event.start ? new Date(event.start) : null,
						end: event.end ? new Date(event.end) : null,
						createdAt: new Date(event.createdAt),
						updatedAt: new Date(event.updatedAt),
						isDone: event.status === 'done',
						hasSubtasks: event.subtasks?.length > 0,
						completedSubtasks:
							event.subtasks?.filter((sub: any) => sub.status === 'done').length || 0,
						totalSubtasks: event.subtasks?.length || 0,
						canHaveSubtasks: event.hierarchyLevel < 3,
						isSubtask: !!event.parentId,
						color: calendarColor,
					}));
				} else {
					// Fetch all visible calendars (for "All Calendars" view)
					const visibleCalendarUids = Array.from(visibleCalendars);
					console.log('Fetching events for all calendars:', visibleCalendarUids);

					if (visibleCalendarUids.length === 0) {
						console.log('No visible calendars found');
						setEvents(prevEvents => {
							const currentlyInAllCalendarsView = isAllCalendarsView();
							if (fetchInitiatedInAllCalendarsView && currentlyInAllCalendarsView) {
								return [];
							}
							return prevEvents;
						});
						setSyncStatus('success');
						setLastSyncTime(new Date());
						if (!silent) setLoading(false);
						return;
					}

					for (const calUid of visibleCalendarUids) {
						const calColor = calendarColors.get(calUid) || '#3174ad';
						try {
							console.log(`Fetching events for calendar: ${calUid}`);
							const response = await apiClient.get(`/api/events/${calUid}?scheduled=true`);
							const calendarEventsData = (response.data || []).map((event: any) => ({
								...event,
								start: event.start ? new Date(event.start) : null,
								end: event.end ? new Date(event.end) : null,
								createdAt: new Date(event.createdAt),
								updatedAt: new Date(event.updatedAt),
								isDone: event.status === 'done',
								hasSubtasks: event.subtasks?.length > 0,
								completedSubtasks:
									event.subtasks?.filter((sub: any) => sub.status === 'done').length || 0,
								totalSubtasks: event.subtasks?.length || 0,
								canHaveSubtasks: event.hierarchyLevel < 3,
								isSubtask: !!event.parentId,
								color: calColor,
							}));
							console.log(`Found ${calendarEventsData.length} events for calendar ${calUid}`);
							allEvents = [...allEvents, ...calendarEventsData];
						} catch (err) {
							console.warn(`Failed to fetch events for calendar ${calUid}:`, err);
						}
					}
				}

				console.log(`Total events loaded: ${allEvents.length}`);

				// Conditional state update for setEvents
				setEvents(prevEvents => {
					const currentActiveCalUid = activeCalendar?.uid; // Get fresh activeCalendar UID
					const currentlyInAllView = isAllCalendarsView(); // Get fresh view state

					if (fetchInitiatedForCalendarUid) {
						// Fetch was for a specific calendar
						// Update if the fetch was for the currently active calendar AND we are not in the "all calendars" view
						if (currentActiveCalUid === fetchInitiatedForCalendarUid && !currentlyInAllView) {
							return allEvents;
						}
					} else if (fetchInitiatedInAllCalendarsView) {
						// Fetch was for "all calendars"
						// Update if the fetch was for "all calendars" AND we are currently in the "all calendars" view
						if (currentlyInAllView) {
							return allEvents;
						}
					}
					// If conditions are not met, this fetch is stale, return previous events
					console.log(
						`setEvents: Stale fetch detected. Requested: ${
							fetchInitiatedForCalendarUid || 'all'
						}, Current active: ${currentActiveCalUid}, Current view all: ${currentlyInAllView}. Keeping prevEvents.`
					);
					return prevEvents;
				});

				setSyncStatus('success');
				setLastSyncTime(new Date());
			} catch (err: any) {
				console.error('Failed to fetch events:', err);
				setError(err.response?.data?.errors?.msg || 'Failed to fetch events');
				setSyncStatus('error');
				if (!silent) {
					toast({
						title: 'Error',
						description: 'Failed to fetch events',
						variant: 'destructive',
					});
				}
			}

			if (!silent) setLoading(false);
		},
		[
			user,
			getCurrentCalendarInfo,
			visibleCalendars,
			calendarColors,
			toast,
			activeCalendar,
			isAllCalendarsView,
		] // Ensure activeCalendar and isAllCalendarsView are dependencies
	);

	// Fetch tasks for specific calendar or all calendars
	const fetchTasks = useCallback(
		async (calendarUidToFetch?: string, silent = false) => {
			if (!user) {
				setTasks([]);
				return;
			}

			if (!silent) setSyncStatus('syncing');
			setError(null);

			// Capture the view state at the time of fetch initiation
			const fetchInitiatedForCalendarUid = calendarUidToFetch;
			const fetchInitiatedInAllCalendarsView = !calendarUidToFetch && isAllCalendarsView();

			try {
				let allTasks: Task[] = [];

				if (calendarUidToFetch) {
					// Fetch single calendar
					console.log('Fetching tasks for single calendar:', calendarUidToFetch);
					const { color: calendarColor } = getCurrentCalendarInfo(calendarUidToFetch);
					const response = await apiClient.get(`/api/events/${calendarUidToFetch}?scheduled=false`);
					allTasks = (response.data || []).map((task: any) => ({
						...task,
						id: task.id,
						title: task.title,
						completed: task.status === 'done',
						dueDate: task.end ? new Date(task.end) : undefined,
						createdAt: new Date(task.createdAt),
						updatedAt: new Date(task.updatedAt),
						isDraggable: task.isDraggable !== false,
						category: task.tags?.[0] || 'task',
						isDone: task.status === 'done',
						hasSubtasks: task.subtasks?.length > 0,
						completedSubtasks:
							task.subtasks?.filter((sub: any) => sub.status === 'done').length || 0,
						totalSubtasks: task.subtasks?.length || 0,
						canHaveSubtasks: task.hierarchyLevel < 3,
						isSubtask: !!task.parentId,
						color: calendarColor,
					}));
				} else {
					// Fetch all visible calendars
					const visibleCalendarUids = Array.from(visibleCalendars);
					console.log('Fetching tasks for all calendars:', visibleCalendarUids);

					if (visibleCalendarUids.length === 0) {
						console.log('No visible calendars found for tasks');
						if (!silent) {
							setSyncStatus('success');
							setLastSyncTime(new Date());
						}
						return;
					}
					for (const calUid of visibleCalendarUids) {
						const calColor = calendarColors.get(calUid) || '#3174ad';
						try {
							console.log(`Fetching tasks for calendar: ${calUid}`);
							const response = await apiClient.get(`/api/events/${calUid}?scheduled=false`);
							const calendarTasksData = (response.data || []).map((task: any) => ({
								...task,
								id: task.id,
								title: task.title,
								completed: task.status === 'done',
								dueDate: task.end ? new Date(task.end) : undefined,
								createdAt: new Date(task.createdAt),
								updatedAt: new Date(task.updatedAt),
								isDraggable: task.isDraggable !== false,
								category: task.tags?.[0] || 'task',
								isDone: task.status === 'done',
								hasSubtasks: task.subtasks?.length > 0,
								completedSubtasks:
									task.subtasks?.filter((sub: any) => sub.status === 'done').length || 0,
								totalSubtasks: task.subtasks?.length || 0,
								canHaveSubtasks: task.hierarchyLevel < 3,
								isSubtask: !!task.parentId,
								color: calColor,
							}));
							console.log(`Found ${calendarTasksData.length} tasks for calendar ${calUid}`);
							allTasks = [...allTasks, ...calendarTasksData];
						} catch (err) {
							console.warn(`Failed to fetch tasks for calendar ${calUid}:`, err);
						}
					}
				}

				console.log(`Total tasks loaded: ${allTasks.length}`);
				// Conditional state update for setTasks
				setTasks(prevTasks => {
					const currentActiveCalUid = activeCalendar?.uid;
					const currentlyInAllView = isAllCalendarsView();

					if (fetchInitiatedForCalendarUid) {
						// Fetch was for a specific calendar
						// Update if the fetch was for the currently active calendar AND we are not in the "all calendars" view
						if (currentActiveCalUid === fetchInitiatedForCalendarUid && !currentlyInAllView) {
							return allTasks;
						}
					} else if (fetchInitiatedInAllCalendarsView) {
						// Fetch was for "all calendars"
						// Update if the fetch was for "all calendars" AND we are currently in the "all calendars" view
						if (currentlyInAllView) {
							return allTasks;
						}
					}
					// If conditions are not met, this fetch is stale, return previous tasks
					console.log(
						`setTasks: Stale fetch detected. Requested: ${
							fetchInitiatedForCalendarUid || 'all'
						}, Current active: ${currentActiveCalUid}, Current view all: ${currentlyInAllView}. Keeping prevTasks.`
					);
					return prevTasks;
				});

				if (!silent) {
					setSyncStatus('success');
					setLastSyncTime(new Date());
				}
			} catch (err: any) {
				console.error('Failed to fetch tasks:', err);
				setError(err.response?.data?.errors?.msg || 'Failed to fetch tasks');
				if (!silent) setSyncStatus('error');
			}
		},
		[
			user,
			getCurrentCalendarInfo,
			visibleCalendars,
			calendarColors,
			activeCalendar,
			isAllCalendarsView,
		] // Ensure activeCalendar and isAllCalendarsView are dependencies
	);

	// Refresh all calendars
	const refreshAll = useCallback(
		async (force = false) => {
			if (syncStatus === 'syncing' && !force) return;

			setSyncStatus('syncing');
			await Promise.all([fetchEvents(undefined, false), fetchTasks(undefined, false)]);

			if (currentView === 'agenda') {
				await fetchAgenda();
			}
		},
		[syncStatus, fetchEvents, fetchTasks, currentView]
	);

	// Refresh specific calendar
	const refreshCalendar = useCallback(
		async (calendarUid: string) => {
			await Promise.all([fetchEvents(calendarUid, true), fetchTasks(calendarUid, true)]);
		},
		[fetchEvents, fetchTasks]
	);

	// Fetch agenda data
	const fetchAgenda = useCallback(async () => {
		if (!user) return;

		try {
			const response = await apiClient.get('/api/events/agenda');
			setAgendaData(response.data);
		} catch (err: any) {
			console.error('Failed to fetch agenda:', err);
			setError(err.response?.data?.errors?.msg || 'Failed to fetch agenda');
		}
	}, [user]);

	const addEvent = useCallback(
		async (eventData: EventFormData, calendarUid?: string) => {
			if (!user) return;

			// Use provided calendarUid or get default
			const targetUid = calendarUid || eventData.uid;
			const { uid, color } = getCurrentCalendarInfo(targetUid);
			setError(null);

			try {
				const response = await apiClient.post('/api/events/add', {
					uid,
					eventData: {
						...eventData,
						id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						uid, // Ensure uid is in eventData too
					},
				});

				const newEvent = {
					...response.data.event,
					start: response.data.event.start ? new Date(response.data.event.start) : null,
					end: response.data.event.end ? new Date(response.data.event.end) : null,
					createdAt: new Date(response.data.event.createdAt),
					updatedAt: new Date(response.data.event.updatedAt),
					color,
				};

				// Update appropriate list based on whether it's scheduled
				if (newEvent.start && newEvent.end) {
					setEvents(prev => [...prev, newEvent]);
				} else {
					setTasks(prev => [
						...prev,
						{
							...newEvent,
							completed: newEvent.status === 'done',
							isDraggable: true,
							category: newEvent.tags?.[0] || 'task',
						},
					]);
				}

				toast({
					title: 'Success',
					description: 'Event created successfully',
				});
			} catch (err: any) {
				console.error('Failed to add event:', err);
				setError(err.response?.data?.errors?.msg || 'Failed to add event');
				toast({
					title: 'Error',
					description: 'Failed to create event',
					variant: 'destructive',
				});
				throw err;
			}
		},
		[user, getCurrentCalendarInfo, toast]
	);

	const updateEvent = useCallback(
		async (eventData: CalendarEvent) => {
			return updateEventOptimistic(eventData, true);
		},
		[updateEventOptimistic]
	);

	// Delete event
	const deleteEvent = useCallback(
		async (id: string) => {
			setError(null);

			try {
				await apiClient.delete(`/api/events/${id}`);
				setEvents(prev => prev.filter(e => e.id !== id));
				setTasks(prev => prev.filter(t => t.id !== id));

				if (selectedEvent && selectedEvent.id === id) {
					setSelectedEvent(null);
				}

				toast({
					title: 'Success',
					description: 'Event deleted successfully',
				});
			} catch (err: any) {
				console.error('Failed to delete event:', err);
				setError(err.response?.data?.errors?.msg || 'Failed to delete event');
				toast({
					title: 'Error',
					description: 'Failed to delete event',
					variant: 'destructive',
				});
				throw err;
			}
		},
		[selectedEvent, toast]
	);

	// Toggle event done
	const toggleEventDone = useCallback(
		async (id: string) => {
			const event = events.find(e => e.id === id) || tasks.find(t => t.id === id);
			if (event) {
				const newStatus: EventStatus = event.isDone ? 'todo' : 'done';
				await updateEvent({ ...event, status: newStatus, isDone: !event.isDone });
			}
		},
		[events, tasks, updateEvent]
	);

	// Repeat event
	const repeatEvent = useCallback(
		async (id: string, repeatCount: number) => {
			const event = events.find(e => e.id === id);
			if (!event || !event.start || !event.end) return;

			const eventList = [];
			let startDate = new Date(event.start);
			let endDate = new Date(event.end);

			for (let i = 1; i <= repeatCount; i++) {
				startDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
				endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

				eventList.push({
					...event,
					id: `${event.id}_repeat_${i}`,
					start: new Date(startDate),
					end: new Date(endDate),
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}

			try {
				const { uid, color } = getCurrentCalendarInfo(event.uid);
				const promises = eventList.map(eventItem =>
					apiClient.post('/api/events/add', {
						uid,
						eventData: { ...eventItem, color },
					})
				);

				await Promise.all(promises);
				await fetchEvents(event.uid, true);

				toast({
					title: 'Success',
					description: `Event repeated ${repeatCount} times`,
				});
			} catch (err: any) {
				console.error('Failed to repeat event:', err);
				toast({
					title: 'Error',
					description: 'Failed to repeat event',
					variant: 'destructive',
				});
			}
		},
		[events, getCurrentCalendarInfo, fetchEvents, toast]
	);

	// Bulk update events
	const bulkUpdateEvents = useCallback(
		async (eventIds: string[], updates: Partial<CalendarEvent>) => {
			try {
				// Get first event to determine calendar
				const firstEvent =
					events.find(e => eventIds.includes(e.id)) || tasks.find(t => eventIds.includes(t.id));
				if (!firstEvent) return;

				const { uid, color } = getCurrentCalendarInfo(firstEvent.uid);
				await apiClient.post('/api/events/bulk-update', {
					uid,
					eventIds,
					updates,
				});

				const effectiveColor = updates.color || color;
				setEvents(prev =>
					prev.map(e => (eventIds.includes(e.id) ? { ...e, ...updates, color: effectiveColor } : e))
				);
				setTasks(prev =>
					prev.map(t => (eventIds.includes(t.id) ? { ...t, ...updates, color: effectiveColor } : t))
				);

				toast({
					title: 'Success',
					description: `${eventIds.length} events updated`,
				});
			} catch (err: any) {
				console.error('Failed to bulk update:', err);
				toast({
					title: 'Error',
					description: 'Failed to update events',
					variant: 'destructive',
				});
			}
		},
		[events, tasks, getCurrentCalendarInfo, toast]
	);

	// Modal management
	const selectEvent = useCallback((event: CalendarEvent | null) => {
		setSelectedEvent(event);
	}, []);

	const openAddModal = useCallback((startDate?: Date, endDate?: Date) => {
		setSelectedEvent(null);

		let finalStartDate: Date | null = null;
		let finalEndDate: Date | null = null;

		if (startDate instanceof Date && !isNaN(startDate.valueOf())) {
			finalStartDate = startDate;
			if (
				endDate instanceof Date &&
				!isNaN(endDate.valueOf()) &&
				endDate.getTime() > startDate.getTime()
			) {
				finalEndDate = endDate;
			} else {
				finalEndDate = new Date(startDate.getTime() + 60 * 60 * 1000);
			}
		}

		setSlotSelectionStartDate(finalStartDate);
		setSlotSelectionEndDate(finalEndDate);
		setIsAddModalOpen(true);
	}, []);

	const openEditModal = useCallback((event: CalendarEvent) => {
		setSelectedEvent(event);
		setIsEditModalOpen(true);
	}, []);

	const closeAllModals = useCallback(() => {
		setIsAddModalOpen(false);
		setIsEditModalOpen(false);
		setIsCalendarModalOpen(false);
		setIsUserModalOpen(false);
		setSelectedEvent(null);
		setSlotSelectionStartDate(null);
		setSlotSelectionEndDate(null);
	}, []);

	// Navigation
	const navigateToToday = useCallback(() => {
		setCurrentDate(new Date());
	}, []);

	const handleDrop = useCallback(
		async (dropData: { start: Date; end: Date; allDay?: boolean }) => {
			const { draggedItem } = dragDropData;
			if (!draggedItem) return;

			const updatedItem = {
				...draggedItem,
				start: dropData.start,
				end: dropData.end,
				isAllDay: dropData.allDay || false,
			};

			await updateEvent(updatedItem);
			setDraggedItem(null);
		},
		[dragDropData, updateEvent, setDraggedItem]
	);

	// Filter effects
	useEffect(() => {
		let result = [...events];

		// Apply visibility filter first
		result = result.filter(event => visibleCalendars.has(event.uid));

		if (filters.search) {
			result = result.filter(
				event =>
					event.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
					(event.description &&
						event.description.toLowerCase().includes(filters.search!.toLowerCase()))
			);
		}

		if (filters.status) {
			result = result.filter(event => event.status === filters.status);
		}

		if (filters.priority) {
			result = result.filter(event => event.priority === filters.priority);
		}

		if (filters.assignee) {
			result = result.filter(event => event.assignee && event.assignee.includes(filters.assignee!));
		}

		if (filters.dateRange) {
			result = result.filter(event => {
				if (!event.start) return false;
				const eventStart = new Date(event.start);
				return eventStart >= filters.dateRange!.start && eventStart <= filters.dateRange!.end;
			});
		}

		setFilteredEvents(result);
	}, [events, filters, visibleCalendars]);

	useEffect(() => {
		const eventToTask = (event: CalendarEvent): Task => {
			return {
				id: event.id,
				title: event.title,
				description: event.description || undefined,
				completed: event.status === 'done',
				start: event.start || undefined,
				end: event.end || undefined,
				dueDate: event.end || undefined,
				priority: event.priority || 'medium',
				category: (event.tags && event.tags.length > 0 ? event.tags[0] : 'task') as any,
				status: event.status,
				tags: event.tags || [],
				assignee: event.assignee || [],
				createdAt: event.createdAt,
				updatedAt: event.updatedAt,
				isDraggable: true,
				hasSubtasks: event.hasSubtasks || false,
				completedSubtasks: event.completedSubtasks || 0,
				totalSubtasks: event.totalSubtasks || 0,
				progressPercentage: event.progressPercentage || 0,
				uid: event.uid,
				resourceId: event.resourceId,
				parentId: event.parentId,
				content: event.content,
				canHaveSubtasks: event.canHaveSubtasks || false,
				isSubtask: event.isSubtask || false,
				isDone: false,
				archived: false,
				isAllDay: event.isAllDay || false,
				hierarchyLevel: event.hierarchyLevel || 0,
				sortOrder: event.sortOrder || 0,
				dependsOn: event.dependsOn || [],
				blocks: event.blocks || [],
				color: event.color,
			};
		};

		// Deduplicate tasks by ID, giving preference to items from 'tasks'
		const taskMap = new Map<string, Task>();
		tasks.forEach(task => {
			if (visibleCalendars.has(task.uid)) {
				taskMap.set(task.id, task);
			}
		});
		events.map(eventToTask).forEach(task => {
			if (!taskMap.has(task.id) && visibleCalendars.has(task.uid)) {
				taskMap.set(task.id, task);
			}
		});

		let resultTasks: Task[] = Array.from(taskMap.values());

		if (filters.search) {
			resultTasks = resultTasks.filter(
				task =>
					task.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
					(task.description &&
						task.description.toLowerCase().includes(filters.search!.toLowerCase()))
			);
		}

		if (filters.category) {
			resultTasks = resultTasks.filter(task => task.category === filters.category);
		}

		if (filters.priority) {
			resultTasks = resultTasks.filter(task => task.priority === filters.priority);
		}

		setFilteredTasks(resultTasks);
	}, [events, tasks, filters, visibleCalendars]);

	// const isAllCalendarsView = useCallback(() => { // Moved to the top
	// 	const path = window.location.pathname;
	// 	return path === '/home' || path === '/' || (!activeCalendar && path.includes('/home'));
	// }, [activeCalendar]);
	useEffect(() => {
		console.log('CalendarEventContext Debug:', {
			pathname: window.location.pathname,
			isAllCalendarsView: isAllCalendarsView(),
			activeCalendar: activeCalendar?.uid || null,
			visibleCalendarsCount: visibleCalendars.size,
			visibleCalendars: Array.from(visibleCalendars),
			allUserCalendars: allUserCalendars?.length || 0,
		});
	}, [activeCalendar, visibleCalendars, allUserCalendars, isAllCalendarsView]);

	useEffect(() => {
		const loadData = async () => {
			if (!user) {
				// Clear data when user logs out or is not available
				setEvents([]);
				setTasks([]);
				setLoading(false);
				return;
			}

			// setLoading(true) should be here to cover the entire async operation
			setLoading(true);

			if (isAllCalendarsView() && visibleCalendars.size > 0) {
				console.log('Loading All Calendars view with calendars:', Array.from(visibleCalendars));
				// Pass undefined to fetchEvents/fetchTasks for "all calendars" scenario
				await Promise.all([fetchEvents(undefined), fetchTasks(undefined)]);
			} else if (activeCalendar && !isAllCalendarsView()) {
				console.log('Loading single calendar view:', activeCalendar.uid);
				await Promise.all([fetchEvents(activeCalendar.uid), fetchTasks(activeCalendar.uid)]);
			} else {
				// If no specific calendar is active and not in "all calendars" view,
				// or no visible calendars for "all" view, perhaps clear or do nothing.
				// Potentially set loading to false if no fetch is made.
				setLoading(false);
			}

			if (currentView === 'agenda') {
				// fetchAgenda might also need similar protection if it sets shared state
				// and can be called during view transitions.
				await fetchAgenda();
			}
		};

		loadData();
	}, [
		user,
		activeCalendar,
		visibleCalendars,
		currentView,
		isAllCalendarsView,
		fetchEvents,
		fetchTasks,
	]);

	const clearFilters = useCallback(() => {
		setFilters({});
	}, []);

	const value = {
		// Data
		events,
		tasks,
		filteredEvents,
		filteredTasks,
		agendaData,

		// Multi-calendar management
		visibleCalendars,
		calendarColors,
		syncStatus,
		lastSyncTime,

		// View state
		currentView,
		currentDate,
		selectedEvent,

		// Modal state
		isAddModalOpen,
		isEditModalOpen,
		isCalendarModalOpen,
		isUserModalOpen,
		contextMenu,
		slotSelectionStartDate,
		slotSelectionEndDate,

		// Drag and drop
		dragDropData,

		// Filters and loading
		filters,
		loading,
		error,
		hasActiveFilters,
		activeFilterCount,

		// Multi-calendar operations
		toggleCalendarVisibility,
		setCalendarColor,
		refreshAll,
		refreshCalendar,

		// Data operations
		fetchEvents,
		fetchTasks,
		fetchAgenda,
		addEvent,
		updateEvent,
		deleteEvent,
		toggleEventDone,
		repeatEvent,
		bulkUpdateEvents,
		// View and navigation
		setCurrentView,
		setCurrentDate,
		navigateToToday,

		// Selection and modals
		selectEvent,
		openAddModal,
		openEditModal,
		closeAllModals,

		// Context menu
		setContextMenu,

		// Drag and drop
		setDraggedItem,
		handleDrop,

		// Filters
		setFilters,
		clearFilters,
		scheduleTask,
		unscheduleEvent,
		isDragging,
		draggedItem,
		dragType,
		startDrag,
		endDrag,
		handleCalendarDrop,
		handleSidebarDrop,
		updateEventOptimistic,
		updatingEvents,
	};

	return <CalendarEventContext.Provider value={value}>{children}</CalendarEventContext.Provider>;
}

export function useCalendarEvents() {
	const context = useContext(CalendarEventContext);
	if (context === undefined) {
		throw new Error('useCalendarEvents must be used within a CalendarEventProvider');
	}
	return context;
}

// Backward compatibility exports
export const useEvents = useCalendarEvents;
export const useTasks = useCalendarEvents;
export const EventProvider = CalendarEventProvider;
