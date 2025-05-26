import React from 'react';

// Lazy load pages for better performance
const SignInPage = React.lazy(() => import('@/pages/SignInPage'));
const SignUpPage = React.lazy(() => import('@/pages/SignUpPage'));
const CalendarView = React.lazy(() => import('@/components/calendar/CalendarView')); // Assuming AppContent will be main Calendar view for now

export interface RouteConfig {
	path: string;
	element: React.ReactNode;
	exact?: boolean;
	private?: boolean; // For protected routes
}

const routes: RouteConfig[] = [
	{
		path: '/signin',
		element: <SignInPage />,
	},
	{
		path: '/signup',
		element: <SignUpPage />,
	},
	{
		path: '/home', // New route for all calendar events
		element: <CalendarView />,
		private: true,
	},
	{
		path: '/:calendarId', // New route for specific calendar events
		element: <CalendarView />,
		private: true,
	},
	{
		path: '/', // Default route, perhaps redirect to /home or /signin
		element: <SignInPage />, // Or <Navigate to="/home" /> if authenticated
		exact: true,
	},
	// Remove old /calendar route if /:calendarId and /home replace its functionality
	// {
	// 	path: '/calendar',
	// 	element: <CalendarView />,
	// 	private: true,
	// },
];

export default routes;
