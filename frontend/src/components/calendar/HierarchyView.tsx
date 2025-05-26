import React, { useState, useMemo } from 'react';
import { CalendarEvent, Task } from '@/lib/types';
import { useEvents } from '@/contexts/EventContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	ChevronDown,
	ChevronRight,
	Plus,
	Search,
	Flag,
	Clock,
	Users,
	CheckSquare,
	Square,
	Calendar,
	MoreHorizontal,
} from 'lucide-react';
import { cn, buildEventHierarchy, formatDateTime } from '@/lib/utils';
import { PRIORITY_COLORS, STATUS_COLORS } from '@/lib/types';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HierarchyViewProps {
	className?: string;
}

export default function HierarchyView({ className }: HierarchyViewProps) {
	const {
		filteredEvents,
		filteredTasks,
		updateEvent,
		toggleEventDone,
		openEditModal,
		openAddModal,
	} = useEvents();

	const [searchQuery, setSearchQuery] = useState('');
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

	// Combine events and tasks, then build hierarchy
	const hierarchicalData = useMemo(() => {
		const allItems = [...filteredEvents, ...filteredTasks];

		// Filter by search query
		const filtered = searchQuery
			? allItems.filter(
					item =>
						item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
						item.description?.toLowerCase().includes(searchQuery.toLowerCase())
			  )
			: allItems;

		return buildEventHierarchy(filtered);
	}, [filteredEvents, filteredTasks, searchQuery]);

	const toggleExpanded = (itemId: string) => {
		setExpandedItems(prev => {
			const newSet = new Set(prev);
			if (newSet.has(itemId)) {
				newSet.delete(itemId);
			} else {
				newSet.add(itemId);
			}
			return newSet;
		});
	};

	const expandAll = () => {
		const allIds = new Set<string>();
		const collectIds = (items: CalendarEvent[]) => {
			items.forEach((item: any) => {
				if (item.hasSubtasks) {
					allIds.add(item.id);
					if (item.subtasks) {
						collectIds(item.subtasks);
					}
				}
			});
		};
		collectIds(hierarchicalData);
		setExpandedItems(allIds);
	};

	const collapseAll = () => {
		setExpandedItems(new Set());
	};

	return (
		<div className={cn('h-full flex flex-col', className)}>
			{/* Header */}
			<div className='flex items-center justify-between p-4 border-b'>
				<h1 className='text-2xl font-bold'>Task Hierarchy</h1>

				<div className='flex items-center gap-2'>
					<div className='relative'>
						<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
						<Input
							placeholder='Search tasks...'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className='pl-8 w-64'
						/>
					</div>

					<Button variant='outline' size='sm' onClick={expandAll}>
						Expand All
					</Button>

					<Button variant='outline' size='sm' onClick={collapseAll}>
						Collapse All
					</Button>

					<Button size='sm' onClick={() => openAddModal()}>
						<Plus className='h-4 w-4 mr-2' />
						New Task
					</Button>
				</div>
			</div>

			{/* Hierarchy Tree */}
			<div className='flex-1 overflow-auto p-4'>
				<div className='space-y-1'>
					{hierarchicalData.length > 0 ? (
						hierarchicalData.map(item => (
							<HierarchyItem
								key={item.id}
								item={item}
								level={0}
								isExpanded={expandedItems.has(item.id)}
								onToggleExpanded={() => toggleExpanded(item.id)}
								onEdit={() => openEditModal(item)}
								onToggleComplete={() => toggleEventDone(item.id)}
							/>
						))
					) : (
						<div className='text-center py-12 text-muted-foreground'>
							{searchQuery
								? `No tasks found for "${searchQuery}"`
								: 'No tasks found. Create your first task to get started.'}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

interface HierarchyItemProps {
	item: CalendarEvent;
	level: number;
	isExpanded: boolean;
	onToggleExpanded: () => void;
	onEdit: () => void;
	onToggleComplete: () => void;
}

function HierarchyItem({
	item,
	level,
	isExpanded,
	onToggleExpanded,
	onEdit,
	onToggleComplete,
}: HierarchyItemProps) {
	const priorityColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;
	const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.todo;
	const hasSubtasks =
		item.hasSubtasks && (item as any).subtasks && (item as any).subtasks.length > 0;

	return (
		<div className='w-full'>
			<div
				className={cn(
					'flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors',
					item.isDone && 'opacity-75'
				)}
				style={{ paddingLeft: `${level * 24 + 8}px` }}
			>
				{/* Expand/Collapse Button */}
				<Button
					variant='ghost'
					size='sm'
					className='h-6 w-6 p-0 flex-shrink-0'
					onClick={onToggleExpanded}
					disabled={!hasSubtasks}
				>
					{hasSubtasks ? (
						isExpanded ? (
							<ChevronDown className='h-4 w-4' />
						) : (
							<ChevronRight className='h-4 w-4' />
						)
					) : (
						<div className='w-4 h-4' />
					)}
				</Button>

				{/* Complete Checkbox */}
				<Button
					variant='ghost'
					size='sm'
					className='h-6 w-6 p-0 flex-shrink-0'
					onClick={onToggleComplete}
				>
					{item.isDone ? (
						<CheckSquare className='h-4 w-4 text-green-600' />
					) : (
						<Square className='h-4 w-4' />
					)}
				</Button>

				{/* Priority Indicator */}
				<div
					className='w-1 h-6 rounded-full flex-shrink-0'
					style={{ backgroundColor: priorityColor }}
				/>

				{/* Title and Details */}
				<div className='flex-1 min-w-0 space-y-1'>
					<div className='flex items-center gap-2'>
						<span
							className={cn(
								'font-medium truncate',
								item.isDone && 'line-through text-muted-foreground'
							)}
						>
							{item.title}
						</span>

						{/* Status Badge */}
						<Badge
							variant='outline'
							className='text-xs px-1 py-0 flex-shrink-0'
							style={{ borderColor: statusColor, color: statusColor }}
						>
							{item.status.replace('_', ' ')}
						</Badge>
					</div>

					{/* Description */}
					{item.description && (
						<p className='text-xs text-muted-foreground truncate'>{item.description}</p>
					)}

					{/* Progress Bar for Parents */}
					{hasSubtasks && (
						<div className='flex items-center gap-2 text-xs text-muted-foreground'>
							<span>
								{item.completedSubtasks}/{item.totalSubtasks} subtasks
							</span>
							<div className='flex-1 bg-gray-200 rounded-full h-1 max-w-32'>
								<div
									className='bg-blue-600 h-1 rounded-full transition-all duration-300'
									style={{ width: `${item.progressPercentage}%` }}
								/>
							</div>
							<span>{item.progressPercentage}%</span>
						</div>
					)}
				</div>

				{/* Metadata */}
				<div className='flex items-center gap-2 flex-shrink-0'>
					{/* Schedule indicator */}
					{item.start && (
						<Badge variant='outline' className='text-xs px-1 py-0'>
							<Calendar className='h-3 w-3 mr-1' />
							{formatDateTime(item.start)}
						</Badge>
					)}

					{/* Assignees */}
					{item.assignee.length > 0 && (
						<Badge variant='outline' className='text-xs px-1 py-0'>
							<Users className='h-3 w-3 mr-1' />
							{item.assignee.length}
						</Badge>
					)}

					{/* Actions Menu */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' size='sm' className='h-6 w-6 p-0'>
								<MoreHorizontal className='h-4 w-4' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onClick={onEdit}>Edit Task</DropdownMenuItem>
							<DropdownMenuItem onClick={onToggleComplete}>
								{item.isDone ? 'Mark Incomplete' : 'Mark Complete'}
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => {
									/* Add subtask logic */
								}}
								disabled={item.hierarchyLevel >= 2}
							>
								Add Subtask
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Subtasks */}
			{hasSubtasks && (
				<Collapsible open={isExpanded}>
					<CollapsibleContent>
						<div className='space-y-1'>
							{(item as any).subtasks!.map((subtask: any) => (
								<HierarchyItem
									key={subtask.id}
									item={subtask}
									level={level + 1}
									isExpanded={false}
									onToggleExpanded={() => {}}
									onEdit={() => onEdit()}
									onToggleComplete={() => onToggleComplete()}
								/>
							))}
						</div>
					</CollapsibleContent>
				</Collapsible>
			)}
		</div>
	);
}
