import { useCallback, useState } from 'react';
import {
	CheckSquare,
	Square,
	Clock,
	MapPin,
	Users,
	Flag,
	MoreHorizontal,
	FileText,
	Maximize2,
	Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { CalendarEvent, PRIORITY_COLORS } from '@/lib/types';
import './mdx-event-styles.css';

// Custom thin scrollbar is defined in mdx-event-styles.css
import { formatTime, cn } from '@/lib/utils';
import { useEvents } from '@/contexts/EventContext';
import { MDXViewer, MDXInlineEditor, MDXEditorContext } from '@/components/MDXEditor';
import { toast } from 'sonner';
import { EventContentPreview } from '@/components/calendar/EventContentPreview';

interface CustomEventProps {
	event: CalendarEvent;
	title: React.ReactNode;
	view?: string;
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
	const { toggleEventDone, startDrag, endDrag, updatingEvents, updateEvent } = useEvents();
	const [isHovered, setIsHovered] = useState(false);
	const [isCurrentlyDragging, setIsCurrentlyDragging] = useState(false);
	const [isContentExpanded, setIsContentExpanded] = useState(false);
	const [contentError, setContentError] = useState<Error | null>(null);
	const isEventUpdating = updatingEvents.has(event.id);

	// Function to handle content click and toggle expanded state
	const handleContentClick = useCallback(
		(e: React.MouseEvent) => {
			// Only expand content in week view
			if (view === 'week') {
				// Capture the click and prevent it from reaching the calendar event handler
				e.stopPropagation();
				e.preventDefault();

				// Toggle expanded state using a function to avoid closure issues
				setIsContentExpanded(prev => !prev);

				// Prevent any other handlers from processing this event
				return false;
			}
		},
		[view]
	);

	const handleEdit = useCallback(() => {
		if (onEdit) {
			onEdit();
		}
	}, [onEdit, event]);

	const handleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			e.preventDefault();
			if (onEdit) {
				onEdit();
			}
		},
		[onEdit, event]
	);

	const handleToggleDone = useCallback(
		async (e: React.MouseEvent) => {
			e.stopPropagation();
			try {
				await toggleEventDone(event.id);
				toast(event.isDone ? 'Marked incomplete' : 'Done!');
			} catch (error) {
				toast('Failed to update event status');
			}
		},
		[event.id, event.isDone, toggleEventDone, toast]
	);

	const handleInternalContextMenu = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			onContextMenu?.(e, event);
		},
		[onContextMenu, event]
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

	const handleContentUpdate = useCallback(
		async (newContent: string) => {
			if (newContent !== event.content) {
				const updatedEvent = {
					...event,
					content: newContent,
					updatedAt: new Date(),
				};
				try {
					await updateEvent(updatedEvent);
					toast.success('Content updated');
				} catch (error) {
					console.error('Failed to update content:', error);
					toast.error('Failed to update content');
				}
			}
		},
		[event, updateEvent]
	);

	const handleContentError = useCallback((error: Error) => {
		console.error('MDX content error:', error);
		setContentError(error);
	}, []);

	const calendarEventColor = event.color || 'rgb(49, 116, 173)';
	const priorityColor = PRIORITY_COLORS[event.priority] || PRIORITY_COLORS.medium;
	const hasRichContent = Boolean(event.content?.trim());

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
				transform: 'translateZ(0)',
			};
		}

		return baseStyles;
	};

	const ActionsButton = ({
		size = 'default',
		event,
	}: {
		size?: 'default' | 'small';
		event: any;
	}) => {
		return (
			<Button
				variant='ghost'
				size='icon'
				className={cn(
					'flex-shrink-0 text-white/80 hover:text-white hover:bg-white/20 relative z-20',
					size === 'small' ? 'h-4 w-4' : 'h-6 w-6'
				)}
				onClick={e => {
					// Don't stop propagation - let the calendar handle the click
					// This allows the handleEventContainerClick to detect the ActionsButton click
				}}
				onMouseDown={e => {
					e.stopPropagation();
				}}
				type='button'
				data-actions-button='true'
			>
				<MoreHorizontal className={cn(size === 'small' ? 'h-3 w-3' : 'h-4 w-4')} />
			</Button>
		);
	};

	// Month view
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

				{isEventUpdating && <div className='absolute inset-0 z-5 cursor-not-allowed' />}

				<Button
					variant='ghost'
					size='icon'
					className='h-4 w-4 flex-shrink-0 p-0 text-white/80 hover:text-white hover:bg-white/20'
					onClick={handleToggleDone}
					onMouseDown={e => {
						e.stopPropagation();
					}}
				>
					{event.isDone ? (
						<CheckSquare className='h-3 w-3 text-green-400' />
					) : (
						<Square className='h-3 w-3 text-gray-300' />
					)}
				</Button>

				<div className='flex items-center gap-2 flex-1 min-w-0 ml-1'>
					{!event.isAllDay && event.start && (
						<span className='text-xs text-gray-200 whitespace-nowrap flex-shrink-0'>
							<Clock className='h-3 w-3 inline mr-1' />
							{formatTime(event.start)}
						</span>
					)}

					<div className='flex items-center gap-1 flex-1'>
						<span
							className={cn(
								'font-medium truncate text-sm flex-1',
								event.isDone && 'line-through text-gray-400'
							)}
						>
							{title}
						</span>
						{hasRichContent && (
							<EventContentPreview
								event={event}
								onError={handleContentError}
								buttonClassName='relative z-20'
							/>
						)}
					</div>
				</div>

				<ActionsButton event={event} size={event.isAllDay ? 'small' : 'default'} />
			</div>
		);
	}

	// Week/Day view
	return (
		<div
			className={cn(
				'relative p-0.5 overflow-hidden flex flex-col justify-between rounded transition-all duration-200',
				'hover:shadow-md focus:shadow-md',
				event.isDone && 'opacity-75',
				isHovered && 'shadow-lg',
				isCurrentlyDragging && 'opacity-50 scale-95',
				isEventUpdating && 'ring-2 ring-blue-400 ring-opacity-50',
				event.isAllDay && view !== 'month' && 'min-h-[60px] border-2 border-dashed border-white/30'
			)}
			style={{
				...getEventStyles(),
				borderLeft: `4px solid ${priorityColor}`,
			}}
			draggable={!event.isDone && !isEventUpdating}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onContextMenu={handleInternalContextMenu}
			onDoubleClick={handleDoubleClick}
		>
			<LoadingOverlay />

			{isEventUpdating && <div className='absolute inset-0 z-5 cursor-not-allowed' />}

			<div className='flex items-start justify-between gap-1'>
				<div className='flex items-center gap-1 overflow-hidden flex-1'>
					<Button
						variant='ghost'
						size='icon'
						className='h-5 w-5 flex-shrink-0 text-white/80 hover:text-white hover:bg-white/20'
						onClick={handleToggleDone}
						onMouseDown={e => {
							e.stopPropagation();
						}}
					>
						{event.isDone ? (
							<CheckSquare className='h-4 w-4 text-green-400' />
						) : (
							<Square className='h-4 w-4 text-gray-300' />
						)}
					</Button>

					<div className='flex flex-col flex-1 min-w-0'>
						<div className='flex items-center gap-1 flex-wrap'>
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

						<div className='flex items-center gap-1'>
							<span
								className={cn(
									'font-medium text-sm leading-tight',
									event.isDone && 'line-through text-gray-400',
									event.isAllDay && view !== 'month' && 'font-semibold'
								)}
								style={{
									whiteSpace: event.isAllDay && view !== 'month' ? 'normal' : 'nowrap',
									overflow: event.isAllDay && view !== 'month' ? 'visible' : 'hidden',
									textOverflow: event.isAllDay && view !== 'month' ? 'initial' : 'ellipsis',
								}}
							>
								{title}
							</span>
						</div>
					</div>
				</div>

				<div className='flex items-center gap-1'>
					<ActionsButton event={event} size={event.isAllDay ? 'small' : 'default'} />
				</div>
			</div>

			<div className='flex-1 mt-1'>
				{event.description && (!event.isAllDay || view === 'week') && (
					<div className='text-xs text-gray-200 mt-1 line-clamp-2'>{event.description}</div>
				)}

				{hasRichContent && event.content && !(view === 'week' && event.isAllDay) && (
					<div
						className={cn(
							'mt-2 transition-all',
							view === 'month' ? 'hidden' : 'flex flex-col',
							event.isAllDay && view !== 'month' ? 'h-[90px]' : 'flex-1 min-h-0'
						)}
					>
						<div
							className={cn(
								'mdx-content-wrapper text-white/95 rounded-sm overflow-hidden',
								view === 'week' ? 'flex flex-col h-full' : '',
								event.isAllDay ? 'bg-white/5' : ''
							)}
						>
							{contentError ? (
								<div className='text-xs text-yellow-300 p-2 bg-black/20 rounded'>
									Content display error. Click edit to fix.
								</div>
							) : view === 'week' ? (
								// Toggle between preview and editable content in week view
								<div
									className='h-full w-full relative'
									onClick={handleContentClick}
									onMouseDown={e => e.stopPropagation()}
									onMouseUp={e => e.stopPropagation()}
								>
									{isContentExpanded ? (
										<div className='flex-1 h-full overflow-auto custom-thin-scrollbar'>
											<div
												className='flex-1 min-h-0 overflow-auto custom-thin-scrollbar'
												style={{
													maxHeight: 'clamp(100px, 30vh, 400px)',
												}}
											>
												<MDXInlineEditor
													content={event.content}
													onChange={handleContentUpdate}
													onError={handleContentError}
													className={cn(
														'mdx-event-content event-mdx-container',
														'prose-sm prose-invert max-w-none',
														'h-auto w-full'
													)}
													minHeight='20px'
													maxHeight={undefined}
													placeholder='Add notes...'
												/>
												<div className='absolute top-0.5 right-0.5 opacity-60 hover:opacity-100 transition-opacity'>
													<div
														className='p-0.5 rounded-sm bg-black/30 backdrop-blur-sm cursor-pointer hover:bg-black/40 transition-colors'
														onClick={e => {
															e.stopPropagation();
															e.preventDefault();
															setIsContentExpanded(false);
														}}
														title='Collapse'
													>
														<Minimize2 className='h-2.5 w-2.5 text-white' />
													</div>
												</div>
											</div>
										</div>
									) : (
										// Preview mode: Limited to 200 characters
										<div
											className='p-1 text-xs cursor-pointer hover:bg-black/20 rounded transition-colors'
											onClick={e => {
												e.stopPropagation();
												e.preventDefault();
												setIsContentExpanded(true);
											}}
										>
											<div className='mdx-event-preview prose-sm prose-invert max-w-none'>
												{event.content && (
													<MDXEditorContext.Provider value={{ isEventCard: true }}>
														<MDXViewer
															content={
																event.content.length > 200
																	? `${event.content.substring(0, 200)}...`
																	: event.content
															}
															className='prose-sm prose-invert max-w-none'
														/>
													</MDXEditorContext.Provider>
												)}
											</div>
											<div className='flex items-center justify-center mt-1 opacity-70 hover:opacity-100 transition-opacity text-[9px] text-white/90'>
												<Maximize2 className='h-2.5 w-2.5 mr-0.5' />
												<span>Expand</span>
											</div>
										</div>
									)}
								</div>
							) : (
								// Non-week view (day view, etc.)
								<div className='max-h-[200px] overflow-auto custom-thin-scrollbar'>
									<MDXEditorContext.Provider value={{ isEventCard: true }}>
										<MDXInlineEditor
											content={event.content}
											onChange={handleContentUpdate}
											onError={handleContentError}
											className={cn('prose-sm prose-invert max-w-none')}
											minHeight='auto'
											maxHeight='200px'
											placeholder='Add notes...'
										/>
									</MDXEditorContext.Provider>
								</div>
							)}
						</div>
					</div>
				)}

				{event.location && (
					<div className='flex items-center gap-1 text-xs text-gray-300 mt-1'>
						<MapPin className='h-3 w-3' />
						<span
							className={cn('truncate', event.isAllDay && view !== 'month' && 'whitespace-normal')}
						>
							{event.location}
						</span>
					</div>
				)}

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

			<div className='flex items-center justify-between mt-2 text-xs'>
				<div className='flex items-center gap-1 flex-wrap'>
					{event.priority && event.priority !== 'medium' && (
						<Badge
							variant='outline'
							className='text-xs px-1 py-0 border-white/50 text-white/80 bg-white/10'
						>
							<Flag className='h-3 w-3 mr-1' style={{ color: priorityColor }} />
							{event.priority}
						</Badge>
					)}

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
