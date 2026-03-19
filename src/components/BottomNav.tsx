import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Shield, Calendar, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const BottomNav = () => {
    const location = useLocation();
    const isAndroidShell = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    const navItems = [
        { path: '/', icon: Home, label: '首页' },
        { path: '/new-season', icon: Sparkles, label: '2026' },
        { path: '/races', icon: Calendar, label: '赛程' },
        { path: '/drivers', icon: Users, label: '车手' },
        { path: '/teams', icon: Shield, label: '车队' },
    ];

    return (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div
                className={`mx-auto flex max-w-md items-center justify-around gap-1 rounded-[30px] border border-border/80 px-2 py-2 backdrop-blur-2xl ${isAndroidShell ? 'android-bottom-dock' : 'glass-strong'
                    }`}
                style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.18)' }}
            >
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex min-w-0 flex-1 items-center justify-center rounded-[22px] px-2 py-2 transition-all duration-300 ${isActive
                                ? 'bg-f1-red text-white shadow-lg shadow-f1-red/30'
                                : 'text-secondary hover:text-primary'
                                }`}
                        >
                            <div className={`flex flex-col items-center gap-1 ${isActive ? 'scale-[1.02]' : ''}`}>
                                <div className={`rounded-2xl p-1.5 transition-all duration-300 ${isActive ? 'bg-white/12' : ''}`}>
                                    <Icon size={20} className={isActive ? 'animate-pulse-slow' : ''} />
                                </div>
                                <span className="text-[11px] font-semibold tracking-wide">{item.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
