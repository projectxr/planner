import { useState, useMemo } from 'react';
import { CalendarEvent, Task, FilterOptions } from '@/lib/types';
import {
	filterEventsBySearch,
	filterEventsByCategory,
	filterEventsByPriority,
	filterEventsByStatus,
} from '@/lib/utils';

export function useEventFilters(events: CalendarEvent[], tasks: Task[]) {
	const [filters, setFilters] = useState<FilterOptions>({});

	const filteredEvents = useMemo(() => {
		let result = [...events];

		if (filters.search) {
			result = filterEventsBySearch(result, filters.search);
		}

		if (filters.status) {
			result = filterEventsByStatus(result, filters.status);
		}

		if (filters.priority) {
			result = filterEventsByPriority(result, filters.priority);
		}

		if (filters.category) {
			result = filterEventsByCategory(result, filters.category);
		}

		if (filters.assignee) {
			result = result.filter(event => event.assignee.includes(filters.assignee!));
		}

		if (filters.dateRange) {
			result = result.filter(event => {
				if (!event.start) return false;
				const eventStart = new Date(event.start);
				return eventStart >= filters.dateRange!.start && eventStart <= filters.dateRange!.end;
			});
		}

		if (!filters.showCompleted) {
			result = result.filter(event => !event.isDone);
		}

		if (!filters.showArchived) {
			result = result.filter(event => !event.archived);
		}

		return result;
	}, [events, filters]);

	const filteredTasks = useMemo(() => {
		let result = [...tasks];

		if (filters.search) {
			result = result.filter(
				task =>
					task.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
					task.description?.toLowerCase().includes(filters.search!.toLowerCase())
			);
		}

		if (filters.category) {
			result = result.filter(task => task.category === filters.category);
		}

		if (filters.priority) {
			result = result.filter(task => task.priority === filters.priority);
		}

		if (!filters.showCompleted) {
			result = result.filter(task => !task.completed);
		}

		return result;
	}, [tasks, filters]);

	const clearFilters = () => setFilters({});

	const hasActiveFilters = Object.values(filters).some(Boolean);

	const activeFilterCount = Object.values(filters).filter(Boolean).length;

	return {
		filters,
		setFilters,
		filteredEvents,
		filteredTasks,
		clearFilters,
		hasActiveFilters,
		activeFilterCount,
	};
}
