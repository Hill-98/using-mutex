export function isAbortSignal(signal: any): signal is AbortSignal {
  return typeof signal === 'object' && (signal instanceof AbortSignal || ('aborted' in signal && 'reason' in signal))
}
