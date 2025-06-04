'use client'
import { forwardRef, useState, useEffect, useCallback, useMemo, createContext, useContext } from "react"
import { 
  MDXEditor as OriginalMDXEditor, 
  MDXEditorMethods, 
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  InsertImage,
  ListsToggle,
  BlockTypeSelect,
  InsertThematicBreak,
  InsertCodeBlock,
  InsertTable,
  frontmatterPlugin,
  directivesPlugin,
  ConditionalContents,
  ChangeCodeMirrorLanguage,
  ShowSandpackInfo,
  InsertSandpack,
  sandpackPlugin
} from '@mdxeditor/editor'

import '@mdxeditor/editor/style.css'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import React from 'react'
import './calendar/mdx-event-styles.css'

// Create a context to track if the editor is within an event card
export const MDXEditorContextType = {
  isEventCard: false,
}

export const MDXEditorContext = createContext(MDXEditorContextType)

// Hook to detect system dark mode preference
const useSystemDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  useEffect(() => {
    // Check initial system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDarkMode(mediaQuery.matches)
    
    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  return isDarkMode
}

// Hook to detect document dark mode class
const useDocumentDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    // Check initial state
    checkDarkMode()
    
    // Create observer for class changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])
  
  return isDarkMode
}

// Types
export interface MDXEditorConfig {
  mode: 'edit' | 'view' | 'inline-edit'
  features?: {
    headings?: boolean
    lists?: boolean
    quotes?: boolean
    links?: boolean
    images?: boolean
    tables?: boolean
    code?: boolean
    thematicBreaks?: boolean
    frontmatter?: boolean
    directives?: boolean
    sandpack?: boolean
  }
  toolbar?: {
    show?: boolean
    minimal?: boolean
    custom?: () => React.ReactNode
  }
  theme?: {
    mode?: 'light' | 'dark' | 'system'
    customClasses?: string
  }
}

export interface MDXEditorProps {
  content?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
  config?: MDXEditorConfig
  maxHeight?: string
  minHeight?: string
  autoFocus?: boolean
  onError?: (error: Error) => void
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

// Content processing utilities
class ContentProcessor {
  private static readonly CONTROL_CHARS = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g
  private static readonly SMART_QUOTES = { '"': '"', "'": "'", "“": "\"", "”": "\"" }
  
  static sanitize(content: string): string {
    if (!content || typeof content !== 'string') return ''
    
    try {
      let processed = content
      
      // Remove control characters
      processed = processed.replace(this.CONTROL_CHARS, '')
      
      // Normalize line endings
      processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      
      // Replace smart quotes
      Object.entries(this.SMART_QUOTES).forEach(([from, to]) => {
        processed = processed.replace(new RegExp(from, 'g'), to)
      })
      
      // Fix unclosed code blocks
      const codeBlockCount = (processed.match(/```/g) || []).length
      if (codeBlockCount % 2 !== 0) {
        processed += '\n```'
      }
      
      return processed
    } catch (error) {
      console.error('Content sanitization failed:', error)
      return content
    }
  }
  
  static validate(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    try {
      // Check for basic markdown structure issues
      const lines = content.split('\n')
      let inCodeBlock = false
      let codeBlockLine = 0
      
      lines.forEach((line, index) => {
        if (line.startsWith('```')) {
          if (!inCodeBlock) {
            inCodeBlock = true
            codeBlockLine = index + 1
          } else {
            inCodeBlock = false
          }
        }
      })
      
      if (inCodeBlock) {
        errors.push(`Unclosed code block starting at line ${codeBlockLine}`)
      }
      
      // Check for invalid characters in certain contexts
      if (content.includes('\x00')) {
        errors.push('Content contains null characters')
      }
      
      return { valid: errors.length === 0, errors }
    } catch (error: any) {
      return { valid: false, errors: ['Validation failed: ' + error.message] }
    }
  }
}

// Error boundary component
class MDXErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<any> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MDXEditor error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback
      return <Fallback error={this.state.error} retry={() => this.setState({ hasError: false, error: null })} />
    }
    
    return this.props.children
  }
}

