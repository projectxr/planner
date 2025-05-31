import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Shield } from 'lucide-react';
import { ColorPicker } from '@/components/ui/ColorPicker';

import {
	CalendarData,
	CalendarSettings,
	PriorityLevel,
	EventStatus,
	CalendarViewType,
} from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useCalendars } from '@/contexts/CalendarContext';
import { useToast } from '@/components/ui/use-toast';
import apiClient from '@/services/api';

interface CalendarModalProps {
	isOpen: boolean;
	onClose: () => void;
	calendarId?: string;
}

interface CalendarSettingsForm {
	name: string;
	description: string;
	color: string;
	isPrivate: boolean;
	settings: CalendarSettings;
}

const initialFormValues: CalendarSettingsForm = {
	name: '',
	description: '',
	color: '#3174ad',
	isPrivate: false,
	settings: {
		defaultPriority: 'medium' as PriorityLevel,
		defaultStatus: 'todo' as EventStatus,
		allowSubtasks: true,
		maxHierarchyLevel: 3,
		autoProgressFromSubtasks: true,
		defaultView: 'week' as CalendarViewType,
		workingHours: { start: '09:00', end: '17:00' },
		timezone: 'UTC',
		enableTimeTracking: true,
		enableDependencies: true,
		enableRecurrence: true,
	},
};

// Skeleton components for different form fields
const FormFieldSkeleton = ({ label, type = 'input' }: { label: string; type?: 'input' | 'textarea' | 'select' | 'color' }) => (
	<div className="space-y-2">
		<Skeleton className="h-4 w-24" /> {/* Label */}
		{type === 'input' && <Skeleton className="h-10 w-full" />}
		{type === 'textarea' && <Skeleton className="h-20 w-full" />}
		{type === 'select' && <Skeleton className="h-10 w-full" />}
		{type === 'color' && <Skeleton className="h-10 w-32" />}
	</div>
);

const SwitchFieldSkeleton = ({ withDescription = false }: { withDescription?: boolean }) => (
	<div className="flex flex-row items-center justify-between rounded-lg border p-4">
		<div className="space-y-0.5">
			<Skeleton className="h-4 w-32" />
			{withDescription && <Skeleton className="h-3 w-48" />}
		</div>
		<Skeleton className="h-6 w-11 rounded-full" />
	</div>
);

