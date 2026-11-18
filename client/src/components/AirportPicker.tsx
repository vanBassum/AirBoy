import { ChevronDown, MapPin, Plus, X } from "lucide-react"

import { AirportDot } from "@/components/AirportTag"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Airport } from "@/lib/types"

type Props = {
  airports: Airport[]
  onChange: (airports: Airport[]) => void
}

/** Multi-select of home airports, with parking and travel cost per airport. */
export function AirportPicker({ airports, onChange }: Props) {
  const enabled = airports.filter((a) => a.enabled)
  const label = enabled.length ? enabled.map((a) => (a.name ? `${a.name} (${a.code})` : a.code)).join(", ") : "Kies luchthavens"
  const update = (i: number, patch: Partial<Airport>) => onChange(airports.map((a, j) => (i === j ? { ...a, ...patch } : a)))
  const num = (v: string) => (v === "" || !Number.isFinite(Number(v)) ? 0 : Number(v))

  return (
    <Popover>
      <PopoverTrigger className="field-box w-full">
        <MapPin className="size-5 text-muted-foreground" />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[34rem] max-w-[calc(100vw-2rem)] p-4" align="start">
        <div className="grid grid-cols-[auto_4.5rem_1fr_5.5rem_5.5rem_auto] items-center gap-x-2 gap-y-2 text-sm">
          <span />
          <span className="text-xs text-muted-foreground">Code</span>
          <span className="text-xs text-muted-foreground">Naam</span>
          <span className="text-xs text-muted-foreground">Parkeren/dag</span>
          <span className="text-xs text-muted-foreground">Reis retour</span>
          <span />
          {airports.map((a, i) => (
            <div key={i} className="contents">
              <span className="flex items-center gap-2">
                <Checkbox checked={a.enabled} onCheckedChange={(v) => update(i, { enabled: v === true })} />
                <AirportDot code={a.code} airports={airports} />
              </span>
              <Input className="uppercase" maxLength={3} value={a.code} onChange={(e) => update(i, { code: e.target.value.toUpperCase() })} />
              <Input value={a.name} onChange={(e) => update(i, { name: e.target.value })} />
              <Input type="number" min={0} value={a.parkingPerDay} onChange={(e) => update(i, { parkingPerDay: num(e.target.value) })} />
              <Input type="number" min={0} value={a.travelCost} onChange={(e) => update(i, { travelCost: num(e.target.value) })} />
              <Button size="icon-sm" variant="ghost" aria-label="Verwijder" onClick={() => onChange(airports.filter((_, j) => j !== i))}>
                <X />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange([...airports, { code: "", name: "", enabled: true, parkingPerDay: 0, travelCost: 0 }])}
          >
            <Plus /> Luchthaven
          </Button>
          <span className="text-xs text-muted-foreground">Kosten in €, tellen mee bij retourcombinaties.</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
