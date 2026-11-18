import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function SortSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Record<T, string>
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden sm:inline">Sorteer op</span>
      <Select items={options} value={value} onValueChange={(v) => v && onChange(v as T)}>
        <SelectTrigger className="h-10 min-w-44 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(options) as T[]).map((k) => (
            <SelectItem key={k} value={k}>
              {options[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