// Default error fallback with dark mode support
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void; content?: string; onChange?: (value: string) => void }> = ({ 
  error, 
  retry, 
  content = '', 
  onChange 
}) => (
  <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    <AlertDescription className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-yellow-800 dark:text-yellow-200">
          The rich text editor encountered an issue. You can try again or use plain text mode.
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={retry}
          className="ml-2"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full min-h-[100px] p-2 font-mono text-sm border rounded resize-none 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 
                   bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                   border-gray-300 dark:border-gray-700"
        placeholder="Enter your content here..."
      />
    </AlertDescription>
  </Alert>
)

// Plugin factory
class PluginFactory {
  static createPlugins(config: MDXEditorConfig): any[] {
    const features = config.features || {}
    const plugins: any[] = []
    
    // Core plugins (always included)
    if (features.headings !== false) plugins.push(headingsPlugin())
    if (features.lists !== false) plugins.push(listsPlugin())
    if (features.quotes !== false) plugins.push(quotePlugin())
    if (features.thematicBreaks !== false) plugins.push(thematicBreakPlugin())
    
    // Markdown shortcuts
    plugins.push(markdownShortcutPlugin())
    
    // Optional plugins
    if (features.links !== false) {
      plugins.push(linkPlugin())
      if (config.mode === 'edit' && config.toolbar?.show) {
        plugins.push(linkDialogPlugin())
      }
    }
    
    if (features.images !== false) {
      plugins.push(imagePlugin())
    }
    
    if (features.tables !== false) {
      plugins.push(tablePlugin())
    }
    
    if (features.code !== false) {
      plugins.push(codeBlockPlugin({ defaultCodeBlockLanguage: '' }))
      plugins.push(codeMirrorPlugin({ 
        codeBlockLanguages: { 
          '': 'Plain Text',
          js: 'JavaScript',
          ts: 'TypeScript',
          jsx: 'JSX',
          tsx: 'TSX',
          css: 'CSS',
          html: 'HTML',
          json: 'JSON',
          md: 'Markdown',
          python: 'Python',
          java: 'Java',
          cpp: 'C++',
          c: 'C',
          bash: 'Bash',
          yaml: 'YAML',
          sql: 'SQL'
        } 
      }))
    }
    
    if (features.frontmatter === true) {
      plugins.push(frontmatterPlugin())
    }
    
    if (features.directives === true) {
      plugins.push(directivesPlugin())
    }
    
    if (features.sandpack === true && config.mode === 'edit') {
      plugins.push(sandpackPlugin())
    }
    
    // Toolbar plugin
    if (config.mode === 'edit' && config.toolbar?.show) {
      plugins.push(diffSourcePlugin({ viewMode: 'rich-text' }))
      plugins.push(toolbarPlugin({
        toolbarContents: config.toolbar.custom || (() => (
          config.toolbar?.minimal ? (
            <div className="flex items-center gap-1">
              <UndoRedo />
              <BoldItalicUnderlineToggles />
              <ListsToggle />
            </div>
          ) : (
            <ConditionalContents
              options={[
                {
                  when: (editor) => editor?.editorType === 'codeblock',
                  contents: () => <ChangeCodeMirrorLanguage />
                },
                {
                  when: (editor) => editor?.editorType === 'sandpack',
                  contents: () => <ShowSandpackInfo />
                },
                {
                  fallback: () => (
                    <div className="flex items-center flex-wrap gap-1">
                      <UndoRedo />
                      <BoldItalicUnderlineToggles />
                      <CodeToggle />
                      <BlockTypeSelect />
                      <CreateLink />
                      <ListsToggle />
                      <InsertImage />
                      <InsertThematicBreak />
                      <InsertCodeBlock />
                      <InsertTable />
                      {features.sandpack && <InsertSandpack />}
                    </div>
                  )
                }
              ]}
            />
          )
        ))
      }))
    }
    
    return plugins
  }
}

