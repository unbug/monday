/**
 * Verdict storage for Code Arena — persists Team A / Tie / Team B votes
 * in IndexedDB. Aggregated into per-model win/tie/loss tables.
 */

const DB_NAME = 'monday-ai'
const DB_VERSION = 8
const VERDICTS_STORE = 'verdicts'

export interface ArenaVerdict {
  id: string
  /** ISO timestamp */
  timestamp: number
  /** Model A id (WebGPU model) */
  modelAId: string
  /** Model A name */
  modelAName: string
  /** Model B id */
  modelBId: string
  /** Model B name */
  modelBName: string
  /** 'A' | 'Tie' | 'B' */
  winner: 'A' | 'Tie' | 'B'
  /** Optional user note */
  note?: string
}

export interface ModelVerdictStats {
  modelId: string
  modelName: string
  winsAsA: number
  winsAsB: number
  winsAsTie: number
  totalComparisons: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result
      if (!db.objectStoreNames.contains(VERDICTS_STORE)) {
        db.createObjectStore(VERDICTS_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Save a single verdict */
export async function saveVerdict(verdict: ArenaVerdict): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(VERDICTS_STORE, 'readwrite')
  const store = tx.objectStore(VERDICTS_STORE)
  store.put(verdict)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Load all verdicts, newest first */
export async function loadVerdicts(): Promise<ArenaVerdict[]> {
  const db = await openDB()
  const tx = db.transaction(VERDICTS_STORE, 'readonly')
  const store = tx.objectStore(VERDICTS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      const verdicts = request.result as ArenaVerdict[]
      verdicts.sort((a, b) => b.timestamp - a.timestamp)
      resolve(verdicts)
    }
    request.onerror = () => reject(request.error)
  })
}

/** Delete all verdicts */
export async function clearVerdicts(): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(VERDICTS_STORE, 'readwrite')
  const store = tx.objectStore(VERDICTS_STORE)
  store.clear()
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Aggregate verdicts into per-model win/tie/loss stats.
 * Model A is always the first model in a comparison.
 */
export function aggregateVerdicts(verdicts: ArenaVerdict[]): ModelVerdictStats[] {
  const map = new Map<string, ModelVerdictStats>()

  for (const v of verdicts) {
    // Ensure both models exist in the map
    if (!map.has(v.modelAId)) {
      map.set(v.modelAId, {
        modelId: v.modelAId,
        modelName: v.modelAName,
        winsAsA: 0,
        winsAsB: 0,
        winsAsTie: 0,
        totalComparisons: 0,
      })
    }
    if (!map.has(v.modelBId)) {
      map.set(v.modelBId, {
        modelId: v.modelBId,
        modelName: v.modelBName,
        winsAsA: 0,
        winsAsB: 0,
        winsAsTie: 0,
        totalComparisons: 0,
      })
    }

    const statsA = map.get(v.modelAId)!
    const statsB = map.get(v.modelBId)!
    statsA.totalComparisons++
    statsB.totalComparisons++

    if (v.winner === 'A') {
      statsA.winsAsA++
      statsB.winsAsB++
    } else if (v.winner === 'B') {
      statsA.winsAsB++
      statsB.winsAsA++
    } else {
      statsA.winsAsTie++
      statsB.winsAsTie++
    }
  }

  // Sort by totalComparisons descending, then winsAsA descending
  return [...map.values()].sort((a, b) => {
    if (b.totalComparisons !== a.totalComparisons) return b.totalComparisons - a.totalComparisons
    return b.winsAsA - a.winsAsA
  })
}
