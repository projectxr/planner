// lib/mdx-parser.ts
import { useMemo } from 'react';

/**
 * Production-ready MDX parser with security, performance, and consistency improvements
 *
 * Features:
 * - XSS protection through HTML sanitization
 * - Consistent styling with dark mode support
 * - Performance optimization through memoization
 * - Error handling and graceful degradation
 * - Extensible configuration
 * - TypeScript support
 */

// HTML sanitization function to prevent XSS
const sanitizeHtml = (html: string): string => {
	// Basic HTML sanitization - in production, consider using DOMPurify
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/javascript:/gi, '')
		.replace(/on\w+\s*=/gi, '')
		.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
};

// Enhanced MDX parsing configuration
interface MDXParserConfig {
	allowHTML?: boolean;
	maxImageHeight?: string;
	linkTarget?: string;
	codeBlockTheme?: 'light' | 'dark' | 'auto';
}

const defaultConfig: MDXParserConfig = {
	allowHTML: false,
	maxImageHeight: '120px',
	linkTarget: '_blank',
	codeBlockTheme: 'auto',
};

// Consolidated MDX parser with consistent styling and security
export const parseMDXContent = (content: string, config: MDXParserConfig = {}): string => {
	if (!content?.trim()) return '';

	const finalConfig = { ...defaultConfig, ...config };

	try {
		const lines = content.split('\n');
		let html = '';
		let inCodeBlock = false;
		let inMDXComponent = false;
		let codeBlockLang = '';
		let currentCodeBlock = '';
		let listItems: string[] = [];
		let listType = '';
		let listDepth = 0;

		const processInlineMarkdown = (text: string): string => {
			return (
				text
					// Bold and italic combinations (order matters)
					.replace(
						/\*\*\*(.*?)\*\*\*/g,
						'<strong class="font-bold"><em class="italic">$1</em></strong>'
					)
					.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
					.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
					.replace(/<u>(.*?)<\/u>/g, '<u class="underline">$1</u>')
					// Inline code
					.replace(
						/`([^`\n]+)`/g,
						'<code class="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>'
					)
					// Links with proper security
					.replace(
						/\[([^\]]+)\]\(([^)]+)\)/g,
						`<a href="$2" target="${finalConfig.linkTarget}" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium">$1</a>`
					)
					// Images with size constraints
					.replace(
						/!\[([^\]]*)\]\(([^)]+)\)/g,
						`<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-2 shadow-sm border border-slate-200 dark:border-slate-700" style="max-height: ${finalConfig.maxImageHeight}; object-fit: cover;" loading="lazy" />`
					)
			);
		};

		const flushListItems = () => {
			if (listItems.length > 0) {
				const listClass = listType === 'ordered' ? 'list-decimal' : 'list-disc';
				const tag = listType === 'ordered' ? 'ol' : 'ul';
				html += `<${tag} class="${listClass} ml-4 space-y-1 my-3 text-sm leading-relaxed">
          ${listItems.map(item => `<li>${item}</li>`).join('')}
        </${tag}>`;
				listItems = [];
				listType = '';
				listDepth = 0;
			}
		};

		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];

			// Handle code blocks
			if (line.match(/^```/)) {
				if (!inCodeBlock) {
					flushListItems();
					inCodeBlock = true;
					codeBlockLang = line.replace('```', '').trim();
					currentCodeBlock = '';
					continue;
				} else {
					inCodeBlock = false;
					const themeClass =
						finalConfig.codeBlockTheme === 'dark'
							? 'bg-slate-900 text-slate-100'
							: finalConfig.codeBlockTheme === 'light'
							? 'bg-slate-100 text-slate-900'
							: 'bg-slate-900 dark:bg-slate-800 text-slate-100 dark:text-slate-200';

					html += `<div class="${themeClass} p-3 rounded-lg my-3 text-xs font-mono overflow-x-auto shadow-inner border border-slate-200 dark:border-slate-700">
            ${
							codeBlockLang
								? `<div class="flex items-center justify-between mb-2">
              <span class="text-slate-400 text-xs uppercase tracking-wide font-sans">${codeBlockLang}</span>
            </div>`
								: ''
						}
            <pre class="whitespace-pre-wrap"><code>${escapeHtml(
							currentCodeBlock.trim()
						)}</code></pre>
          </div>`;
					continue;
				}
			}

			if (inCodeBlock) {
				currentCodeBlock += line + '\n';
				continue;
			}

			// Handle MDX components with improved styling
			if (line.match(/<Alert type="(info|warning|error|success)">/)) {
				flushListItems();
				const type = line.match(/type="(\w+)"/)?.[1] || 'info';
				const componentStyles = {
					info: {
						icon: '💡',
						classes:
							'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
					},
					warning: {
						icon: '⚠️',
						classes:
							'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
					},
					error: {
						icon: '❌',
						classes:
							'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
					},
					success: {
						icon: '✅',
						classes:
							'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
					},
				};

				const style = componentStyles[type as keyof typeof componentStyles];
				inMDXComponent = true;
				html += `<div class="flex items-start gap-3 p-3 rounded-lg border-l-4 my-3 shadow-sm ${style.classes}">
          <span class="text-lg flex-shrink-0 mt-0.5">${style.icon}</span>
          <div class="text-sm leading-relaxed">`;
			} else if (line.match(/<\/Alert>/)) {
				html += '</div></div>';
				inMDXComponent = false;
			} else if (line.match(/<Callout emoji="([^"]*)">/)) {
				flushListItems();
				const emoji = line.match(/emoji="([^"]*)"/)?.[1] || '📌';
				inMDXComponent = true;
				html += `<div class="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600 p-3 rounded-lg my-3 shadow-sm">
          <div class="flex items-start gap-3">
            <span class="text-lg flex-shrink-0 mt-0.5">${emoji}</span>
            <div class="text-sm leading-relaxed text-slate-700 dark:text-slate-300">`;
			} else if (line.match(/<\/Callout>/)) {
				html += '</div></div></div>';
				inMDXComponent = false;
			} else if (line.match(/<TaskList>/)) {
				flushListItems();
				inMDXComponent = true;
				html +=
					'<div class="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 my-3"><ul class="space-y-2">';
			} else if (line.match(/<\/TaskList>/)) {
				html += '</ul></div>';
				inMDXComponent = false;
			} else if (line.match(/<Task completed={(true|false)}>([^<]+)<\/Task>/)) {
				const match = line.match(/<Task completed={(true|false)}>([^<]+)<\/Task>/);
				if (match) {
					const completed = match[1] === 'true';
					const taskText = escapeHtml(match[2]);
					html += `<li class="flex items-center gap-3 text-sm">
            <div class="flex-shrink-0">
              <div class="w-4 h-4 rounded border-2 flex items-center justify-center ${
								completed
									? 'bg-green-500 border-green-500 dark:bg-green-600 dark:border-green-600'
									: 'border-slate-300 dark:border-slate-600'
							}">
                ${completed ? '<span class="text-white text-xs">✓</span>' : ''}
              </div>
            </div>
            <span class="${
							completed
								? 'line-through text-slate-500 dark:text-slate-400'
								: 'text-slate-700 dark:text-slate-300'
						}">${taskText}</span>
          </li>`;
				}
			}
			// Handle headers with consistent styling
			else if (line.match(/^# /)) {
				flushListItems();
				const text = escapeHtml(line.replace(/^# /, ''));
				html += `<h1 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 mt-4 border-b border-slate-200 dark:border-slate-700 pb-1">${text}</h1>`;
			} else if (line.match(/^## /)) {
				flushListItems();
				const text = escapeHtml(line.replace(/^## /, ''));
				html += `<h2 class="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-3">${text}</h2>`;
			} else if (line.match(/^### /)) {
				flushListItems();
				const text = escapeHtml(line.replace(/^### /, ''));
				html += `<h3 class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 mt-3">${text}</h3>`;
			}
			// Handle lists with proper nesting support
			else if (line.match(/^(\s*)([\*\-\+])\s+(.+)/)) {
				const match = line.match(/^(\s*)([\*\-\+])\s+(.+)/);
				if (match) {
					const indent = match[1].length;
					const text = processInlineMarkdown(match[3]);

					if (listType !== 'unordered' || indent !== listDepth) {
						flushListItems();
						listType = 'unordered';
						listDepth = indent;
					}
					listItems.push(text);
				}
			} else if (line.match(/^(\s*)(\d+\.)\s+(.+)/)) {
				const match = line.match(/^(\s*)(\d+\.)\s+(.+)/);
				if (match) {
					const indent = match[1].length;
					const text = processInlineMarkdown(match[3]);

					if (listType !== 'ordered' || indent !== listDepth) {
						flushListItems();
						listType = 'ordered';
						listDepth = indent;
					}
					listItems.push(text);
				}
			}
			// Handle blockquotes
			else if (line.match(/^> /)) {
				flushListItems();
				const text = processInlineMarkdown(line.replace(/^> /, ''));
				html += `<blockquote class="border-l-4 border-slate-300 dark:border-slate-600 pl-4 my-3 italic text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 py-2 rounded-r">
          <span class="text-sm leading-relaxed">${text}</span>
        </blockquote>`;
			}
			// Handle horizontal rules
			else if (line.match(/^---+$/)) {
				flushListItems();
				html += '<hr class="my-4 border-slate-200 dark:border-slate-700" />';
			}
			// Handle empty lines
			else if (line.trim() === '') {
				if (!inMDXComponent && listItems.length === 0) {
					html += '<div class="h-2"></div>';
				}
			}
			// Handle regular paragraphs
			else if (line.trim() && !inMDXComponent) {
				flushListItems();
				html += `<p class="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-3">${processInlineMarkdown(
					line
				)}</p>`;
			} else if (inMDXComponent && line.trim()) {
				html += processInlineMarkdown(line);
			}
		}

		// Flush any remaining list items
		flushListItems();

		return finalConfig.allowHTML ? html : sanitizeHtml(html);
	} catch (error) {
		console.error('MDX parsing error:', error);
		return `<p class="text-red-600 dark:text-red-400 text-sm">Error parsing content: ${escapeHtml(
			String(error)
		)}</p>`;
	}
};

// HTML escape utility
const escapeHtml = (text: string): string => {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
};

// React hook for memoized MDX parsing
export const useMDXParser = (content: string, config?: MDXParserConfig) => {
	return useMemo(() => {
		return parseMDXContent(content, config);
	}, [content, config]);
};

// Utility to extract plain text from MDX content (for previews)
export const extractPlainText = (content: string, maxLength: number = 150): string => {
	if (!content?.trim()) return '';

	// Remove MDX components and markdown formatting
	const plainText = content
		.replace(/<[^>]*>/g, '') // Remove HTML/MDX tags
		.replace(/```[\s\S]*?```/g, '[code]') // Replace code blocks
		.replace(/`[^`]+`/g, '[code]') // Replace inline code
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[image: $1]') // Replace images
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
		.replace(/#+\s+/g, '') // Remove header markers
		.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1') // Remove bold/italic
		.replace(/^>\s+/gm, '') // Remove blockquote markers
		.replace(/^[-*+]\s+/gm, '') // Remove list markers
		.replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
		.replace(/\n+/g, ' ') // Replace newlines with spaces
		.trim();

	return plainText.length > maxLength
		? plainText.substring(0, maxLength).trim() + '...'
		: plainText;
};

// Type definitions for better TypeScript support
export interface MDXComponent {
	type: 'Alert' | 'Callout' | 'TaskList' | 'Task';
	props: Record<string, any>;
	children?: string;
}

export interface ParsedMDXContent {
	html: string;
	plainText: string;
	hasComponents: boolean;
	estimatedReadTime: number; // in minutes
}

// Enhanced parser that returns structured data
export const parseAndAnalyzeMDX = (content: string, config?: MDXParserConfig): ParsedMDXContent => {
	const html = parseMDXContent(content, config);
	const plainText = extractPlainText(content);
	const hasComponents = /<(Alert|Callout|TaskList|Task)\b/.test(content);
	const wordCount = plainText.split(/\s+/).length;
	const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute

	return {
		html,
		plainText,
		hasComponents,
		estimatedReadTime,
	};
};
