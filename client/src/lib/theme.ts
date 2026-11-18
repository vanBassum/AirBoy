import { useEffect } from "react"

import { useLocalState } from "./useLocalState"

export type Theme = "system" | "light" | "dark"

const dark = window.matchMedia("(prefers-color-scheme: dark)")

function apply(theme: Theme) {
  const isDark = theme === "dark" || (theme === "system" && dark.matches)
  document.documentElement.classList.toggle("dark", isDark)
}

/** Light/dark preference per browser; "system" follows the OS and updates when it changes. */
export function useTheme() {
  // Same key as the inline script in index.html, which applies it before the first paint.
  const [theme, setTheme] = useLocalState<Theme>("airboy.theme", "system")
  useEffect(() => {
    apply(theme)
    if (theme !== "system") return
    const f = () => apply("system")
    dark.addEventListener("change", f)
    return () => dark.removeEventListener("change", f)
  }, [theme])
  return [theme, setTheme] as const
}
