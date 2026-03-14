import { Calendar, Users, Trophy, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { COUNTRY_TRANSLATIONS, GP_TRANSLATIONS } from '../utils/translations';
import F1Logo from '../components/F1Logo';
import { useDynamic2026Data } from '../hooks/useDynamic2026Data';

type TabType = 'schedule' | 'drivers' | 'teams';

const NewSeasonPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { schedule, drivers, teams, loading } = useDynamic2026Data();

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

  const translateRound = (round: string) => {
    if (round.toUpperCase().includes('TESTING')) return '季前测试';
    return round.replace(/ROUND\s+(\d+)/i, '第 $1 站');
  };

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
              {schedule.map((event) => (
                <Link
                  key={event.slug}
                  to={`/new-season/${event.slug}`}
                  className="group relative glass rounded-[2.5rem] overflow-hidden transition-all duration-700 border border-border/50"
                >
                  <div className="p-10 flex flex-col h-full justify-between min-h-[360px]">
                    <div>
                      <div className="text-secondary font-bold text-xs uppercase tracking-[0.2em] mb-4">
                        {translateRound(event.round)}
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-4xl font-black text-primary mb-2 font-orbitron flex items-center">
                            {event.flag ? (
                              <img src={event.flag} alt={event.country} className="w-14 h-14 mr-4 object-cover rounded-full shadow-lg border-2 border-border transition-transform group-hover:scale-110" />
                            ) : (
                              <span className="mr-4 text-5xl">🏁</span>
                            )}
                            {COUNTRY_TRANSLATIONS[event.country] || event.country}
                          </h2>
                          <h3 className="text-secondary font-bold text-sm leading-relaxed uppercase tracking-tighter">
                            {GP_TRANSLATIONS[event.gpName] || event.gpName}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <div className="mt-12 flex items-end justify-between">
                      <div className="font-black text-2xl font-orbitron tracking-wider text-primary">
                        {event.dates}
                      </div>
                      {event.image && (
                        <div className="w-32 h-32 flex items-center justify-center bg-transparent">
                          <img
                            src={event.image}
                            alt="Track"
                            className="max-w-full max-h-full object-contain dark:invert dark:brightness-150 dark:contrast-125 opacity-90 transition-transform duration-500 group-hover:scale-125 select-none pointer-events-none"
                          />
                        </div>
                      )}
                    </div>
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-f1-red scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  </div>
                </Link>
              ))}
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

                    {/* Tags - 降低层级 */}
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