// Main component with enhanced dark mode support
export const MDXEditorComponent = forwardRef<MDXEditorMethods, MDXEditorProps>(({
  content = '',
  onChange,
  placeholder = 'Enter content...',
  className,
  readOnly = false,
  config = { mode: 'edit' },
  maxHeight,
  minHeight,
  autoFocus = false,
  onError,
  errorFallback = DefaultErrorFallback
}, ref) => {
  const [processedContent, setProcessedContent] = useState(() => ContentProcessor.sanitize(content))
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  // Dark mode detection
  const systemDarkMode = useSystemDarkMode()
  const documentDarkMode = useDocumentDarkMode()
  
  // Determine effective dark mode
  const isDarkMode = useMemo(() => {
    const themeMode = config.theme?.mode || 'system'
    switch (themeMode) {
      case 'dark': return true
      case 'light': return false
      case 'system': 
      default: 
        return documentDarkMode || systemDarkMode
    }
  }, [config.theme?.mode, documentDarkMode, systemDarkMode])
  
  // Update content when prop changes
  useEffect(() => {
    const sanitized = ContentProcessor.sanitize(content)
    setProcessedContent(sanitized)
  }, [content])
  
  
  const handleChange = useCallback((newContent: string) => {
    try {
      const sanitized = ContentProcessor.sanitize(newContent)
      setProcessedContent(sanitized)
      onChange?.(sanitized)
      setHasError(false)
    } catch (error) {
      console.error('Error handling content change:', error)
      onError?.(error as Error)
      setHasError(true)
    }
  }, [onChange, onError])
  
  const plugins = useMemo(() => {
    return PluginFactory.createPlugins(config)
  }, [config])
  
  const editorClasses = useMemo(() => {
    const baseClasses = cn(
      'prose prose-sm max-w-none focus:outline-none',
      isDarkMode 
        ? 'prose-invert prose-headings:text-gray-100 prose-p:text-gray-200 prose-strong:text-gray-100 prose-code:text-gray-100 prose-pre:bg-gray-800 prose-blockquote:text-gray-300' 
        : 'prose-gray prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-900',
      config.theme?.customClasses
    )
    
    const modeClasses = {
      'view': 'cursor-default',
      'edit': 'min-h-[150px]',
      'inline-edit': 'min-h-[60px]'
    }
    
    return cn(baseClasses, modeClasses[config.mode] || modeClasses.edit)
  }, [config.mode, config.theme?.customClasses, isDarkMode])
  
  // Use React context to determine if we're in an event card
  const editorContext = useContext(MDXEditorContext);
  const isInEventCard = editorContext.isEventCard;
  
  const containerStyle = useMemo(() => {
    const baseStyles = {
      maxHeight,
      minHeight,
      overflowY: maxHeight ? 'auto' as const : 'visible' as const,
      flexBasis: 'auto',
      flexShrink: 1,
      marginLeft: '0.5rem'
    };
    
    if (isInEventCard) {
      return {
        ...baseStyles,
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        padding: '0',
        margin: '0',
        border: 'none',
        maxHeight: '100%',
        overflow: 'hidden',
        position: 'relative' as const,
      };
    }
    
    return baseStyles;
  }, [maxHeight, minHeight, isInEventCard])
  
  const containerClasses = useMemo(() => cn(
    'mdx-editor-container',
    isDarkMode && 'dark',
    isInEventCard && 'in-event-card',
    isDarkMode 
      ? 'bg-gray-900 text-gray-100 [&_.mdxeditor-root-contenteditable]:bg-gray-900 [&_.mdxeditor-root-contenteditable]:text-gray-100' 
      : 'bg-white text-gray-900 [&_.mdxeditor-root-contenteditable]:bg-white [&_.mdxeditor-root-contenteditable]:text-gray-900',
    isInEventCard && 'bg-transparent [&_.mdxeditor-root-contenteditable]:bg-transparent',
    isDarkMode
      ? '[&_.mdxeditor-toolbar]:bg-gray-800 [&_.mdxeditor-toolbar]:border-gray-700'
      : '[&_.mdxeditor-toolbar]:bg-gray-50 [&_.mdxeditor-toolbar]:border-gray-200',
    isInEventCard && [
      '[&_.mdxeditor-toolbar]:p-0.5',
      '[&_.mdxeditor-toolbar]:min-h-0',
      '[&_.mdxeditor-toolbar]:border-none',
      '[&_.mdxeditor-toolbar]:bg-black/20',
      config.mode === 'inline-edit' && [
        '[&_.mdxeditor-toolbar]:absolute',
        '[&_.mdxeditor-toolbar]:top-0',
        '[&_.mdxeditor-toolbar]:right-0',
        '[&_.mdxeditor-toolbar]:opacity-0',
        '[&_.mdxeditor-toolbar]:transition-opacity',
        '[&_.mdxeditor-toolbar]:duration-200',
        '[&:hover_.mdxeditor-toolbar]:opacity-100',
        '[&:focus-within_.mdxeditor-toolbar]:opacity-100',
        '[&_.mdxeditor-toolbar]:z-10',
        '[&_.mdxeditor-toolbar]:rounded',
        '[&_.mdxeditor-toolbar]:shadow-lg',
      ]
    ].filter(Boolean),
    isDarkMode
      ? '[&_.mdxeditor-toolbar_button]:text-gray-300 [&_.mdxeditor-toolbar_button:hover]:text-gray-100 [&_.mdxeditor-toolbar_button:hover]:bg-gray-700'
      : '[&_.mdxeditor-toolbar_button]:text-gray-600 [&_.mdxeditor-toolbar_button:hover]:text-gray-900 [&_.mdxeditor-toolbar_button:hover]:bg-gray-100',
    isInEventCard && '[&_.mdxeditor-toolbar_button]:p-0.5 [&_.mdxeditor-toolbar_button]:text-xs',
    isInEventCard && [
      '[&_.mdxeditor-root-contenteditable]:min-h-0',
      '[&_.mdxeditor-root-contenteditable]:flex-1',
      '[&_.mdxeditor-root-contenteditable]:overflow-y-auto',
      '[&_.mdxeditor-root-contenteditable]:scrollbar-thin',
      '[&_.mdxeditor-root-contenteditable]:contain-intrinsic-size-auto',
    ],
    className
  ), [isDarkMode, className, isInEventCard, config.mode])
    
  const handleCalendarEventClick = useCallback((e: React.MouseEvent) => {
    if (isInEventCard && config.mode === 'inline-edit') {
      e.stopPropagation();
    }
  }, [isInEventCard, config.mode]);

  return (
    <div 
      className={containerClasses}
      style={containerStyle}
      data-theme={isDarkMode ? 'dark' : 'light'}
      onClick={handleCalendarEventClick}
      onMouseDown={handleCalendarEventClick} 
    >
      <MDXErrorBoundary fallback={errorFallback}>
        <OriginalMDXEditor
          key={`mdx-${retryCount}-${isDarkMode ? 'dark' : 'light'}`} 
          ref={ref}
          markdown={processedContent}
          onChange={config.mode !== 'view' ? handleChange : undefined}
          readOnly={readOnly || config.mode === 'view'}
          placeholder={placeholder}
          contentEditableClassName={editorClasses}
          plugins={plugins}
          autoFocus={autoFocus && config.mode !== 'view' && !isInEventCard} 
        />
      </MDXErrorBoundary>
    </div>
  )
})

