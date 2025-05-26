import { useCallback, useState } from 'react';
import {
	Edit,
	Trash,
	CheckSquare,
	Square,
	Clock,
	MapPin,
	Users,
	Flag,
	MoreHorizontal,
	FileText,
	ChevronDown,
	ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { CalendarEvent, PRIORITY_COLORS } from '@/lib/types';
import { formatTime, cn } from '@/lib/utils';
import { useEvents } from '@/contexts/EventContext';
import { useMDXParser } from '@/lib/mdx-parser';

interface CustomEventProps {
	event: CalendarEvent;
	title: React.ReactNode;
	view?: string; // Add view prop to determine rendering mode
	onEdit?: () => void;
	onContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
	onDragStart?: () => void;
}

export default function CustomEvent({
	event,
	title,
	view,
	onEdit,
	onContextMenu,
	onDragStart,
}: CustomEventProps) {
	const { deleteEvent, toggleEventDone, startDrag, endDrag, updatingEvents } = useEvents();
	const [isHovered, setIsHovered] = useState(false);
	const [isContentExpanded, setIsContentExpanded] = useState(false);
	const [isCurrentlyDragging, setIsCurrentlyDragging] = useState(false);
	const isEventUpdating = updatingEvents.has(event.id);

	const handleEdit = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (onEdit) onEdit();
		},
		[onEdit]
	);

	const handleDelete = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			deleteEvent(event.id);
		},
		[event.id, deleteEvent]
	);

	const handleToggleDone = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			toggleEventDone(event.id);
		},
		[event.id, toggleEventDone]
	);

	const handleInternalContextMenu = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			onContextMenu?.(e, event);
		},
		[onContextMenu, event]
	);

	const handleToggleContent = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			setIsContentExpanded(!isContentExpanded);
		},
		[isContentExpanded]
	);

	const handleDragStart = useCallback(
		(e: React.DragEvent) => {
			if (onDragStart) onDragStart();
			setIsCurrentlyDragging(true);

			const dragData = {
				type: 'calendar-event',
				event: event,
			};
			e.dataTransfer.setData('application/json', JSON.stringify(dragData));
			e.dataTransfer.effectAllowed = 'move';

			startDrag(event, 'calendar-event');

			// Create a more polished drag image
			const dragImage = document.createElement('div');
			dragImage.innerHTML = `
            <div style="
                padding: ${view === 'month' ? '4px 8px' : '8px 12px'};
                background-color: ${event.color || '#3174ad'};
                color: white;
                border-radius: 6px;
                font-size: ${view === 'month' ? '12px' : '14px'};
                font-weight: 500;
                white-space: nowrap;
                max-width: ${view === 'month' ? '150px' : '200px'};
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                backdrop-filter: blur(8px);
                ${isEventUpdating ? 'opacity: 0.7; filter: grayscale(0.3);' : ''}
            ">
                ${event.title}
                ${isEventUpdating ? ' (Updating...)' : ''}
            </div>
        `;
			dragImage.style.position = 'absolute';
			dragImage.style.top = '-1000px';
			dragImage.style.pointerEvents = 'none';

			document.body.appendChild(dragImage);
			e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2);

			// Clean up drag image
			requestAnimationFrame(() => {
				if (document.body.contains(dragImage)) {
					document.body.removeChild(dragImage);
				}
			});
		},
		[event, onDragStart, startDrag, view, isEventUpdating]
	);

	const handleDragEnd = useCallback(() => {
		setIsCurrentlyDragging(false);
		endDrag();
	}, [endDrag]);

	const calendarEventColor = event.color || 'rgb(49, 116, 173)';
	const priorityColor = PRIORITY_COLORS[event.priority] || PRIORITY_COLORS.medium;

	const parsedContent = useMDXParser(event.content || '', {
		maxImageHeight: '120px',
		codeBlockTheme: 'auto',
		allowHTML: false,
	});

	const hasRichContent = Boolean(event.content?.trim());
	const shouldShowExpandButton = hasRichContent && parsedContent.length > 200;

	// Add enhanced loading overlay with better UX
	const LoadingOverlay = () => {
		if (!isEventUpdating) return null;

		return (
			<div className='absolute inset-0 bg-black/10 rounded flex items-center justify-center backdrop-blur-[1px] z-10'>
				<div className='flex items-center gap-2 text-white text-xs'>
					<div className='w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin' />
					<span className='hidden sm:inline'>Updating...</span>
				</div>
			</div>
		);
	};

	// Enhanced visual feedback styles
	const getEventStyles = () => {
		const baseStyles = {
			backgroundColor: calendarEventColor,
			color: 'white',
			transition: 'all 0.2s ease',
		};

		if (isCurrentlyDragging) {
			return {
				...baseStyles,
				opacity: 0.5,
				transform: 'scale(0.95)',
			};
		}

		if (isEventUpdating) {
			return {
				...baseStyles,
				boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5), 0 0 12px rgba(59, 130, 246, 0.3)',
				transform: 'translateZ(0)', // Force hardware acceleration
			};
		}

		return baseStyles;
	};

	if (view === 'month') {
		return (
			<div
				className={cn(
					'relative p-1 overflow-hidden flex items-center rounded transition-all duration-200',
					'hover:shadow-sm focus:shadow-sm',
					event.isDone && 'opacity-60',
					isHovered && 'shadow-md',
					isCurrentlyDragging && 'opacity-50 scale-95',
					isEventUpdating && 'ring-2 ring-blue-400 ring-opacity-50'
				)}
				style={{
					...getEventStyles(),
					borderLeft: `3px solid ${priorityColor}`,
				}}
				draggable={!event.isDone && !isEventUpdating}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onContextMenu={handleInternalContextMenu}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<LoadingOverlay />

				{/* Disable interactions while updating */}
				{isEventUpdating && <div className='absolute inset-0 z-5 cursor-not-allowed' />}

				{/* Completion checkbox */}
				<Button
					variant='ghost'
					size='icon'
					className='h-4 w-4 flex-shrink-0 p-0'
					onClick={handleToggleDone}
				>
					{event.isDone ? (
						<CheckSquare className='h-3 w-3 text-green-400' />
					) : (
						<Square className='h-3 w-3 text-gray-300' />
					)}
				</Button>

				{/* Event content */}
				<div className='flex items-center gap-2 flex-1 min-w-0 ml-1'>
					{/* Time indicator for non-all-day events */}
					{!event.isAllDay && event.start && (
						<span className='text-xs text-gray-200 whitespace-nowrap flex-shrink-0'>
							<Clock className='h-3 w-3 inline mr-1' />
							{formatTime(event.start)}
						</span>
					)}

					{/* Title */}
					<span
						className={cn(
							'font-medium truncate text-sm flex-1',
							event.isDone && 'line-through text-gray-400'
						)}
					>
						{title}
					</span>
				</div>

				{/* Actions dropdown */}
				<div
					className={cn(
						'flex-shrink-0 transition-opacity duration-200',
						isHovered ? 'opacity-100' : 'opacity-0'
					)}
				>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' size='icon' className='h-5 w-5 p-0'>
								<MoreHorizontal className='h-3 w-3' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onClick={handleEdit}>
								<Edit className='h-4 w-4 mr-2' />
								Edit
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleToggleDone}>
								{event.isDone ? (
									<>
										<Square className='h-4 w-4 mr-2' />
										Mark Incomplete
									</>
								) : (
									<>
										<CheckSquare className='h-4 w-4 mr-2' />
										Mark Complete
									</>
								)}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleDelete} className='text-red-600'>
								<Trash className='h-4 w-4 mr-2' />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		);
	}

	// Render detailed version for week/day/agenda views
	return (
		<div
			className={cn(
				'relative p-0.5 overflow-hidden flex flex-col justify-between rounded transition-all duration-200',
				'hover:shadow-md focus:shadow-md',
				event.isDone && 'opacity-75',
				isHovered && 'shadow-lg',
				isCurrentlyDragging && 'opacity-50 scale-95',
				isEventUpdating && 'ring-2 ring-blue-400 ring-opacity-50'
			)}
			style={{
				...getEventStyles(),
				borderLeft: `4px solid ${priorityColor}`,
			}}
			draggable={!event.isDone && !isEventUpdating}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onContextMenu={handleInternalContextMenu}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<LoadingOverlay />

			{/* Disable interactions while updating */}
			{isEventUpdating && <div className='absolute inset-0 z-5 cursor-not-allowed' />}

			{/* Header */}
			<div className='flex items-start justify-between gap-1'>
				<div className='flex items-center gap-1 overflow-hidden flex-1'>
					<Button
						variant='ghost'
						size='icon'
						className='h-5 w-5 flex-shrink-0'
						onClick={handleToggleDone}
					>
						{event.isDone ? (
							<CheckSquare className='h-4 w-4 text-green-400' />
						) : (
							<Square className='h-4 w-4 text-gray-300' />
						)}
					</Button>

					<div className='flex flex-col flex-1 min-w-0'>
						<div className='flex items-center gap-1'>
							{!event.isAllDay && event.start && (
								<span className='text-xs text-gray-200 whitespace-nowrap'>
									<Clock className='h-3 w-3 inline mr-1' />
									{formatTime(event.start)}
								</span>
							)}
							{event.isAllDay && (
								<Badge variant='secondary' className='text-xs bg-white/20 text-white'>
									All day
								</Badge>
							)}
							{hasRichContent && <FileText className='h-3 w-3 text-gray-300' />}
						</div>

						<span
							className={cn(
								'font-medium truncate text-sm',
								event.isDone && 'line-through text-gray-400'
							)}
						>
							{title}
						</span>
					</div>
				</div>

				{/* Actions (visible on hover or for mobile) */}
				<div
					className={cn(
						'flex items-center gap-1 transition-opacity duration-200',
						isHovered ? 'opacity-100' : 'opacity-0 md:opacity-100'
					)}
				>
					{shouldShowExpandButton && (
						<Button
							variant='ghost'
							size='icon'
							className='h-6 w-6'
							onClick={handleToggleContent}
							title={isContentExpanded ? 'Collapse content' : 'Expand content'}
						>
							{isContentExpanded ? (
								<ChevronUp className='h-3 w-3' />
							) : (
								<ChevronDown className='h-3 w-3' />
							)}
						</Button>
					)}

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' size='icon' className='h-6 w-6'>
								<MoreHorizontal className='h-3 w-3' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onClick={handleEdit}>
								<Edit className='h-4 w-4 mr-2' />
								Edit
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleToggleDone}>
								{event.isDone ? (
									<>
										<Square className='h-4 w-4 mr-2' />
										Mark Incomplete
									</>
								) : (
									<>
										<CheckSquare className='h-4 w-4 mr-2' />
										Mark Complete
									</>
								)}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleDelete} className='text-red-600'>
								<Trash className='h-4 w-4 mr-2' />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Content */}
			<div className='flex-1 mt-1'>
				{/* Description */}
				{event.description && !event.isAllDay && (
					<div className='text-xs text-gray-200 mt-1 line-clamp-2'>{event.description}</div>
				)}

				{/* Rich Content (MDX) */}
				{hasRichContent && parsedContent && (
					<div className='mt-2'>
						<div
							className={cn(
								'max-w-none',
								!isContentExpanded && shouldShowExpandButton && 'line-clamp-3 overflow-hidden'
							)}
							dangerouslySetInnerHTML={{ __html: parsedContent }}
						/>
					</div>
				)}

				{/* Location */}
				{event.location && (
					<div className='flex items-center gap-1 text-xs text-gray-300 mt-1'>
						<MapPin className='h-3 w-3' />
						<span className='truncate'>{event.location}</span>
					</div>
				)}

				{/* Progress for tasks with subtasks */}
				{event.hasSubtasks && (
					<div className='mt-1'>
						<div className='flex items-center justify-between text-xs text-gray-300'>
							<span>
								{event.completedSubtasks}/{event.totalSubtasks} subtasks
							</span>
							<span>{event.progressPercentage}%</span>
						</div>
						<div className='w-full bg-gray-700 rounded-full h-1 mt-1'>
							<div
								className='bg-sky-400 h-1 rounded-full transition-all duration-300'
								style={{ width: `${event.progressPercentage}%` }}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className='flex items-center justify-between mt-2 text-xs'>
				<div className='flex items-center gap-1 flex-wrap'>
					{/* Priority indicator */}
					{event.priority && event.priority !== 'medium' && (
						<Badge
							variant='outline'
							className='text-xs px-1 py-0 border-white/50 text-white/80 bg-white/10'
						>
							<Flag className='h-3 w-3 mr-1' style={{ color: priorityColor }} />
							{event.priority}
						</Badge>
					)}

					{/* Status indicator */}
					<Badge
						variant='outline'
						className='text-xs px-1 py-0 border-white/50 text-white/80 bg-white/10'
					>
						{(event.status || 'todo').replace('_', ' ')}
					</Badge>

					{/* Tags */}
					{event.tags &&
						event.tags.slice(0, 2).map((tag, index) => (
							<Badge
								key={index}
								variant='secondary'
								className='text-xs px-1 py-0 bg-white/20 text-white'
							>
								{tag}
							</Badge>
						))}
					{event.tags && event.tags.length > 2 && (
						<Badge variant='secondary' className='text-xs px-1 py-0 bg-white/20 text-white'>
							+{event.tags.length - 2}
						</Badge>
					)}
				</div>

				{/* Assignees */}
				{event.assignee && event.assignee.length > 0 && (
					<div className='flex items-center gap-1'>
						<Users className='h-3 w-3 text-gray-300' />
						<span className='text-gray-300'>{event.assignee.length}</span>
					</div>
				)}
			</div>
		</div>
	);
}
