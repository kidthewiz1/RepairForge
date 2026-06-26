import { createContext, useContext, useState, useCallback } from "react";
import { translations } from "@/i18n/translations";

const LanguageContext = createContext(null);

function detectLang() {
  const stored = localStorage.getItem("ff_lang");
  if (stored === "en" || stored === "fr") return stored;
  const nav = (navigator.language || navigator.userLanguage || "en").toLowerCase();
  return nav.startsWith("fr") ? "fr" : "en";
}

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(detectLang);

  const setLang = useCallback((l) => {
    localStorage.setItem("ff_lang", l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let str = translations[lang]?.[key];
      if (str === undefined) str = translations.en[key] ?? key;
      if (vars && typeof str === "string") {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
        });
      }
      return str;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
