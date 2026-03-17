import { Calendar, Users, Trophy, ChevronRight, Target, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { translateCountry, GP_TRANSLATIONS } from '../utils/translations';
import F1Logo from '../components/F1Logo';
import { useDynamic2026Data } from '../hooks/useDynamic2026Data';

type TabType = 'schedule' | 'drivers' | 'teams';

const NewSeasonPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { schedule, drivers, teams, loading, raceResults } = useDynamic2026Data();

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
    <div className="min-h-screen py-10 px-4 bg-bg-primary animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex-1">
            <h1 className="text-5xl md:text-7xl font-black text-primary mb-4 flex items-center justify-center md:justify-start font-orbitron tracking-tight gap-6 italic">
              <div className="p-2 flex items-center justify-center">
                <F1Logo className="w-16 md:w-20 h-8" />
              </div>
              2026
            </h1>
            <p className="text-secondary text-xl font-medium max-w-2xl border-l-4 border-f1-red pl-6 py-1">
              规则革命，全新时代。探索 2026 赛季 F1 的全貌。
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-bg-secondary p-1.5 rounded-2xl border border-border self-center md:self-end shadow-lg">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${activeTab === 'schedule'
                ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                : 'text-secondary hover:text-primary hover:bg-bg-primary'
                }`}
            >
              <Calendar size={18} />
              <span>赛历</span>
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${activeTab === 'drivers'
                ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                : 'text-secondary hover:text-primary hover:bg-bg-primary'
                }`}
            >
              <Users size={18} />
              <span>车手</span>
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${activeTab === 'teams'
                ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                : 'text-secondary hover:text-primary hover:bg-bg-primary'
                }`}
            >
              <Trophy size={18} />
              <span>车队</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-12 transition-all duration-500">
          {activeTab === 'schedule' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-slide-up">
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
                    className={`group relative overflow-hidden rounded-[2.5rem] transition-all duration-700 shadow-2xl flex flex-col h-full min-h-[340px] ${
                        isNext 
                          ? 'bg-gradient-to-br from-[#e10600] via-[#c40500] to-[#990400] scale-[1.03] z-10 border-4 border-white/20' 
                          : isCancelled 
                            ? 'bg-primary/5 grayscale opacity-70 border border-border/50' 
                            : 'glass border border-white/10 hover:border-f1-red/30'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-8 flex justify-between items-start">
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
                    <div className="px-8 pb-8">
                        <div className="flex items-center gap-4 mb-3">
                            {isNext ? (
                                <Target className="text-white animate-spin-slow" size={28} />
                            ) : (
                                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 shadow-lg bg-white/10 shrink-0 relative">
                                    <img src={event.flag} alt="" className="w-full h-full object-cover scale-125 absolute inset-0" />
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
                            <div className="bg-bg-primary/40 backdrop-blur-xl p-6 grid grid-cols-3 gap-3 border-t border-white/10">
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
                            <div className="px-8 py-8 border-t border-white/5 flex items-end justify-between bg-white/2 overflow-hidden group/footer relative">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-slide-up">
              {sortedDrivers.map((driver) => (
                <Link
                  key={driver.id}
                  to={`/new-season/driver/${driver.id}`}
                  className="group relative glass rounded-3xl overflow-hidden border-b-4 hover:border-f1-red/50 transition-all duration-700 shadow-2xl"
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
                  <div className="p-8 relative">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  to={`/new-season/team/${team.id}`}
                  className="group relative glass rounded-3xl overflow-hidden border border-border hover:border-f1-red/50 transition-all duration-500 shadow-2xl flex flex-col"
                >
                  <div className="p-8">
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
                            <div key={dCode} className="bg-bg-primary/40 backdrop-blur-sm px-4 py-2 rounded-xl text-[10px] font-bold font-orbitron text-primary border border-border/50 group-hover:border-f1-red/30 transition-colors flex flex-col items-center min-w-[70px]">
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
        </div>
      </div>
    </div>
  );
};

export default NewSeasonPage;
