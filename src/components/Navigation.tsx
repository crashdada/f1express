import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Home, Users, Calendar, BarChart3, Sparkles, Settings } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import F1Logo from './F1Logo';
import { Capacitor } from '@capacitor/core';

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/new-season', label: '新赛季', icon: Sparkles },
    { path: '/drivers', label: '车手', icon: Users },
    { path: '/teams', label: '车队', icon: Shield },
    { path: '/races', label: '比赛', icon: Calendar },
    { path: '/analytics', label: '数据', icon: BarChart3 },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-nav backdrop-blur-lg shadow-lg dark:shadow-black/20 shadow-slate-200/50'
        : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-4 group">
            <div className="relative">
              <div className="absolute inset-0 bg-f1-red/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="p-1 group-hover:scale-110 transition-all duration-300">
                <F1Logo className="w-10 md:w-12 h-auto" />
              </div>
            </div>
            <span className="text-primary font-black text-2xl hidden sm:block font-orbitron tracking-tighter group-hover:text-f1-red transition-colors italic">
              F1 <span className="text-f1-red">EXPRESS</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <div className="flex items-center space-x-1 mr-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 relative group ${isActive
                      ? 'text-white'
                      : 'text-secondary hover:text-primary'
                      }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-f1-red rounded-xl shadow-lg shadow-f1-red/30" />
                    )}
                    <div className={`relative z-10 flex items-center space-x-2 ${isActive ? '' : 'group-hover:bg-primary/10'} rounded-xl px-2 py-1 transition-all`}>
                      <Icon size={18} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="border-l border-border pl-4 flex items-center">
              <ThemeToggle />
              <Link
                to="/admin-console"
                className="w-1.5 h-1.5 rounded-full bg-primary/20 hover:bg-f1-red/40 transition-colors ml-4 cursor-default"
                title="System Console"
              />
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center space-x-2">
            {Capacitor.isNativePlatform() ? (
              <Link
                to="/settings"
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-300 flex items-center justify-center border border-black/10 dark:border-white/10 group"
                aria-label="Settings"
              >
                <Settings size={20} className="text-secondary group-hover:text-primary transition-colors" />
              </Link>
            ) : (
              <ThemeToggle />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
