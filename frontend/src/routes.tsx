import React from 'react';

const SignInPage = React.lazy(() => import('@/pages/SignInPage'));
const SignUpPage = React.lazy(() => import('@/pages/SignUpPage'));
const CalendarPage = React.lazy(() => import('@/pages/CalendarPage'));

export interface RouteConfig {
	path: string;
	element: React.ReactNode;
	exact?: boolean;
	private?: boolean;
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
		path: '/home',
		element: <CalendarPage />,
		private: true,
	},
	{
		path: '/:calendarId',
		element: <CalendarPage />,
		private: true,
	},
	{
		path: '/',
		element: <SignInPage />, // Or <Navigate to="/home" /> if authenticated
		exact: true,
	},
];

export default routes;
