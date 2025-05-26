import { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { EventProvider as EventProvider } from '@/contexts/EventContext';
import { UserProvider } from '@/contexts/UserContext';
import { CalendarProvider } from '@/contexts/CalendarContext';
import appRoutes from '@/routes';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import './App.css';

const PrivateRoute = () => {
	const isAuthenticated = !!localStorage.getItem('token');
	return isAuthenticated ? <AuthenticatedLayout /> : <Navigate to='/signin' />;
};

function App() {
	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (mediaQuery.matches) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		};

		// Set initial theme
		handleChange();

		// Listen for changes
		mediaQuery.addEventListener('change', handleChange);

		// Cleanup listener on component unmount
		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	}, []);

	return (
		<UserProvider>
			<CalendarProvider>
				<EventProvider>
					<Router>
						<Suspense fallback={<div>Loading...</div>}>
							<Routes>
								{appRoutes.map(route => {
									if (route.private) {
										return (
											<Route key={route.path} element={<PrivateRoute />}>
												<Route path={route.path} element={route.element} />
											</Route>
										);
									}
									return <Route key={route.path} path={route.path} element={route.element} />;
								})}
							</Routes>
						</Suspense>
					</Router>
				</EventProvider>
			</CalendarProvider>
		</UserProvider>
	);
}

export default App;
