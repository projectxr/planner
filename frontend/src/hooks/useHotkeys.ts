import { useEffect, useCallback } from 'react';

export function useHotkeys(key: string, callback: () => void, deps: any[] = []) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore key events if they're in an input, textarea, or select
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }
    
    // Handle keyboard shortcuts
    if (event.key === key) {
      event.preventDefault();
      callback();
    }
  }, [key, callback]);

  useEffect(() => {
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, ...deps]);
}