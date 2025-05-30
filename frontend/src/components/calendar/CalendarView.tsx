import React, { useCallback, useMemo, useEffect } from 'react'; // Removed useState
import { useParams } from 'react-router-dom';
import { Calendar, ViewsProps, dateFnsLocalizer, SlotInfo } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { CalendarEvent } from '@/lib/types';
import { format, startOfWeek as baseStartOfWeek, getDay, parse, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { useCalendarEvents } from '@/contexts/EventContext';
import { useCalendars } from '@/contexts/CalendarContext';
import { getEventStyle } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Settings, Users, MoreHorizontal, Repeat, Calendar as CalendarIcon } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import CustomToolbar from './CustomToolbar';
import CustomEvent from './CustomEvent';
import EventModal from '../modals/EventModal';
import FilterModal from '../modals/FilterModal';
import CalendarModal from '../modals/CalendarModal';
import UserManagementModal from '../modals/UserManagementModal';

const locales = {
	'en-US': enUS,
};

const startOfWeek = (date: Date) => {
	return baseStartOfWeek(date, { weekStartsOn: 1 });
};

const localizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek,
	getDay,
	locales,
});

const DragAndDropCalendar = withDragAndDrop(
	Calendar as new (props: any) => Calendar<CalendarEvent, object>
);

interface CalendarViewProps {
	className?: string;
	showSidebar?: boolean;
}