MDXEditorComponent.displayName = 'MDXEditorComponent'

// Convenience exports for common configurations with dark mode support
export const MDXViewer = forwardRef<MDXEditorMethods, Omit<MDXEditorProps, 'config'>>((props, ref) => (
  <MDXEditorComponent {...props} ref={ref} config={{ mode: 'view', theme: { mode: 'system' } }} />
))

export const MDXInlineEditor = forwardRef<MDXEditorMethods, Omit<MDXEditorProps, 'config'>>((props, ref) => (
  <MDXEditorComponent 
    {...props} 
    ref={ref} 
    config={{ 
      mode: 'inline-edit',
      toolbar: { show: true, minimal: true },
      theme: { mode: 'system' }
    }} 
  />
))

export const MDXFullEditor = forwardRef<MDXEditorMethods, Omit<MDXEditorProps, 'config'>>((props, ref) => (
  <MDXEditorComponent 
    {...props} 
    ref={ref} 
    config={{ 
      mode: 'edit',
      toolbar: { show: true, minimal: false },
      theme: { mode: 'system' }
    }} 
  />
))

MDXViewer.displayName = 'MDXViewer'
MDXInlineEditor.displayName = 'MDXInlineEditor'
MDXFullEditor.displayName = 'MDXFullEditor'

export default MDXEditorComponent