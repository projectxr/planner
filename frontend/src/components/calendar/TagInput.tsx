import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Tag, Plus } from 'lucide-react';

interface TagInputProps {
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	maxTags?: number;
	suggestions?: string[];
}

export default function TagInput({
	value,
	onChange,
	placeholder = 'Add tags...',
	maxTags = 10,
	suggestions = ['urgent', 'meeting', 'project', 'personal', 'work', 'follow-up'],
}: TagInputProps) {
	const [inputValue, setInputValue] = useState('');
	const [showSuggestions, setShowSuggestions] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const filteredSuggestions = suggestions.filter(
		suggestion =>
			!value.includes(suggestion) && suggestion.toLowerCase().includes(inputValue.toLowerCase())
	);

	const addTag = (tag: string) => {
		const trimmedTag = tag.trim();
		if (trimmedTag && !value.includes(trimmedTag) && value.length < maxTags) {
			onChange([...value, trimmedTag]);
			setInputValue('');
			setShowSuggestions(false);
		}
	};

	const removeTag = (tagToRemove: string) => {
		onChange(value.filter(tag => tag !== tagToRemove));
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag(inputValue);
		} else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
			removeTag(value[value.length - 1]);
		} else if (e.key === 'Escape') {
			setShowSuggestions(false);
		}
	};

	return (
		<div className='space-y-2'>
			{/* Selected Tags */}
			{value.length > 0 && (
				<div className='flex flex-wrap gap-1'>
					{value.map(tag => (
						<Badge key={tag} variant='secondary' className='flex items-center gap-1'>
							<Tag className='h-3 w-3' />
							<span className='text-xs'>{tag}</span>
							<Button
								variant='ghost'
								size='sm'
								className='h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground'
								onClick={() => removeTag(tag)}
							>
								<X className='h-3 w-3' />
							</Button>
						</Badge>
					))}
				</div>
			)}

			{/* Input */}
			<div className='relative'>
				<div className='relative'>
					<Tag className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
					<Input
						ref={inputRef}
						value={inputValue}
						onChange={e => {
							setInputValue(e.target.value);
							setShowSuggestions(true);
						}}
						onKeyDown={handleKeyDown}
						onFocus={() => setShowSuggestions(true)}
						onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
						placeholder={value.length >= maxTags ? `Maximum ${maxTags} tags` : placeholder}
						disabled={value.length >= maxTags}
						className='pl-10'
					/>
					{inputValue && (
						<Button
							variant='ghost'
							size='sm'
							className='absolute right-2 top-1 h-6 w-6 p-0'
							onClick={() => addTag(inputValue)}
						>
							<Plus className='h-4 w-4' />
						</Button>
					)}
				</div>

				{/* Suggestions */}
				{showSuggestions && (filteredSuggestions.length > 0 || inputValue) && (
					<div className='absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto'>
						{inputValue && !value.includes(inputValue.trim()) && (
							<div
								className='px-3 py-2 hover:bg-accent cursor-pointer border-b'
								onClick={() => addTag(inputValue)}
							>
								<div className='flex items-center gap-2'>
									<Plus className='h-4 w-4' />
									<span>Add "{inputValue}"</span>
								</div>
							</div>
						)}

						{filteredSuggestions.map(suggestion => (
							<div
								key={suggestion}
								className='px-3 py-2 hover:bg-accent cursor-pointer flex items-center gap-2'
								onClick={() => addTag(suggestion)}
							>
								<Tag className='h-4 w-4 text-muted-foreground' />
								<span>{suggestion}</span>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Helper text */}
			<div className='text-xs text-muted-foreground'>
				Press Enter or comma to add tags. {value.length}/{maxTags} tags used.
			</div>
		</div>
	);
}
