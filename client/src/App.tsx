import { ArrowLeftRight, Plane } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useMemo, useState } from "react"

import { FiltersPanel } from "@/components/FiltersPanel"
import { OneWayList } from "@/components/OneWayList"
import { ReturnList } from "@/components/ReturnList"
import { SearchBar } from "@/components/SearchBar"
import { useSettings } from "@/lib/settings"
import { useLocalState } from "@/lib/useLocalState"
import { airlinesIn, maxPriceIn, searchUrl } from "@/lib/trips"
import type { Direction } from "@/lib/types"
import { useSearch } from "@/lib/useSearch"
import { cn } from "@/lib/utils"

type Mode = "oneway" | "return"

export default function App() {
  const { t } = useTranslation()
  const [settings, setSettings] = useSettings()
  const { state, start, stop } = useSearch()
  const [mode, setMode] = useState<Mode>("oneway")
  const [direction, setDirection] = useState<Direction>("out")
  const [compact, setCompact] = useLocalState("airboy.compact", false)
  const airlines = useMemo(() => airlinesIn(state.legs), [state.legs])
  const priceCeiling = useMemo(() => maxPriceIn(state.legs), [state.legs])

  return (
    <div className="relative min-h-svh overflow-hidden bg-[linear-gradient(180deg,#e6defa_0%,#efe9fb_30%,#f6f3fb_60%,#f7f5fa_100%)]">
      <Backdrop />
      <main className="relative mx-auto max-w-[96rem] space-y-6 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Plane className="size-12 -rotate-12 fill-primary text-primary" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[oklch(0.2_0.06_280)]">AirBoy</h1>
              <p className="text-lg text-[oklch(0.3_0.08_280)]">{t("app.tagline")}</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-xl bg-white/70 p-1 shadow-sm backdrop-blur">
            <ModeButton active={mode === "oneway"} onClick={() => setMode("oneway")} icon={<Plane className="size-4" />}>
              {t("mode.oneWay")}
            </ModeButton>
            <ModeButton active={mode === "return"} onClick={() => setMode("return")} icon={<ArrowLeftRight className="size-4" />}>
              {t("mode.return")}
            </ModeButton>
          </div>
        </header>

        <SearchBar
          settings={settings}
          onChange={setSettings}
          direction={direction}
          onDirection={setDirection}
          search={state}
          onSearch={(fresh) => start(searchUrl(settings, fresh))}
          onStop={stop}
        />

        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <FiltersPanel
            filters={settings.filters}
            onChange={(filters) => setSettings({ ...settings, filters })}
            airports={settings.airports}
            airlines={airlines}
            priceCeiling={priceCeiling}
            showNights={mode === "return"}
          />
          {mode === "oneway" ? (
            <OneWayList legs={state.legs} settings={settings} direction={direction} compact={compact} onCompact={setCompact} />
          ) : (
            <ReturnList legs={state.legs} settings={settings} compact={compact} onCompact={setCompact} />
          )}
        </div>
      </main>
    </div>
  )
}

function ModeButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-lg px-4 font-medium transition-colors",
        active ? "bg-primary text-primary-foreground shadow" : "text-foreground hover:bg-white",
      )}
    >
      {icon}
      {children}
    </button>
  )
}

/** Soft dawn glow with layered mountain silhouettes behind the header. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[10.5rem]">
      <div className="absolute -top-24 right-0 h-80 w-[60%] rounded-full bg-[radial-gradient(closest-side,#f6d3e4,transparent)] opacity-80" />
      <svg className="absolute right-0 bottom-0 h-36 w-full max-w-4xl" viewBox="0 0 1000 220" preserveAspectRatio="none">
        <defs>
          <linearGradient id="m1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9abe6" />
            <stop offset="1" stopColor="#e9e2f8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="m2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8f7fd0" />
            <stop offset="1" stopColor="#d9d0f3" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 220 L120 150 L210 170 L330 95 L420 140 L520 60 L600 105 L700 40 L790 110 L880 80 L1000 130 L1000 220 Z" fill="url(#m1)" />
        <path d="M680 58 L700 40 L722 60 L708 56 L700 64 L692 55 Z" fill="#ffffff" opacity="0.8" />
        <path d="M200 220 L330 160 L430 185 L560 120 L660 165 L760 125 L880 170 L1000 150 L1000 220 Z" fill="url(#m2)" opacity="0.7" />
      </svg>
    </div>
  )
}
