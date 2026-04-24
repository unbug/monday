import { useState, useCallback, useRef } from 'react'

interface Props {
  code: string
  language: string
}

export function CodeRunner({ code, language }: Props) {
  const [output, setOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleMessage = useCallback((e: MessageEvent) => {
    if (e.data?.type === 'console-output') {
      setOutput((prev) => prev + e.data.content + '\n')
    }
  }, [])

  useState(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  })

  const sandboxDoc = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 8px; font-family: monospace; font-size: 12px; background: #1a1a2e; color: #e5e5e5; }
  </style>
</head>
<body>
  <script>
    (function() {
      const _log = console.log;
      const _warn = console.warn;
      const _error = console.error;
      console.log = function(...args) {
        _log.apply(console, args);
        window.parent.postMessage({ type: 'console-output', content: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
      };
      console.warn = function(...args) {
        _warn.apply(console, args);
        window.parent.postMessage({ type: 'console-output', content: '[WARN] ' + args.map(a => String(a)).join(' ') }, '*');
      };
      console.error = function(...args) {
        _error.apply(console, args);
        window.parent.postMessage({ type: 'console-output', content: '[ERROR] ' + args.map(a => String(a)).join(' ') }, '*');
      };
    })();
  </script>
  ${escapeHtml(code)}
</body>
</html>`

  const handleRun = () => {
    setOutput('')
    setIsRunning(true)
    if (iframeRef.current) {
      iframeRef.current.srcdoc = sandboxDoc
    }
  }

  const handleClear = () => {
    setOutput('')
    setIsRunning(false)
    if (iframeRef.current) {
      iframeRef.current.srcdoc = ''
    }
  }

  const isJs = language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts'

  if (!isJs) {
    return null
  }

  return (
    <div className="code-runner">
      <div className="code-runner-header">
        <span className="code-runner-label">JavaScript</span>
        <div className="code-runner-actions">
          <button className="code-runner-btn code-runner-run" onClick={handleRun} disabled={isRunning}>
            {isRunning ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run
              </>
            )}
          </button>
          {output && (
            <button className="code-runner-btn code-runner-clear" onClick={handleClear}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>
      {output && (
        <div className="code-runner-output">
          <div className="code-runner-output-header">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            Output
          </div>
          <pre className="code-runner-output-content">{output}</pre>
        </div>
      )}
      {isRunning && (
        <iframe
          ref={iframeRef}
          className="code-runner-iframe"
          sandbox="allow-same-origin"
          title="Code runner"
          onLoad={() => setIsRunning(false)}
        />
      )}
    </div>
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
