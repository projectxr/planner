import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Bold,
	Italic,
	Underline,
	List,
	ListOrdered,
	Link,
	Code,
	Eye,
	Edit,
	Hash,
	Quote,
	Image,
	Table,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMDXParser } from '@/lib/mdx-parser';

interface RichTextEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export default function RichTextEditor({
	value,
	onChange,
	placeholder = 'Enter content...',
	className,
}: RichTextEditorProps) {
	const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const insertMarkdown = (before: string, after: string = '') => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selectedText = value.substring(start, end);

		const newValue =
			value.substring(0, start) + before + (selectedText || 'text') + after + value.substring(end);

		onChange(newValue);

		// Set cursor position after insertion
		setTimeout(() => {
			const newPosition = start + before.length + (selectedText ? selectedText.length : 4);
			textarea.setSelectionRange(newPosition, newPosition);
			textarea.focus();
		}, 0);
	};

	const insertTemplate = (template: string) => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const newValue = value.substring(0, start) + template + value.substring(start);
		onChange(newValue);

		setTimeout(() => {
			textarea.setSelectionRange(start + template.length, start + template.length);
			textarea.focus();
		}, 0);
	};

	const formatButtons = [
		{ icon: Bold, label: 'Bold', action: () => insertMarkdown('**', '**') },
		{ icon: Italic, label: 'Italic', action: () => insertMarkdown('*', '*') },
		{ icon: Underline, label: 'Underline', action: () => insertMarkdown('<u>', '</u>') },
		{ icon: Code, label: 'Inline Code', action: () => insertMarkdown('`', '`') },
		{ icon: Hash, label: 'Heading', action: () => insertMarkdown('## ') },
		{ icon: Quote, label: 'Quote', action: () => insertMarkdown('> ') },
		{ icon: List, label: 'Bullet List', action: () => insertMarkdown('- ') },
		{ icon: ListOrdered, label: 'Numbered List', action: () => insertMarkdown('1. ') },
		{ icon: Link, label: 'Link', action: () => insertMarkdown('[', '](url)') },
		{ icon: Image, label: 'Image', action: () => insertMarkdown('![alt](', ')') },
		{
			icon: Table,
			label: 'Table',
			action: () =>
				insertTemplate(
					'\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n'
				),
		},
	];

	const mdxTemplates = [
		{
			label: 'Alert Info',
			action: () => insertTemplate('\n<Alert type="info">\nYour info message here\n</Alert>\n'),
		},
		{
			label: 'Alert Warning',
			action: () =>
				insertTemplate('\n<Alert type="warning">\nYour warning message here\n</Alert>\n'),
		},
		{
			label: 'Callout',
			action: () =>
				insertTemplate('\n<Callout emoji="💡">\nYour callout content here\n</Callout>\n'),
		},
		{
			label: 'Task List',
			action: () =>
				insertTemplate(
					'\n<TaskList>\n<Task completed={false}>Uncompleted task</Task>\n<Task completed={true}>Completed task</Task>\n</TaskList>\n'
				),
		},
		{
			label: 'Code Block',
			action: () =>
				insertTemplate('\n```javascript\n// Your code here\nconsole.log("Hello, world!");\n```\n'),
		},
	];

	const previewHtml = useMDXParser(value, {
		codeBlockTheme: 'auto',
		allowHTML: false,
		maxImageHeight: '200px',
	});

	return (
		<div className={cn('border rounded-md', className)}>
			<Tabs value={activeTab} onValueChange={tab => setActiveTab(tab as 'edit' | 'preview')}>
				<div className='flex items-center justify-between border-b px-3 py-2'>
					<div className='flex items-center gap-1 flex-wrap'>
						{formatButtons.map((button, index) => (
							<Button
								key={index}
								variant='ghost'
								size='sm'
								onClick={button.action}
								title={button.label}
								className='h-8 w-8 p-0'
							>
								<button.icon className='h-4 w-4' />
							</Button>
						))}

						<div className='w-px h-6 bg-gray-300 mx-1' />

						{mdxTemplates.map((template, index) => (
							<Button
								key={`template-${index}`}
								variant='ghost'
								size='sm'
								onClick={template.action}
								title={template.label}
								className='h-8 px-2 text-xs'
							>
								{template.label}
							</Button>
						))}
					</div>

					<TabsList className='grid w-32 grid-cols-2'>
						<TabsTrigger value='edit' className='text-xs'>
							<Edit className='h-3 w-3 mr-1' />
							Edit
						</TabsTrigger>
						<TabsTrigger value='preview' className='text-xs'>
							<Eye className='h-3 w-3 mr-1' />
							Preview
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value='edit' className='m-0'>
					<Textarea
						ref={textareaRef}
						value={value}
						onChange={e => onChange(e.target.value)}
						placeholder={placeholder}
						className='border-0 focus-visible:ring-0 min-h-[300px] resize-none font-mono text-sm'
					/>
				</TabsContent>

				<TabsContent value='preview' className='m-0'>
					<div
						className='p-4 min-h-[300px] prose prose-sm max-w-none dark:prose-invert'
						dangerouslySetInnerHTML={{
							__html: previewHtml || `<p class="text-gray-500">${placeholder}</p>`,
						}}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
