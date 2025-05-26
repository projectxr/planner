import { useState, useCallback } from 'react';
import { addDays, addWeeks, addMonths, startOfWeek, startOfMonth, startOfDay } from 'date-fns';
import { CalendarViewType } from '@/lib/types';

export function useCalendarNavigation(
	initialDate = new Date(),
	initialView: CalendarViewType = 'week'
) {
	const [currentDate, setCurrentDate] = useState(initialDate);
	const [currentView, setCurrentView] = useState(initialView);

	const navigateToToday = useCallback(() => {
		setCurrentDate(new Date());
	}, []);

	const navigatePrevious = useCallback(() => {
		setCurrentDate(prevDate => {
			switch (currentView) {
				case 'day':
					return addDays(prevDate, -1);
				case 'week':
				case 'work_week':
					return addWeeks(prevDate, -1);
				case 'month':
					return addMonths(prevDate, -1);
				default:
					return prevDate;
			}
		});
	}, [currentView]);

	const navigateNext = useCallback(() => {
		setCurrentDate(prevDate => {
			switch (currentView) {
				case 'day':
					return addDays(prevDate, 1);
				case 'week':
				case 'work_week':
					return addWeeks(prevDate, 1);
				case 'month':
					return addMonths(prevDate, 1);
				default:
					return prevDate;
			}
		});
	}, [currentView]);

	const navigateToDate = useCallback((date: Date) => {
		setCurrentDate(date);
	}, []);

	const changeView = useCallback((view: CalendarViewType) => {
		setCurrentView(view);

		// Adjust date to appropriate start for new view
		setCurrentDate(prevDate => {
			switch (view) {
				case 'week':
				case 'work_week':
					return startOfWeek(prevDate);
				case 'month':
					return startOfMonth(prevDate);
				case 'day':
					return startOfDay(prevDate);
				default:
					return prevDate;
			}
		});
	}, []);

	return {
		currentDate,
		currentView,
		navigateToToday,
		navigatePrevious,
		navigateNext,
		navigateToDate,
		changeView,
		setCurrentDate,
		setCurrentView,
	};
}