export default function CalendarView({ className }: CalendarViewProps) {
	const { calendarId: routeCalendarId } = useParams<{ calendarId?: string }>();
	const { activeCalendar, setActiveCalendar, calendars } = useCalendars();
	const {
		filteredEvents,
		currentView,
		currentDate,
		setCurrentDate,
		setCurrentView,
		updateEventOptimistic,
		repeatEvent,
		selectedEvent,
		contextMenu,
		setContextMenu,
		setDraggedItem,
		openAddModal,
		openEditModal,
		loading,
		error,
		isAddModalOpen,
		isEditModalOpen,
		closeAllModals,
		slotSelectionStartDate,
		slotSelectionEndDate,
		draggedItem,
		dragType,
		handleCalendarDrop,
		isFilterModalOpen, // Added from context
		isCalendarModalOpen, // Added from context
		openCalendarModal, // Added from context
		isUserModalOpen, // Added from context
		openUserModal, // Added from context
	} = useCalendarEvents();

	const calendarViews: ViewsProps<object, object> = useMemo(
		() => ({
			month: true,
			week: true,
			work_week: true,
			day: true,
			agenda: true,
		}),
		[]
	);

	const handleEventDrop = useCallback(
		({
			event,
			start,
			end,
			isAllDay,
		}: {
			event: CalendarEvent;
			start: Date | string;
			end: Date | string;
			isAllDay?: boolean;
		}) => {
			const startDate = typeof start === 'string' ? parseISO(start) : start;
			const endDate = typeof end === 'string' ? parseISO(end) : end;

			const updatedEvent = {
				...event,
				start: startDate,
				end: endDate,
				isAllDay: isAllDay || false,
				updatedAt: new Date(),
			};

			updateEventOptimistic(updatedEvent, true).catch((error: any) => {
				console.error('Failed to update event position:', error);
			});
		},
		[updateEventOptimistic]
	);

	const handleDragStart = useCallback(
		(event: CalendarEvent) => {
			setDraggedItem(event);
		},
		[setDraggedItem]
	);

	const handleEventResize = useCallback(
		({ event, start, end }: { event: CalendarEvent; start: Date | string; end: Date | string }) => {
			const startDate = typeof start === 'string' ? parseISO(start) : start;
			const endDate = typeof end === 'string' ? parseISO(end) : end;

			const updatedEvent = {
				...event,
				start: startDate,
				end: endDate,
				updatedAt: new Date(),
			};

			updateEventOptimistic(updatedEvent, true).catch((error: any) => {
				console.error('Failed to resize event:', error);
			});
		},
		[updateEventOptimistic]
	);

	const handleDragOver = useCallback(
		(event: React.DragEvent) => {
			setDraggedItem(null);
			if (dragType === 'unscheduled-task') {
				event.preventDefault();
				event.dataTransfer.dropEffect = 'move';
			}
		},
		[dragType, setDraggedItem]
	);

	const handleDropFromOutside = useCallback(
		async ({ start, end, allDay }: { start: Date; end: Date; allDay?: boolean }) => {
			console.log('Drop from outside detected:', { start, end, allDay });
			await handleCalendarDrop({ start, end, allDay });
		},
		[handleCalendarDrop]
	);

	const getDragFromOutsideItem = useCallback(() => {
		if (dragType === 'unscheduled-task' && draggedItem) {
			return {
				title: draggedItem.title,
				task: draggedItem,
			};
		}
		return null;
	}, [dragType, draggedItem]);

	const handleSelectEvent = useCallback(
		(event: CalendarEvent | any) => {
			console.log('handleSelectEvent called with:', event);
			const calendarEvent = event as CalendarEvent;
			if (calendarEvent && calendarEvent.id) {
				openEditModal(calendarEvent);
			} else {
				console.error('Invalid event object:', event);
			}
		},
		[openEditModal]
	);

	const handleSelectSlot = useCallback(
		({ start, end }: SlotInfo) => {
			openAddModal(start, end);
		},
		[openAddModal]
	);

	const handleEventContextMenu = useCallback(
		(e: React.MouseEvent, calendarEvent: CalendarEvent) => {
			e.preventDefault();
			setContextMenu({
				mouseX: e.clientX - 2,
				mouseY: e.clientY - 4,
				event: calendarEvent,
			});
		},
		[setContextMenu]
	);

	const handleCloseContextMenu = useCallback(() => {
		setContextMenu(null);
	}, [setContextMenu]);

	const handleRepeatEvent = useCallback(
		(repeatCount: number) => {
			if (contextMenu && contextMenu.event) {
				repeatEvent(contextMenu.event.id, repeatCount);
			}
			handleCloseContextMenu();
		},
		[contextMenu, repeatEvent, handleCloseContextMenu]
	);

	useEffect(() => {
		const targetId = routeCalendarId === 'home' ? null : routeCalendarId;
		setActiveCalendar(targetId || null);
	}, [routeCalendarId, setActiveCalendar, calendars]);

	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				handleCloseContextMenu();
				closeAllModals();
			}
			if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				openAddModal();
			}
		};

		document.addEventListener('keydown', handleKeyPress);
		return () => document.removeEventListener('keydown', handleKeyPress);
	}, [handleCloseContextMenu, closeAllModals, openAddModal]);
	// END: Added event handlers from original SELECTION

	const eventPropGetter = useCallback((event: CalendarEvent) => {
		const calendarColor = event.color || 'rgb(49, 116, 173)';
		return {
			style: {
				...getEventStyle(event),
				backgroundColor: calendarColor,
				borderColor: calendarColor,
			},
			className: cn(
				'transition-all duration-200 hover:shadow-lg',
				event.isDone && 'opacity-75 rbc-event-done'
			),
		};
	}, []);

	if (loading && !filteredEvents.length) {
		return (
			<div className='flex items-center justify-center h-full'>
				<div className='flex items-center space-x-2'>
					<CalendarIcon className='h-6 w-6 animate-spin' />
					<span>Loading calendar...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='flex items-center justify-center h-full'>
				<div className='text-center space-y-2'>
					<p className='text-red-600'>Error loading calendar: {error}</p>
					<Button onClick={() => window.location.reload()}>Reload</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={cn('h-full flex flex-col', className)}>
			{/* Simplified Header - Only calendar identification and settings */}
			<div className='flex items-center justify-between p-4 border-b'>
				<h1 className='text-2xl font-bold flex items-center gap-2'>
					{activeCalendar
						? activeCalendar.name
						: routeCalendarId === 'home'
						? 'All Calendars'
						: 'Calendar'}
				</h1>

				{/* Only high-level settings - no duplicate controls */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' size='sm'>
							<MoreHorizontal className='h-4 w-4' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem onClick={openCalendarModal}>
							{' '}
							{/* Updated */}
							<Settings className='h-4 w-4 mr-2' />
							Calendar Settings
						</DropdownMenuItem>
						<DropdownMenuItem onClick={openUserModal}>
							{' '}
							{/* Updated */}
							<Users className='h-4 w-4 mr-2' />
							Manage Users
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>Export Calendar</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			{/* Calendar with integrated toolbar */}
			<div className='flex-1 p-4 overflow-y-auto'>
				<DragAndDropCalendar
					localizer={localizer as any}
					events={filteredEvents}
					startAccessor='start'
					endAccessor='end'
					style={{ height: '100%' }}
					views={calendarViews}
					view={currentView as any}
					date={currentDate}
					onNavigate={setCurrentDate}
					onView={setCurrentView as any}
					selectable
					resizable
					onDragStart={event => handleDragStart(event as any)}
					onSelectEvent={handleSelectEvent} // Single click to edit
					onDoubleClickEvent={handleSelectEvent} // Double click to edit (backup)
					onSelectSlot={handleSelectSlot}
					onEventDrop={handleEventDrop}
					onEventResize={handleEventResize}
					onDropFromOutside={handleDropFromOutside as any}
					dragFromOutsideItem={getDragFromOutsideItem as any}
					onDragOver={handleDragOver}
					eventPropGetter={eventPropGetter}
					components={{
						toolbar: props => <CustomToolbar {...props} onAddEvent={openAddModal} />,
						event: props => (
							<CustomEvent
								{...props}
								event={props.event as CalendarEvent}
								title={props.title}
								view={currentView}
								onEdit={() => handleSelectEvent(props.event as CalendarEvent)}
								onContextMenu={e => handleEventContextMenu(e, props.event as CalendarEvent)}
								onDragStart={() => handleDragStart(props.event as CalendarEvent)}
							/>
						),
					}}
					longPressThreshold={10}
				/>
			</div>
			{contextMenu && contextMenu.event && (
				<Popover
					open={!!contextMenu}
					onOpenChange={isOpen => {
						if (!isOpen) handleCloseContextMenu();
					}}
				>
					<PopoverContent
						className='py-1 min-w-[160px] w-auto bg-slate-800 z-30'
						onEscapeKeyDown={handleCloseContextMenu}
						style={{
							position: 'fixed',
							top: `${contextMenu.mouseY}px`,
							left: `${contextMenu.mouseX}px`,
						}}
					>
						<div
							className='px-2 py-1.5 rounded-sm cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground flex items-center z-50000'
							onClick={() => handleRepeatEvent(1)}
						>
							<Repeat className='h-4 w-4 mr-2' />
							Repeat Tomorrow
						</div>
						<div
							className='px-2 py-1.5 rounded-sm cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground flex items-center'
							onClick={() => handleRepeatEvent(7)}
						>
							<Repeat className='h-4 w-4 mr-2' />
							Repeat For a Week
						</div>
						<div className='border-t my-1' /> {/* Separator */}
						<div
							className='px-2 py-1.5 rounded-sm cursor-pointer text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center'
							onClick={handleCloseContextMenu}
						>
							Close
						</div>
					</PopoverContent>
				</Popover>
			)}
			{/* Modals */}
			<EventModal
				isOpen={isAddModalOpen || isEditModalOpen}
				onClose={closeAllModals}
				event={isEditModalOpen ? selectedEvent : null}
				mode={isAddModalOpen ? 'add' : 'edit'}
				defaultStart={isAddModalOpen ? slotSelectionStartDate || undefined : undefined}
				defaultEnd={isAddModalOpen ? slotSelectionEndDate || undefined : undefined}
			/>
			<FilterModal isOpen={isFilterModalOpen} onClose={closeAllModals} /> {/* Updated */}
			<CalendarModal
				isOpen={isCalendarModalOpen}
				onClose={closeAllModals} /* Updated */
				calendarId={activeCalendar?.uid} // Use activeCalendar's uid
			/>
			<UserManagementModal
				isOpen={isUserModalOpen}
				onClose={closeAllModals} /* Updated */
				calendarId={activeCalendar?.uid} // Use activeCalendar's uid
			/>
		</div>
	);
}
