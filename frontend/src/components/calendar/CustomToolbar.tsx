import { useCallback } from 'react';
import { NavigateAction, View } from 'react-big-calendar';
import { format, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { CalendarViewType } from '@/lib/types';

const mapFromRBCView = (view: View): CalendarViewType => {
	return view as CalendarViewType;
};

interface EnhancedCustomToolbarProps {
	date: Date;
	view: View;
	label: string;
	onNavigate: (action: NavigateAction) => void;
	onView: (view: View) => void;
	onAddEvent?: () => void;
}

export default function EnhancedCustomToolbar({
	date,
	onNavigate,
	onView,
	view,
	label,
	onAddEvent,
}: EnhancedCustomToolbarProps) {
	const handleNavigate = useCallback(
		(action: NavigateAction) => {
			onNavigate(action);
		},
		[onNavigate]
	);

	const handleViewChange = useCallback(
		(viewName: string) => {
			const standardViews: View[] = ['month', 'week', 'work_week', 'day', 'agenda'];
			if (standardViews.includes(viewName as View)) {
				onView(viewName as View);
			}
		},
		[onView]
	);

	const handleQuickNavigate = useCallback(
		(direction: 'prev' | 'next') => {
			const action = direction === 'prev' ? 'PREV' : 'NEXT';
			handleNavigate(action as NavigateAction);
		},
		[handleNavigate]
	);

	const getFormattedLabel = () => {
		switch (view) {
			case 'month':
				return format(date, 'MMMM yyyy');
			case 'week':
			case 'work_week':
				const startOfWeek = addDays(date, -date.getDay());
				const endOfWeek = addDays(startOfWeek, 6);
				return `${format(startOfWeek, 'MMM dd')} - ${format(endOfWeek, 'MMM dd, yyyy')}`;
			case 'day':
				return format(date, 'EEEE, MMMM dd, yyyy');
			case 'agenda':
				return 'Agenda View';
			default:
				return label;
		}
	};

	const viewOptions = [
		{ value: 'month', label: 'Month' },
		{ value: 'week', label: 'Week' },
		{ value: 'work_week', label: 'Work Week' },
		{ value: 'day', label: 'Day' },
		{ value: 'agenda', label: 'Agenda' },
	];

	return (
		<div className='flex flex-wrap items-center justify-between mb-6 gap-4'>
			{/* Navigation Controls */}
			<div className='flex items-center gap-2'>
				<Button
					variant='outline'
					size='sm'
					onClick={() => handleNavigate('TODAY')}
					className='whitespace-nowrap'
				>
					<Clock className='h-4 w-4 mr-1' />
					Today
				</Button>

				<div className='flex items-center border rounded-md'>
					<Button
						variant='ghost'
						size='sm'
						onClick={() => handleQuickNavigate('prev')}
						className='rounded-r-none border-r'
					>
						<ChevronLeft className='h-4 w-4' />
					</Button>

					<div className='flex items-center gap-2 px-3 py-1 min-w-[200px] justify-center'>
						<CalendarIcon className='h-4 w-4 text-muted-foreground' />
						<span className='font-medium text-sm'>{getFormattedLabel()}</span>
					</div>

					<Button
						variant='ghost'
						size='sm'
						onClick={() => handleQuickNavigate('next')}
						className='rounded-l-none border-l'
					>
						<ChevronRight className='h-4 w-4' />
					</Button>
				</div>
			</div>

			{/* View Selector and Actions */}
			<div className='flex items-center gap-2'>
				<Select value={view} onValueChange={handleViewChange}>
					<SelectTrigger className='w-36'>
						<SelectValue placeholder='Select view' />
					</SelectTrigger>
					<SelectContent>
						{viewOptions.map(option => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{onAddEvent && (
					<Button size='sm' onClick={onAddEvent} className='whitespace-nowrap'>
						<Plus className='h-4 w-4 mr-1' />
						New Event
					</Button>
				)}
			</div>
		</div>
	);
}

interface CalendarToolbarWrapperProps {
	date: Date;
	view: View;
	label: string;
	onNavigate: (action: NavigateAction) => void;
	onView: (view: CalendarViewType) => void;
	onAddEvent?: () => void;
}

export function CalendarToolbarWrapper(props: CalendarToolbarWrapperProps) {
	const handleViewChange = useCallback(
		(view: View) => {
			props.onView(mapFromRBCView(view));
		},
		[props]
	);

	return <EnhancedCustomToolbar {...props} onView={handleViewChange} />;
}
