import i18n from "@/i18n"

import type { LegResult } from "./types"

export type StreamHandlers = {
  onStart?: (total: number) => void
  onLeg: (leg: LegResult) => void
}

/** Opens the search event stream; `done` resolves when the server says it is finished. */
export function streamLegs(url: string, h: StreamHandlers) {
  const es = new EventSource(url)
  let settled = false
  const done = new Promise<void>((resolve, reject) => {
    es.addEventListener("start", (e) => h.onStart?.(JSON.parse((e as MessageEvent).data).total))
    es.addEventListener("leg", (e) => h.onLeg(JSON.parse((e as MessageEvent).data)))
    es.addEventListener("done", () => {
      settled = true
      es.close()
      resolve()
    })
    // EventSource would reconnect (and restart the search) on its own; never let it.
    es.onerror = () => {
      es.close()
      if (!settled) {
        settled = true
        reject(new Error(i18n.t("search.disconnected")))
      }
    }
  })
  return {
    done,
    cancel: () => {
      settled = true
      es.close()
    },
  }
}
