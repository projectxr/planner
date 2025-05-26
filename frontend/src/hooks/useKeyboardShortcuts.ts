import { useEffect } from 'react';
import { CalendarViewType } from '@/lib/types';

interface UseKeyboardShortcutsProps {
	onNewEvent?: () => void;
	onNavigateToday?: () => void;
	onNavigatePrevious?: () => void;
	onNavigateNext?: () => void;
	onChangeView?: (view: CalendarViewType) => void;
	onSearch?: () => void;
	onEscape?: () => void;
}

export function useKeyboardShortcuts({
	onNewEvent,
	onNavigateToday,
	onNavigatePrevious,
	onNavigateNext,
	onChangeView,
	onSearch,
	onEscape,
}: UseKeyboardShortcutsProps) {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Don't trigger shortcuts when typing in inputs
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement ||
				(event.target as Element)?.getAttribute('contenteditable') === 'true'
			) {
				return;
			}

			const { key, ctrlKey, metaKey } = event;
			const isModifierPressed = ctrlKey || metaKey;

			switch (key) {
				// New event
				case 'n':
					if (isModifierPressed) {
						event.preventDefault();
						onNewEvent?.();
					}
					break;

				// Navigate to today
				case 't':
					if (isModifierPressed) {
						event.preventDefault();
						onNavigateToday?.();
					}
					break;

				// Navigation
				case 'ArrowLeft':
					if (isModifierPressed) {
						event.preventDefault();
						onNavigatePrevious?.();
					}
					break;

				case 'ArrowRight':
					if (isModifierPressed) {
						event.preventDefault();
						onNavigateNext?.();
					}
					break;

				// View changes
				case '1':
					if (isModifierPressed) {
						event.preventDefault();
						onChangeView?.('day');
					}
					break;

				case '2':
					if (isModifierPressed) {
						event.preventDefault();
						onChangeView?.('week');
					}
					break;

				case '3':
					if (isModifierPressed) {
						event.preventDefault();
						onChangeView?.('month');
					}
					break;

				case '4':
					if (isModifierPressed) {
						event.preventDefault();
						onChangeView?.('agenda');
					}
					break;

				// Search
				case 'f':
					if (isModifierPressed) {
						event.preventDefault();
						onSearch?.();
					}
					break;

				// Escape
				case 'Escape':
					onEscape?.();
					break;
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [
		onNewEvent,
		onNavigateToday,
		onNavigatePrevious,
		onNavigateNext,
		onChangeView,
		onSearch,
		onEscape,
	]);
}
