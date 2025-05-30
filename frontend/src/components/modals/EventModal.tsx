import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// import { format } from 'date-fns'; // No longer used directly here
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
	CalendarIcon,
	// Clock, // No longer used directly here
	MapPin,
	Flag,
	Trash2,
	Save,
	X,
	AlertCircle,
} from 'lucide-react';

import { CalendarEvent, PriorityLevel, EventStatus, DEFAULT_EVENT_FORM } from '@/lib/types';
import { useEvents } from '@/contexts/EventContext';
import { useUser } from '@/contexts/UserContext';
import { useCalendars } from '@/contexts/CalendarContext';
import { cn } from '@/lib/utils';
import RichTextEditor from '../calendar/RichTextEditor';
import UserSelector from '../calendar/UserSelector';
import TagInput from '../calendar/TagInput';
import DependencySelector from '../calendar/DependencySelector';
import { DateTimeField } from '../DateTimeField'; // Corrected import path relative to modals directory

const eventFormSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().optional(),
	content: z.string().optional(),
	start: z.date().optional().nullable(),
	end: z.date().optional().nullable(),
	isAllDay: z.boolean().default(false),
	location: z.string().optional(),
	priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
	status: z.enum(['todo', 'in_progress', 'review', 'done', 'cancelled']).default('todo'),
	assignee: z.array(z.string()).default([]),
	tags: z.array(z.string()).default([]),
	parentId: z.string().optional().nullable(),
	dependsOn: z.array(z.string()).default([]),
	blocks: z.array(z.string()).default([]),
	estimatedHours: z.number().optional().nullable(),
	uid: z.string().min(1, 'Calendar is required'),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface UserCalendarItem {
	calendar: {
		uid: string;
		calendarName: string;
	};
	color: string;
	isVisible: boolean;
}

interface EventModalProps {
	isOpen: boolean;
	onClose: () => void;
	event?: CalendarEvent | null;
	mode: 'add' | 'edit';
	defaultStart?: Date;
	defaultEnd?: Date;
}

