import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Shield, Calendar, Sparkles } from 'lucide-react';

const BottomNav = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: Home, label: '首页' },
        { path: '/new-season', icon: Sparkles, label: '2026' },
        { path: '/races', icon: Calendar, label: '赛程' },
        { path: '/drivers', icon: Users, label: '车手' },
        { path: '/teams', icon: Shield, label: '车队' },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary/80 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-f1-red' : 'text-secondary hover:text-primary'
                                }`}
                        >
                            <div className={`p-1 rounded-xl transition-all duration-300 ${isActive ? 'bg-f1-red/10' : ''}`}>
                                <Icon size={22} className={isActive ? 'animate-pulse-slow' : ''} />
                            </div>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
