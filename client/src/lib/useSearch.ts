import { useCallback, useRef, useState } from "react"

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
  const source = useRef<EventSource | null>(null)

  const stop = useCallback(() => {
    source.current?.close()
    source.current = null
    setState((s) => ({ ...s, running: false }))
  }, [])

  const start = useCallback((url: string) => {
    source.current?.close()
    setState({ ...idle, running: true })

    const es = new EventSource(url)
    source.current = es
    es.addEventListener("start", (e) => {
      const { total } = JSON.parse((e as MessageEvent).data)
      setState((s) => ({ ...s, total }))
    })
    es.addEventListener("leg", (e) => {
      const leg: LegResult = JSON.parse((e as MessageEvent).data)
      setState((s) => ({
        ...s,
        done: s.done + 1,
        cached: s.cached + (leg.cached ? 1 : 0),
        failed: s.failed + (leg.error ? 1 : 0),
        legs: [...s.legs, leg],
      }))
    })
    es.addEventListener("done", () => {
      es.close()
      source.current = null
      setState((s) => ({ ...s, running: false }))
    })
    es.onerror = () => {
      es.close()
      source.current = null
      setState((s) => ({ ...s, running: false, error: s.done < s.total || s.total === 0 ? "Verbinding met server verbroken." : s.error }))
    }
  }, [])

  return { state, start, stop }
}
