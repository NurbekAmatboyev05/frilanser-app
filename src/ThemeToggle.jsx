import React from 'react';
import { useTheme } from './ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all active:scale-95 group relative"
      title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    >
      <span className="text-xl">
        {theme === 'dark' ? '☀️' : '🌙'}
      </span>
      {/* Tooltip hint */}
      <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {theme === 'dark' ? 'Yorug\' rejim' : 'Tungi rejim'}
      </span>
    </button>
  );
};

export default ThemeToggle;
