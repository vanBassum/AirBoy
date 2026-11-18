import { ChevronDown, Home, MapPin } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { AirportDot } from "@/components/AirportTag"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HOME, homeAirports, placeLabel } from "@/lib/places"
import type { AppSettings, Place } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  value: Place
  onChange: (p: Place) => void
  settings: AppSettings
  label: string
}

/** Pick the home group, a known airport, or type any IATA code. */
export function PlaceSelect({ value, onChange, settings: s, label }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [other, setOther] = useState("")
  const pick = (p: Place) => {
    onChange(p)
    setOpen(false)
    setOther("")
  }
  const known = s.airports.filter((a) => /^[A-Z]{3}$/.test(a.code))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="field-box w-full" aria-label={label}>
        {value === HOME ? <Home className="size-5 shrink-0 text-muted-foreground" /> : <MapPin className="size-5 shrink-0 text-muted-foreground" />}
        <span className="flex-1 truncate text-left">{placeLabel(value, s)}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1.5" align="start">
        <Option active={value === HOME} onClick={() => pick(HOME)}>
          <Home className="size-4 text-primary" />
          <span className="font-medium">{s.homeName}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {homeAirports(s)
              .map((a) => a.code)
              .join(" · ")}
          </span>
        </Option>
        <div className="my-1 border-t" />
        <div className="max-h-56 overflow-y-auto">
          {known.map((a) => (
            <Option key={a.code} active={value === a.code} onClick={() => pick(a.code)}>
              <AirportDot code={a.code} airports={s.airports} />
              <span className="w-9 font-semibold tabular-nums">{a.code}</span>
              <span className="truncate text-muted-foreground">{a.name}</span>
            </Option>
          ))}
        </div>
        <div className="my-1 border-t" />
        <form
          className="flex gap-1.5 p-1"
          onSubmit={(e) => {
            e.preventDefault()
            if (/^[A-Z]{3}$/.test(other)) pick(other)
          }}
        >
          <Input
            className="uppercase"
            maxLength={3}
            placeholder={t("place.otherPlaceholder")}
            value={other}
            onChange={(e) => setOther(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
          />
          <Button type="submit" size="sm" variant="secondary" disabled={!/^[A-Z]{3}$/.test(other)}>
            {t("place.use")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function Option({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent", active && "bg-accent")}
    >
      {children}
    </button>
  )
}
