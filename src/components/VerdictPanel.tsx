import { useState, useCallback, useEffect } from 'react'
import { t } from '../lib/i18n'
import { loadVerdicts, clearVerdicts, saveVerdict, aggregateVerdicts } from '../lib/verdicts'
import type { ArenaVerdict, ModelVerdictStats } from '../lib/verdicts'

interface VerdictPanelProps {
  modelAId: string
  modelAName: string
  modelBId: string
  modelBName: string
}

export function VerdictPanel({ modelAId, modelAName, modelBId, modelBName }: VerdictPanelProps) {
  const [voting, setVoting] = useState(false)
  const [winner, setWinner] = useState<'A' | 'Tie' | 'B' | null>(null)
  const [note, setNote] = useState('')
  const [stats, setStats] = useState<ModelVerdictStats[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load aggregated stats on mount
  useEffect(() => {
    loadVerdicts().then((verdicts) => {
      setStats(aggregateVerdicts(verdicts))
      setLoaded(true)
    })
  }, [])

  const handleVote = useCallback(
    (result: 'A' | 'Tie' | 'B') => {
      setWinner(result)
      setVoting(true)

      const verdict: ArenaVerdict = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        modelAId,
        modelAName,
        modelBId,
        modelBName,
        winner: result,
        note: note.trim() || undefined,
      }

      saveVerdict(verdict).then(() => {
        loadVerdicts().then((v) => setStats(aggregateVerdicts(v)))
      })
    },
    [modelAId, modelAName, modelBId, modelBName, note],
  )

  const handleClear = useCallback(() => {
    clearVerdicts().then(() => setStats([]))
  }, [])

  if (!loaded) return null

  return (
    <div className="arena-verdict">
      <div className="arena-verdict-header">
        <h3 className="arena-verdict-title">{t('arena.verdictTitle')}</h3>
        <p className="arena-verdict-subtitle">{t('arena.verdictSubtitle')}</p>
      </div>

      {/* Voting buttons */}
      <div className="arena-verdict-vote-row">
        <button
          className={`arena-verdict-btn team-a ${winner === 'A' ? 'voted' : ''}`}
          onClick={() => handleVote('A')}
          disabled={voting}
        >
          <span className="arena-verdict-team">⚔️</span>
          <span className="arena-verdict-team-name">{modelAName}</span>
        </button>

        <button
          className={`arena-verdict-btn tie ${winner === 'Tie' ? 'voted' : ''}`}
          onClick={() => handleVote('Tie')}
          disabled={voting}
        >
          <span className="arena-verdict-team">🤝</span>
          <span className="arena-verdict-team-name">{t('arena.tie')}</span>
        </button>

        <button
          className={`arena-verdict-btn team-b ${winner === 'B' ? 'voted' : ''}`}
          onClick={() => handleVote('B')}
          disabled={voting}
        >
          <span className="arena-verdict-team">⚔️</span>
          <span className="arena-verdict-team-name">{modelBName}</span>
        </button>
      </div>

      {/* Optional note */}
      <textarea
        className="arena-verdict-note"
        placeholder={t('arena.verdictNotePlaceholder')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        disabled={voting}
      />

      {/* Leaderboard */}
      {stats.length > 0 && (
        <div className="arena-leaderboard">
          <div className="arena-leaderboard-header">
            <h4 className="arena-leaderboard-title">{t('arena.leaderboardTitle')}</h4>
            <button className="arena-leaderboard-clear" onClick={handleClear}>
              {t('arena.clearAll')}
            </button>
          </div>
          <table className="arena-leaderboard-table">
            <thead>
              <tr>
                <th className="arena-lb-model">{t('arena.model')}</th>
                <th className="arena-lb-wins">{t('arena.wins')}</th>
                <th className="arena-lb-losses">{t('arena.losses')}</th>
                <th className="arena-lb-ties">{t('arena.ties')}</th>
                <th className="arena-lb-total">{t('arena.total')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.modelId} className={s.modelId === modelAId ? 'lb-team-a' : s.modelId === modelBId ? 'lb-team-b' : ''}>
                  <td className="arena-lb-model-cell">{s.modelName}</td>
                  <td className="arena-lb-wins-cell">{s.winsAsA}</td>
                  <td className="arena-lb-losses-cell">{s.winsAsB}</td>
                  <td className="arena-lb-ties-cell">{s.winsAsTie}</td>
                  <td className="arena-lb-total-cell">{s.totalComparisons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
