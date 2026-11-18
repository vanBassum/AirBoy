import { AirlineBadge } from "@/components/AirlineBadge"
import { AirportTag } from "@/components/AirportTag"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { defaultFilters } from "@/lib/settings"
import { fmtEuro, fmtHour } from "@/lib/trips"
import type { Airport, Filters } from "@/lib/types"

type Props = {
  filters: Filters
  onChange: (f: Filters) => void
  /** All configured airports (colours are derived from this list). */
  airports: Airport[]
  airlines: string[]
  priceCeiling: number
  showNights: boolean
}

const arr = (v: number | readonly number[]) => (Array.isArray(v) ? v : [v]) as number[]

export function FiltersPanel({ filters: f, onChange, airports, airlines, priceCeiling, showNights }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch })
  const ceiling = Math.max(priceCeiling, 50)
  const price = f.maxPrice === null ? ceiling : Math.min(f.maxPrice, ceiling)

  return (
    <aside className="h-fit rounded-2xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-primary/5 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Filters</h2>
        <button className="text-sm text-primary hover:underline" onClick={() => onChange({ ...defaultFilters, minNights: f.minNights, maxNights: f.maxNights })}>
          Alles wissen
        </button>
      </div>

      <Section title="Vliegvelden">
        <div className="space-y-2.5">
          {airports
            .filter((a) => a.enabled)
            .map((a) => (
              <Label key={a.code} className="font-normal">
                <Checkbox
                  checked={!f.excludedAirports.includes(a.code)}
                  onCheckedChange={(v) =>
                    set({ excludedAirports: v ? f.excludedAirports.filter((x) => x !== a.code) : [...f.excludedAirports, a.code] })
                  }
                />
                <AirportTag code={a.code} airports={airports} />
                <span className="truncate">{a.name}</span>
              </Label>
            ))}
        </div>
      </Section>

      <Section title="Maatschappijen">
        {airlines.length === 0 && <p className="text-sm text-muted-foreground">Nog geen resultaten.</p>}
        <div className="-mr-2 max-h-44 space-y-3 overflow-y-auto pr-2">
          {airlines.map((a) => (
            <Label key={a} className="font-normal">
              <Checkbox
                checked={!f.excludedAirlines.includes(a)}
                onCheckedChange={(v) =>
                  set({ excludedAirlines: v ? f.excludedAirlines.filter((x) => x !== a) : [...f.excludedAirlines, a] })
                }
              />
              <AirlineBadge name={a} className="size-6 text-[9px]" />
              {a}
            </Label>
          ))}
        </div>
      </Section>

      <Section title="Vertrektijd" value={`${fmtHour(f.depFrom)} – ${fmtHour(f.depTo)}`}>
        <Slider min={0} max={24} step={1} value={[f.depFrom, f.depTo]} onValueChange={(v) => { const [a, b] = arr(v); set({ depFrom: a, depTo: b }) }} />
      </Section>

      <Section title="Max prijs per vlucht" value={f.maxPrice === null ? "Geen limiet" : fmtEuro(price)}>
        <Slider
          min={10}
          max={ceiling}
          step={5}
          value={[price]}
          onValueChange={(v) => {
            const p = arr(v)[0]
            set({ maxPrice: p >= ceiling ? null : p })
          }}
        />
      </Section>

      {showNights && (
        <Section title="Verblijf" value={`${f.minNights} – ${f.maxNights} nachten`}>
          <Slider min={1} max={21} step={1} value={[f.minNights, f.maxNights]} onValueChange={(v) => { const [a, b] = arr(v); set({ minNights: a, maxNights: b }) }} />
        </Section>
      )}

      <Section title="Overstappen">
        <RadioGroup value={f.directOnly ? "direct" : "all"} onValueChange={(v) => set({ directOnly: v === "direct" })}>
          <Label className="font-normal">
            <RadioGroupItem value="direct" /> Alleen directe vluchten
          </Label>
          <Label className="font-normal">
            <RadioGroupItem value="all" /> Ook met 1 overstap
          </Label>
        </RadioGroup>
      </Section>
    </aside>
  )
}

function Section({ title, value, children }: { title: string; value?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t pt-5 first-of-type:mt-5">
      <h3 className="font-semibold">{title}</h3>
      {value && <div className="text-right text-sm text-muted-foreground">{value}</div>}
      {children}
    </section>
  )
}
