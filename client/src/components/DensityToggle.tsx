import { Rows2, Rows4 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

export function DensityToggle({ compact, onChange }: { compact: boolean; onChange: (c: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex rounded-lg border bg-card p-0.5" role="group" aria-label={t("view.label")}>
      <Button size="icon-sm" variant={compact ? "ghost" : "secondary"} onClick={() => onChange(false)} title={t("view.roomy")} aria-label={t("view.roomy")}>
        <Rows2 />
      </Button>
      <Button size="icon-sm" variant={compact ? "secondary" : "ghost"} onClick={() => onChange(true)} title={t("view.compact")} aria-label={t("view.compact")}>
        <Rows4 />
      </Button>
    </div>
  )
}
