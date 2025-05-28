import { Search, ChevronDown, Home, List, Settings, PlusSquare, Calendar, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
	DropdownMenuGroup,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { useCalendarEvents } from '@/contexts/EventContext'; // Updated import
import { useCalendars } from '@/contexts/CalendarContext';
import { useUser } from '@/contexts/UserContext'; // Added UserContext
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react'; // Added useEffect
import CalendarModal from '@/components/modals/CalendarModal';

interface HeaderProps {
	onCreateEvent: () => void;
	onCreateTodo: () => void;
	onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
	const { filters, setFilters, syncStatus, refreshAll } = useCalendarEvents();
	const { calendars, activeCalendar, setActiveCalendar } = useCalendars();
	const navigate = useNavigate();
	const location = useLocation();
	const { user, logoutUser, updateUserName } = useUser(); // Changed userDetails to user
	const [searchTerm, setSearchTerm] = useState(filters.search || '');
	const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
	const [editingCalendarId, setEditingCalendarId] = useState<string | undefined>(undefined);
	const [nameOfUser, setNameOfUser] = useState('');
	const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);


	useEffect(() => {
		if (user) {
			setNameOfUser(user.name || '');
		}
	}, [user]);
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setFilters({ ...filters, search: searchTerm });
	};

	const handleClearSearch = () => {
		setSearchTerm('');
		setFilters({ ...filters, search: '' });
	};

	const onUserNameChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
		setNameOfUser(e.target.value);
	};

	const onUserNameSaved = async () => {
		if (user && nameOfUser !== user.name) { // Changed userDetails to user
			await updateUserName(nameOfUser);
			// Optionally, close popover or show success message
		}
	};

	const showSignOutModal = () => {
		// Implement sign out modal or direct sign out
		logoutUser();
		navigate('/signin');
		setIsUserPopoverOpen(false); // Close popover on sign out
	};

	const handleCalendarSelect = (calendarId: string | null) => {
		if (calendarId === null) {
			setActiveCalendar(null);
			navigate('/home');
		} else {
			navigate(`/${calendarId}`);
		}
	};

	const handleOpenSettingsModal = (calendarId: string) => {
		setEditingCalendarId(calendarId);
		setIsCalendarModalOpen(true);
	};

	const handleOpenAddCalendarModal = () => {
		setEditingCalendarId(undefined);
		setIsCalendarModalOpen(true);
	};

	const handleRefreshAll = async () => {
		await refreshAll(true);
	};

	let currentCalendarName = 'Select Calendar';
	const onHomePage = location.pathname === '/home' || location.pathname === '/';

	if (onHomePage) {
		currentCalendarName = 'All Calendars';
	} else if (activeCalendar && activeCalendar.name) {
		currentCalendarName = activeCalendar.name;
	} else {
		const pathParts = location.pathname.split('/');
		if (
			pathParts.length === 2 &&
			pathParts[1] &&
			pathParts[1] !== 'home' &&
			pathParts[1] !== 'signin' &&
			pathParts[1] !== 'signup'
		) {
			const potentialCalId = pathParts[1];
			const foundCal = calendars.find(c => c.uid === potentialCalId);
			if (foundCal && foundCal.name) {
				currentCalendarName = foundCal.name;
			}
		}
	}

	return (
		<>
			<header className='border-b px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-background'>
				<div className='flex items-center gap-3'>
					<Calendar className='h-6 w-6 text-primary' />
					<h1 className='text-xl font-bold hidden sm:block'>Planner</h1>

					{/* Calendar Selector with sync status indicator */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant='outline'
								className={`flex items-center gap-2 min-w-[180px] justify-between ${
									syncStatus === 'syncing' ? 'animate-pulse' : ''
								}`}
							>
								<span className='truncate max-w-[150px]'>{currentCalendarName}</span>
								<ChevronDown className='h-4 w-4' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='start' className='w-[280px]'>
							{/* All Calendars option */}
							<DropdownMenuItem
								onSelect={() => handleCalendarSelect(null)}
								className={onHomePage ? 'bg-accent' : ''}
							>
								<Home className='h-4 w-4 mr-2' />
								All Calendars
								{onHomePage && (
									<span className='ml-auto text-xs text-muted-foreground'>Current</span>
								)}
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							{/* Individual Calendars */}
							<DropdownMenuGroup>
								{calendars.length > 0 ? (
									calendars.map(calendar => (
										<DropdownMenuSub key={calendar.uid}>
											<DropdownMenuSubTrigger
												className={`${
													activeCalendar?.uid === calendar.uid && !onHomePage ? 'bg-accent' : ''
												} flex justify-between w-full items-center`}
											>
												<div
													className='flex items-center flex-grow cursor-pointer'
													onClick={e => {
														e.preventDefault();
														e.stopPropagation();
														handleCalendarSelect(calendar.uid);
													}}
												>
													<List
														className='h-4 w-4 mr-2 flex-shrink-0'
														style={{ color: calendar.color || 'inherit' }}
													/>
													<span className='truncate' style={{ color: calendar.color || 'inherit' }}>
														{calendar.name}
													</span>
													{activeCalendar?.uid === calendar.uid && !onHomePage && (
														<span className='ml-auto text-xs text-muted-foreground'>Active</span>
													)}
												</div>
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent>
												<DropdownMenuItem onSelect={() => handleOpenSettingsModal(calendar.uid)}>
													<Settings className='h-4 w-4 mr-2' />
													Calendar Settings
												</DropdownMenuItem>
											</DropdownMenuSubContent>
										</DropdownMenuSub>
									))
								) : (
									<DropdownMenuItem disabled>No calendars found</DropdownMenuItem>
								)}
							</DropdownMenuGroup>

							<DropdownMenuSeparator />

							{/* Calendar Actions */}
							<DropdownMenuItem onSelect={handleOpenAddCalendarModal}>
								<PlusSquare className='h-4 w-4 mr-2' />
								Add New Calendar
							</DropdownMenuItem>

							{/* Refresh All option for "All Calendars" view */}
							{onHomePage && (
								<DropdownMenuItem onSelect={handleRefreshAll} disabled={syncStatus === 'syncing'}>
									<Search className='h-4 w-4 mr-2' />
									{syncStatus === 'syncing' ? 'Syncing...' : 'Refresh All'}
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>

					<Button
						variant='outline'
						size='sm'
						className='ml-2 hidden sm:flex'
						onClick={onToggleSidebar}
					>
						Toggle Sidebar
					</Button>
				</div>

				{/* Search Bar */}
				<div className='flex flex-1 max-w-md'>
					<form onSubmit={handleSearch} className='flex w-full'>
						<div className='relative flex-1'>
							<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
							<Input
								placeholder={
									onHomePage ? 'Search across all calendars...' : 'Search events and todos...'
								}
								className='pl-8'
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
							/>
						</div>
						<Button type='submit' size='sm' className='ml-2'>
							Search
						</Button>
						{searchTerm && (
							<Button
								type='button'
								variant='ghost'
								size='sm'
								onClick={handleClearSearch}
								className='ml-1'
							>
								Clear
							</Button>
						)}
					</form>
					{/* User Settings Popover */}
					<Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
						<PopoverTrigger asChild>
							<Button variant="ghost" size="icon" className="ml-2">
								<UserIcon className="h-5 w-5" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-80">
							<div className="grid gap-4">
								<div className="space-y-2">
									<h4 className="font-medium leading-none">User Settings</h4>
									<p className="text-sm text-muted-foreground">
										Manage your account settings.
									</p>
								</div>
								<div className="grid gap-2">
									<div className="grid grid-cols-3 items-center gap-4">
										<Input
											id="userName"
											value={nameOfUser}
											onChange={onUserNameChanged}
											onBlur={onUserNameSaved} // Save on blur
											className="col-span-2 h-8"
										/>
										<Button onClick={onUserNameSaved} size="sm" className="col-span-1">
											Save Name
										</Button>
									</div>
									<div className="grid grid-cols-3 items-center gap-4">
										<span className="col-span-2 text-sm">
											Default Calendar: {user?.myCalendar?.calendarName || 'Not set'}
										</span>
									</div>
									<Button variant="outline" onClick={showSignOutModal} className="w-full">
										Sign Out
									</Button>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			</header>

			{/* Calendar Settings Modal */}
			{isCalendarModalOpen && (
				<CalendarModal
					isOpen={isCalendarModalOpen}
					onClose={() => {
						setIsCalendarModalOpen(false);
						setEditingCalendarId(undefined);
					}}
					calendarId={editingCalendarId}
				/>
			)}
		</>
	);
}

export default Header;
