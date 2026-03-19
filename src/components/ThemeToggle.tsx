import { Moon, Sun } from 'lucide-react';
import { useF1 } from '../context/F1Context';

const ThemeToggle = () => {
    const { dispatch, resolvedTheme } = useF1();
    const isDark = resolvedTheme === 'dark';

    return (
        <button
            onClick={() => dispatch({ type: 'SET_THEME', payload: isDark ? 'light' : 'dark' })}
            className="relative p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition-all duration-300 group overflow-hidden"
            aria-label="Toggle Theme"
        >
            <div className={`transition-transform duration-500 flex flex-col ${isDark ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="h-6 w-6 flex items-center justify-center">
                    <Moon size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="h-6 w-6 flex items-center justify-center">
                    <Sun size={20} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                </div>
            </div>

            {/* Background glow when hovered */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${isDark ? 'from-blue-500 to-purple-500' : 'from-yellow-400 to-orange-500'}`} />
        </button>
    );
};

export default ThemeToggle;
