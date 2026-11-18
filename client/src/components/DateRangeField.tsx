import { CalendarDays, GripHorizontal } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLayoutEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { locale } from "@/i18n"
import { cn } from "@/lib/utils"

// Dates as whole UTC day numbers: simple arithmetic, no DST surprises.
const DAY = 86_400_000
const toNum = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return Date.UTC(y, m - 1, d) / DAY
}
const toIso = (n: number) => new Date(n * DAY).toISOString().slice(0, 10)
const dateOf = (n: number) => new Date(n * DAY)
const weekday = (n: number) => (dateOf(n).getUTCDay() + 6) % 7 // monday = 0
const todayNum = () => {
  const t = new Date()
  return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / DAY
}
const fmt = (n: number, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale.intl, { ...opts, timeZone: "UTC" }).format(dateOf(n))
const monthStart = (n: number) => {
  const d = dateOf(n)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / DAY
}
const addMonths = (n: number, months: number) => {
  const d = dateOf(n)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1) / DAY
}

/** Day numbers of a Monday-to-Sunday week, for the weekday header (2024-01-01 was a Monday). */
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => Date.UTC(2024, 0, 1) / DAY + i)

type Props = {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

export function DateRangeField({ from, to, onChange }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const s = toNum(from)
  const e = toNum(to)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="field-box w-full">
        <CalendarDays className="size-5 shrink-0 text-muted-foreground" />
        <span className="truncate">
          {fmt(s, { day: "numeric", month: "short" })} – {fmt(e, { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t("dates.daysShort", { count: e - s + 1 })}</span>
      </PopoverTrigger>
      <PopoverContent className="w-[23rem] p-0" align="start">
        {open && <RangeCalendar start={s} end={e} onCommit={(a, b) => onChange(toIso(a), toIso(b))} onDone={() => setOpen(false)} />}
      </PopoverContent>
    </Popover>
  )
}

type Drag = { kind: "edge"; anchor: number } | { kind: "move"; offset: number; length: number }

/**
 * Continuous calendar: weeks stacked vertically, months flow into each other.
 * Drag the start or end block to resize, drag the middle to shift the whole range.
 * Clicking outside the range moves the nearest edge there.
 */
function RangeCalendar({
  start,
  end,
  onCommit,
  onDone,
}: {
  start: number
  end: number
  onCommit: (s: number, e: number) => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const today = todayNum()
  const [range, setRange] = useState({ s: start, e: end })
  const rangeRef = useRef(range)
  rangeRef.current = range
  const drag = useRef<Drag | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const scroller = useRef<HTMLDivElement>(null)

  const weeks = useMemo(() => {
    const first = Math.min(monthStart(today), monthStart(start))
    const last = Math.max(addMonths(today, 13), addMonths(end, 3))
    const rows: number[][] = []
    for (let d = first - weekday(first); d < last; d += 7) rows.push(Array.from({ length: 7 }, (_, i) => d + i))
    return rows
  }, [today, start, end])

  // Open with the start week near the top.
  useLayoutEffect(() => {
    const el = scroller.current
    const idx = weeks.findIndex((w) => w[6] >= start)
    const row = el?.children[Math.max(0, idx - 1)] as HTMLElement | undefined
    if (el && row) el.scrollTop = row.offsetTop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dayAt = (x: number, y: number) => {
    const el = scroller.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cx = Math.min(Math.max(x, r.left + 60), r.right - 8)
    const cy = Math.min(Math.max(y, r.top + 4), r.bottom - 4)
    const cell = document.elementFromPoint(cx, cy)?.closest<HTMLElement>("[data-day]")
    return cell ? Number(cell.dataset.day) : null
  }

  const apply = (d: number) => {
    const g = drag.current
    if (!g) return
    if (g.kind === "edge") {
      const day = Math.max(d, today)
      setRange({ s: Math.min(g.anchor, day), e: Math.max(g.anchor, day) })
    } else {
      const s = Math.max(today, d - g.offset)
      setRange({ s, e: s + g.length })
    }
  }

  // While dragging, keep scrolling when the pointer sits near the top/bottom edge.
  const autoScroll = () => {
    const el = scroller.current
    if (!drag.current || !el) return
    const r = el.getBoundingClientRect()
    const { x, y } = pointer.current
    const zone = 36
    const dy = y < r.top + zone ? -Math.ceil((r.top + zone - y) / 3) : y > r.bottom - zone ? Math.ceil((y - (r.bottom - zone)) / 3) : 0
    if (dy) {
      el.scrollTop += dy
      const d = dayAt(x, y)
      if (d !== null) apply(d)
    }
    requestAnimationFrame(autoScroll)
  }

  function onPointerDown(ev: React.PointerEvent) {
    const d = dayAt(ev.clientX, ev.clientY)
    if (d === null || d < today) return
    ev.preventDefault()
    scroller.current?.setPointerCapture(ev.pointerId)
    pointer.current = { x: ev.clientX, y: ev.clientY }
    const { s, e } = rangeRef.current
    if (d === s && s !== e) drag.current = { kind: "edge", anchor: e }
    else if (d === e) drag.current = { kind: "edge", anchor: s }
    else if (d > s && d < e) drag.current = { kind: "move", offset: d - s, length: e - s }
    else {
      drag.current = { kind: "edge", anchor: Math.abs(d - s) <= Math.abs(d - e) ? e : s }
      apply(d)
    }
    requestAnimationFrame(autoScroll)
  }

  function onPointerMove(ev: React.PointerEvent) {
    if (!drag.current) return
    pointer.current = { x: ev.clientX, y: ev.clientY }
    const d = dayAt(ev.clientX, ev.clientY)
    if (d !== null) apply(d)
  }

  function onPointerUp() {
    if (!drag.current) return
    drag.current = null
    onCommit(rangeRef.current.s, rangeRef.current.e)
  }

  const { s, e } = range
  const cursor = (d: number) => (d < today ? "cursor-not-allowed" : d === s || d === e ? "cursor-grab" : d > s && d < e ? "cursor-move" : "cursor-pointer")

  return (
    <div className="select-none">
      <div className="border-b px-4 py-3">
        <div className="font-semibold">
          {fmt(s, { weekday: "short", day: "numeric", month: "short" })} → {fmt(e, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          <span className="ml-2 font-normal text-muted-foreground">{t("dates.days", { count: e - s + 1 })}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t("dates.dragHint")}</p>
      </div>
      <div className="grid grid-cols-[3.75rem_repeat(7,1fr)] px-2 pt-2 text-center text-xs text-muted-foreground">
        <span />
        {WEEKDAYS.map((d) => (
          <span key={d}>{fmt(d, { weekday: "short" })}</span>
        ))}
      </div>
      <div
        ref={scroller}
        className="relative h-80 touch-none overflow-y-auto px-2 pb-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {weeks.map((week) => {
          const first = week.find((d) => dateOf(d).getUTCDate() === 1)
          return (
            <div key={week[0]} className="grid grid-cols-[3.75rem_repeat(7,1fr)] gap-y-0.5 py-px">
              <span className="self-center text-xs font-semibold text-primary">
                {first !== undefined && fmt(first, { month: "short", year: "2-digit" })}
              </span>
              {week.map((d) => {
                const date = dateOf(d).getUTCDate()
                const oddMonth = dateOf(d).getUTCMonth() % 2 === 1
                const inRange = d >= s && d <= e
                const edge = d === s || d === e
                return (
                  <div
                    key={d}
                    data-day={d}
                    className={cn(
                      "relative flex h-9 items-center justify-center text-sm tabular-nums",
                      cursor(d),
                      oddMonth && !inRange && "bg-muted/70",
                      d < today && "text-muted-foreground/40",
                      inRange && !edge && "bg-primary/15 text-primary",
                      d === s && "rounded-l-lg",
                      d === e && "rounded-r-lg",
                      edge && "bg-primary font-semibold text-primary-foreground shadow-sm",
                      d === today && !inRange && "font-bold text-primary",
                    )}
                  >
                    {date === 1 ? <span className="font-bold">{date}</span> : date}
                    {edge && <GripHorizontal className="absolute bottom-0.5 size-3 opacity-70" />}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="flex justify-end border-t px-3 py-2">
        <Button size="sm" onClick={onDone}>
          {t("dates.done")}
        </Button>
      </div>
    </div>
  )
}
