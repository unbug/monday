import { useState } from 'react'
import type { CitationEntry } from '../types'

interface Props {
  citations: CitationEntry[]
  onCitationClick: (citation: CitationEntry) => void
}

export function CitationDisplay({ citations, onCitationClick }: Props) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? citations : citations.slice(0, 3)

  return (
    <div className="citation-display">
      <div className="citation-display-header">
        <span className="citation-display-icon">📎</span>
        <span className="citation-display-title">
          {citations.length} source{citations.length !== 1 ? 's' : ''} used
        </span>
        <button
          className="citation-display-toggle"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? 'Show less' : 'Show all sources'}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {visible.map((c) => (
        <button
          key={`${c.docId}-${c.chunkIndex}`}
          className="citation-pill"
          onClick={() => onCitationClick(c)}
          title={`Open ${c.docName}, chunk ${c.chunkIndex + 1}`}
        >
          <span className="citation-pill-doc">{c.docName}</span>
          <span className="citation-pill-chunk">#{c.chunkIndex + 1}</span>
          <span className="citation-pill-score">{c.score.toFixed(2)}</span>
        </button>
      ))}

      {expanded && citations.length > 0 && (
        <button
          className="citation-expand-more"
          onClick={() => setExpanded(false)}
        >
          ▲ Collapse
        </button>
      )}
    </div>
  )
}
