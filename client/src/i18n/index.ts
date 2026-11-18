import { enGB } from "date-fns/locale"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./en.json"

/* -------------------------------------------------------------------------- */
/*  All UI text lives in en.json (English is the base language), bundled with  */
/*  the app. Same setup as parklr-ui: flat keys ("search.submit"), so the key  */
/*  and namespace separators are off; i18next.d.ts types t() against en.json,  */
/*  so an unknown key fails tsc. Adding a language = another JSON + resources. */
/* -------------------------------------------------------------------------- */

export type TranslationKey = keyof typeof en

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: en } },
  keySeparator: false,
  nsSeparator: false,
  // React escapes what it renders; escaping here as well would show &amp;.
  interpolation: { escapeValue: false },
  // Resources are inline, so init is synchronous and the first render already has its text.
  initAsync: false,
})

/** Locale for dates and numbers; follows the UI language. */
export const locale = { intl: "en-GB", dateFns: enGB }

export default i18n
