import { Calendar, Users, Trophy, ChevronRight, Target, XCircle, BarChart3 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { translateCountry, GP_TRANSLATIONS } from '../utils/translations';
import F1Logo from '../components/F1Logo';
import { useDynamic2026Data } from '../hooks/useDynamic2026Data';
import { isAndroid } from '../utils/platform';

type TabType = 'schedule' | 'drivers' | 'teams' | 'standings';
type StandingsView = 'drivers' | 'teams';

const NewSeasonPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [standingsView, setStandingsView] = useState<StandingsView>('drivers');
  const { schedule, drivers, teams, loading, raceResults } = useDynamic2026Data();
  const isAndroidShell = isAndroid();

  // Get active tab from search params or default to schedule
  const activeTab = (searchParams.get('tab') as TabType) || 'schedule';
  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // 排序权重
  const teamRank: Record<string, number> = {
    "McLaren": 1, "Ferrari": 2, "Red Bull": 3, "Mercedes": 4, "Aston Martin": 5,
    "Alpine": 6, "Haas": 7, "Racing Bulls": 8, "Williams": 9, "Audi": 10, "Cadillac": 11, "RB": 8
  };

  const driverRank: Record<string, number> = {
    "VER": 1, "NOR": 2, "LEC": 3, "PIA": 4, "SAI": 5, "HAM": 6, "RUS": 7, "PER": 8, "ALO": 9, "STR": 10,
    "HUL": 11, "GAS": 12, "BEA": 13, "ALB": 14, "OCO": 15, "ANT": 16, "BOR": 17, "LAW": 18, "COL": 19, "HAD": 20, "LIN": 21, "BOT": 22
  };

  const sortedDrivers = (!drivers || !Array.isArray(drivers)) ? [] : [...drivers].sort((a, b) => {
    const aTR = teamRank[a.team] || 99;
    const bTR = teamRank[b.team] || 99;
    if (aTR !== bTR) return aTR - bTR;
    return (driverRank[a.code] || 99) - (driverRank[b.code] || 99);
  });

  const getTeamColor = (teamName: string) => {
    const team = teams.find(t => t.name === teamName || t.nameCn === teamName || t.id === teamName.toLowerCase().replace(/\s+/g, '_'));
    return team?.color || "#5e5e5e";
  };

  const driverStandings = useMemo(() => {
    const totals = new Map<string, {
      code: string;
      points: number;
      wins: number;
      podiums: number;
      sprintWins: number;
      bestFinish: number;
    }>();

    raceResults.forEach((round) => {
      (round.results || []).forEach((result) => {
        const current = totals.get(result.code) || {
          code: result.code,
          points: 0,
          wins: 0,
          podiums: 0,
          sprintWins: 0,
          bestFinish: Number.POSITIVE_INFINITY,
        };

        current.points += Number(result.points || 0);
        if (typeof result.pos === 'number' && result.pos > 0) {
          current.bestFinish = Math.min(current.bestFinish, result.pos);
          if (result.pos === 1) current.wins += 1;
          if (result.pos <= 3) current.podiums += 1;
        }
        totals.set(result.code, current);
      });

      (round.sprintResults || []).forEach((result) => {
        const current = totals.get(result.code) || {
          code: result.code,
          points: 0,
          wins: 0,
          podiums: 0,
          sprintWins: 0,
          bestFinish: Number.POSITIVE_INFINITY,
        };

        current.points += Number(result.points || 0);
        if (result.pos === 1) current.sprintWins += 1;
        if (typeof result.pos === 'number' && result.pos > 0) {
          current.bestFinish = Math.min(current.bestFinish, result.pos);
        }
        totals.set(result.code, current);
      });
    });

    return Array.from(totals.values())
      .map((entry) => {
        const driver = drivers.find((item) => item.code === entry.code);
        return {
          ...entry,
          id: driver?.id || entry.code,
          firstNameCn: driver?.firstNameCn || driver?.firstName || entry.code,
          lastNameCn: driver?.lastNameCn || driver?.lastName || '',
          image: driver?.image,
          teamCn: driver?.teamCn || driver?.team || '',
          teamColor: driver ? getTeamColor(driver.team) : '#5e5e5e',
        };
      })
      .sort((a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.podiums - a.podiums ||
        a.bestFinish - b.bestFinish ||
        a.code.localeCompare(b.code)
      );
  }, [drivers, raceResults]);

  const teamStandings = useMemo(() => {
    const totals = new Map<string, {
      key: string;
      points: number;
      wins: number;
      podiums: number;
      sprintWins: number;
      bestFinish: number;
    }>();

    const resolveTeam = (teamName: string, teamNameCn?: string) =>
      teams.find((team) =>
        team.name === teamName ||
        team.nameCn === teamNameCn ||
        team.nameCn === teamName ||
        team.name === teamNameCn ||
        team.id === teamName.toLowerCase().replace(/\s+/g, '_')
      );

    raceResults.forEach((round) => {
      (round.results || []).forEach((result) => {
        const matchedTeam = resolveTeam(result.team, result.teamCn);
        const key = matchedTeam?.id || result.team;
        const current = totals.get(key) || {
          key,
          points: 0,
          wins: 0,
          podiums: 0,
          sprintWins: 0,
          bestFinish: Number.POSITIVE_INFINITY,
        };

        current.points += Number(result.points || 0);
        if (typeof result.pos === 'number' && result.pos > 0) {
          current.bestFinish = Math.min(current.bestFinish, result.pos);
          if (result.pos === 1) current.wins += 1;
          if (result.pos <= 3) current.podiums += 1;
        }
        totals.set(key, current);
      });

      (round.sprintResults || []).forEach((result) => {
        const matchedTeam = resolveTeam(result.team, result.teamCn);
        const key = matchedTeam?.id || result.team;
        const current = totals.get(key) || {
          key,
          points: 0,
          wins: 0,
          podiums: 0,
          sprintWins: 0,
          bestFinish: Number.POSITIVE_INFINITY,
        };

        current.points += Number(result.points || 0);
        if (result.pos === 1) current.sprintWins += 1;
        if (typeof result.pos === 'number' && result.pos > 0) {
          current.bestFinish = Math.min(current.bestFinish, result.pos);
        }
        totals.set(key, current);
      });
    });

    return Array.from(totals.values())
      .map((entry) => {
        const team = teams.find((item) => item.id === entry.key || item.name === entry.key || item.nameCn === entry.key);
        return {
          ...entry,
          id: team?.id || entry.key,
          name: team?.name || entry.key,
          nameCn: team?.nameCn || team?.name || entry.key,
          color: team?.color || '#5e5e5e',
          logo: team?.logo,
          drivers: team?.drivers || [],
        };
      })
      .sort((a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.podiums - a.podiums ||
        a.bestFinish - b.bestFinish ||
        a.name.localeCompare(b.name)
      );
  }, [raceResults, teams]);

  const completedRounds = useMemo(() => {
    return raceResults.filter((round) => (round.results || []).length > 0).length;
  }, [raceResults]);

  const driverLeader = driverStandings[0];
  const teamLeader = teamStandings[0];
  const tabs = [
    { key: 'schedule' as const, label: '赛历', icon: Calendar },
    { key: 'drivers' as const, label: '车手', icon: Users },
    { key: 'teams' as const, label: '车队', icon: Trophy },
    { key: 'standings' as const, label: '积分榜', icon: BarChart3 },
  ];

  // Calculate Next Race
  const CheckeredFlagIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="presentation"
    >
      <title>Chequered Flag</title>
      <path 
        fill="currentColor" 
        d="M9 6h2V4H9zm4 0V4h2v2zm-4 8v-2h2v2zm8-4V8h2v2zm0 4v-2h2v2zm-4 0v-2h2v2zm4-8V4h2v2zm-6 2V6h2v2zM5 20V4h2v2h2v2H7v2h2v2H7v8zm10-8v-2h2v2zm-4 0v-2h2v2zm-2-2V8h2v2zm4 0V8h2v2zm2-2V6h2v2z"
      />
    </svg>
  );

  const nextRaceNumber = useMemo(() => {
    if (!schedule.length) return null;
    const upcoming = schedule.filter(e => {
        const roundNumber = e.roundNumber || parseInt(e.round.match(/\d+/)?.[0] || '0');
        const isCancelled = e.status === 'CANCELLED';
        const isFinished = raceResults.some(r => Number(r.round) === roundNumber && r.results && r.results.length > 0);
        return !isCancelled && !isFinished;
    });
    return upcoming.length > 0 ? (upcoming[0].roundNumber || parseInt(upcoming[0].round.match(/\d+/)?.[0] || '0')) : null;
  }, [schedule, raceResults]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-f1-red"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 py-6 md:py-10 bg-bg-primary animate-fade-in ${isAndroidShell ? 'android-shell' : ''}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
          <div className={`flex-1 ${isAndroidShell ? 'android-surface rounded-[32px] px-5 py-5 md:bg-transparent md:border-0 md:shadow-none md:p-0 md:backdrop-blur-none' : ''}`}>
            <div className="inline-flex items-center rounded-full border border-f1-red/15 bg-f1-red/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-f1-red md:hidden">
              Season Control
            </div>
            <h1 className="mt-4 md:mt-0 text-4xl md:text-7xl font-black text-primary mb-4 flex items-center justify-center md:justify-start font-orbitron tracking-tight gap-4 md:gap-6 italic">
              <div className="p-2 flex items-center justify-center rounded-[22px] border border-white/10 bg-black/5 dark:bg-white/5 md:border-0 md:bg-transparent">
                <F1Logo className="w-14 md:w-20 h-8" />
              </div>
              2026
            </h1>
            <p className={`text-secondary font-medium max-w-2xl py-1 ${isAndroidShell ? 'text-base md:text-xl md:border-l-4 md:border-f1-red md:pl-6' : 'text-xl border-l-4 border-f1-red pl-6'}`}>
              规则革命，全新时代。探索 2026 赛季 F1 的全貌。
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 md:hidden">
              <div className="rounded-[22px] border border-border/70 bg-bg-secondary/55 p-3 text-left">
                <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">Rounds</div>
                <div className="mt-2 text-2xl font-black font-orbitron text-primary">{schedule.length}</div>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-bg-secondary/55 p-3 text-left">
                <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">Drivers</div>
                <div className="mt-2 text-2xl font-black font-orbitron text-primary">{drivers.length}</div>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-bg-secondary/55 p-3 text-left">
                <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">Done</div>
                <div className="mt-2 text-2xl font-black font-orbitron text-primary">{completedRounds}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="self-center md:self-end w-full md:w-auto">
            <div className="flex overflow-x-auto no-scrollbar gap-2 rounded-[26px] border border-border bg-bg-secondary/70 p-2 shadow-lg md:flex-wrap md:justify-end">
              {tabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex shrink-0 items-center gap-2 rounded-[18px] px-4 py-3 font-bold transition-all duration-300 ${activeTab === tab.key
                      ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                      : 'text-secondary hover:text-primary hover:bg-bg-primary'
                      }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-8 md:mt-12 transition-all duration-500">
          {activeTab === 'schedule' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 animate-slide-up">
              {schedule.map((event) => {
                const roundNumber = event.roundNumber || parseInt(event.round.match(/\d+/)?.[0] || '0');
                const roundResults = raceResults.find(r => Number(r.round) === roundNumber);
                const isFinished = roundResults && roundResults.results && roundResults.results.length > 0;
                const isCancelled = event.status === 'CANCELLED';
                const isNext = roundNumber === nextRaceNumber;
                const top3 = isFinished ? roundResults?.results.slice(0, 3) : [];

                return (
                  <Link
                    key={event.round}
                    to={`/new-season/race/${event.slug}`}
                    className={`group relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] transition-all duration-700 shadow-2xl flex flex-col h-full min-h-[320px] md:min-h-[340px] ${
                        isNext 
                          ? 'bg-gradient-to-br from-[#e10600] via-[#c40500] to-[#990400] scale-[1.03] z-10 border-4 border-white/20' 
                          : isCancelled 
                            ? 'bg-primary/5 grayscale opacity-70 border border-border/50' 
                            : 'glass border border-white/10 hover:border-f1-red/30'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-6 md:p-8 flex justify-between items-start">
                        <div className={`text-xs font-black uppercase tracking-[0.2em] ${isNext ? 'text-white/80' : 'text-secondary'}`}>
                            {event.round}
                        </div>
                        {isNext ? (
                            <div className="bg-white text-f1-red text-[11px] font-black px-4 py-2 rounded-xl flex items-center gap-2 uppercase tracking-widest shadow-2xl animate-pulse">
                                <span>NEXT RACE</span>
                                <ChevronRight size={16} />
                            </div>
                        ) : (
                            <div className={`text-[10px] font-black px-4 py-2 rounded-xl flex items-center gap-2 uppercase tracking-widest border shadow-sm ${
                                isCancelled 
                                  ? 'bg-f1-red/10 text-f1-red border-f1-red/20' 
                                  : 'bg-primary/5 text-secondary border-border/40'
                            }`}>
                                {isCancelled ? <XCircle size={14} /> : isFinished ? <CheckeredFlagIcon size={14} /> : <Calendar size={14} />}
                                {event.dates}
                            </div>
                        )}
                    </div>

                    {/* Card Body */}
                    <div className="px-6 pb-6 md:px-8 md:pb-8">
                        <div className="flex items-center gap-4 mb-3">
                            {isNext ? (
                                <Target className="text-white animate-spin-slow" size={28} />
                            ) : (
                                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 shadow-lg bg-white/10 shrink-0 relative">
                                    <img src={event.flag} alt="" className="w-full h-full object-contain p-1 absolute inset-0" />
                                </div>
                            )}
                            <h3 className={`text-4xl md:text-5xl font-black font-orbitron italic tracking-tighter leading-none ${isNext ? 'text-white' : 'text-primary'}`}>
                                {translateCountry(event.country)}
                            </h3>
                        </div>
                        <p className={`text-xs font-bold uppercase tracking-[0.2em] line-clamp-1 h-4 ${isNext ? 'text-white/70' : 'text-secondary opacity-70'}`}>
                            {GP_TRANSLATIONS[event.gpName] || event.gpName}
                        </p>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-auto relative">
                        {isFinished ? (
                            <div className="bg-bg-primary/40 backdrop-blur-xl p-4 md:p-6 grid grid-cols-3 gap-3 border-t border-white/10">
                                {top3?.sort((a,b) => (a.pos || 0) - (b.pos || 0)).map((driver, idx) => {
                                    const driverPhoto = drivers.find(d => d.code === driver.code)?.image;
                                    return (
                                        <div key={driver.code} className="flex flex-col items-center bg-white/5 rounded-[2rem] p-3 border border-white/5 shadow-inner group/driver">
                                            <div className="relative mb-3">
                                                <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-bg-primary shadow-xl ${
                                                    idx === 0 ? 'bg-yellow-400 text-black' : idx === 1 ? 'bg-slate-300 text-black' : 'bg-[#cd7f32] text-white'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="w-14 h-14 rounded-full overflow-hidden bg-bg-secondary border border-white/10 group-hover/driver:scale-110 transition-transform duration-500">
                                                    {driverPhoto ? (
                                                        <img src={driverPhoto} alt={driver.code} className="w-full h-full object-cover scale-110 object-top" />
                                                    ) : (
                                                        <Users className="w-full h-full p-3 text-white/20" />
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-black text-primary mb-1 uppercase tracking-wider">{driver.code}</span>
                                            <span className={`text-[9px] font-bold font-mono border-t border-white/5 pt-1 w-full text-center ${idx === 0 ? 'text-yellow-400/80' : 'text-secondary opacity-60'}`}>
                                                {idx === 0 ? (driver.status === 'Finished' ? '1:33:15.607' : driver.status) : `+${(idx * 5.515).toFixed(3)}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : isCancelled ? (
                            <div className="p-10 flex items-center justify-center bg-f1-red/5 border-t border-f1-red/10 relative overflow-hidden">
                                <span className="text-3xl font-black font-orbitron italic tracking-[0.4em] text-f1-red/30 uppercase z-10">CALLED OFF</span>
                                <XCircle className="absolute -right-4 -bottom-4 text-f1-red opacity-[0.03]" size={120} />
                            </div>
                        ) : (
                            <div className="px-6 py-6 md:px-8 md:py-8 border-t border-white/5 flex items-end justify-between bg-white/2 overflow-hidden group/footer relative">
                                <div className={`flex flex-col gap-1.5 ${isNext ? 'text-white' : 'text-secondary'}`}>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Grand Prix Dates</span>
                                    <span className="text-2xl font-black font-orbitron italic tracking-wide">{event.dates}</span>
                                </div>
                                {event.image ? (
                                    <img 
                                      src={event.image} 
                                      alt="Track" 
                                      className={`h-20 w-auto object-contain opacity-30 transition-all duration-1000 group-hover/footer:opacity-80 group-hover/footer:scale-125 group-hover/footer:-rotate-12 ${isNext ? 'brightness-0 invert' : 'dark:brightness-200'}`} 
                                    />
                                ) : (
                                    <div className="opacity-10 transition-all duration-700 group-hover/footer:scale-110 group-hover/footer:rotate-12">
                                        <F1Logo className={`w-20 ${isNext ? 'brightness-200' : ''}`} />
                                    </div>
                                )}
                                {isNext && (
                                    <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none">
                                        <Target size={200} className="text-white" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8 animate-slide-up">
              {sortedDrivers.map((driver) => (
                <Link
                  key={driver.id}
                  to={`/new-season/driver/${driver.id}`}
                  className="group relative glass rounded-[2rem] md:rounded-3xl overflow-hidden border-b-4 hover:border-f1-red/50 transition-all duration-700 shadow-2xl"
                  style={{ borderBottomColor: getTeamColor(driver.team) }}
                >
                  <div className="h-64 relative overflow-hidden bg-bg-primary/50">
                    <div className="absolute top-4 right-6 text-8xl font-black opacity-10 font-orbitron italic group-hover:opacity-30 group-hover:scale-110 transition-all duration-700 select-none text-primary z-0">
                      {driver.number}
                    </div>
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                      <span
                        className="text-white text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest transition-colors duration-500"
                        style={{ backgroundColor: getTeamColor(driver.team) }}
                      >
                        {driver.code}
                      </span>
                      <span className="bg-bg-primary/80 backdrop-blur-md text-primary text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-tight border border-white/10">
                        {driver.country}
                      </span>
                    </div>
                    <img
                      src={driver.image}
                      alt={driver.lastName}
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[180%] object-contain object-top scale-110 origin-top transition-all duration-1000 group-hover:scale-115 z-20"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg-secondary via-bg-secondary/40 to-transparent z-30"></div>
                  </div>
                  <div className="p-6 md:p-8 relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: getTeamColor(driver.team) }}></div>
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-secondary">{driver.teamCn}</span>
                    </div>
                    <div className="text-3xl font-black font-orbitron leading-none mb-6 italic tracking-tighter text-primary">
                      <div className="text-sm opacity-60 font-medium mb-1 not-italic">{driver.firstNameCn || driver.firstName}</div>
                      <div className="uppercase">{driver.lastNameCn || driver.lastName}</div>
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-border/50">
                      <span className="text-muted font-bold font-orbitron tracking-widest uppercase text-xs">查看详情</span>
                      <div className="w-10 h-10 rounded-full bg-bg-primary flex items-center justify-center group-hover:bg-f1-red transition-colors duration-500">
                        <ChevronRight className="text-primary group-hover:text-white transition-all duration-500" size={20} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 animate-slide-up">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  to={`/new-season/team/${team.id}`}
                  className="group relative glass rounded-[2rem] md:rounded-3xl overflow-hidden border border-border hover:border-f1-red/50 transition-all duration-500 shadow-2xl flex flex-col"
                >
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-2.5 h-10 rounded-full" style={{ backgroundColor: team.color }}></div>
                          <h2 className="text-4xl font-black font-orbitron italic tracking-tighter text-primary">{team.nameCn}</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-bg-primary/50 text-secondary text-[10px] font-black px-2 py-1 rounded border border-border uppercase tracking-widest">
                            {team.engine} PU
                          </span>
                          <span className="bg-bg-primary/50 text-secondary text-[10px] font-black px-2 py-1 rounded border border-border uppercase tracking-widest">
                            {team.base.split(',')[1]?.trim() || team.base}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {team.drivers.map(dCode => {
                          const driverObj = drivers.find(d => d.code === dCode);
                          return (
                            <div key={dCode} className="bg-bg-primary/40 backdrop-blur-sm px-3 md:px-4 py-2 rounded-xl text-[10px] font-bold font-orbitron text-primary border border-border/50 group-hover:border-f1-red/30 transition-colors flex flex-col items-center min-w-[64px] md:min-w-[70px]">
                              <span className="opacity-60 text-[8px] mb-0.5">{dCode}</span>
                              <span className="text-sm">{driverObj?.lastNameCn || dCode}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 border-t border-border/50 pt-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary font-medium uppercase tracking-tighter text-xs">动力单元</span>
                        <span className="font-bold text-primary">{team.engineCn}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-secondary font-medium uppercase tracking-tighter text-xs">总部</span>
                        <span className="font-bold text-primary">{team.baseCn}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-bg-primary/20 mt-auto p-4 flex items-center justify-center relative overflow-hidden min-h-[160px]">
                    <img
                      src={team.carImage}
                      alt={team.name}
                      className="w-full max-w-[90%] h-auto object-contain z-10 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[140px] font-black opacity-[0.03] font-orbitron italic select-none uppercase truncate leading-none text-primary">
                        {team.name}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {activeTab === 'standings' && (
            <div className="space-y-6 md:space-y-8 animate-slide-up">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="glass rounded-[2rem] md:rounded-3xl border border-border p-5 md:p-6 lg:col-span-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-secondary mb-2">2026 Standings</p>
                      <h2 className="text-3xl font-black font-orbitron italic text-primary tracking-tight">积分榜</h2>
                      <p className="text-secondary mt-2">已完成 {completedRounds} 站，实时汇总正赛与冲刺积分。</p>
                    </div>
                    <div className="inline-flex self-start rounded-2xl border border-border bg-bg-secondary p-1.5 shadow-lg">
                      <button
                        onClick={() => setStandingsView('drivers')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${standingsView === 'drivers'
                          ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                          : 'text-secondary hover:text-primary hover:bg-bg-primary'
                        }`}
                      >
                        车手榜
                      </button>
                      <button
                        onClick={() => setStandingsView('teams')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${standingsView === 'teams'
                          ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                          : 'text-secondary hover:text-primary hover:bg-bg-primary'
                        }`}
                      >
                        车队榜
                      </button>
                    </div>
                  </div>
                </div>
                <div className="glass rounded-[2rem] md:rounded-3xl border border-border p-5 md:p-6">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-secondary mb-3">
                    {standingsView === 'drivers' ? 'Leader' : 'Constructor Leader'}
                  </p>
                  {standingsView === 'drivers' && driverLeader ? (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 bg-bg-secondary shrink-0">
                        {driverLeader.image ? (
                          <img src={driverLeader.image} alt={driverLeader.code} className="w-full h-full object-cover object-top scale-110" />
                        ) : (
                          <Users className="w-full h-full p-4 text-white/20" />
                        )}
                      </div>
                      <div>
                        <p className="text-2xl font-black font-orbitron italic text-primary">{driverLeader.points}</p>
                        <p className="text-lg font-black text-primary">{driverLeader.firstNameCn} {driverLeader.lastNameCn}</p>
                        <p className="text-secondary text-sm">{driverLeader.teamCn}</p>
                      </div>
                    </div>
                  ) : standingsView === 'teams' && teamLeader ? (
                    <div className="flex items-center gap-4">
                      <div className="w-4 self-stretch rounded-full" style={{ backgroundColor: teamLeader.color }}></div>
                      <div>
                        <p className="text-2xl font-black font-orbitron italic text-primary">{teamLeader.points}</p>
                        <p className="text-lg font-black text-primary">{teamLeader.nameCn}</p>
                        <p className="text-secondary text-sm">{teamLeader.wins} 胜 / {teamLeader.podiums} 次领奖台</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {standingsView === 'drivers' ? (
                <div className="glass rounded-[2rem] border border-border overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto no-scrollbar">
                    <div className="min-w-[760px]">
                      <div className="grid grid-cols-[80px_minmax(0,1.6fr)_110px_90px_110px_110px] gap-4 px-6 py-4 bg-bg-secondary/80 border-b border-border text-xs font-black uppercase tracking-[0.2em] text-secondary">
                        <span>排名</span>
                        <span>车手</span>
                        <span className="text-right">积分</span>
                        <span className="text-right">胜场</span>
                        <span className="text-right">领奖台</span>
                        <span className="text-right">冲刺胜</span>
                      </div>
                      {driverStandings.map((driver, index) => (
                        <div key={driver.code} className="grid grid-cols-[80px_minmax(0,1.6fr)_110px_90px_110px_110px] gap-4 px-6 py-5 border-b border-border/60 last:border-b-0 items-center hover:bg-white/5 transition-colors">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shadow-lg ${index === 0 ? 'bg-yellow-400 text-black' : index === 1 ? 'bg-slate-300 text-black' : index === 2 ? 'bg-[#cd7f32] text-white' : 'bg-bg-secondary text-primary'}`}>
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 bg-bg-secondary shrink-0">
                              {driver.image ? (
                                <img src={driver.image} alt={driver.code} className="w-full h-full object-cover object-top scale-110" />
                              ) : (
                                <Users className="w-full h-full p-4 text-white/20" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-lg font-black text-primary truncate">{driver.firstNameCn} {driver.lastNameCn}</p>
                              <div className="flex items-center gap-2 text-sm text-secondary truncate">
                                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: driver.teamColor }}></span>
                                <span>{driver.teamCn}</span>
                                <span className="font-black uppercase tracking-widest">{driver.code}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-2xl font-black font-orbitron italic text-primary">{driver.points}</div>
                          <div className="text-right text-lg font-black text-primary">{driver.wins}</div>
                          <div className="text-right text-lg font-black text-primary">{driver.podiums}</div>
                          <div className="text-right text-lg font-black text-primary">{driver.sprintWins}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass rounded-[2rem] border border-border overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto no-scrollbar">
                    <div className="min-w-[800px]">
                      <div className="grid grid-cols-[80px_minmax(0,1.8fr)_120px_100px_120px_120px] gap-4 px-6 py-4 bg-bg-secondary/80 border-b border-border text-xs font-black uppercase tracking-[0.2em] text-secondary">
                        <span>排名</span>
                        <span>车队</span>
                        <span className="text-right">积分</span>
                        <span className="text-right">胜场</span>
                        <span className="text-right">领奖台</span>
                        <span className="text-right">冲刺胜</span>
                      </div>
                      {teamStandings.map((team, index) => (
                        <div key={team.id} className="grid grid-cols-[80px_minmax(0,1.8fr)_120px_100px_120px_120px] gap-4 px-6 py-5 border-b border-border/60 last:border-b-0 items-center hover:bg-white/5 transition-colors">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shadow-lg ${index === 0 ? 'bg-yellow-400 text-black' : index === 1 ? 'bg-slate-300 text-black' : index === 2 ? 'bg-[#cd7f32] text-white' : 'bg-bg-secondary text-primary'}`}>
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-3 self-stretch rounded-full shrink-0" style={{ backgroundColor: team.color }}></div>
                            <div className="min-w-0">
                              <p className="text-lg font-black text-primary truncate">{team.nameCn}</p>
                              <p className="text-sm text-secondary truncate">{team.name}</p>
                            </div>
                          </div>
                          <div className="text-right text-2xl font-black font-orbitron italic text-primary">{team.points}</div>
                          <div className="text-right text-lg font-black text-primary">{team.wins}</div>
                          <div className="text-right text-lg font-black text-primary">{team.podiums}</div>
                          <div className="text-right text-lg font-black text-primary">{team.sprintWins}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewSeasonPage;
