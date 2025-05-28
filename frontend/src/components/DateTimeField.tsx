import { useState } from 'react';
import { Control, useController } from 'react-hook-form';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarIcon, HelpCircle, Clock } from 'lucide-react';

// Define the structure for the configuration object
interface InputConfigItem {
	label: string;
	dateFormat?: string; // Suggested: 'PPP' for date, 'p' for time, 'Pp' or 'PPP p' for date & time
	required?: boolean;
	helperText?: string;
	description?: string;
	placeholder?: string;
	showTimeInput?: boolean; // Controls if time input is shown alongside calendar
}

interface DateTimeFieldProps {
	config: InputConfigItem;
	control: Control<any>; // react-hook-form Control object
	name: string; // Name of the field in the form
}

export const DateTimeField = ({ config, control, name }: DateTimeFieldProps) => {
	const [showPopover, setShowPopover] = useState(false);
	const { field, fieldState } = useController({ name, control });

	const handleDateSelect = (selectedDate: Date | undefined) => {
		if (selectedDate) {
			const currentDate = field.value instanceof Date ? field.value : new Date();
			const newDate = new Date(selectedDate); // Start with the selected date (time typically 00:00)

			if (config.showTimeInput) {
				// Preserve existing time if available, otherwise default to current time or 00:00
				newDate.setHours(currentDate.getHours());
				newDate.setMinutes(currentDate.getMinutes());
				newDate.setSeconds(currentDate.getSeconds());
				newDate.setMilliseconds(currentDate.getMilliseconds());
			}
			field.onChange(newDate);
			if (!config.showTimeInput) {
				setShowPopover(false);
			}
		} else {
			field.onChange(null); // Clear the date
			setShowPopover(false);
		}
	};

	const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const timeValue = e.target.value;
		if (timeValue) {
			const [hours, minutes] = timeValue.split(':').map(Number);
			const newDate = field.value instanceof Date ? new Date(field.value) : new Date();
			newDate.setHours(hours);
			newDate.setMinutes(minutes);
			newDate.setSeconds(0); // Reset seconds
			newDate.setMilliseconds(0); // Reset milliseconds
			field.onChange(newDate);
		}
	};

	const getFormattedDateTime = (date: Date) => {
		if (config.showTimeInput) {
			return format(date, config.dateFormat || 'PPP p'); // e.g., "May 28, 2025 10:30 AM"
		}
		return format(date, config.dateFormat || 'PPP'); // e.g., "May 28, 2025"
	};

	return (
		<FormField
			control={control}
			name={name}
			render={() => (
				// field provided by useController is used directly
				<FormItem className='flex flex-col'>
					<div className='flex justify-between items-center'>
						<FormLabel htmlFor={name} className={cn(fieldState.error && 'text-destructive')}>
							{config.label}
							{config.required && <span className='text-red-500 ml-1'>*</span>}
						</FormLabel>
						{config.helperText && (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button variant='ghost' size='icon' className='h-6 w-6 rounded-full p-0'>
											<HelpCircle className='h-4 w-4 text-muted-foreground' />
											<span className='sr-only'>Help</span>
										</Button>
									</TooltipTrigger>
									<TooltipContent>{config.helperText}</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>

					{config.description && <FormDescription>{config.description}</FormDescription>}

					<Popover open={showPopover} onOpenChange={setShowPopover}>
						<PopoverTrigger asChild>
							<FormControl>
								<Button
									variant='outline'
									id={name}
									type='button'
									className={cn(
										'w-full justify-start text-left font-normal z-500',
										!field.value && 'text-muted-foreground',
										fieldState.error ? 'border-red-500' : ''
									)}
									// onClick={() => setShowPopover(true)} // Removed this line
								>
									<CalendarIcon className='mr-2 h-4 w-4' />
									{field.value instanceof Date ? (
										getFormattedDateTime(field.value)
									) : (
										<span>{config.placeholder || 'Select date'}</span>
									)}
								</Button>
							</FormControl>
						</PopoverTrigger>
						<PopoverContent className='w-auto p-0 z-50'>
							<Calendar
								mode='single'
								selected={field.value instanceof Date ? field.value : undefined}
								onSelect={handleDateSelect}
								initialFocus
								disabled={field.disabled}
							/>
							{config.showTimeInput && field.value instanceof Date && (
								<div className='p-3 border-t border-border'>
									<label
										htmlFor={`${name}-time`}
										className='block text-sm font-medium text-muted-foreground mb-1'
									>
										Time
									</label>
									<div className='flex items-center gap-2'>
										<Clock className='h-4 w-4 text-muted-foreground' />
										<Input
											id={`${name}-time`}
											type='time'
											value={field.value ? format(field.value, 'HH:mm') : ''}
											onChange={handleTimeChange}
											className='w-full'
											disabled={field.disabled}
										/>
									</div>
								</div>
							)}
							<div className='p-2 border-t flex justify-between gap-1'>
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={() => {
										const today = new Date();
										if (field.value instanceof Date && config.showTimeInput) {
											today.setHours(field.value.getHours());
											today.setMinutes(field.value.getMinutes());
										}
										field.onChange(today);
										if (!config.showTimeInput) setShowPopover(false);
									}}
								>
									Today
								</Button>
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={() => {
										const tomorrow = new Date(Date.now() + 86400000);
										if (field.value instanceof Date && config.showTimeInput) {
											tomorrow.setHours(field.value.getHours());
											tomorrow.setMinutes(field.value.getMinutes());
										}
										field.onChange(tomorrow);
										if (!config.showTimeInput) setShowPopover(false);
									}}
								>
									Tomorrow
								</Button>
								<Button
									type='button'
									variant='ghost'
									size='sm'
									onClick={() => {
										field.onChange(null);
										setShowPopover(false);
									}}
								>
									Clear
								</Button>
								{config.showTimeInput && (
									<Button
										type='button'
										variant='default'
										size='sm'
										onClick={() => setShowPopover(false)}
									>
										Done
									</Button>
								)}
							</div>
						</PopoverContent>
					</Popover>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
};
