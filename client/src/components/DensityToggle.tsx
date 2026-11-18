import { Rows2, Rows4 } from "lucide-react"

import { Button } from "@/components/ui/button"

export function DensityToggle({ compact, onChange }: { compact: boolean; onChange: (c: boolean) => void }) {
  return (
    <div className="flex rounded-lg border bg-white p-0.5" role="group" aria-label="Weergave">
      <Button size="icon-sm" variant={compact ? "ghost" : "secondary"} onClick={() => onChange(false)} title="Ruime weergave" aria-label="Ruime weergave">
        <Rows2 />
      </Button>
      <Button size="icon-sm" variant={compact ? "secondary" : "ghost"} onClick={() => onChange(true)} title="Compacte weergave" aria-label="Compacte weergave">
        <Rows4 />
      </Button>
    </div>
  )
}
