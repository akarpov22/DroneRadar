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
          "manage": "Manage",
          "select-model": "Select model",
          "drone-model": "Drone model",
          "name": "Name",
          "manufacturer": "Manufacturer",
          "max-range": "Max range",
          "max-speed": "Max speed",
          "save": "Save",
          "show-only-owned": "Show only owned",
          "show-all": "Show all"         
        },
      },
      uk: {
        translation: {
          "yours-drone": 'Ваш дрон?',
          "enter-serial-number": "Введіть серійний номер",
          "manage": "Керувати",
          "select-model": "Вибрати модель",
          "drone-model": "Модель дрону",
          "name": "Ім'я",
          "manufacturer": "Виробник",
          "max-range": "Максимальна дальність польоту",
          "max-speed": "Максимальна швидкість",
          "save": "Зберегти" ,
          "show-only-owned": "Відобразити тільки свої дрони",
          "show-all": "Відобразити всі"          
        },
      },
    },
  });

export default i18n;
