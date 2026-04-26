import { memo, useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'
import 'highlight.js/styles/github-dark.min.css'
import 'katex/dist/katex.min.css'
import { CodeRunner } from './CodeRunner'
import { ArtifactsPreview } from './ArtifactsPreview'
import { isJsLanguage, isPreviewable } from '../lib/codeBlocks'

interface Props {
  content: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components: Components = {
  pre: ({ children, className }: any) => {
    const codeEl = (children as any)?.props?.children
    const codeString =
      typeof codeEl === 'string'
        ? codeEl
        : String((codeEl as any)?.props?.children ?? '')

    const lang = className
      ?.replace('hljs language-', '')
      .replace('language-', '')
      .trim() || 'code'

    // JavaScript/TypeScript → CodeRunner
    if (isJsLanguage(lang)) {
      return <CodeRunner code={codeString} language={lang} />
    }

    // HTML/SVG → ArtifactsPreview
    if (isPreviewable(lang)) {
      return <InlineArtifact code={codeString} lang={lang} />
    }

    // Default: code block
    return (
      <div className="code-block">
        <div className="code-block-header">
          <span className="code-block-lang">{lang}</span>
          <button
            className="code-copy-btn"
            onClick={() => navigator.clipboard.writeText(codeString)}
            title="Copy code"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span className="code-copy-text">Copy</span>
          </button>
        </div>
        <pre className={className}>{children}</pre>
      </div>
    )
  },
  code: ({ className, children }: any) => {
    const isInline =
      !className &&
      typeof children === 'string' &&
      !children.includes('\n')

    if (isInline) {
      return (
        <code className="inline-code">{children}</code>
      )
    }

    return <code className={className}>{children}</code>
  },
  blockquote: ({ children }: any) => (
    <blockquote className="markdown-blockquote">{children}</blockquote>
  ),
  table: ({ children }: any) => (
    <div className="markdown-table-wrapper">{children}</div>
  ),
  thead: ({ children }: any) => <thead className="markdown-table-head">{children}</thead>,
  th: ({ children, ...rest }: any) => (
    <th className="markdown-table-cell" {...rest}>{children}</th>
  ),
  td: ({ children, ...rest }: any) => (
    <td className="markdown-table-cell" {...rest}>{children}</td>
  ),
  ul: ({ children }: any) => <ul className="markdown-list">{children}</ul>,
  ol: ({ children }: any) => <ol className="markdown-list">{children}</ol>,
  li: ({ children, ...rest }: any) => <li className="markdown-list-item" {...rest}>{children}</li>,
  a: ({ children, href, ...rest }: any) => (
    <a
      className="markdown-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
    >
      {children}
    </a>
  ),
  h1: ({ children }: any) => <h1 className="markdown-heading markdown-h1">{children}</h1>,
  h2: ({ children }: any) => <h2 className="markdown-heading markdown-h2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="markdown-heading markdown-h3">{children}</h3>,
  h4: ({ children }: any) => <h4 className="markdown-heading markdown-h4">{children}</h4>,
  h5: ({ children }: any) => <h5 className="markdown-heading markdown-h5">{children}</h5>,
  h6: ({ children }: any) => <h6 className="markdown-heading markdown-h6">{children}</h6>,
  hr: () => <hr className="markdown-hr" />,
  p: ({ children }: any) => <p className="markdown-paragraph">{children}</p>,
  strong: ({ children }: any) => <strong className="markdown-strong">{children}</strong>,
  em: ({ children }: any) => <em className="markdown-em">{children}</em>,
}

// ── Think block parser ──

interface ContentSegment {
  type: 'text' | 'think'
  content: string
  /** false when <think> is open but </think> not yet received (streaming) */
  complete: boolean
}

function parseThinkBlocks(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  let rest = raw

  while (rest.length > 0) {
    const start = rest.indexOf('<think>')
    if (start === -1) {
      if (rest) segments.push({ type: 'text', content: rest, complete: true })
      break
    }
    if (start > 0) {
      segments.push({ type: 'text', content: rest.slice(0, start), complete: true })
    }
    const afterOpen = rest.slice(start + 7)
    const end = afterOpen.indexOf('</think>')
    if (end === -1) {
      segments.push({ type: 'think', content: afterOpen, complete: false })
      break
    } else {
      segments.push({ type: 'think', content: afterOpen.slice(0, end), complete: true })
      rest = afterOpen.slice(end + 8)
    }
  }

  return segments
}

// ── ThinkBlock component ──

function ThinkBlock({ content, complete }: { content: string; complete: boolean }) {
  const [open, setOpen] = useState(!complete)

  const wordCount = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content],
  )

  return (
    <div className={`think-block ${complete ? 'think-block--done' : 'think-block--streaming'}`}>
      <button
        className="think-block-header"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-expanded={open}
      >
        <span className="think-block-icon" aria-hidden>💭</span>
        <span className="think-block-title">
          {complete ? `Thought process` : 'Thinking…'}
        </span>
        {complete && (
          <span className="think-block-meta">{wordCount} words</span>
        )}
        <svg
          className={`think-block-chevron ${open ? 'think-block-chevron--open' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="think-block-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeHighlight]}
            components={components}
            skipHtml={false}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: Props) {
  const segments = useMemo(() => parseThinkBlocks(content), [content])

  // Fast path: no think blocks
  if (segments.length === 1 && segments[0].type === 'text') {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
        skipHtml={false}
      >
        {content}
      </ReactMarkdown>
    )
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'think' ? (
          <ThinkBlock key={i} content={seg.content} complete={seg.complete} />
        ) : seg.content ? (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeHighlight]}
            components={components}
            skipHtml={false}
          >
            {seg.content}
          </ReactMarkdown>
        ) : null,
      )}
    </>
  )
})

/** Inline artifact wrapper — expandable preview for HTML/SVG code blocks */
function InlineArtifact({ code, lang }: { code: string; lang: string }) {
  const [expanded, setExpanded] = useState(false)

  if (!expanded) {
    return (
      <div className="code-block code-block--artifact">
        <div className="code-block-header">
          <span className="code-block-lang">{lang}</span>
          <button
            className="code-copy-btn"
            onClick={() => navigator.clipboard.writeText(code)}
            title="Copy code"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span className="code-copy-text">Copy</span>
          </button>
          <button
            className="code-preview-btn"
            onClick={() => setExpanded(true)}
            title="Preview"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="code-preview-text">Preview</span>
          </button>
        </div>
        <pre className="code-block--artifact-preview">{code}</pre>
      </div>
    )
  }

  return (
    <ArtifactsPreview
      content={code}
      type={lang === 'svg' ? 'svg' : 'html'}
      onClose={() => setExpanded(false)}
      title={`${lang.toUpperCase()} Preview`}
    />
  )
}
