import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { CalendarData, CalendarSettings } from '@/lib/types';
import apiClient from '@/services/api';
import { useUser } from './UserContext';

export interface CreateCalendarPayload {
	calendarName: string;
	description?: string;
	color?: string;
	isPrivate?: boolean;
	settings?: Partial<CalendarSettings>;
}

interface CalendarContextType {
	calendars: CalendarData[];
	activeCalendar: CalendarData | null;
	loading: boolean;
	error: string | null;
	fetchCalendars: () => Promise<void>;
	setActiveCalendar: (calendarId: string | null) => void;
	createCalendar: (payload: CreateCalendarPayload) => Promise<CalendarData | null>;
	updateCalendar: (calendarId: string, updates: Partial<CalendarData>) => Promise<void>;
	deleteCalendar: (calendarId: string) => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
	const {
		user,
		refreshUser,
		updateCalendarDetails: updateCalendarDetailsInUserContext,
		updateCalendarSnapshot,
	} = useUser();
	const [calendars, setCalendars] = useState<CalendarData[]>([]);
	const [_activeCalendar, _setActiveCalendar] = useState<CalendarData | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [attemptedDefaultCalendarCreation, setAttemptedDefaultCalendarCreation] =
		useState<boolean>(false);
	const [processedUserEmailForDefault, setProcessedUserEmailForDefault] = useState<
		string | undefined
	>(undefined);
	const [hasCompletedInitialFetch, setHasCompletedInitialFetch] = useState<boolean>(false);

