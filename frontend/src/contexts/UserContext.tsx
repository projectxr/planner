import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import apiClient from '@/services/api';
import { User, CalendarData } from '@/lib/types';

interface AuthCredentials {
	name?: string;
	email: string;
	password?: string;
}

interface UserContextType {
	user: User | null;
	token: string | null;
	loading: boolean;
	error: string | null;
	loginUser: (credentials: AuthCredentials) => Promise<void>;
	registerUser: (userData: AuthCredentials) => Promise<void>;
	logoutUser: () => void;
	refreshUser: () => Promise<void>;
	updateCalendarDetails: (
		calendarUid: string,
		updates: Partial<
			Pick<CalendarData, 'calendarName' | 'description' | 'color' | 'isPrivate' | 'settings'>
		>,
		skipRefresh?: boolean
	) => Promise<void>;
	updateCalendarSnapshot: (
		calendarUid: string,
		updates: Partial<
			Pick<CalendarData, 'calendarName' | 'description' | 'color' | 'isPrivate' | 'settings'>
		>
	) => void;
	updateUserName: (name: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [needsRefresh, setNeedsRefresh] = useState<boolean>(false);

	const fetchUserDetails = useCallback(async (currentToken: string) => {
		if (!currentToken) {
			delete apiClient.defaults.headers.common['X-AUTH-TOKEN'];
			setUser(null);
			setToken(null);
			return;
		}
		setLoading(true);
		apiClient.defaults.headers.common['X-AUTH-TOKEN'] = currentToken;
		try {
			const { data } = await apiClient.get('/api/auth/');
			setUser(prev => {
				// Only update if data is different to prevent unnecessary re-renders
				if (JSON.stringify(prev) !== JSON.stringify(data)) {
					return data;
				}
				return prev;
			});
			setError(null);
			setNeedsRefresh(false);
		} catch (err) {
			console.error('Failed to verify token or fetch user:', err);
			localStorage.removeItem('token');
			delete apiClient.defaults.headers.common['X-AUTH-TOKEN'];
			setToken(null);
			setUser(null);
			setError('Session expired or invalid. Please log in again.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (token) {
			fetchUserDetails(token);
		}
	}, [token, fetchUserDetails]);
	
	useEffect(() => {
		if (needsRefresh && token) {
			fetchUserDetails(token);
		}
	}, [needsRefresh, token, fetchUserDetails]);

	const refreshUser = useCallback(async () => {
		const currentToken = localStorage.getItem('token');
		if (currentToken) {
			await fetchUserDetails(currentToken);
		} else {
			setUser(null);
			setToken(null);
			delete apiClient.defaults.headers.common['X-AUTH-TOKEN'];
		}
	}, [fetchUserDetails]);
	
	// Mark for refresh without immediate API call
	const markForRefresh = useCallback(() => {
		setNeedsRefresh(true);
	}, []);

	const loginUser = useCallback(async (credentials: AuthCredentials) => {
		setLoading(true);
		setError(null);
		try {
			const response = await apiClient.post('/api/auth/login', credentials);
			if (response.data.token) {
				localStorage.setItem('token', response.data.token);
				apiClient.defaults.headers.common['X-AUTH-TOKEN'] = response.data.token;
				setToken(response.data.token);
				setUser(response.data.user || { email: credentials.email });
			}
		} catch (err: any) {
			console.error('Failed to login:', err);
			setError(err.response?.data?.errors?.msg || 'Failed to login');
			localStorage.removeItem('token');
			delete apiClient.defaults.headers.common['X-AUTH-TOKEN'];
			setToken(null);
			setUser(null);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	const registerUser = useCallback(async (userData: AuthCredentials) => {
		setLoading(true);
		setError(null);
		try {
			const response = await apiClient.post('/api/auth/register', userData);
			if (response.data.token) {
				localStorage.setItem('token', response.data.token);
				apiClient.defaults.headers.common['X-AUTH-TOKEN'] = response.data.token;
				setToken(response.data.token);
				setUser(response.data.user || { email: userData.email });
			}
		} catch (err: any) {
			console.error('Failed to register:', err);
			setError(err.response?.data?.errors?.msg || 'Failed to register');
			localStorage.removeItem('token');
			delete apiClient.defaults.headers.common['X-AUTH-TOKEN'];
			setToken(null);
			setUser(null);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	const logoutUser = useCallback(() => {
		localStorage.removeItem('token');
		delete apiClient.defaults.headers.common['X-AUTH-TOKEN'];
		setToken(null);
		setUser(null);
	}, []);

	// Update calendar snapshot in local state before API call
	const updateCalendarSnapshot = useCallback(
		(
			calendarUid: string,
			updates: Partial<
				Pick<CalendarData, 'calendarName' | 'description' | 'color' | 'isPrivate' | 'settings'>
			>
		) => {
			if (!user) return;
			
			setUser(prevUser => {
				if (!prevUser) return prevUser;
				
				// Create deep copy of user
				const updatedUser = {...prevUser};
				
				// Find and update the calendar
				if (updatedUser.myCalendars) {
					updatedUser.myCalendars = updatedUser.myCalendars.map(calEntry => {
						if (calEntry.calendar.uid === calendarUid) {
							return {
								...calEntry,
								calendar: {
									...calEntry.calendar,
									...(updates.calendarName && { calendarName: updates.calendarName }),
									...(updates.description && { description: updates.description }),
									...(updates.color && { color: updates.color }),
									...(updates.isPrivate !== undefined && { isPrivate: updates.isPrivate }),
									...(updates.settings && { settings: {...calEntry.calendar.settings, ...updates.settings} }),
								}
							};
						}
						return calEntry;
					});
				}
				
				return updatedUser;
			});
		},
		[user]
	);

	const updateCalendarDetails = useCallback(
		async (
			calendarUid: string,
			updates: Partial<
				Pick<CalendarData, 'calendarName' | 'description' | 'color' | 'isPrivate' | 'settings'>
			>,
			skipRefresh = false
		) => {
			if (!user) throw new Error('User not available for updating calendar details.');
			
			// Optimistically update local state first
			updateCalendarSnapshot(calendarUid, updates);
			
			setLoading(true);
			setError(null);
			try {
				const payload = { uid: calendarUid, ...updates };
				if ('name' in updates && !('calendarName' in updates)) {
					// @ts-ignore
					payload.calendarName = updates.name;
					// @ts-ignore
					delete payload.name;
				}

				await apiClient.post('/api/calendar/update', payload);
				
				// Only refresh if not skipped
				if (!skipRefresh) {
					await refreshUser();
				} else {
					markForRefresh();
				}
				
				setError(null);
			} catch (err: any) {
				console.error('Failed to update calendar details:', err);
				setError(err.response?.data?.errors?.msg || 'Failed to update calendar details');
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[user, refreshUser, updateCalendarSnapshot, markForRefresh]
	);

	const updateUserName = useCallback(async (name: string) => {
		if (!user) throw new Error('User not available for updating name.');
		setLoading(true);
		setError(null);
		try {
			await apiClient.put('/api/auth/user', { name }); // Assuming PUT endpoint for user update
			await refreshUser(); // Refresh user data to get updated name
			setError(null);
		} catch (err: any) {
			console.error('Failed to update user name:', err);
			setError(err.response?.data?.errors?.msg || 'Failed to update user name');
			throw err;
		} finally {
			setLoading(false);
		}
	}, [user, refreshUser]);

	const value = useMemo(() => ({
		user,
		token,
		loading,
		error,
		loginUser,
		registerUser,
		logoutUser,
		refreshUser,
		updateCalendarDetails,
		updateCalendarSnapshot,
		updateUserName,
	}), [
		user,
		token,
		loading,
		error,
		loginUser,
		registerUser,
		logoutUser,
		refreshUser,
		updateCalendarDetails,
		updateCalendarSnapshot,
		updateUserName,
	]);

	return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error('useUser must be used within a UserProvider');
	}
	return context;
}
