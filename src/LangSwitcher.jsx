import React from 'react';
import { useLanguage } from './LanguageContext';

const LangSwitcher = ({ variant = 'default' }) => {
  const { lang, changeLang } = useLanguage();

  const containerCls = variant === 'dark' || variant === 'chat'
    ? 'flex bg-gray-900/50 p-1 rounded-xl border border-white/10'
    : 'flex bg-gray-100 p-1 rounded-xl border border-gray-200';

  const btnCls = (active) => `
    px-3 py-1.5 rounded-lg text-xs font-bold transition-all
    ${active 
      ? (variant === 'dark' || variant === 'chat' ? 'bg-primary text-white shadow-lg' : 'bg-white text-primary shadow-sm') 
      : 'text-gray-500 hover:text-gray-700'}
  `;

  return (
    <div className={containerCls}>
      <button
        className={btnCls(lang === 'uz')}
        onClick={() => changeLang('uz')}
      >
        🇺🇿 UZ
      </button>
      <button
        className={btnCls(lang === 'ru')}
        onClick={() => changeLang('ru')}
      >
        🇷🇺 RU
      </button>
    </div>
  );
};

export default LangSwitcher;
