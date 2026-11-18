import { Settings, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { locale } from "@/i18n"

type Props = {
  compact: boolean
  onCompact: (c: boolean) => void
  fresh: boolean
  onFresh: (f: boolean) => void
}

export function SettingsPage({ compact, onCompact, fresh, onFresh }: Props) {
  const { t } = useTranslation()
  const [msg, setMsg] = useState<string | null>(null)
  const [version, setVersion] = useState<{ sha: string; built: string | null } | null>(null)

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then(setVersion)
      .catch(() => setVersion(null))
  }, [])
  const isSha = version && /^[0-9a-f]{7,}$/.test(version.sha)

  async function clearCache() {
    const r = await fetch("/api/cache", { method: "DELETE" })
      .then((r) => r.json())
      .catch(() => null)
    setMsg(r ? t("settings.cacheCleared", { count: r.removed }) : t("settings.cacheClearFailed"))
  }

  return (
    <section className="max-w-2xl rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-primary/5 backdrop-blur">
      <header className="mb-5 flex items-start gap-3">
        <Settings className="mt-1 size-7 text-primary" />
        <div>
          <h2 className="text-2xl font-semibold">{t("settings.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
        </div>
      </header>

      <div className="space-y-5">
        <Row title={t("settings.display")}>
          <Label className="font-normal">
            <Checkbox checked={compact} onCheckedChange={(v) => onCompact(v === true)} /> {t("view.compact")}
          </Label>
        </Row>
        <Row title={t("settings.cache")} hint={t("settings.cacheHint")}>
          <Label className="font-normal">
            <Checkbox checked={fresh} onCheckedChange={(v) => onFresh(v === true)} /> {t("settings.ignoreCache")}
          </Label>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={clearCache}>
              <Trash2 /> {t("settings.clearCache")}
            </Button>
            {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
          </div>
        </Row>
        <Row title={t("settings.version")}>
          <p className="text-sm">
            {!version ? (
              "…"
            ) : isSha ? (
              <a className="font-mono text-primary hover:underline" href={`https://github.com/vanBassum/AirBoy/commit/${version.sha}`} target="_blank" rel="noreferrer">
                {version.sha.slice(0, 7)}
              </a>
            ) : (
              <span className="font-mono">{version.sha}</span>
            )}
            {version?.built && (
              <span className="text-muted-foreground">
                {" · "}
                {t("settings.built", {
                  date: new Date(version.built).toLocaleString(locale.intl, { dateStyle: "medium", timeStyle: "short" }),
                })}
              </span>
            )}
          </p>
        </Row>
      </div>
    </section>
  )
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t pt-4">
      <h3 className="font-semibold">{title}</h3>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="space-y-3">{children}</div>
    </div>
  )
}
