import { useCallback, useState, useRef, useEffect } from 'react';
import { Eye, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { MDXViewer } from '@/components/MDXEditor';

interface EventContentPreviewProps {
  event: {
    content?: string;
    id: string;
    title: string;
  };
  onError?: (error: Error) => void;
  className?: string;
  buttonClassName?: string;
  maxHeight?: string;
}

export function EventContentPreview({
  event,
  onError,
  className = "",
  buttonClassName = "",
  maxHeight = "300px"
}: EventContentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contentError, setContentError] = useState<Error | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Reset error state when popover opens
  useEffect(() => {
    if (isOpen) {
      setContentError(null);
      setIsLoading(true);
    }
  }, [isOpen]);

  const handleError = useCallback((error: Error) => {
    console.error('MDX content error:', error);
    setContentError(error);
    setIsLoading(false);
    onError?.(error);
  }, [onError]);

  // Use effect to set loading state to false after a short delay
  // since MDXViewer doesn't support an onLoad callback
  useEffect(() => {
    if (isLoading && isOpen) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isOpen]);

  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    // Prevent event from bubbling up to calendar event handlers
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(prev => !prev);
  }, []);

  // Validate content
  const hasValidContent = Boolean(event.content?.trim());
  
  if (!hasValidContent) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          className={`h-5 w-5 p-0 text-white/80 hover:text-white hover:bg-white/20 relative z-10 ${buttonClassName}`}
          onClick={handleTriggerClick}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={`View content for ${event.title}`}
        >
          <Eye className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className={`max-w-md p-3 bg-gray-900 border-gray-700 shadow-lg z-[9999] ${className}`}
        align="start"
        side="bottom"
        sideOffset={5}
        avoidCollisions={true}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={() => setIsOpen(false)}
        onPointerDownOutside={(e) => {
          const target = e.target as Element;
          if (!target.closest('[draggable="true"]')) {
            setIsOpen(false);
          }
        }}
      >
        {contentError ? (
          <div className="flex items-center gap-2 p-2 text-amber-400 bg-amber-400/10 rounded-md border border-amber-400/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium">Content Error</div>
              <div className="text-xs opacity-75 mt-1">
                Unable to display content due to formatting issues.
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Loading...</span>
          </div>
        ) : (
          <MDXViewer 
            content={event.content || ''} 
            maxHeight={maxHeight}
            className="overflow-y-auto custom-thin-scrollbar"
            onError={handleError}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
