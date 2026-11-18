import { ChevronDown, Minus, Plus, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function PassengerPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <Popover>
      <PopoverTrigger className="field-box w-full">
        <User className="size-5 text-muted-foreground" />
        <span className="flex-1 text-left">{value}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="flex items-center justify-between">
          <span className="text-sm">Volwassenen</span>
          <div className="flex items-center gap-2">
            <Button size="icon-sm" variant="outline" disabled={value <= 1} onClick={() => onChange(value - 1)} aria-label="Minder">
              <Minus />
            </Button>
            <span className="w-4 text-center tabular-nums">{value}</span>
            <Button size="icon-sm" variant="outline" disabled={value >= 9} onClick={() => onChange(value + 1)} aria-label="Meer">
              <Plus />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Prijzen zijn totaal voor alle personen.</p>
      </PopoverContent>
    </Popover>
  )
}
