import { useState, useCallback, useEffect } from 'react';
import { CalendarEvent, Task } from '@/lib/types';

interface DragData {
	type: 'calendar-event' | 'unscheduled-task';
	event?: CalendarEvent;
	task?: Task;
}

interface DragDropState {
	isDragging: boolean;
	dragType: string | null;
	dragData: DragData | null;
	dropTarget: string | null;
}

export function useDragAndDrop() {
	const [dragState, setDragState] = useState<DragDropState>({
		isDragging: false,
		dragType: null,
		dragData: null,
		dropTarget: null,
	});

	// Handle drag start from any source
	const handleDragStart = useCallback((data: DragData) => {
		console.log('Drag started:', data);
		setDragState({
			isDragging: true,
			dragType: data.type,
			dragData: data,
			dropTarget: null,
		});
	}, []);

	// Handle drag end
	const handleDragEnd = useCallback(() => {
		console.log('Drag ended');
		setDragState({
			isDragging: false,
			dragType: null,
			dragData: null,
			dropTarget: null,
		});
	}, []);

	// Handle drop target enter
	const handleDropTargetEnter = useCallback((targetType: string) => {
		setDragState(prev => ({
			...prev,
			dropTarget: targetType,
		}));
	}, []);

	// Handle drop target leave
	const handleDropTargetLeave = useCallback(() => {
		setDragState(prev => ({
			...prev,
			dropTarget: null,
		}));
	}, []);

	// Get drag from outside item for react-big-calendar
	const getDragFromOutsideItem = useCallback(() => {
		if (dragState.dragType === 'unscheduled-task' && dragState.dragData?.task) {
			return {
				title: dragState.dragData.task.title,
				task: dragState.dragData.task,
			};
		}
		return null;
	}, [dragState]);

	// Handle drop on calendar
	const onDrop = useCallback(
		async (
			dropInfo: { start: Date; end: Date; allDay?: boolean },
			scheduleTaskFn: (taskId: string, start: Date, end: Date, isAllDay?: boolean) => Promise<void>
		) => {
			if (dragState.dragType === 'unscheduled-task' && dragState.dragData?.task) {
				console.log('Dropping unscheduled task on calendar:', dragState.dragData.task.id);
				try {
					await scheduleTaskFn(
						dragState.dragData.task.id,
						dropInfo.start,
						dropInfo.end,
						dropInfo.allDay || false
					);
				} catch (error) {
					console.error('Failed to schedule task:', error);
				}
			}
		},
		[dragState]
	);

	// Listen for custom drag events
	useEffect(() => {
		const handleCalendarEventDrag = (e: CustomEvent) => {
			handleDragStart(e.detail);
		};

		const handleTaskDrag = (e: CustomEvent) => {
			handleDragStart(e.detail);
		};

		// Global drag end listener
		const handleGlobalDragEnd = () => {
			handleDragEnd();
		};

		window.addEventListener('calendar-event-drag-start', handleCalendarEventDrag as EventListener);
		window.addEventListener('task-drag-start', handleTaskDrag as EventListener);
		document.addEventListener('dragend', handleGlobalDragEnd);

		return () => {
			window.removeEventListener(
				'calendar-event-drag-start',
				handleCalendarEventDrag as EventListener
			);
			window.removeEventListener('task-drag-start', handleTaskDrag as EventListener);
			document.removeEventListener('dragend', handleGlobalDragEnd);
		};
	}, [handleDragStart, handleDragEnd]);

	return {
		// State
		isDragging: dragState.isDragging,
		dragType: dragState.dragType,
		dragData: dragState.dragData,
		dropTarget: dragState.dropTarget,
		draggedItem: dragState.dragData?.event || dragState.dragData?.task || null,

		// Handlers
		handleDragStart,
		handleDragEnd,
		handleDropTargetEnter,
		handleDropTargetLeave,
		getDragFromOutsideItem,
		onDrop,

		// Utilities
		canDropOnCalendar: dragState.dragType === 'unscheduled-task',
		canDropOnSidebar: dragState.dragType === 'calendar-event',
	};
}
