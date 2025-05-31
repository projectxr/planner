import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
// import { Switch } from '@/components/ui/switch'; // No longer used directly here
import { Separator } from '@/components/ui/separator';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
	Plus,
	Search,
	Settings,
	Users,
	MoreHorizontal,
	Calendar,
	// Palette, // Removed
	Loader2,
	Home,
	ChevronRight,
	Star,
	Archive,
	Trash2,
	Share2,
	Download,
	Upload,
	CheckSquare,
	Square,
	Clock,
	// Palette, // Confirming removal again, as it was flagged by lint and should be gone.
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalendarEvents } from '@/contexts/EventContext';
import { useCalendars } from '@/contexts/CalendarContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarUser, CalendarData } from '@/lib/types';
import CalendarModal from '@/components/modals/CalendarModal';

interface MyCalendarItem {
	calendar: CalendarData;
	color: string;
	isVisible?: boolean;
	isFavorite?: boolean;
	group?: string;
}

type CalendarGroup = {
	name: string;
	calendars: MyCalendarItem[];
	isExpanded: boolean;
};

export default function CalendarSidebar() {
	const {
		visibleCalendars, // Still needed for isVisible prop
		// toggleCalendarVisibility, // Removed
		// setCalendarColor, // Removed
		syncStatus,
		refreshAll,
		refreshCalendar,
		filteredTasks,
		openEditModal,
	} = useCalendarEvents();
	const { activeCalendar, setActiveCalendar, calendars } = useCalendars();
	const { toast } = useToast();
	const navigate = useNavigate();
	const location = useLocation();
	const { handleSidebarDrop } = useCalendarEvents();

	const [searchQuery, setSearchQuery] = useState('');
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
		new Set(['shared', 'unscheduled-tasks'])
	);
	const [favorites, /* setFavorites */] = useState<Set<string>>( // setFavorites no longer used directly
		new Set(JSON.parse(localStorage.getItem('favorite-calendars') || '[]'))
	);
	const [isDragOver, setIsDragOver] = useState(false);
	const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
	const [editingCalendarId, setEditingCalendarId] = useState<string | undefined>(undefined);

	const myDisplayCalendars: MyCalendarItem[] = calendars.map(calData => ({
		calendar: calData,
		color: calData.color || '#3174ad',
	}));
	const isOnHomePage = location.pathname === '/home' || location.pathname === '/';

	const unscheduledTasks = filteredTasks.filter(task => !task.start || !task.end);

	const groupedCalendars: CalendarGroup[] = [
		{
			name: 'Favorites',
			calendars: myDisplayCalendars.filter(cal => favorites.has(cal.calendar.uid)),
			isExpanded: expandedGroups.has('favorites'),
		},
		{
			name: 'Calendars',
			calendars: myDisplayCalendars.filter(cal => !favorites.has(cal.calendar.uid)),
			isExpanded: expandedGroups.has('calendars'),
		},
	];

	const filteredGroups = groupedCalendars
		.map(group => ({
			...group,
			calendars: searchQuery
				? group.calendars.filter((cal: any) =>
						cal.calendar.calendarName.toLowerCase().includes(searchQuery.toLowerCase())
				  )
				: group.calendars,
		}))
		.filter(group => group.calendars.length > 0);

	// Removed handleToggleVisibility, handleColorChange as their functionalities 
	// are to be accessed via CalendarModal triggered by onOpenSettings.
	
	const handleOpenCalendarSettingsFromItem = (calendarUid: string) => {
		// Set the calendar ID to edit and pass it to the modal
		const calendar = calendars.find(cal => cal.uid === calendarUid);
		setEditingCalendarId(calendarUid);
		setIsCalendarModalOpen(true);
		console.log('Opening calendar settings from sidebar for:', calendar?.calendarName || calendar?.name);
	};

	const handleNavigateToCalendar = (calendarUid: string | null) => {
		if (calendarUid === null) {
			// Navigate to "All Calendars" view
			setActiveCalendar(null);
			navigate('/home');
		} else {
			// Navigate to specific calendar
			navigate(`/${calendarUid}`);
		}
	};

	// handleToggleFavorite removed - this functionality should be within CalendarModal
	
	const handleToggleGroup = (groupName: string) => {
		const newExpanded = new Set(expandedGroups);
		if (newExpanded.has(groupName)) {
			newExpanded.delete(groupName);
		} else {
			newExpanded.add(groupName);
		}
		setExpandedGroups(newExpanded);
	};

	const handleCreateCalendar = () => {
		setIsCalendarModalOpen(true);
	};

	const handleRefresh = async () => {
		await refreshAll(true);
	};

	const handleRefreshCalendar = async (calendarUid: string) => {
		await refreshCalendar(calendarUid);
		toast({
			title: 'Calendar refreshed',
			description: 'Calendar data has been refreshed',
		});
	};

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);

			try {
				const data = e.dataTransfer.getData('application/json');
				if (data) {
					const dragData = JSON.parse(data);
					console.log('Drop data received:', dragData);
					await handleSidebarDrop(dragData);
				}
			} catch (error) {
				console.error('Failed to handle drop:', error);
				toast({
					title: 'Drop Failed',
					description: 'Failed to process the dropped item',
					variant: 'destructive',
				});
			}
		},
		[handleSidebarDrop, toast]
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX;
		const y = e.clientY;

		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			setIsDragOver(false);
		}
	}, []);

	return (
		<div className='h-full flex flex-col'>
			{/* Header */}
			<div className='p-4 space-y-3'>
				<div className='flex items-center justify-between'>
					<h3 className='font-semibold flex items-center gap-2'>
						My Calendars
						{syncStatus === 'syncing' && <Loader2 className='h-4 w-4 animate-spin' />}
					</h3>
					<div className='flex gap-1'>
						<Button
							size='sm'
							variant='ghost'
							onClick={handleRefresh}
							disabled={syncStatus === 'syncing'}
							title='Refresh all calendars'
						>
							<Calendar className='h-4 w-4' />
						</Button>
						<Button size='sm' onClick={handleCreateCalendar} title='Create new calendar'>
							<Plus className='h-4 w-4' />
						</Button>
					</div>
				</div>

				{/* Search */}
				<div className='relative'>
					<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
					<Input
						placeholder='Search calendars...'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className='pl-8'
					/>
				</div>
			</div>

			<Separator />

			{/* All Calendars Option */}
			<div className='p-2'>
				<div
					className={cn(
						'group p-3 rounded-md border-2 transition-all duration-200 cursor-pointer hover:bg-muted/50',
						isOnHomePage ? 'border-primary bg-primary/10' : 'border-transparent'
					)}
					onClick={() => handleNavigateToCalendar(null)}
				>
					<div className='flex items-center gap-3'>
						<Home className='h-4 w-4 text-primary' />
						<div className='flex-1 min-w-0'>
							<p className='font-medium text-sm'>All Calendars</p>
							<p className='text-xs text-muted-foreground'>
								View events from all visible calendars
							</p>
						</div>
						{/* Reserve space for badge to prevent width changes */}
						<div className='w-12 flex justify-end'>
							{isOnHomePage && (
								<Badge variant='default' className='text-xs'>
									Active
								</Badge>
							)}
						</div>
					</div>
				</div>
			</div>

			<Separator />

			{/* Calendar Groups */}
			<ScrollArea className='flex-1'>
				<div className='p-2 space-y-2'>
					{filteredGroups.length > 0 ? (
						<>
							{filteredGroups.map(group => (
								<div key={group.name} className='space-y-1'>
									{/* Group Header */}
									<div
										className='flex items-center gap-2 py-2 px-1 cursor-pointer hover:bg-muted/50 rounded'
										onClick={() => handleToggleGroup(group.name.toLowerCase().replace(' ', '-'))}
									>
										<ChevronRight
											className={cn(
												'h-4 w-4 transition-transform',
												group.isExpanded && 'rotate-90'
											)}
										/>
										<span className='font-medium text-sm text-muted-foreground'>{group.name}</span>
										<span className='text-xs text-muted-foreground ml-auto'>
											({group.calendars.length})
										</span>
									</div>

									{/* Group Calendars */}
									{group.isExpanded && (
										<div className='ml-4 space-y-1'>
											{group.calendars.map(calendarItem => (
												<CalendarItem
													key={calendarItem.calendar.uid}
													calendar={calendarItem}
													isActive={
														calendarItem.calendar.uid === activeCalendar?.uid && !isOnHomePage
													}
													isVisible={visibleCalendars.has(calendarItem.calendar.uid)}
													isFavorite={favorites.has(calendarItem.calendar.uid)}
													onNavigate={() => handleNavigateToCalendar(calendarItem.calendar.uid)}
													// Removed onToggleVisibility, onColorChange, onToggleFavorite
													onOpenSettings={() => handleOpenCalendarSettingsFromItem(calendarItem.calendar.uid)}
													onRefresh={() => handleRefreshCalendar(calendarItem.calendar.uid)}
												/>
											))}
										</div>
									)}
								</div>
							))}

							{unscheduledTasks.length > 0 && (
								<>
									<Separator className='my-4' />
									<div className='space-y-1'>
										{/* Enhanced Tasks Header with Drop Zone */}
										<div
											className={cn(
												'flex items-center gap-2 py-2 px-1 cursor-pointer hover:bg-muted/50 rounded transition-all duration-200',
												isDragOver &&
													'bg-blue-100 border-2 border-blue-300 border-dashed shadow-inner'
											)}
											onClick={() => handleToggleGroup('unscheduled-tasks')}
											onDrop={handleDrop}
											onDragOver={handleDragOver}
											onDragLeave={handleDragLeave}
										>
											<ChevronRight
												className={cn(
													'h-4 w-4 transition-transform',
													expandedGroups.has('unscheduled-tasks') && 'rotate-90'
												)}
											/>
											<Clock className='h-4 w-4 text-muted-foreground' />
											<span className='font-medium text-sm text-muted-foreground'>
												Unscheduled Tasks
											</span>
											<span className='text-xs text-muted-foreground ml-auto'>
												({unscheduledTasks.length})
											</span>
											{isDragOver && (
												<span className='text-xs text-blue-600 font-medium animate-pulse'>
													Drop to unschedule
												</span>
											)}
										</div>

										{/* Tasks List */}
										{expandedGroups.has('unscheduled-tasks') && (
											<div className='ml-4 space-y-1 max-h-48 overflow-y-auto'>
												{unscheduledTasks.map(task => (
													<TaskItem
														key={task.id}
														task={task}
														onToggleComplete={() => console.log(task.id)}
														onEdit={() => openEditModal(task)}
													/>
												))}
											</div>
										)}
									</div>
								</>
							)}
						</>
					) : (
						<div className='text-center py-8 text-muted-foreground'>
							<Calendar className='h-8 w-8 mx-auto mb-2 opacity-50' />
							<p className='text-sm'>
								{searchQuery ? `No calendars found for "${searchQuery}"` : 'No calendars found'}
							</p>
						</div>
					)}
				</div>
			</ScrollArea>

			<Separator />

			{/* Footer Stats */}
			<div className='p-4'>
				<div className='text-xs text-muted-foreground space-y-1'>
					<div className='flex justify-between'>
						<span>Total calendars:</span>
						<span>{myDisplayCalendars.length}</span>
					</div>
					<div className='flex justify-between'>
						<span>Visible:</span>
						<span>{visibleCalendars.size}</span>
					</div>
					<div className='flex justify-between'>
						<span>Favorites:</span>
						<span>{favorites.size}</span>
					</div>
					{unscheduledTasks.length > 0 && (
						<div className='flex justify-between'>
							<span>Unscheduled tasks:</span>
							<span>{unscheduledTasks.length}</span>
						</div>
					)}
				</div>
			</div>
			{isCalendarModalOpen && (
				<CalendarModal
					isOpen={isCalendarModalOpen}
					onClose={() => {
						setIsCalendarModalOpen(false);
						setEditingCalendarId(undefined); // Reset editing ID
					}}
					calendarId={editingCalendarId} // Use editingCalendarId
				/>
			)}
		</div>
	);
}

