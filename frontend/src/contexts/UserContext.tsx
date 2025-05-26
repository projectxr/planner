import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
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
	refreshUser: () => Promise<void>; // Added refreshUser
	updateCalendarDetails: (
		calendarUid: string,
		updates: Partial<
			Pick<CalendarData, 'calendarName' | 'description' | 'color' | 'isPrivate' | 'settings'>
		>
	) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

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
			setUser(data);
			setError(null);
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

	const refreshUser = useCallback(async () => {
		const currentToken = localStorage.getItem('token');
		if (currentToken) {
			await fetchUserDetails(currentToken);
		} else {
			// Handle case where token might have been removed by another tab/action
			setUser(null);
			setToken(null);
			delete apiClient.defaults.headers.common['X-AUTH-TOKEN'];
		}
	}, [fetchUserDetails]);

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

	const updateCalendarDetails = useCallback(
		async (
			calendarUid: string,
			updates: Partial<
				Pick<CalendarData, 'calendarName' | 'description' | 'color' | 'isPrivate' | 'settings'>
			>
		) => {
			if (!user) throw new Error('User not available for updating calendar details.');
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

				const response = await apiClient.post('/api/calendar/update', payload);
				// const updatedCalendarData: CalendarData = response.data; // Backend sends back the updated calendar
				// No need to manually merge here, refreshUser will fetch the latest user object
				// which will include the updated calendar details from the backend.
				await refreshUser(); // Refresh user data to get the latest calendar details
				setError(null);
			} catch (err: any) {
				console.error('Failed to update calendar details:', err);
				setError(err.response?.data?.errors?.msg || 'Failed to update calendar details');
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[user]
	);

	const value = {
		user,
		token,
		loading,
		error,
		loginUser,
		registerUser,
		logoutUser,
		refreshUser, // Added refreshUser
		updateCalendarDetails,
	};

	return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error('useUser must be used within a UserProvider');
	}
	return context;
}