export default function EventModal({
	isOpen,
	onClose,
	event,
	mode,
	defaultStart,
	defaultEnd,
}: EventModalProps) {
	const { user } = useUser();
	const { activeCalendar } = useCalendars();
	const [isLoading, setIsLoading] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [activeTab, setActiveTab] = useState('details');

	const getDefaultCalendarUid = useCallback(() => {
		if (mode === 'add' && activeCalendar?.uid) return activeCalendar.uid;
		if (user?.myCalendar?.uid) return user.myCalendar.uid;
		if (user?.myCalendars?.[0]?.calendar?.uid) return user.myCalendars[0].calendar.uid;
		return '';
	}, [user, activeCalendar, mode]);

	const form = useForm<EventFormValues>({
		resolver: zodResolver(eventFormSchema),
		defaultValues: {
			...DEFAULT_EVENT_FORM,
			start: defaultStart,
			end: defaultEnd,
		},
	});

	useEffect(() => {
		// Reset to details tab when modal opens
		if (isOpen) {
			setActiveTab('details');
		}
	}, [isOpen]);

	useEffect(() => {
		console.log('EventModal mounted/updated:', { mode, event, isOpen });

		if (!isOpen) return; // Don't reset if modal is closed

		try {
			if (mode === 'edit' && event) {
				console.log('Resetting form with event data:', event);
				const formData = {
					title: event.title || '',
					description: event.description || '',
					content: event.content || '',
					start: event.start ? new Date(event.start) : undefined,
					end: event.end ? new Date(event.end) : undefined,
					isAllDay: event.isAllDay || false,
					location: event.location || '',
					priority: event.priority || 'medium',
					status: event.status || 'todo',
					assignee: event.assignee || [],
					tags: event.tags || [],
					parentId: event.parentId || undefined,
					dependsOn: event.dependsOn || [],
					blocks: event.blocks || [],
					estimatedHours: event.estimatedHours || undefined,
					uid: event.uid || '',
				};
				console.log('Form data to reset:', formData);
				form.reset(formData);
			} else if (mode === 'add') {
				const defaultUid = getDefaultCalendarUid();
				console.log('Resetting form for new event with default UID:', defaultUid);
				if (!defaultUid) {
					console.error('No default calendar UID available');
				}
				const formData = {
					...DEFAULT_EVENT_FORM,
					uid: defaultUid || '',
					start: defaultStart,
					end: defaultEnd,
				};
				console.log('Form data for new event:', formData);
				form.reset(formData);
			}
		} catch (error) {
			console.error('Error resetting form:', error);
		}
	}, [mode, event, defaultStart, defaultEnd, form, getDefaultCalendarUid, isOpen]);

	const { addEvent, updateEvent, deleteEvent } = useEvents();

	useEffect(() => {
		console.log('EventModal hooks:', {
			hasAddEvent: !!addEvent,
			hasUpdateEvent: !!updateEvent,
			hasDeleteEvent: !!deleteEvent,
		});
	}, [addEvent, updateEvent, deleteEvent]);

	useEffect(() => {
		const start = form.watch('start');
		const end = form.watch('end');
		const currentEstimatedHours = form.watch('estimatedHours');

		if (start && end && end > start) {
			const diffMilliseconds = end.getTime() - start.getTime();
			const diffHours = parseFloat((diffMilliseconds / (1000 * 60 * 60)).toFixed(2));
			
			if (diffHours !== currentEstimatedHours) {
				form.setValue('estimatedHours', diffHours, { shouldValidate: true });
			}
		} else if (currentEstimatedHours !== undefined && currentEstimatedHours !== null && (!start || !end || end <= start) ){
			// if start/end is cleared or invalid, but we had an estimate, clear it unless it's 0
			// Or if user manually clears estimated hours
			// form.setValue('estimatedHours', undefined, { shouldValidate: true });
		}

	}, [form.watch('start'), form.watch('end'), form]);

	useEffect(() => {
		const start = form.watch('start');
		const estimatedHours = form.watch('estimatedHours');
		const currentEnd = form.watch('end');

		if (start && typeof estimatedHours === 'number' && estimatedHours > 0) {
			const newEnd = new Date(start.getTime() + estimatedHours * 60 * 60 * 1000);
			if (!currentEnd || newEnd.getTime() !== currentEnd.getTime()) {
				form.setValue('end', newEnd, { shouldValidate: true });
			}
		} else if (start && typeof estimatedHours === 'number' && estimatedHours === 0 && currentEnd) {
			// If estimated hours is set to 0, set end time to be same as start time
			if (currentEnd.getTime() !== start.getTime()) {
				form.setValue('end', new Date(start.getTime()), { shouldValidate: true });
			}
		} 
		// if estimated hours is cleared (undefined / null) or negative, we don't auto-update end time
		// The user might be in the process of clearing/correcting it.

	}, [form.watch('start'), form.watch('estimatedHours'), form]);


	const onSubmit = async (values: any) => {
		setIsLoading(true);
		try {
			if (mode === 'add') {
				await addEvent(values, values.uid);
			} else if (mode === 'edit' && event) {
				await updateEvent({
					...event,
					...values,
					updatedAt: new Date(),
				} as any);
			}
			onClose();
		} catch (error) {
			console.error('Failed to save event:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!event) return;

		setIsLoading(true);
		try {
			await deleteEvent(event.id);
			onClose();
		} catch (error) {
			console.error('Failed to delete event:', error);
		} finally {
			setIsLoading(false);
			setShowDeleteConfirm(false);
		}
	};

	const handleClose = () => {
		if (!isLoading) {
			onClose();
			setShowDeleteConfirm(false);
			form.reset();
		}
	};

	const priorityOptions: { value: PriorityLevel; label: string; color: string }[] = [
		{ value: 'low', label: 'Low', color: 'text-green-600' },
		{ value: 'medium', label: 'Medium', color: 'text-yellow-600' },
		{ value: 'high', label: 'High', color: 'text-orange-600' },
		{ value: 'urgent', label: 'Urgent', color: 'text-red-600' },
	];

	const statusOptions: { value: EventStatus; label: string; color: string }[] = [
		{ value: 'todo', label: 'To Do', color: 'text-gray-600' },
		{ value: 'in_progress', label: 'In Progress', color: 'text-blue-600' },
		{ value: 'review', label: 'Review', color: 'text-yellow-600' },
		{ value: 'done', label: 'Done', color: 'text-green-600' },
		{ value: 'cancelled', label: 'Cancelled', color: 'text-red-600' },
	];

	const availableCalendars = (user?.myCalendars?.filter((cal: any) => cal.calendar) ||
		[]) as UserCalendarItem[];

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className='max-w-4xl h-[90vh] flex flex-col'>
				<DialogHeader className='flex-shrink-0'>
					<DialogTitle className='flex items-center gap-2'>
						{mode === 'add' ? (
							<>
								<CalendarIcon className='h-5 w-5' />
								Create New Event
							</>
						) : (
							<>
								<CalendarIcon className='h-5 w-5' />
								Edit Event
							</>
						)}
					</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className='flex flex-col flex-1 overflow-hidden'
					>
						<div className='flex-1 overflow-hidden'>
							<Tabs value={activeTab} onValueChange={setActiveTab} className='h-full flex flex-col'>
								<TabsList className='grid w-full grid-cols-3 flex-shrink-0'>
									<TabsTrigger value='details'>Details</TabsTrigger>
									<TabsTrigger value='assignment'>Assignment</TabsTrigger>
									<TabsTrigger value='advanced'>Advanced</TabsTrigger>
								</TabsList>

								<div className='flex-1 overflow-y-auto'>
									<TabsContent value='details' className='space-y-4 mt-6'>
										{/* Calendar UID field */}
										{availableCalendars.length > 1 && (
											<FormField
												control={form.control}
												name='uid'
												render={({ field }) => (
													<FormItem>
														<FormLabel>Calendar</FormLabel>
														<Select onValueChange={field.onChange} value={field.value}>
															<FormControl>
																<SelectTrigger>
																	<SelectValue placeholder='Select a calendar' />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																{availableCalendars.map((cal: UserCalendarItem) => (
																	<SelectItem key={cal.calendar.uid} value={cal.calendar.uid}>
																		<div className='flex items-center gap-2'>
																			<div
																				className='w-3 h-3 rounded-full'
																				style={{ backgroundColor: cal.color }}
																			/>
																			{cal.calendar.calendarName}
																		</div>
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>
										)}

										{/* Start/End Date grid */}
										<div className='grid grid-cols-2 gap-4'>
											<DateTimeField
												control={form.control}
												name='start'
												config={{
													label: 'Start Date & Time',
													showTimeInput: !form.watch('isAllDay'),
													placeholder: 'Pick a start date',
												}}
											/>
											<DateTimeField
												control={form.control}
												name='end'
												config={{
													label: 'End Date & Time',
													showTimeInput: !form.watch('isAllDay'),
													placeholder: 'Pick an end date',
												}}
											/>
										</div>

										{/* isAllDay switch */}
										<div className='flex items-center space-x-2'>
											<FormField
												control={form.control}
												name='isAllDay'
												render={({ field }) => (
													<FormItem className='flex flex-row items-center space-x-2 space-y-0'>
														<FormControl>
															<Switch checked={field.value} onCheckedChange={field.onChange} />
														</FormControl>
														<FormLabel>All Day Event</FormLabel>
													</FormItem>
												)}
											/>
										</div>
										
										<FormField
											control={form.control}
											name='estimatedHours'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Estimated Hours</FormLabel>
													<FormControl>
														<Input
															type='number'
															min='0'
															step='0.5'
															placeholder='Estimated time in hours'
															{...field}
															value={field.value || ''}
															onChange={e =>
																field.onChange(
																	e.target.value ? parseFloat(e.target.value) : undefined
																)
															}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name='title'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Title *</FormLabel>
													<FormControl>
														<Input
															placeholder='Event title'
															{...field}
															autoFocus={mode === 'add'}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name='description'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Description</FormLabel>
													<FormControl>
														<Textarea
															placeholder='Brief description of the event'
															rows={3}
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name='content'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Rich Content</FormLabel>
													<FormControl>
														<RichTextEditor
															value={field.value || ''}
															onChange={field.onChange}
															placeholder='Add detailed content, notes, or markdown...'
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name='location'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Location</FormLabel>
													<FormControl>
														<div className='relative'>
															<MapPin className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
															<Input placeholder='Event location' className='pl-10' {...field} />
														</div>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</TabsContent>

									<TabsContent value='assignment' className='space-y-4 mt-6'>
										<div className='grid grid-cols-2 gap-4'>
											<FormField
												control={form.control}
												name='priority'
												render={({ field }) => (
													<FormItem>
														<FormLabel>Priority</FormLabel>
														<Select onValueChange={field.onChange} value={field.value}>
															<FormControl>
																<SelectTrigger>
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																{priorityOptions.map(option => (
																	<SelectItem key={option.value} value={option.value}>
																		<div className='flex items-center gap-2'>
																			<Flag className={cn('h-4 w-4', option.color)} />
																			{option.label}
																		</div>
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name='status'
												render={({ field }) => (
													<FormItem>
														<FormLabel>Status</FormLabel>
														<Select onValueChange={field.onChange} value={field.value}>
															<FormControl>
																<SelectTrigger>
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																{statusOptions.map(option => (
																	<SelectItem key={option.value} value={option.value}>
																		<div className='flex items-center gap-2'>
																			<div
																				className={cn(
																					'w-2 h-2 rounded-full',
																					option.color.replace('text-', 'bg-')
																				)}
																			/>
																			{option.label}
																		</div>
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>

										<FormField
											control={form.control}
											name='assignee'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Assignees</FormLabel>
													<FormControl>
														<UserSelector
															value={field.value}
															onChange={field.onChange}
															calendarUid={form.watch('uid')}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name='tags'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Tags</FormLabel>
													<FormControl>
														<TagInput
															value={field.value}
															onChange={field.onChange}
															placeholder='Add tags...'
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</TabsContent>

									<TabsContent value='advanced' className='space-y-4 mt-6'>
										<FormField
											control={form.control}
											name='dependsOn'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Depends On</FormLabel>
													<FormControl>
														<DependencySelector
															value={field.value}
															onChange={field.onChange}
															calendarUid={form.watch('uid')}
															excludeEventId={event?.id}
															type='dependsOn'
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name='blocks'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Blocks</FormLabel>
													<FormControl>
														<DependencySelector
															value={field.value}
															onChange={field.onChange}
															calendarUid={form.watch('uid')}
															excludeEventId={event?.id}
															type='blocks'
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										{event?.hasSubtasks && (
											<div className='rounded-lg border p-4'>
												<h4 className='font-medium mb-2'>Subtask Progress</h4>
												<div className='space-y-2'>
													<div className='flex justify-between text-sm'>
														<span>
															Completed: {event.completedSubtasks}/{event.totalSubtasks}
														</span>
														<span>{event.progressPercentage}%</span>
													</div>
													<div className='w-full bg-gray-200 rounded-full h-2'>
														<div
															className='bg-blue-600 h-2 rounded-full transition-all duration-300'
															style={{ width: `${event.progressPercentage}%` }}
														/>
													</div>
												</div>
											</div>
										)}
									</TabsContent>
								</div>
							</Tabs>
						</div>

						<div className='flex-shrink-0 border-t bg-background'>
							<Separator />
							<DialogFooter className='flex justify-between p-6'>
								<div>
									{mode === 'edit' && (
										<Button
											type='button'
											variant='destructive'
											onClick={() => setShowDeleteConfirm(true)}
											disabled={isLoading}
										>
											<Trash2 className='h-4 w-4 mr-2' />
											Delete
										</Button>
									)}
								</div>

								<div className='flex gap-2'>
									<Button
										type='button'
										variant='outline'
										onClick={handleClose}
										disabled={isLoading}
									>
										<X className='h-4 w-4 mr-2' />
										Cancel
									</Button>
									<Button type='submit' disabled={isLoading}>
										<Save className='h-4 w-4 mr-2' />
										{mode === 'add' ? 'Create Event' : 'Save Changes'}
									</Button>
								</div>
							</DialogFooter>
						</div>
					</form>
				</Form>

				<Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
					<DialogContent className='sm:max-w-md'>
						<DialogHeader>
							<DialogTitle className='flex items-center gap-2'>
								<AlertCircle className='h-5 w-5 text-red-600' />
								Delete Event
							</DialogTitle>
						</DialogHeader>
						<div className='py-4'>
							<p>Are you sure you want to delete this event? This action cannot be undone.</p>
							{event?.hasSubtasks && (
								<div className='mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md'>
									<p className='text-sm text-yellow-800'>
										<AlertCircle className='h-4 w-4 inline mr-1' />
										This event has {event.totalSubtasks} subtasks. Deleting it will also remove all
										subtasks.
									</p>
								</div>
							)}
						</div>
						<DialogFooter>
							<Button
								variant='outline'
								onClick={() => setShowDeleteConfirm(false)}
								disabled={isLoading}
							>
								Cancel
							</Button>
							<Button variant='destructive' onClick={handleDelete} disabled={isLoading}>
								Delete Event
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</DialogContent>
		</Dialog>
	);
}
