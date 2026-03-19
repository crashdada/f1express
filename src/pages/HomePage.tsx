import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, TrendingUp, ChevronRight, Trophy, Sparkles, Calendar, Radio, ArrowRight } from 'lucide-react';
import { useF1 } from '../context/F1Context';
import { CompactDriverCard } from '../components/DriverCard';
import { TeamCard } from '../components/TeamCard';
import { StatCard } from '../components/StatCard';
import F1Logo from '../components/F1Logo';
import RaceCountdown from '../components/RaceCountdown';

import { useCombinedData } from '../hooks/useCombinedData';
import { isAndroid } from '../utils/platform';

const HomePage = () => {
  const { state } = useF1();
  const { combinedTeams, combinedDrivers } = useCombinedData();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const topDrivers = useMemo(() => {
    return combinedDrivers.slice(0, 5);
  }, [combinedDrivers]);

  const topTeams = useMemo(() => {
    return combinedTeams.slice(0, 5);
  }, [combinedTeams]);

  const totalRaces = state.raceResults.length;
  const isAndroidShell = isAndroid();
  const mobileTopDrivers = topDrivers.slice(0, 3);
  const mobileTopTeams = topTeams.slice(0, 3);

  const quickLinks = [
    { to: '/new-season', label: '2026 赛季', meta: '阵容与赛历', icon: Sparkles },
    { to: '/races', label: '比赛周末', meta: '时间与分站', icon: Calendar },
    { to: '/analytics', label: '数据页', meta: '趋势与统计', icon: Radio },
  ];

  return (
    <div className="animate-fade-in">
      <div className="md:hidden px-4 pb-8">
        <section className={`relative overflow-hidden rounded-[32px] px-5 pb-6 pt-5 text-white shadow-2xl ${isAndroidShell ? 'android-hero-card' : 'bg-slate-900'
          }`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(145deg,rgba(225,6,0,0.95),rgba(12,17,29,0.92)_54%,rgba(8,12,22,1))]" />
          <div className="absolute -right-10 top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute left-0 top-0 h-24 w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.18),transparent)] opacity-60" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                  Android Edition
                </div>
                <h1 className="mt-4 max-w-[12ch] text-3xl font-black leading-tight">
                  把 F1 信息压进一块更顺手的移动主屏
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
                  首页、导航和系统栏都按 Android 的阅读节奏重新压缩，打开就能直达赛季重点。
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/15 p-3 backdrop-blur-xl">
                <F1Logo className="w-14 h-auto" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/65">Drivers</div>
                <div className="mt-2 text-3xl font-black font-orbitron">{state.drivers.length}+</div>
                <div className="mt-1 text-xs text-white/75">现役与历史车手资料</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/15 p-4 backdrop-blur-xl">
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/65">Race Log</div>
                <div className="mt-2 text-3xl font-black font-orbitron">{totalRaces.toLocaleString()}+</div>
                <div className="mt-1 text-xs text-white/75">随手切到分站和积分</div>
              </div>
            </div>

            <div className="mt-5 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="min-w-[156px] rounded-[24px] border border-white/10 bg-black/15 p-4 backdrop-blur-xl transition-transform duration-300 active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl bg-white/10 p-2">
                        <Icon size={18} />
                      </div>
                      <ArrowRight size={16} className="text-white/60" />
                    </div>
                    <div className="mt-4 text-base font-semibold">{item.label}</div>
                    <div className="mt-1 text-xs text-white/70">{item.meta}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="android-surface mt-5 rounded-[28px] px-4 py-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-f1-red">Next up</div>
              <h2 className="mt-1 text-xl font-bold text-primary">下一站倒计时</h2>
            </div>
            <div className="rounded-full border border-border/80 px-3 py-1 text-xs text-secondary">
              主屏优先展示
            </div>
          </div>
          <RaceCountdown />
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="android-surface rounded-[24px] p-4">
            <div className="flex items-center gap-2 text-secondary">
              <Users size={16} className="text-f1-red" />
              <span className="text-sm">记录车手</span>
            </div>
            <div className="mt-3 text-3xl font-black font-orbitron text-primary">{state.drivers.length}+</div>
          </div>
          <div className="android-surface rounded-[24px] p-4">
            <div className="flex items-center gap-2 text-secondary">
              <Shield size={16} className="text-f1-red" />
              <span className="text-sm">参与车队</span>
            </div>
            <div className="mt-3 text-3xl font-black font-orbitron text-primary">{state.teams.length}</div>
          </div>
          <div className="android-surface rounded-[24px] p-4">
            <div className="flex items-center gap-2 text-secondary">
              <TrendingUp size={16} className="text-f1-red" />
              <span className="text-sm">比赛记录</span>
            </div>
            <div className="mt-3 text-3xl font-black font-orbitron text-primary">{totalRaces.toLocaleString()}+</div>
          </div>
          <div className="android-surface rounded-[24px] p-4">
            <div className="flex items-center gap-2 text-secondary">
              <Sparkles size={16} className="text-f1-red" />
              <span className="text-sm">新赛季入口</span>
            </div>
            <Link to="/new-season" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-f1-red">
              立即查看
              <ChevronRight size={16} />
            </Link>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div className="android-surface rounded-[28px] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center text-lg font-bold text-primary">
                <Trophy className="mr-2 text-f1-red" size={20} />
                车手 Top 3
              </h2>
              <Link to="/drivers" className="inline-flex items-center gap-1 text-sm font-semibold text-f1-red">
                全部车手
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="space-y-3">
              {mobileTopDrivers.map((driver, index) => (
                <CompactDriverCard key={driver.code} driver={driver} index={index} />
              ))}
            </div>
          </div>

          <div className="android-surface rounded-[28px] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center text-lg font-bold text-primary">
                <Shield className="mr-2 text-f1-red" size={20} />
                车队 Top 3
              </h2>
              <Link to="/teams" className="inline-flex items-center gap-1 text-sm font-semibold text-f1-red">
                全部车队
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="space-y-3">
              {mobileTopTeams.map((team, index) => (
                <TeamCard key={team.name} team={team} index={index} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="hidden md:block">
      {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-bg-primary via-bg-primary to-f1-red/10" />
          <div className="absolute inset-0 grid-bg opacity-30 dark:opacity-50" />
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-f1-red/10 dark:bg-f1-red/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

        {/* Content */}
          <div className={`relative z-10 text-center px-4 ${mounted ? 'animate-slide-up' : ''}`}>
            <div className="mb-8">
              <div className="inline-block relative">
                <div className="absolute inset-0 bg-f1-red/10 blur-[60px] rounded-full animate-float" />
                <div className="relative p-2 animate-float">
                  <F1Logo className="w-24 md:w-32 h-auto" />
                </div>
              </div>
            </div>



          {/* Next Race Countdown */}
            <div className="max-w-4xl mx-auto">
              <RaceCountdown />
            </div>
          </div>

        </section>

      {/* Stats Section */}
        <section className="py-16 px-4 relative">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              <StatCard
                icon={Users}
                value={`${state.drivers.length}+`}
                label="记录车手"
                delay={0}
              />
              <StatCard
                icon={Shield}
                value={state.teams.length}
                label="参与车队"
                delay={100}
              />
              <StatCard
                icon={TrendingUp}
                value={`${totalRaces.toLocaleString()}+`}
                label="比赛记录"
                delay={200}
              />
            </div>

          {/* Top Lists */}
            <div className="grid lg:grid-cols-2 gap-12">
            {/* Top Drivers */}
              <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary flex items-center font-orbitron">
                    <Trophy className="text-f1-red mr-3" size={28} />
                    积分榜 Top 5
                  </h2>
                  <Link to="/drivers" className="flex items-center text-f1-red hover:text-red-400 transition-colors group">
                    查看更多
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {topDrivers.map((driver, index) => (
                    <CompactDriverCard key={driver.code} driver={driver} index={index} />
                  ))}
                </div>
              </div>

            {/* Top Teams */}
              <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary flex items-center font-orbitron">
                    <Shield className="text-f1-red mr-3" size={28} />
                    车队排名 Top 5
                  </h2>
                  <Link to="/teams" className="flex items-center text-f1-red hover:text-red-400 transition-colors group">
                    查看更多
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {topTeams.map((team, index) => (
                    <TeamCard key={team.name} team={team} index={index} variant="compact" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
};

export default HomePage;
