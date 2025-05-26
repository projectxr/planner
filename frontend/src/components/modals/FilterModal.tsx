import React from 'react';
import { useForm } from 'react-hook-form';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter, X, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import { FilterOptions, PriorityLevel, EventStatus, TaskCategory } from '@/lib/types';
import { useEvents } from '@/contexts/EventContext';

interface FilterModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function FilterModal({ isOpen, onClose }: FilterModalProps) {
	const { filters, setFilters, clearFilters } = useEvents();

	const form = useForm<FilterOptions>({
		defaultValues: filters,
	});

	const onSubmit = (values: FilterOptions) => {
		setFilters(values);
		onClose();
	};

	const handleClearFilters = () => {
		clearFilters();
		form.reset({});
		onClose();
	};

	const activeFilterCount = Object.values(filters).filter(Boolean).length;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Filter className='h-5 w-5' />
						Filter Events
						{activeFilterCount > 0 && (
							<Badge variant='secondary' className='ml-auto'>
								{activeFilterCount} active
							</Badge>
						)}
					</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
						{/* Search */}
						<FormField
							control={form.control}
							name='search'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Search</FormLabel>
									<FormControl>
										<Input
											placeholder='Search events by title or description...'
											{...field}
											value={field.value || ''}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						{/* Status */}
						<FormField
							control={form.control}
							name='status'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Status</FormLabel>
									<Select onValueChange={field.onChange} value={field.value || ''}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder='All statuses' />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value=''>All statuses</SelectItem>
											<SelectItem value='todo'>To Do</SelectItem>
											<SelectItem value='in_progress'>In Progress</SelectItem>
											<SelectItem value='review'>Review</SelectItem>
											<SelectItem value='done'>Done</SelectItem>
											<SelectItem value='cancelled'>Cancelled</SelectItem>
										</SelectContent>
									</Select>
								</FormItem>
							)}
						/>

						{/* Priority */}
						<FormField
							control={form.control}
							name='priority'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Priority</FormLabel>
									<Select onValueChange={field.onChange} value={field.value || ''}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder='All priorities' />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value=''>All priorities</SelectItem>
											<SelectItem value='low'>Low</SelectItem>
											<SelectItem value='medium'>Medium</SelectItem>
											<SelectItem value='high'>High</SelectItem>
											<SelectItem value='urgent'>Urgent</SelectItem>
										</SelectContent>
									</Select>
								</FormItem>
							)}
						/>

						{/* Category */}
						<FormField
							control={form.control}
							name='category'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Category</FormLabel>
									<Select onValueChange={field.onChange} value={field.value || ''}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder='All categories' />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value=''>All categories</SelectItem>
											<SelectItem value='task'>Task</SelectItem>
											<SelectItem value='meeting'>Meeting</SelectItem>
											<SelectItem value='deadline'>Deadline</SelectItem>
											<SelectItem value='reminder'>Reminder</SelectItem>
											<SelectItem value='project'>Project</SelectItem>
										</SelectContent>
									</Select>
								</FormItem>
							)}
						/>

						{/* Date Range */}
						<div className='space-y-2'>
							<FormLabel>Date Range</FormLabel>
							<div className='grid grid-cols-2 gap-2'>
								<FormField
									control={form.control}
									name='dateRange.start'
									render={({ field }) => (
										<FormItem>
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant='outline'
															className={cn(
																'w-full pl-3 text-left font-normal',
																!field.value && 'text-muted-foreground'
															)}
														>
															{field.value ? format(field.value, 'PPP') : 'Start date'}
															<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className='w-auto p-0' align='start'>
													<Calendar
														mode='single'
														selected={field.value}
														onSelect={field.onChange}
														initialFocus
													/>
												</PopoverContent>
											</Popover>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name='dateRange.end'
									render={({ field }) => (
										<FormItem>
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant='outline'
															className={cn(
																'w-full pl-3 text-left font-normal',
																!field.value && 'text-muted-foreground'
															)}
														>
															{field.value ? format(field.value, 'PPP') : 'End date'}
															<CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className='w-auto p-0' align='start'>
													<Calendar
														mode='single'
														selected={field.value}
														onSelect={field.onChange}
														initialFocus
													/>
												</PopoverContent>
											</Popover>
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Options */}
						<div className='space-y-3'>
							<FormField
								control={form.control}
								name='showCompleted'
								render={({ field }) => (
									<FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
										<div className='space-y-0.5'>
											<FormLabel className='text-base'>Show Completed</FormLabel>
											<div className='text-sm text-muted-foreground'>
												Include completed events in results
											</div>
										</div>
										<FormControl>
											<Switch checked={field.value || false} onCheckedChange={field.onChange} />
										</FormControl>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name='showArchived'
								render={({ field }) => (
									<FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
										<div className='space-y-0.5'>
											<FormLabel className='text-base'>Show Archived</FormLabel>
											<div className='text-sm text-muted-foreground'>
												Include archived events in results
											</div>
										</div>
										<FormControl>
											<Switch checked={field.value || false} onCheckedChange={field.onChange} />
										</FormControl>
									</FormItem>
								)}
							/>
						</div>

						<DialogFooter className='flex justify-between'>
							<Button
								type='button'
								variant='outline'
								onClick={handleClearFilters}
								disabled={activeFilterCount === 0}
							>
								<RotateCcw className='h-4 w-4 mr-2' />
								Clear All
							</Button>

							<div className='flex gap-2'>
								<Button type='button' variant='outline' onClick={onClose}>
									Cancel
								</Button>
								<Button type='submit'>Apply Filters</Button>
							</div>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