	const fetchCalendars = useCallback(async () => {
		if (!user) {
			setCalendars([]);
			_setActiveCalendar(null); // Use renamed state setter
			setHasCompletedInitialFetch(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			// Construct calendars from user data without unnecessary API calls
			const userCalendars = user.myCalendars.map((calEntry: any) => {
				const backendCalendar = calEntry.calendar;
				return {
					...backendCalendar,
					uid: backendCalendar.uid,
					name: backendCalendar.calendarName || backendCalendar.name || 'Unnamed Calendar',
					description: backendCalendar.description || '',
					color: backendCalendar.color || '#3174ad',
					isPrivate: backendCalendar.isPrivate || false,
					settings: backendCalendar.settings || {
						defaultPriority: 'medium',
						defaultStatus: 'todo',
						allowSubtasks: true,
						maxHierarchyLevel: 3,
						autoProgressFromSubtasks: true,
						defaultView: 'week',
						workingHours: { start: '09:00', end: '17:00' },
						timezone: 'UTC',
						enableTimeTracking: true,
						enableDependencies: true,
						enableRecurrence: true,
					},
					users: backendCalendar.users || [],
					owner: backendCalendar.owner,
					createdAt: backendCalendar.createdAt,
					updatedAt: backendCalendar.updatedAt,
				};
			}) as CalendarData[];

			// Only update state if calendars have actually changed
			setCalendars(prevCalendars => {
				if (JSON.stringify(prevCalendars) !== JSON.stringify(userCalendars)) {
					return userCalendars;
				}
				return prevCalendars;
			});

			if (userCalendars.length > 0) {
				const currentActiveId = localStorage.getItem('activeCalendarId');
				const foundActive = userCalendars.find(c => c.uid === currentActiveId);

				_setActiveCalendar(prevActiveCalendar => {
					// Only update active calendar if it's actually different
					if (foundActive) {
						if (!prevActiveCalendar || prevActiveCalendar.uid !== foundActive.uid) {
							return foundActive;
						}
					} else if (userCalendars.length > 0) {
						if (!prevActiveCalendar || prevActiveCalendar.uid !== userCalendars[0].uid) {
							localStorage.setItem('activeCalendarId', userCalendars[0].uid);
							return userCalendars[0];
						}
					} else if (prevActiveCalendar !== null) {
						localStorage.removeItem('activeCalendarId');
						return null;
					}
					return prevActiveCalendar;
				});
			} else if (_activeCalendar !== null) {
				_setActiveCalendar(null); // Only set to null if it wasn't already null
				localStorage.removeItem('activeCalendarId');
			}
		} catch (err: any) {
			console.error('Failed to fetch calendars:', err);
			setError(err.message || 'Failed to load calendars');
			setCalendars([]);
			_setActiveCalendar(null);
		} finally {
			setLoading(false);
			// Mark that we've completed the initial fetch
			setHasCompletedInitialFetch(true);
		}
	}, [user, _activeCalendar]);

	const createCalendar = useCallback(
		async (payload: CreateCalendarPayload): Promise<CalendarData | null> => {
			if (!user) {
				setError('User not authenticated to create calendars.');
				return null;
			}
			setLoading(true);
			setError(null);
			try {
				const apiPayload: any = {
					uid: crypto.randomUUID(),
					calendarName: payload.calendarName,
					description: payload.description,
					color: payload.color,
					isPrivate: payload.isPrivate,
					settings: payload.settings,
				};

				Object.keys(apiPayload).forEach(
					key => apiPayload[key] === undefined && delete apiPayload[key]
				);

				const response = await apiClient.post('/api/calendar/createPersonal', apiPayload);
				const newCalendar = response.data as CalendarData;

				await refreshUser(); // Instead of fetchCalendars, refresh the user data

				return newCalendar;
			} catch (err: any) {
				console.error('Failed to create calendar:', err);
				const errorMessage =
					err.response?.data?.errors?.msg ||
					err.response?.data?.message ||
					err.message ||
					'Failed to create calendar';
				setError(errorMessage);
				return null;
			} finally {
				setLoading(false);
			}
		},
		[user, fetchCalendars]
	);

	const updateCalendar = async (calendarId: string, updates: Partial<CalendarData>) => {
		setLoading(true);
		setError(null);
		try {
			const { name, ...restOfUpdates } = updates;
			const payloadForUserContext: Partial<
				Pick<CalendarData, 'calendarName' | 'description' | 'color' | 'isPrivate' | 'settings'>
			> = {
				...restOfUpdates,
			};
			if (name) {
				payloadForUserContext.calendarName = name;
			}

			// First, apply the change optimistically to both contexts
			if (updateCalendarSnapshot) {
				// Update UserContext's local snapshot first
				updateCalendarSnapshot(calendarId, payloadForUserContext);
				
				// Also update our local calendars state optimistically
				setCalendars(prevCalendars => {
					return prevCalendars.map(calendar => {
						if (calendar.uid === calendarId) {
							return {
								...calendar,
								...(name && { name }), // Update name if provided
								...(payloadForUserContext.calendarName && { name: payloadForUserContext.calendarName }),
								...(payloadForUserContext.description && { description: payloadForUserContext.description }),
								...(payloadForUserContext.color && { color: payloadForUserContext.color }),
								...(payloadForUserContext.isPrivate !== undefined && { isPrivate: payloadForUserContext.isPrivate }),
								...(payloadForUserContext.settings && { settings: {
									...calendar.settings,
									...payloadForUserContext.settings
								}}),
							};
						}
						return calendar;
					});
				});
				
				// Also update active calendar if it's the one being updated
				if (_activeCalendar && _activeCalendar.uid === calendarId) {
					_setActiveCalendar(prevActiveCalendar => {
						if (!prevActiveCalendar) return prevActiveCalendar;
						
						return {
							...prevActiveCalendar,
							...(name && { name }), // Update name if provided
							...(payloadForUserContext.calendarName && { name: payloadForUserContext.calendarName }),
							...(payloadForUserContext.description && { description: payloadForUserContext.description }),
							...(payloadForUserContext.color && { color: payloadForUserContext.color }),
							...(payloadForUserContext.isPrivate !== undefined && { isPrivate: payloadForUserContext.isPrivate }),
							...(payloadForUserContext.settings && { settings: {
								...prevActiveCalendar.settings,
								...payloadForUserContext.settings
							}}),
						};
					});
				}
			}

			// Then perform the actual API update with skipRefresh=true since we already updated locally
			if (updateCalendarDetailsInUserContext) {
				await updateCalendarDetailsInUserContext(calendarId, payloadForUserContext, true);
			} else {
				throw new Error(
					'updateCalendarDetailsInUserContext function is not available from UserContext'
				);
			}
		} catch (err: any) {
			console.error('Failed to update calendar via UserContext:', err);
			setError(err.message || 'Failed to update calendar');
			// If there's an error, we should refresh to get the correct state
			if (refreshUser) {
				refreshUser().catch(e => console.error('Failed to refresh user after calendar update error:', e));
			}
		} finally {
			setLoading(false);
		}
	};

	const deleteCalendar = async (calendarId: string) => {
		setLoading(true);
		setError(null);
		try {
			await apiClient.delete(`/api/calendar/${calendarId}`);
			await refreshUser(); // Refresh user data, which will trigger fetchCalendars in this context
		} catch (err: any) {
			console.error('Failed to delete calendar:', err);
			setError(err.message || 'Failed to delete calendar');
			throw err; // Re-throw to allow UI to handle it
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Reset flags when user changes
		if (user?.email !== processedUserEmailForDefault) {
			setAttemptedDefaultCalendarCreation(false);
			setProcessedUserEmailForDefault(user?.email);
			setHasCompletedInitialFetch(false); // 🔥 Also reset the fetch completion flag
		}
	}, [user, processedUserEmailForDefault]);

	useEffect(() => {
		fetchCalendars();
	}, [fetchCalendars]);

	// 🔥 FIXED: Only create default calendar AFTER we've completed initial fetch and confirmed no calendars exist
	useEffect(() => {
		if (
			user &&
			!loading &&
			hasCompletedInitialFetch && // 🔥 NEW: Only after we've fetched existing calendars
			calendars.length === 0 &&
			!error &&
			!attemptedDefaultCalendarCreation
		) {
			console.log('Creating default calendar for user:', user.email);
			setAttemptedDefaultCalendarCreation(true);
			createCalendar({ calendarName: 'My Calendar' });
		}
	}, [
		user,
		calendars,
		loading,
		error,
		attemptedDefaultCalendarCreation,
		hasCompletedInitialFetch,
		createCalendar,
	]);

	const setActiveCalendarAndStore = (calendar: CalendarData | null) => {
		_setActiveCalendar(calendar); // Use renamed state setter
		if (calendar) {
			localStorage.setItem('activeCalendarId', calendar.uid);
		} else {
			localStorage.removeItem('activeCalendarId');
		}
	};

	const selectActiveCalendar = useCallback(
		(calendarId: string | null) => {
			if (calendarId === null) {
				setActiveCalendarAndStore(null);
				return;
			}
			const calendarToActivate = calendars.find(c => c.uid === calendarId);
			if (calendarToActivate) {
				setActiveCalendarAndStore(calendarToActivate);
			} else {
				// Fallback or error handling if calendarId not found
				if (calendars.length > 0) {
					setActiveCalendarAndStore(calendars[0]);
				} else {
					setActiveCalendarAndStore(null);
				}
			}
		},
		[calendars]
	);

	const value = useMemo(() => ({
		calendars,
		activeCalendar: _activeCalendar, // Use renamed state variable
		loading,
		error,
		fetchCalendars,
		setActiveCalendar: selectActiveCalendar,
		createCalendar,
		updateCalendar,
		deleteCalendar,
	}), [
		calendars,
		_activeCalendar,
		loading,
		error,
		fetchCalendars,
		selectActiveCalendar,
		createCalendar,
		updateCalendar,
		deleteCalendar,
	]);

	return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function useCalendars() {
	const context = useContext(CalendarContext);
	if (context === undefined) {
		throw new Error('useCalendars must be used within a CalendarProvider');
	}
	return context;
}
