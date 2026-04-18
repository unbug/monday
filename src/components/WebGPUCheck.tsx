import { BorderBeam } from 'border-beam'

interface Props {
  supported: boolean | null
}

export function WebGPUCheck({ supported }: Props) {
  if (supported === null) return null
  if (supported) return null

  return (
    <div style={{ margin: '16px' }}>
      <BorderBeam size="sm" theme="auto" colorVariant="sunset" strength={0.6} duration={2.4}>
        <div className="webgpu-warning">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <strong>WebGPU not supported</strong>
            <p>
              Your browser does not support WebGPU, which is required to run AI models locally.
              Please use the latest version of Chrome or Edge.
            </p>
          </div>
        </div>
      </BorderBeam>
    </div>
  )
}
