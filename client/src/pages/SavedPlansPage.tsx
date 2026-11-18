import { Bookmark, FolderOpen, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Empty } from "@/components/FindFlights"
import { Button } from "@/components/ui/button"
import { fmtDateLong, fmtEuro } from "@/lib/format"
import { placeName } from "@/lib/places"
import { deletePlan, listPlans, planTotals } from "@/lib/plans"
import type { AppSettings, Plan } from "@/lib/types"

export function SavedPlansPage({ settings: s, currentId, onOpen }: { settings: AppSettings; currentId: string; onOpen: (p: Plan) => void }) {
  const { t } = useTranslation()
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listPlans()
      .then((list) => setPlans(list.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))))
      .catch((e: Error) => setError(e.message))
  }, [])

  async function remove(p: Plan) {
    if (!window.confirm(t("saved.confirmDelete", { name: p.name }))) return
    await deletePlan(p.id)
    setPlans((list) => list?.filter((x) => x.id !== p.id) ?? null)
  }

  return (
    <section className="panel">
      <header className="mb-4 flex items-start gap-3">
        <Bookmark className="mt-1 size-7 text-primary" />
        <div>
          <h2 className="text-2xl font-semibold">{t("saved.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("saved.subtitle")}</p>
        </div>
      </header>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {plans?.length === 0 && <Empty>{t("saved.empty")}</Empty>}
      <div className="space-y-2">
        {plans?.map((p) => {
          const totals = planTotals(p, s)
          const route = p.legs.map((l, i) => (i === 0 ? `${placeName(l.from, s)} → ${placeName(l.to, s)}` : `→ ${placeName(l.to, s)}`)).join(" ")
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {p.name}
                  {p.id === currentId && <span className="ml-2 text-xs font-normal text-primary">{t("saved.current")}</span>}
                </div>
                <div className="truncate text-sm text-muted-foreground">{route || t("plan.empty")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("plan.legsCount", { count: totals.legs })}
                  {p.updatedAt && ` · ${t("saved.updated", { date: fmtDateLong(p.updatedAt.slice(0, 10)) })}`}
                </div>
              </div>
              <div className="text-xl font-bold text-success tabular-nums">{fmtEuro(totals.total)}</div>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={() => onOpen(p)}>
                  <FolderOpen /> {t("plan.open")}
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => remove(p)} aria-label={t("plan.delete")} title={t("plan.delete")}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
