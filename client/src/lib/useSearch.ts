import { useCallback, useRef, useState } from "react"

import { streamLegs } from "./stream"
import type { LegResult } from "./types"

export type SearchState = {
  running: boolean
  total: number
  done: number
  cached: number
  failed: number
  legs: LegResult[]
  error: string | null
}

const idle: SearchState = { running: false, total: 0, done: 0, cached: 0, failed: 0, legs: [], error: null }

/** Streams leg results from the backend over Server-Sent Events. */
export function useSearch() {
  const [state, setState] = useState<SearchState>(idle)
  const current = useRef<ReturnType<typeof streamLegs> | null>(null)

  const stop = useCallback(() => {
    current.current?.cancel()
    current.current = null
    setState((s) => ({ ...s, running: false }))
  }, [])

  const start = useCallback((url: string) => {
    current.current?.cancel()
    setState({ ...idle, running: true })
    const run = streamLegs(url, {
      onStart: (total) => setState((s) => ({ ...s, total })),
      onLeg: (leg) =>
        setState((s) => ({
          ...s,
          done: s.done + 1,
          cached: s.cached + (leg.cached ? 1 : 0),
          failed: s.failed + (leg.error ? 1 : 0),
          legs: [...s.legs, leg],
        })),
    })
    current.current = run
    run.done
      .then(() => setState((s) => ({ ...s, running: false })))
      .catch((e: Error) => setState((s) => ({ ...s, running: false, error: e.message })))
  }, [])

  return { state, start, stop }
}
