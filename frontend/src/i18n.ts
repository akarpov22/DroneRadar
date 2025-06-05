import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector) 
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false, 
    },
    resources: {
      en: {
        translation: {
          "yours-drone": 'Yours drone?',
          "enter-serial-number": 'Enter serial number',
          "manage": "Manage"
        },
      },
      uk: {
        translation: {
          "yours-drone": 'Ваш дрон?',
          "enter-serial-number": "Введіть серійний номер",
          "manage": "Керувати"
        },
      },
    },
  });

export default i18n;
