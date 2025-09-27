import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Japanese translations for QA Workflow MCP
import translations from './translations.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ja: {
        translation: translations,
      },
    },
    lng: 'ja',
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
