import React, { useState, createContext, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import EventModal from '@/components/modals/EventModal';
import FilterModal from '@/components/modals/FilterModal';
import { CalendarEvent, Task, EventStatus, PriorityLevel } from '@/lib/types';
import CalendarSidebar from '@/components/layout/CalendarSidebar';

export interface ModalControlContextType {
	openEventModal: (event?: CalendarEvent, start?: Date, end?: Date) => void;
	closeEventModal: () => void;
	openTodoModal: (task?: Task, start?: Date, end?: Date) => void;
	closeTodoModal: () => void;
	openFilterModal: () => void;
	closeFilterModal: () => void;
}

export const ModalControlContext = createContext<ModalControlContextType | undefined>(undefined);

const AuthenticatedLayout: React.FC = () => {
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [isEventModalOpen, setIsEventModalOpen] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(undefined);
	const [newEventRange, setNewEventRange] = useState<{ start?: Date; end?: Date } | undefined>(
		undefined
	);

	const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

	const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

	const openEventModal = useCallback((event?: CalendarEvent, start?: Date, end?: Date) => {
		setSelectedEvent(event);
		if (!event && start && end) {
			setNewEventRange({ start, end });
		} else {
			setNewEventRange(undefined);
		}
		setIsEventModalOpen(true);
	}, []);
	const closeEventModal = useCallback(() => {
		setIsEventModalOpen(false);
		setSelectedEvent(undefined);
		setNewEventRange(undefined);
	}, []);

	const openTodoModal = useCallback((task?: Task, start?: Date, end?: Date) => {
		if (task) {
			const eventFromTask: CalendarEvent = {
				id: task.id,
				title: task.title,
				description: task.description || '',
				content: task.content || '', // Assuming Task might have content or default to empty
				start: task.dueDate || start || new Date(), // Use dueDate as start, or provided start, or now
				end: task.dueDate || end || new Date(), // Use dueDate as end, or provided end, or now
				isAllDay: true, // Tasks are often all-day, or this can be a default
				// category: task.category, // Storing category in tags instead
				priority: task.priority as PriorityLevel, // Assuming PriorityLevel is compatible
				status: task.status as EventStatus, // Assuming Task status maps to EventStatus
				uid: task.uid, // Calendar UID
				createdAt: task.createdAt || new Date(),
				updatedAt: task.updatedAt || new Date(),
				resourceId: task.resourceId,
				location: task.location,
				parentId: task.parentId,
				hierarchyLevel: task.hierarchyLevel || 0,
				hierarchyPath: task.hierarchyPath || undefined,
				sortOrder: task.sortOrder || 0,
				progressPercentage: task.progressPercentage || 0,
				estimatedHours: task.estimatedHours,
				actualHours: task.actualHours,
				dependsOn: task.dependsOn || [],
				blocks: task.blocks || [],
				assignee: task.assignee || [],
				tags: task.tags || (task.category ? [task.category] : []), // Use category as a tag
				createdBy: task.createdBy,
				updatedBy: undefined, // Default for new/converted event
				archived: task.archived || false,
				archivedAt: undefined, // Default for new/converted event
				isDone: task.status === 'done', // Derive from status if possible
				hasSubtasks: task.hasSubtasks || false,
				completedSubtasks: task.completedSubtasks || 0,
				totalSubtasks: task.totalSubtasks || 0,
				canHaveSubtasks: task.canHaveSubtasks === undefined ? true : task.canHaveSubtasks, // Default to true
				isSubtask: task.isSubtask || false,
				color: undefined, // Default, EventModal might handle or inherit
				isVisible: true, // Default
			};
			setSelectedEvent(eventFromTask);
		} else {
			setSelectedEvent(undefined); // For creating a new "task" (event)
		}
		if (!task && start && end) {
			setNewEventRange({ start, end });
		} else {
			setNewEventRange(undefined);
		}
		setIsEventModalOpen(true); // Use the event modal state
	}, []);

	const closeTodoModal = useCallback(() => {
		setIsEventModalOpen(false);
		setSelectedEvent(undefined);
		setNewEventRange(undefined);
	}, []);

	const openFilterModal = useCallback(() => setIsFilterModalOpen(true), []);
	const closeFilterModal = useCallback(() => setIsFilterModalOpen(false), []);

	const modalControls: ModalControlContextType = {
		openEventModal,
		closeEventModal,
		openTodoModal, // openTodoModal now opens EventModal
		closeTodoModal, // closeTodoModal now closes EventModal
		openFilterModal,
		closeFilterModal,
	};

	return (
		<ModalControlContext.Provider value={modalControls}>
			<div className='flex flex-col h-screen'>
				<Header
					onCreateEvent={() => openEventModal()}
					onCreateTodo={() => openTodoModal()}
					onToggleSidebar={toggleSidebar}
				/>
				<div className='flex flex-1 overflow-hidden'>
					{isSidebarOpen && <CalendarSidebar />}{' '}
					<main className='flex-1 overflow-y-auto p-0'>
						<Outlet /> {/* Child routes will render here (e.g., CalendarView) */}
					</main>
				</div>
				{isEventModalOpen && (
					<EventModal
						event={selectedEvent || null} // Pass null if undefined
						isOpen={isEventModalOpen}
						onClose={closeEventModal}
						mode={selectedEvent ? 'edit' : 'add'} // Determine and pass mode
						defaultStart={newEventRange?.start} // Use correct prop name
						defaultEnd={newEventRange?.end} // Use correct prop name
					/>
				)}
				{isFilterModalOpen && <FilterModal isOpen={isFilterModalOpen} onClose={closeFilterModal} />}
			</div>
		</ModalControlContext.Provider>
	);
};

export default AuthenticatedLayout;