interface TaskItemProps {
	task: any;
	onToggleComplete: () => void;
	onEdit: () => void;
}

function TaskItem({ task, onToggleComplete, onEdit }: TaskItemProps) {
	const [isCurrentlyDragging, setIsCurrentlyDragging] = useState(false);
	const { startDrag, endDrag } = useCalendarEvents();

	const priorityColors = {
		high: 'text-red-500',
		medium: 'text-yellow-500',
		low: 'text-green-500',
	};

	const handleDragStart = (e: React.DragEvent) => {
		setIsCurrentlyDragging(true);

		// Set drag data for external drops (like sidebar to sidebar reordering)
		const dragData = {
			type: 'unscheduled-task',
			task: task,
		};
		e.dataTransfer.setData('application/json', JSON.stringify(dragData));
		e.dataTransfer.effectAllowed = 'move';

		// Use React context for internal state management
		startDrag(task, 'unscheduled-task');

		// Create custom drag image
		const dragImage = document.createElement('div');
		dragImage.textContent = task.title;
		dragImage.style.cssText = `
			padding: 8px 12px;
			background-color: ${task.color || '#3174ad'};
			color: white;
			border-radius: 4px;
			position: absolute;
			top: -1000px;
			font-size: 14px;
			white-space: nowrap;
			max-width: 200px;
			overflow: hidden;
			text-overflow: ellipsis;
		`;
		document.body.appendChild(dragImage);
		e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2);

		setTimeout(() => {
			if (document.body.contains(dragImage)) {
				document.body.removeChild(dragImage);
			}
		}, 0);
	};

	const handleDragEnd = () => {
		setIsCurrentlyDragging(false);
		endDrag();
	};

	return (
		<div
			className={cn(
				'group p-2 rounded-md hover:bg-muted/50 transition-all duration-200 cursor-pointer',
				task.completed && 'opacity-60',
				isCurrentlyDragging && 'opacity-50 scale-95 rotate-1'
			)}
			draggable={!task.completed}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className='flex items-center gap-2'>
				{/* Completion toggle */}
				<button
					onClick={e => {
						e.stopPropagation();
						onToggleComplete();
					}}
					className='flex-shrink-0'
				>
					{task.completed ? (
						<CheckSquare className='h-4 w-4 text-primary' />
					) : (
						<Square className='h-4 w-4 text-muted-foreground hover:text-primary' />
					)}
				</button>

				{/* Drag handle indicator */}
				{!task.completed && (
					<div className='flex-shrink-0 opacity-30 group-hover:opacity-100 transition-opacity'>
						<svg className='h-3 w-3' viewBox='0 0 6 10'>
							<path
								d='M0 0h2v2H0V0zm4 0h2v2H4V0zM0 4h2v2H0V4zm4 0h2v2H4V4zM0 8h2v2H0V8zm4 0h2v2H4V8z'
								fill='currentColor'
							/>
						</svg>
					</div>
				)}

				{/* Task info */}
				<div className='flex-1 min-w-0' onClick={onEdit}>
					<p
						className={cn(
							'text-sm truncate',
							task.completed && 'line-through text-muted-foreground'
						)}
					>
						{task.title}
					</p>
					<div className='flex items-center gap-2 text-xs text-muted-foreground'>
						{task.priority && task.priority !== 'medium' && (
							<span
								className={cn(
									'font-medium',
									priorityColors[task.priority as keyof typeof priorityColors]
								)}
							>
								{task.priority.toUpperCase()}
							</span>
						)}
						{task.dueDate && <span>Due: {task.dueDate.toLocaleDateString()}</span>}
					</div>
				</div>

				{/* Task color indicator */}
				{task.color && (
					<div
						className='w-2 h-2 rounded-full flex-shrink-0'
						style={{ backgroundColor: task.color }}
					/>
				)}
			</div>
		</div>
	);
}

