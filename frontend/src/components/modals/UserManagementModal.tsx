import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Users, Plus, Search, Trash2, Shield, Eye, Edit, UserPlus, Crown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import { CalendarUser, UserInviteData } from '@/lib/types';
import apiClient from '@/services/api';

interface UserManagementModalProps {
	isOpen: boolean;
	onClose: () => void;
	calendarId?: string;
}

export default function UserManagementModal({
	isOpen,
	onClose,
	calendarId,
}: UserManagementModalProps) {
	const { toast } = useToast();
	const [users, setUsers] = useState<CalendarUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [inviteData, setInviteData] = useState<UserInviteData>({
		userName: '',
		email: '',
		role: 'viewer',
	});

	// Load calendar users
	useEffect(() => {
		const loadUsers = async () => {
			if (!calendarId) return;

			try {
				const response = await apiClient.post('/api/calendar/getData', { uid: calendarId });
				setUsers(response.data.users || []);
			} catch (error) {
				console.error('Failed to load users:', error);
				toast({
					title: 'Error',
					description: 'Failed to load calendar users',
					variant: 'destructive',
				});
			}
		};

		if (isOpen) {
			loadUsers();
		}
	}, [isOpen, calendarId, toast]);

	const handleInviteUser = async () => {
		if (!calendarId || !inviteData.userName.trim()) {
			toast({
				title: 'Error',
				description: 'Please enter a username',
				variant: 'destructive',
			});
			return;
		}

		setLoading(true);
		try {
			const response = await apiClient.post('/api/calendar/addUser', {
				uid: calendarId,
				userName: inviteData.userName.trim(),
			});

			// Add new user to local state
			setUsers(prev => [...prev, response.data]);
			setInviteData({ userName: '', email: '', role: 'viewer' });

			toast({
				title: 'Success',
				description: 'User added successfully',
			});
		} catch (error: any) {
			console.error('Failed to add user:', error);
			toast({
				title: 'Error',
				description: error.response?.data?.errors?.msg || 'Failed to add user',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const handleRemoveUser = async (userId: string) => {
		if (!calendarId) return;

		try {
			// Note: You'd need to implement this endpoint
			await apiClient.post('/api/calendar/removeUser', {
				uid: calendarId,
				userId,
			});

			setUsers(prev => prev.filter(user => user.user !== userId));

			toast({
				title: 'Success',
				description: 'User removed successfully',
			});
		} catch (error) {
			console.error('Failed to remove user:', error);
			toast({
				title: 'Error',
				description: 'Failed to remove user',
				variant: 'destructive',
			});
		}
	};

	const getRoleIcon = (user: CalendarUser) => {
		if (user.hasWriteAccess && user.hasReadAccess) {
			return <Edit className='h-4 w-4' />;
		} else if (user.hasReadAccess) {
			return <Eye className='h-4 w-4' />;
		}
		return <Shield className='h-4 w-4' />;
	};

	const getRoleLabel = (user: CalendarUser) => {
		if (user.hasWriteAccess && user.hasReadAccess) {
			return 'Editor';
		} else if (user.hasReadAccess) {
			return 'Viewer';
		}
		return 'No Access';
	};

	const filteredUsers = users.filter(user =>
		(user.name || user.user).toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Users className='h-5 w-5' />
						Manage Calendar Users
						<Badge variant='secondary' className='ml-auto'>
							{users.length} user{users.length !== 1 ? 's' : ''}
						</Badge>
					</DialogTitle>
				</DialogHeader>

				<div className='space-y-6'>
					{/* Add User Section */}
					<div className='rounded-lg border p-4 space-y-4'>
						<h3 className='font-medium flex items-center gap-2'>
							<UserPlus className='h-4 w-4' />
							Add New User
						</h3>

						<div className='flex gap-2'>
							<Input
								placeholder='Enter username'
								value={inviteData.userName}
								onChange={e => setInviteData(prev => ({ ...prev, userName: e.target.value }))}
								className='flex-1'
							/>

							<Select
								value={inviteData.role}
								onValueChange={(role: any) => setInviteData(prev => ({ ...prev, role }))}
							>
								<SelectTrigger className='w-32'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='viewer'>
										<div className='flex items-center gap-2'>
											<Eye className='h-4 w-4' />
											Viewer
										</div>
									</SelectItem>
									<SelectItem value='editor'>
										<div className='flex items-center gap-2'>
											<Edit className='h-4 w-4' />
											Editor
										</div>
									</SelectItem>
									<SelectItem value='admin'>
										<div className='flex items-center gap-2'>
											<Crown className='h-4 w-4' />
											Admin
										</div>
									</SelectItem>
								</SelectContent>
							</Select>

							<Button onClick={handleInviteUser} disabled={loading || !inviteData.userName.trim()}>
								<Plus className='h-4 w-4 mr-2' />
								Add
							</Button>
						</div>
					</div>

					{/* Current Users Section */}
					<div className='space-y-4'>
						<div className='flex items-center justify-between'>
							<h3 className='font-medium'>Current Users</h3>

							<div className='relative'>
								<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
								<Input
									placeholder='Search users...'
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									className='pl-8 w-64'
								/>
							</div>
						</div>

						<div className='space-y-2'>
							{filteredUsers.length > 0 ? (
								filteredUsers.map(user => (
									<div
										key={user.user}
										className='flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors'
									>
										<div className='flex items-center gap-3'>
											<Avatar className='h-10 w-10'>
												<AvatarImage src={user.avatar} />
												<AvatarFallback>
													{(user.name || user.user).substring(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>

											<div className='flex flex-col'>
												<span className='font-medium'>{user.name || user.user}</span>
												{user.email && (
													<span className='text-sm text-muted-foreground'>{user.email}</span>
												)}
											</div>
										</div>

										<div className='flex items-center gap-2'>
											<Badge variant='outline' className='flex items-center gap-1'>
												{getRoleIcon(user)}
												{getRoleLabel(user)}
											</Badge>

											<Button
												variant='ghost'
												size='sm'
												onClick={() => handleRemoveUser(user.user)}
												className='text-destructive hover:text-destructive'
											>
												<Trash2 className='h-4 w-4' />
											</Button>
										</div>
									</div>
								))
							) : (
								<div className='text-center p-8 text-muted-foreground'>
									{searchQuery
										? `No users found for "${searchQuery}"`
										: 'No users in this calendar'}
								</div>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
