'use client'
import { forwardRef, useState, useEffect } from "react"
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
  DiffSourceToggleWrapper,
  frontmatterPlugin,
  directivesPlugin
} from '@mdxeditor/editor'

import '@mdxeditor/editor/style.css'
import { cn } from '@/lib/utils'

interface MDXEditorComponentProps {
  content?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  showToolbar?: boolean;
  viewOnly?: boolean;
  editorRef?: React.ForwardedRef<MDXEditorMethods>;
  simpleView?: boolean;
  maxHeight?: string;
  inlineEditOnly?: boolean;
  autoFocus?: boolean;
  showFullToolbar?: boolean;
}

export const MDXEditorComponent = forwardRef<MDXEditorMethods, MDXEditorComponentProps>(({
  content = '',
  onChange,
  placeholder = 'Enter content...',
  className,
  readOnly = false,
  showToolbar = true, 
  viewOnly = false,
  simpleView = false,
  maxHeight,
  inlineEditOnly = false,
  autoFocus = false,
  showFullToolbar = false
}, ref) => {
  const preprocessMarkdown = (markdown: string): string => {
    if (!markdown || typeof markdown !== 'string') return '';
    
    try {
      let processed = markdown;
      
      processed = processed.replace(/```\n([^`]*(?:\d+:\d+\s*[AP]M|min:|Week \d+:|Month \d+:)[^`]*)\n```/g, (match, content) => {
        const lines = content.split('\n').map((line: any) => {
          return line.replace(/[{}]/g, '').trim();
        });
        return '```\n' + lines.join('\n') + '\n```';
      });
      
      processed = processed.replace(/```([^`\n]*)\n/g, (match, lang) => {
        const cleanLang = lang ? lang.replace(/[{}"':]/g, '').trim() : '';
        return cleanLang ? `\`\`\`${cleanLang}\n` : '```\n';
      });
      
      const codeBlockMatches = processed.match(/```/g);
      if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
        processed += '\n```';
      }
      
      processed = processed.replace(/"/g, '"').replace(/"/g, '"');
      
      processed = processed.replace(/<([^>]*[{}"'][^>]*)>/g, (match) => {
        return `\`${match}\``;
      });
      
      processed = processed.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      return processed;
    } catch (error) {
      console.warn('Error preprocessing markdown:', error);
      return markdown.replace(/[{}"'<>]/g, '');
    }
  };

  const [markdown, setMarkdown] = useState(() => preprocessMarkdown(content));
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const processed = preprocessMarkdown(content);
    setMarkdown(processed);
    setHasError(false);
  }, [content]);

  const handleChange = (value: string) => {
    try {
      const processed = preprocessMarkdown(value);
      setMarkdown(processed);
      onChange?.(processed);
      setHasError(false);
    } catch (error) {
      console.warn('Error handling markdown change:', error);
      setHasError(true);
    }
  };

  const renderWithErrorHandling = (renderFunction: () => React.ReactNode) => {
    if (hasError) {
      return (
        <div className={cn('border rounded-md p-3 bg-yellow-50 border-yellow-200', className)}>
          <div className="text-sm text-yellow-700 mb-2 flex items-center gap-2">
            <span>⚠️</span>
            <span>Rich text mode encountered an error. Using plain text mode.</span>
            <button 
              onClick={() => setHasError(false)}
              className="text-blue-600 underline text-xs"
            >
              Try again
            </button>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => {
              setMarkdown(e.target.value);
              onChange?.(e.target.value);
            }}
            placeholder={placeholder}
            className="w-full min-h-[100px] border-0 bg-transparent resize-none focus:outline-none font-mono text-sm"
            readOnly={readOnly}
            autoFocus={autoFocus}
          />
        </div>
      );
    }

    try {
      return renderFunction();
    } catch (error) {
      console.warn('MDX rendering error:', error);
      setHasError(true);
      
      return (
        <div className={cn('border rounded-md p-3 bg-yellow-50 border-yellow-200', className)}>
          <div className="text-sm text-yellow-700 mb-2">
            ⚠️ Rich text rendering failed. Switching to plain text mode.
          </div>
          <textarea
            value={markdown}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className="w-full min-h-[100px] border-0 bg-transparent resize-none focus:outline-none font-mono text-sm"
            readOnly={readOnly}
            autoFocus={autoFocus}
          />
        </div>
      );
    }
  };

  const basePlugins = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    linkPlugin(),
    imagePlugin(),
    tablePlugin(),
    codeBlockPlugin({ 
      defaultCodeBlockLanguage: ''
    }),
    codeMirrorPlugin({ 
      codeBlockLanguages: { 
        '': 'Plain Text',
        js: 'JavaScript', 
        css: 'CSS', 
        html: 'HTML', 
        md: 'Markdown',
        text: 'Plain Text'
      } 
    }),
  ];

  const SafeMDXEditor = ({ plugins, ...props }: any) => {
    try {
      return <OriginalMDXEditor {...props} plugins={plugins} />;
    } catch (error) {
      console.error('MDXEditor component error:', error);
      throw error;
    }
  };

  if (viewOnly) {
    return renderWithErrorHandling(() => (
      <div 
        className={cn('mdx-content prose prose-sm dark:prose-invert', className)}
        style={{ maxHeight, overflowY: maxHeight ? 'auto' : 'visible' }}
      >
        <SafeMDXEditor
          ref={ref}
          markdown={markdown}
          readOnly={true}
          contentEditableClassName="prose prose-sm sm:prose dark:prose-invert focus:outline-none max-w-none"
          plugins={basePlugins}
        />
      </div>
    ));
  }

  if (inlineEditOnly) {
    const inlinePlugins = [...basePlugins];
    
    if (showToolbar) {
      inlinePlugins.push(
        toolbarPlugin({
          toolbarContents: () => (
            <div className="flex items-center flex-wrap gap-1">
              <BoldItalicUnderlineToggles />
              <ListsToggle />
            </div>
          )
        })
      );
    }
    
    return renderWithErrorHandling(() => (
      <div className={cn('mdx-editor-inline', className)}>
        <SafeMDXEditor
          ref={ref}
          markdown={markdown}
          onChange={handleChange}
          readOnly={readOnly}
          placeholder={placeholder}
          contentEditableClassName="prose prose-sm sm:prose dark:prose-invert focus:outline-none min-h-[60px] max-w-none"
          plugins={inlinePlugins}
          autoFocus={autoFocus}
        />
      </div>
    ));
  }
  
  if (readOnly || simpleView) {
    return renderWithErrorHandling(() => (
      <div className={cn('mdx-editor-simple', className)}>
        <SafeMDXEditor
          ref={ref}
          markdown={markdown}
          onChange={handleChange}
          readOnly={readOnly}
          placeholder={placeholder}
          contentEditableClassName="prose prose-sm sm:prose dark:prose-invert focus:outline-none min-h-[60px] max-w-none"
          plugins={basePlugins}
          autoFocus={autoFocus}
        />
      </div>
    ));
  }

  const toolbarPlugins = [];
  
  if (showToolbar) {
    try {
      toolbarPlugins.push(linkDialogPlugin());
    } catch (error) {
      console.warn('linkDialogPlugin failed to load:', error);
    }
    
    try {
      toolbarPlugins.push(diffSourcePlugin({ viewMode: 'rich-text' }));
    } catch (error) {
      console.warn('diffSourcePlugin failed to load:', error);
    }
    
    toolbarPlugins.push(
      toolbarPlugin({
        toolbarContents: showFullToolbar ? 
          () => (
            <div className="flex items-center flex-wrap gap-2 p-1">
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
              <DiffSourceToggleWrapper />
            </div>
          ) : 
          () => (
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
              <DiffSourceToggleWrapper />
            </div>
          )
      })
    );
  }

  const fullPlugins = [
    ...basePlugins,
    ...toolbarPlugins
  ];

  return renderWithErrorHandling(() => (
    <div className={cn('mdx-editor-full', className)} style={{ maxHeight, overflowY: maxHeight ? 'auto' : 'visible' }}>
      <SafeMDXEditor
        ref={ref}
        markdown={markdown}
        onChange={handleChange}
        placeholder={placeholder}
        contentEditableClassName="prose prose-sm sm:prose dark:prose-invert focus:outline-none min-h-[150px] max-w-none"
        plugins={fullPlugins}
        autoFocus={autoFocus}
      />
    </div>
  ));
});

MDXEditorComponent.displayName = 'MDXEditorComponent';

export default MDXEditorComponent;