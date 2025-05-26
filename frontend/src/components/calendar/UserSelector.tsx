import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/services/api';

interface User {
	id: string;
	name: string;
	userName: string;
	email?: string;
	avatar?: string;
}

interface UserSelectorProps {
	value: string[];
	onChange: (value: string[]) => void;
	calendarUid: string;
	placeholder?: string;
	maxUsers?: number;
}

export default function UserSelector({
	value,
	onChange,
	calendarUid,
	placeholder = 'Select users...',
	maxUsers = 10,
}: UserSelectorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [availableUsers, setAvailableUsers] = useState<User[]>([]);
	const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);

	// Fetch available users for the calendar
	useEffect(() => {
		const fetchUsers = async () => {
			if (!calendarUid || !searchQuery.trim()) {
				setAvailableUsers([]);
				return;
			}

			setLoading(true);
			try {
				const response = await apiClient.get(`/api/calendar/getusers/${searchQuery}`);
				const users = response.data.map((userName: string, index: number) => ({
					id: `user_${index}`,
					name: userName,
					userName,
					avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`,
				}));
				setAvailableUsers(users);
			} catch (error) {
				console.error('Failed to fetch users:', error);
				setAvailableUsers([]);
			}
			setLoading(false);
		};

		const debounceTimer = setTimeout(fetchUsers, 300);
		return () => clearTimeout(debounceTimer);
	}, [searchQuery, calendarUid]);

	// Update selected users when value changes
	useEffect(() => {
		// In a real app, you'd fetch user details by IDs
		const users = value.map((userId, index) => ({
			id: userId,
			name: userId, // Placeholder - should fetch actual user data
			userName: userId,
			avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
		}));
		setSelectedUsers(users);
	}, [value]);

	const handleUserToggle = (user: User) => {
		const isSelected = value.includes(user.id);
		if (isSelected) {
			onChange(value.filter(id => id !== user.id));
		} else if (value.length < maxUsers) {
			onChange([...value, user.id]);
		}
	};

	const handleRemoveUser = (userId: string) => {
		onChange(value.filter(id => id !== userId));
	};

	return (
		<div className='space-y-2'>
			{/* Selected Users */}
			{selectedUsers.length > 0 && (
				<div className='flex flex-wrap gap-1'>
					{selectedUsers.map(user => (
						<Badge key={user.id} variant='secondary' className='flex items-center gap-1'>
							<Avatar className='h-4 w-4'>
								<AvatarImage src={user.avatar} />
								<AvatarFallback className='text-xs'>
									{user.name.substring(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<span className='text-xs'>{user.name}</span>
							<Button
								variant='ghost'
								size='sm'
								className='h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground'
								onClick={() => handleRemoveUser(user.id)}
							>
								<X className='h-3 w-3' />
							</Button>
						</Badge>
					))}
				</div>
			)}

			{/* User Selector */}
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant='outline'
						role='combobox'
						aria-expanded={isOpen}
						className='w-full justify-start'
					>
						<Users className='h-4 w-4 mr-2' />
						{selectedUsers.length > 0
							? `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} selected`
							: placeholder}
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-80 p-0'>
					<div className='p-2 border-b'>
						<div className='relative'>
							<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
							<Input
								placeholder='Search users...'
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								className='pl-8'
							/>
						</div>
					</div>

					<div className='max-h-64 overflow-y-auto'>
						{loading ? (
							<div className='p-4 text-center text-sm text-muted-foreground'>
								Searching users...
							</div>
						) : availableUsers.length > 0 ? (
							<div className='p-1'>
								{availableUsers.map(user => {
									const isSelected = value.includes(user.id);
									return (
										<div
											key={user.id}
											className={cn(
												'flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent',
												isSelected && 'bg-accent'
											)}
											onClick={() => handleUserToggle(user)}
										>
											<div className='flex items-center space-x-2 flex-1'>
												<Avatar className='h-6 w-6'>
													<AvatarImage src={user.avatar} />
													<AvatarFallback className='text-xs'>
														{user.name.substring(0, 2).toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div className='flex flex-col'>
													<span className='font-medium'>{user.name}</span>
													{user.email && (
														<span className='text-xs text-muted-foreground'>{user.email}</span>
													)}
												</div>
											</div>
											{isSelected && <Check className='h-4 w-4' />}
										</div>
									);
								})}
							</div>
						) : searchQuery ? (
							<div className='p-4 text-center text-sm text-muted-foreground'>
								No users found for "{searchQuery}"
							</div>
						) : (
							<div className='p-4 text-center text-sm text-muted-foreground'>
								Start typing to search for users
							</div>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
