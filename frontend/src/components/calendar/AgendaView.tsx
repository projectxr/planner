import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	Calendar,
	Clock,
	Play,
	Pause,
	SkipForward,
	AlertCircle,
	CheckCircle,
	Activity,
} from 'lucide-react';
import { cn, formatDateTime, formatTime } from '@/lib/utils';
import { PRIORITY_COLORS, STATUS_COLORS } from '@/lib/types';
import { useEvents } from '@/contexts/EventContext';

export default function AgendaView() {
	const { agendaData, fetchAgenda, openEditModal, toggleEventDone } = useEvents();

	useEffect(() => {
		fetchAgenda();
	}, [fetchAgenda]);

	if (!agendaData) {
		return (
			<div className='flex items-center justify-center h-full'>
				<div className='text-center space-y-2'>
					<Activity className='h-8 w-8 mx-auto animate-pulse' />
					<p>Loading agenda...</p>
				</div>
			</div>
		);
	}

	const { currentTaskOngoing, currentTasks, nextTask, timeScheduledTasks, isBacklog, isFuture } =
		agendaData;

	return (
		<div className='h-full flex flex-col'>
			{/* Header */}
			<div className='p-4 border-b'>
				<div className='flex items-center justify-between'>
					<h1 className='text-2xl font-bold'>Agenda</h1>
					<Button variant='outline' size='sm' onClick={fetchAgenda}>
						<Activity className='h-4 w-4 mr-2' />
						Refresh
					</Button>
				</div>
			</div>

			<div className='flex-1 overflow-hidden'>
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-full'>
					{/* Current Status */}
					<Card className='lg:col-span-1'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Clock className='h-5 w-5' />
								Current Status
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							{/* Current Task */}
							{currentTaskOngoing && currentTasks.length > 0 ? (
								<div className='space-y-3'>
									<div className='flex items-center gap-2'>
										<Play className='h-4 w-4 text-green-600' />
										<span className='font-medium text-green-600'>In Progress</span>
									</div>
									{currentTasks.map(task => (
										<div
											key={task.id}
											className='p-3 border rounded-lg cursor-pointer hover:bg-accent/50'
											onClick={() => openEditModal(task)}
										>
											<h4 className='font-medium'>{task.title}</h4>
											<p className='text-sm text-muted-foreground'>
												{formatTime(task.start!)} - {formatTime(task.end!)}
											</p>
											<Badge
												variant='outline'
												className='mt-2'
												style={{
													borderColor: PRIORITY_COLORS[task.priority],
													color: PRIORITY_COLORS[task.priority],
												}}
											>
												{task.priority}
											</Badge>
										</div>
									))}
								</div>
							) : (
								<div className='text-center py-6 text-muted-foreground'>
									<Pause className='h-8 w-8 mx-auto mb-2' />
									<p>No current tasks</p>
								</div>
							)}

							<Separator />

							{/* Next Task */}
							{nextTask ? (
								<div className='space-y-3'>
									<div className='flex items-center gap-2'>
										<SkipForward className='h-4 w-4 text-blue-600' />
										<span className='font-medium text-blue-600'>Up Next</span>
									</div>
									<div
										className='p-3 border rounded-lg cursor-pointer hover:bg-accent/50'
										onClick={() => openEditModal(nextTask)}
									>
										<h4 className='font-medium'>{nextTask.title}</h4>
										<p className='text-sm text-muted-foreground'>
											{formatTime(nextTask.start!)} - {formatTime(nextTask.end!)}
										</p>
										<Badge
											variant='outline'
											className='mt-2'
											style={{
												borderColor: PRIORITY_COLORS[nextTask.priority],
												color: PRIORITY_COLORS[nextTask.priority],
											}}
										>
											{nextTask.priority}
										</Badge>
									</div>
								</div>
							) : (
								<div className='text-center py-6 text-muted-foreground'>
									<CheckCircle className='h-8 w-8 mx-auto mb-2' />
									<p>No upcoming tasks</p>
								</div>
							)}

							{/* Status indicators */}
							<div className='space-y-2 text-sm'>
								{isBacklog && (
									<div className='flex items-center gap-2 text-orange-600'>
										<AlertCircle className='h-4 w-4' />
										<span>You're ahead of schedule</span>
									</div>
								)}
								{isFuture && (
									<div className='flex items-center gap-2 text-red-600'>
										<AlertCircle className='h-4 w-4' />
										<span>You're behind schedule</span>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Scheduled Tasks Timeline */}
					<Card className='lg:col-span-2'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Calendar className='h-5 w-5' />
								Today's Schedule
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ScrollArea className='h-[600px]'>
								<div className='space-y-3'>
									{timeScheduledTasks.length > 0 ? (
										timeScheduledTasks.map((task, index) => {
											const isCurrentTask = currentTasks.some(ct => ct.id === task.id);
											const isNextTask = nextTask && nextTask.id === task.id;
											const isPastTask = new Date(task.end!) < new Date();

											return (
												<div
													key={task.id}
													className={cn(
														'flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors',
														isCurrentTask && 'border-green-500 bg-green-50',
														isNextTask && 'border-blue-500 bg-blue-50',
														isPastTask && task.isDone && 'bg-green-50/50',
														isPastTask && !task.isDone && 'bg-red-50/50'
													)}
													onClick={() => openEditModal(task)}
												>
													{/* Timeline indicator */}
													<div className='flex flex-col items-center pt-1'>
														<div
															className={cn(
																'w-3 h-3 rounded-full',
																isCurrentTask && 'bg-green-500',
																isNextTask && 'bg-blue-500',
																isPastTask && task.isDone && 'bg-green-500',
																isPastTask && !task.isDone && 'bg-red-500',
																!isCurrentTask && !isNextTask && !isPastTask && 'bg-gray-300'
															)}
														/>
														{index < timeScheduledTasks.length - 1 && (
															<div className='w-0.5 h-8 bg-gray-200 mt-2' />
														)}
													</div>

													{/* Task details */}
													<div className='flex-1 min-w-0'>
														<div className='flex items-start justify-between gap-2'>
															<div className='flex-1'>
																<h4
																	className={cn(
																		'font-medium',
																		task.isDone && 'line-through text-muted-foreground'
																	)}
																>
																	{task.title}
																</h4>
																<p className='text-sm text-muted-foreground'>
																	{formatTime(task.start!)} - {formatTime(task.end!)}
																</p>
																{task.description && (
																	<p className='text-sm text-muted-foreground mt-1 line-clamp-2'>
																		{task.description}
																	</p>
																)}
															</div>

															<div className='flex flex-col items-end gap-2'>
																<Badge
																	variant='outline'
																	style={{
																		borderColor: STATUS_COLORS[task.status],
																		color: STATUS_COLORS[task.status],
																	}}
																>
																	{task.status.replace('_', ' ')}
																</Badge>

																<Button
																	variant='ghost'
																	size='sm'
																	onClick={e => {
																		e.stopPropagation();
																		toggleEventDone(task.id);
																	}}
																>
																	{task.isDone ? (
																		<CheckCircle className='h-4 w-4 text-green-600' />
																	) : (
																		<Circle className='h-4 w-4' />
																	)}
																</Button>
															</div>
														</div>

														{/* Tags and priority */}
														<div className='flex items-center gap-2 mt-2'>
															<Badge
																variant='outline'
																className='text-xs'
																style={{
																	borderColor: PRIORITY_COLORS[task.priority],
																	color: PRIORITY_COLORS[task.priority],
																}}
															>
																{task.priority}
															</Badge>
															{task.tags.slice(0, 2).map(tag => (
																<Badge key={tag} variant='secondary' className='text-xs'>
																	{tag}
																</Badge>
															))}
														</div>
													</div>
												</div>
											);
										})
									) : (
										<div className='text-center py-12 text-muted-foreground'>
											<Calendar className='h-8 w-8 mx-auto mb-2' />
											<p>No scheduled tasks for today</p>
										</div>
									)}
								</div>
							</ScrollArea>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

const Circle = ({ className }: { className?: string }) => (
	<svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
		<circle cx='12' cy='12' r='10' strokeWidth='2' />
	</svg>
);