interface CalendarItemProps {
	calendar: MyCalendarItem;
	isActive: boolean;
	isVisible: boolean; // Still needed for styling
	isFavorite: boolean; // Still needed for displaying star icon
	onNavigate: () => void;
	onOpenSettings: () => void; // New prop
	onRefresh: () => void;
}

function CalendarItem({
	calendar,
	isActive,
	isVisible,
	isFavorite,
	onNavigate,
	onOpenSettings, // Changed props
	onRefresh,
}: CalendarItemProps) {
	const users: CalendarUser[] = calendar.calendar.users || [];

	// colorOptions no longer needed here as color picker is removed
	// const colorOptions = [ ... ]; 

	return (
		<div
			className={cn(
				'group p-3 rounded-md border-2 transition-all duration-200',
				isActive && 'border-primary bg-primary/10',
				!isActive && 'border-transparent hover:border-muted-foreground/20',
				!isVisible && 'opacity-60'
			)}
		>
			{/* Main Calendar Info - Clickable */}
			<div className='flex items-center gap-3 cursor-pointer' onClick={onNavigate}>
				{/* Color indicator */}
				<div
					className='w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow-sm'
					style={{ backgroundColor: calendar.color }}
				/>

				{/* Calendar info */}
				<div className='flex-1 min-w-0'>
					<div className='flex items-center gap-2'>
						<p className={cn('font-medium text-sm truncate', isActive && 'text-primary')}>
							{calendar.calendar.calendarName}
						</p>

						{isFavorite && <Star className='h-3 w-3 text-yellow-500 fill-current' />}
					</div>

					{users.length > 0 && (
						<p className='text-xs text-muted-foreground'>
							{users.length} user{users.length !== 1 ? 's' : ''}
						</p>
					)}
				</div>
			</div>

			{/* Controls - Visible on hover - Simplified */}
			<div className='flex items-center justify-end mt-3 gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
				{/* Visibility toggle, Favorite toggle, and Color picker removed */}
				{/* Only "More actions" dropdown remains in this control row */ }
				<div className='flex items-center gap-1'>
					{/* More actions */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' size='sm' className='h-7 w-7 p-0'>
								<MoreHorizontal className='h-3 w-3' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							<DropdownMenuItem onClick={onRefresh}>
								<Calendar className='h-4 w-4 mr-2' />
								Refresh Calendar
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={onOpenSettings}> {/* Calls prop to open modal */}
								<Settings className='h-4 w-4 mr-2' />
								Calendar Settings
							</DropdownMenuItem>
							<DropdownMenuItem> {/* This likely opens a different modal or navigates */}
								<Users className='h-4 w-4 mr-2' />
								Manage Users
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Share2 className='h-4 w-4 mr-2' />
								Share Calendar
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								<Download className='h-4 w-4 mr-2' />
								Export Calendar
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Upload className='h-4 w-4 mr-2' />
								Import Events
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								<Archive className='h-4 w-4 mr-2' />
								Archive Calendar
							</DropdownMenuItem>
							<DropdownMenuItem className='text-red-600'>
								<Trash2 className='h-4 w-4 mr-2' />
								Delete Calendar
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