export default function CalendarModal({ isOpen, onClose, calendarId }: CalendarModalProps) {
	const { updateCalendarDetails } = useUser();
	const { createCalendar } = useCalendars();
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const [dataLoading, setDataLoading] = useState(false); // New state for data fetching
	const [calendarData, setCalendarData] = useState<CalendarData | null>(null);

	const isEditMode = useMemo(() => !!calendarId, [calendarId]);
	const dialogTitle = isEditMode ? 'Calendar Settings' : 'Add New Calendar';
	const saveButtonText = isEditMode ? 'Save Settings' : 'Create Calendar';

	const form = useForm<CalendarSettingsForm>({
		defaultValues: initialFormValues,
	});

	useEffect(() => {
		const loadCalendarData = async () => {
			if (!calendarId || !isEditMode) return;

			setDataLoading(true); // Start loading
			try {
				const response = await apiClient.post('/api/calendar/getData', { uid: calendarId });
				const calendar = response.data as CalendarData;
				setCalendarData(calendar);

				form.reset({
					name: calendar.calendarName || calendar.name || '', 
					description: calendar.description || '',
					color: calendar.color || '#3174ad',
					isPrivate: calendar.isPrivate || false,
					settings: calendar.settings || initialFormValues.settings,
				});

				console.log('Loaded calendar data for editing:', calendar);
			} catch (error) {
				console.error('Failed to load calendar data:', error);
				toast({
					title: 'Error',
					description: 'Failed to load calendar settings.',
					variant: 'destructive',
				});
			} finally {
				setDataLoading(false); // End loading
			}
		};

		if (isOpen) {
			if (isEditMode && calendarId) {
				loadCalendarData();
			} else {
				form.reset(initialFormValues);
				setCalendarData(null);
				setDataLoading(false);
			}
		}
	}, [isOpen, calendarId, isEditMode, form, toast]);

	const onSubmit = async (values: CalendarSettingsForm) => {
		setLoading(true);
		try {
			if (isEditMode && calendarId) {
				await updateCalendarDetails(calendarId, {
					calendarName: values.name,
					description: values.description,
					color: values.color,
					isPrivate: values.isPrivate,
					settings: values.settings,
				});
				toast({
					title: 'Success',
					description: 'Calendar settings updated successfully.',
				});
			} else {
				const newCalendarPayload = {
					calendarName: values.name,
					description: values.description,
					color: values.color,
					isPrivate: values.isPrivate,
					settings: values.settings,
				};
				const newCalendar = await createCalendar(newCalendarPayload);
				if (newCalendar) {
					toast({
						title: 'Success',
						description: `Calendar "${newCalendar.calendarName || newCalendar.name}" created successfully.`,
					});
				} else {
					throw new Error('Failed to create calendar.');
				}
			}
			onClose();
		} catch (error: any) {
			console.error(`Failed to ${isEditMode ? 'update' : 'create'} calendar:`, error);
			toast({
				title: 'Error',
				description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} calendar.`,
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Settings className='h-5 w-5' />
						{dialogTitle}
					</DialogTitle>
				</DialogHeader>

				{dataLoading ? (
					// Skeleton loading state
					<div className="space-y-6">
						<div className="w-full">
							{/* Tabs skeleton */}
							<div className="grid w-full grid-cols-4 gap-1 rounded-md bg-muted p-1 text-muted-foreground mb-6">
								{[1, 2, 3, 4].map((i) => (
									<Skeleton key={i} className="h-9 w-full" />
								))}
							</div>

							{/* Form content skeleton */}
							<div className="space-y-4">
								<FormFieldSkeleton label="Calendar Name" />
								<FormFieldSkeleton label="Description" type="textarea" />
								<FormFieldSkeleton label="Color" type="color" />
								<FormFieldSkeleton label="Timezone" />
							</div>
						</div>

						<Separator />

						{/* Footer skeleton */}
						<div className="flex justify-end space-x-2">
							<Skeleton className="h-10 w-20" />
							<Skeleton className="h-10 w-32" />
						</div>
					</div>
				) : (
					// Actual form content
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
							<Tabs defaultValue='general' className='w-full'>
								<TabsList className='grid w-full grid-cols-4'>
									<TabsTrigger value='general'>General</TabsTrigger>
									<TabsTrigger value='defaults'>Defaults</TabsTrigger>
									<TabsTrigger value='features'>Features</TabsTrigger>
									<TabsTrigger value='privacy'>Privacy</TabsTrigger>
								</TabsList>

								<TabsContent value='general' className='space-y-4'>
									<FormField
										control={form.control}
										name='name'
										render={({ field }) => (
											<FormItem>
												<FormLabel>Calendar Name</FormLabel>
												<FormControl>
													<Input placeholder='My Calendar' {...field} />
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
														placeholder='Describe what this calendar is for...'
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
										name='color'
										render={({ field }) => (
											<FormItem className='flex flex-col'>
												<FormLabel>Color</FormLabel>
												<FormControl>
													<ColorPicker value={field.value} onChange={field.onChange} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name='settings.timezone'
										render={({ field }) => (
											<FormItem>
												<FormLabel>Timezone</FormLabel>
												<FormControl>
													<Input placeholder='UTC' {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</TabsContent>

								<TabsContent value='defaults' className='space-y-4'>
									<div className='grid grid-cols-2 gap-4'>
										<FormField
											control={form.control}
											name='settings.defaultPriority'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Default Priority</FormLabel>
													<Select onValueChange={field.onChange} value={field.value}>
														<FormControl>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															<SelectItem value='low'>Low</SelectItem>
															<SelectItem value='medium'>Medium</SelectItem>
															<SelectItem value='high'>High</SelectItem>
															<SelectItem value='urgent'>Urgent</SelectItem>
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name='settings.defaultStatus'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Default Status</FormLabel>
													<Select onValueChange={field.onChange} value={field.value}>
														<FormControl>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															<SelectItem value='todo'>To Do</SelectItem>
															<SelectItem value='in_progress'>In Progress</SelectItem>
															<SelectItem value='review'>Review</SelectItem>
															<SelectItem value='done'>Done</SelectItem>
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									<FormField
										control={form.control}
										name='settings.defaultView'
										render={({ field }) => (
											<FormItem>
												<FormLabel>Default View</FormLabel>
												<Select onValueChange={field.onChange} value={field.value}>
													<FormControl>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value='month'>Month</SelectItem>
														<SelectItem value='week'>Week</SelectItem>
														<SelectItem value='work_week'>Work Week</SelectItem>
														<SelectItem value='day'>Day</SelectItem>
														<SelectItem value='agenda'>Agenda</SelectItem>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className='grid grid-cols-2 gap-4'>
										<FormField
											control={form.control}
											name='settings.workingHours.start'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Work Start Time</FormLabel>
													<FormControl>
														<Input type='time' {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name='settings.workingHours.end'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Work End Time</FormLabel>
													<FormControl>
														<Input type='time' {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</TabsContent>

								<TabsContent value='features' className='space-y-4'>
									<FormField
										control={form.control}
										name='settings.allowSubtasks'
										render={({ field }) => (
											<FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
												<div className='space-y-0.5'>
													<FormLabel className='text-base'>Enable Subtasks</FormLabel>
													<div className='text-sm text-muted-foreground'>
														Allow creating subtasks within events
													</div>
												</div>
												<FormControl>
													<Switch checked={field.value} onCheckedChange={field.onChange} />
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name='settings.enableTimeTracking'
										render={({ field }) => (
											<FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
												<div className='space-y-0.5'>
													<FormLabel className='text-base'>Time Tracking</FormLabel>
													<div className='text-sm text-muted-foreground'>
														Track estimated and actual time spent
													</div>
												</div>
												<FormControl>
													<Switch checked={field.value} onCheckedChange={field.onChange} />
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name='settings.enableDependencies'
										render={({ field }) => (
											<FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
												<div className='space-y-0.5'>
													<FormLabel className='text-base'>Dependencies</FormLabel>
													<div className='text-sm text-muted-foreground'>
														Allow events to depend on or block other events
													</div>
												</div>
												<FormControl>
													<Switch checked={field.value} onCheckedChange={field.onChange} />
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name='settings.enableRecurrence'
										render={({ field }) => (
											<FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
												<div className='space-y-0.5'>
													<FormLabel className='text-base'>Recurring Events</FormLabel>
													<div className='text-sm text-muted-foreground'>
														Enable recurring/repeated events
													</div>
												</div>
												<FormControl>
													<Switch checked={field.value} onCheckedChange={field.onChange} />
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name='settings.autoProgressFromSubtasks'
										render={({ field }) => (
											<FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
												<div className='space-y-0.5'>
													<FormLabel className='text-base'>Auto Progress</FormLabel>
													<div className='text-sm text-muted-foreground'>
														Automatically update parent task progress from subtasks
													</div>
												</div>
												<FormControl>
													<Switch checked={field.value} onCheckedChange={field.onChange} />
												</FormControl>
											</FormItem>
										)}
									/>
								</TabsContent>

								<TabsContent value='privacy' className='space-y-4'>
									<FormField
										control={form.control}
										name='isPrivate'
										render={({ field }) => (
											<FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
												<div className='space-y-0.5'>
													<FormLabel className='text-base'>Private Calendar</FormLabel>
													<div className='text-sm text-muted-foreground'>
														Make this calendar private and invitation-only
													</div>
												</div>
												<FormControl>
													<Switch checked={field.value} onCheckedChange={field.onChange} />
												</FormControl>
											</FormItem>
										)}
									/>

									<div className='rounded-lg border p-4 space-y-2'>
										<h4 className='font-medium flex items-center gap-2'>
											<Shield className='h-4 w-4' />
											Calendar Statistics
										</h4>
										{isEditMode && calendarData && (
											<div className='grid grid-cols-2 gap-4 text-sm'>
												<div>
													<span className='text-muted-foreground'>Total Users:</span>
													<span className='ml-2 font-medium'>{calendarData.users?.length || 0}</span>
												</div>
												<div>
													<span className='text-muted-foreground'>Created:</span>
													<span className='ml-2 font-medium'>
														{calendarData.createdAt
															? new Date(calendarData.createdAt).toLocaleDateString()
															: 'Unknown'}
													</span>
												</div>
											</div>
										)}
										{!isEditMode && (
											<p className='text-sm text-muted-foreground'>
												Calendar statistics will be available after the calendar is created.
											</p>
										)}
									</div>
								</TabsContent>
							</Tabs>

							<Separator />

							<DialogFooter>
								<Button type='button' variant='outline' onClick={onClose} disabled={loading}>
									Cancel
								</Button>
								<Button type='submit' disabled={loading}>
									{saveButtonText}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				)}
			</DialogContent>
		</Dialog>
	);
}