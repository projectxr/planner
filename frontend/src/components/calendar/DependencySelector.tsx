import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, Link, Search, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarEvent } from '@/lib/types';
import apiClient from '@/services/api';

interface DependencySelectorProps {
	value: string[];
	onChange: (value: string[]) => void;
	calendarUid: string;
	excludeEventId?: string;
	type: 'dependsOn' | 'blocks';
	placeholder?: string;
}

export default function DependencySelector({
	value,
	onChange,
	calendarUid,
	excludeEventId,
	type,
	placeholder,
}: DependencySelectorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [availableEvents, setAvailableEvents] = useState<CalendarEvent[]>([]);
	const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
	const [loading, setLoading] = useState(false);

	const defaultPlaceholder =
		type === 'dependsOn' ? 'Select events this depends on...' : 'Select events this blocks...';

	useEffect(() => {
		const fetchEvents = async () => {
			if (!calendarUid) return;

			setLoading(true);
			try {
				const response = await apiClient.get(`/api/events/${calendarUid}`);
				const events = response.data
					.filter((event: CalendarEvent) => event.id !== excludeEventId)
					.map((event: CalendarEvent) => ({
						...event,
						start: event.start ? new Date(event.start) : null,
						end: event.end ? new Date(event.end) : null,
					}));
				setAvailableEvents(events);
			} catch (error) {
				console.error('Failed to fetch events:', error);
				setAvailableEvents([]);
			}
			setLoading(false);
		};

		fetchEvents();
	}, [calendarUid, excludeEventId]);

	// Update selected events when value changes
	useEffect(() => {
		const selected = availableEvents.filter(event => value.includes(event.id));
		setSelectedEvents(selected);
	}, [value, availableEvents]);

	const filteredEvents = availableEvents.filter(
		event =>
			event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			event.description?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const handleEventToggle = (event: CalendarEvent) => {
		const isSelected = value.includes(event.id);
		if (isSelected) {
			onChange(value.filter(id => id !== event.id));
		} else {
			onChange([...value, event.id]);
		}
	};

	const handleRemoveEvent = (eventId: string) => {
		onChange(value.filter(id => id !== eventId));
	};

	return (
		<div className='space-y-2'>
			{/* Selected Events */}
			{selectedEvents.length > 0 && (
				<div className='flex flex-wrap gap-1'>
					{selectedEvents.map(event => (
						<Badge key={event.id} variant='secondary' className='flex items-center gap-1'>
							<Calendar className='h-3 w-3' />
							<span className='text-xs max-w-24 truncate'>{event.title}</span>
							<Button
								variant='ghost'
								size='sm'
								className='h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground'
								onClick={() => handleRemoveEvent(event.id)}
							>
								<X className='h-3 w-3' />
							</Button>
						</Badge>
					))}
				</div>
			)}

			{/* Event Selector */}
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant='outline'
						role='combobox'
						aria-expanded={isOpen}
						className='w-full justify-start'
					>
						<Link className='h-4 w-4 mr-2' />
						{selectedEvents.length > 0
							? `${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''} selected`
							: placeholder || defaultPlaceholder}
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-80 p-0'>
					<div className='p-2 border-b'>
						<div className='relative'>
							<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
							<Input
								placeholder='Search events...'
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								className='pl-8'
							/>
						</div>
					</div>

					<div className='max-h-64 overflow-y-auto'>
						{loading ? (
							<div className='p-4 text-center text-sm text-muted-foreground'>Loading events...</div>
						) : filteredEvents.length > 0 ? (
							<div className='p-1'>
								{filteredEvents.map(event => {
									const isSelected = value.includes(event.id);
									return (
										<div
											key={event.id}
											className={cn(
												'flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent',
												isSelected && 'bg-accent'
											)}
											onClick={() => handleEventToggle(event)}
										>
											<div className='flex items-center space-x-2 flex-1 min-w-0'>
												<Calendar className='h-4 w-4 text-muted-foreground flex-shrink-0' />
												<div className='flex flex-col min-w-0 flex-1'>
													<span className='font-medium truncate'>{event.title}</span>
													{event.description && (
														<span className='text-xs text-muted-foreground truncate'>
															{event.description}
														</span>
													)}
													<div className='flex items-center gap-2 text-xs text-muted-foreground'>
														<span className='capitalize'>{event.status.replace('_', ' ')}</span>
														<span>•</span>
														<span className='capitalize'>{event.priority}</span>
													</div>
												</div>
											</div>
											{isSelected && <Check className='h-4 w-4 flex-shrink-0' />}
										</div>
									);
								})}
							</div>
						) : (
							<div className='p-4 text-center text-sm text-muted-foreground'>
								{searchQuery ? `No events found for "${searchQuery}"` : 'No events available'}
							</div>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
