import { Car, Plus, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { AirportDot } from "@/components/AirportTag"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { Airport, AppSettings } from "@/lib/types"

const num = (v: string) => (v === "" || !Number.isFinite(Number(v)) ? 0 : Number(v))

/** Known airports: which form the home group, and parking/travel costs for those. */
export function AirportsPage({ settings: s, onSettings }: { settings: AppSettings; onSettings: (s: AppSettings) => void }) {
  const { t } = useTranslation()
  const setAirports = (airports: Airport[]) => onSettings({ ...s, airports })
  const update = (i: number, patch: Partial<Airport>) => setAirports(s.airports.map((a, j) => (i === j ? { ...a, ...patch } : a)))

  return (
    <section className="panel">
      <header className="mb-4 flex items-start gap-3">
        <Car className="mt-1 size-7 text-primary" />
        <div>
          <h2 className="text-2xl font-semibold">{t("airports.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("airports.subtitle")}</p>
        </div>
      </header>

      <label className="mb-5 flex max-w-sm flex-col gap-1.5">
        <span className="text-sm font-medium">{t("airports.homeName")}</span>
        <Input value={s.homeName} onChange={(e) => onSettings({ ...s, homeName: e.target.value })} />
      </label>

      <div className="overflow-x-auto">
        <div className="grid min-w-[40rem] grid-cols-[1.5rem_5rem_1fr_4rem_7rem_7rem_2rem] items-center gap-x-3 gap-y-2 text-sm">
          <span />
          <span className="text-xs text-muted-foreground">{t("airports.code")}</span>
          <span className="text-xs text-muted-foreground">{t("airports.name")}</span>
          <span className="text-xs text-muted-foreground">{t("airports.home")}</span>
          <span className="text-xs text-muted-foreground">{t("airports.parking")}</span>
          <span className="text-xs text-muted-foreground">{t("airports.travel")}</span>
          <span />
          {s.airports.map((a, i) => (
            <div key={i} className="contents">
              <AirportDot code={a.code} airports={s.airports} />
              <Input className="uppercase" maxLength={3} value={a.code} onChange={(e) => update(i, { code: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} />
              <Input value={a.name} onChange={(e) => update(i, { name: e.target.value })} />
              <Checkbox checked={a.home} onCheckedChange={(v) => update(i, { home: v === true })} aria-label={t("airports.home")} />
              <Input type="number" min={0} disabled={!a.home} value={a.parkingPerDay} onChange={(e) => update(i, { parkingPerDay: num(e.target.value) })} />
              <Input type="number" min={0} disabled={!a.home} value={a.travelCost} onChange={(e) => update(i, { travelCost: num(e.target.value) })} />
              <Button size="icon-sm" variant="ghost" aria-label={t("airports.remove")} onClick={() => setAirports(s.airports.filter((_, j) => j !== i))}>
                <X />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" variant="outline" onClick={() => setAirports([...s.airports, { code: "", name: "", home: false, parkingPerDay: 0, travelCost: 0 }])}>
          <Plus /> {t("airports.add")}
        </Button>
        <span className="text-xs text-muted-foreground">{t("airports.costsHint")}</span>
      </div>
    </section>
  )
}
