import { useState, useMemo } from 'react';
import { Calendar, MapPin, Search, ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import { useF1 } from '../context/F1Context';
import { useDynamic2026Data } from '../hooks/useDynamic2026Data';
import { SkeletonRaceCard } from '../components/Skeletons';
import { getTeamDisplayName } from '../utils/f1Data';
import { translateCountry, GP_TRANSLATIONS } from '../utils/translations';
import F1Logo from '../components/F1Logo';

const ITEMS_PER_PAGE = 10;

const RacesPage = () => {
  const { state, dispatch } = useF1();
  const { schedule: dynamicSchedule, raceResults: dynamicResults } = useDynamic2026Data();
  const [currentPage, setCurrentPage] = useState(1);

  // 合流: 把 2026 数据转化为历史格式
  const combinedRaceInfo = useMemo(() => {
    // 基础历史赛事信息 (排除2026，如果之前已被缓存)
    const historicalInfo = state.raceInfo.filter(r => r.season !== 2026);

    // 动态转化 2026 JSON 赛程信息，只保留已经有赛果的比赛
    const dynamicInfo = dynamicSchedule
      .filter((event, idx) => {
        const roundMatch = event.round && typeof event.round === 'string' ? event.round.match(/(\d+)/) : null;
        const roundNo = roundMatch ? parseInt(roundMatch[1], 10) : idx + 1;

        // 检查这个分站是否已经在赛果 JSON 中（未开赛的比赛不会显示）
        return dynamicResults.some(r => Number(r.round) === roundNo && r.results && r.results.length > 0);
      })
      .map((event, idx) => {
        const roundMatch = event.round && typeof event.round === 'string' ? event.round.match(/(\d+)/) : null;
        const roundNo = roundMatch ? parseInt(roundMatch[1], 10) : idx + 1;

        const gpName = event.gpName || event.country;

        // 从抓取结果中寻回这站的杆位数据
        const raceRes = dynamicResults.find(r => Number(r.round) === roundNo);
        const pole = raceRes?.polePosition;

        return {
          season: 2026,
          roundNo: roundNo,
          circuit: event.gpName || event.country,
          circuitCn: GP_TRANSLATIONS[gpName] || gpName, // 映射中文大奖赛名
          poleTime: pole?.time || '',
          poleFirstName: pole?.firstName || '',
          poleFirstNameCn: pole?.firstNameCn || '',
          poleLastName: pole?.lastName || '',
          poleLastNameCn: pole?.lastNameCn || '',
          poleCode: pole?.code || '',
          country: event.country,
          countryCn: translateCountry(event.country), // 映射中文国家名
          startDate: event.dates,
          endDate: '',
          url: event.slug || ''
        };
      });

    return [...dynamicInfo, ...historicalInfo];
  }, [state.raceInfo, dynamicSchedule, dynamicResults]);

  // 合并赛果
  const combinedRaceResults = useMemo(() => {
    const historicalResults = state.raceResults.filter(r => r.season !== 2026);

    const dynamicConverted = dynamicResults.flatMap((raceRound) => {
      return raceRound.results.map((r) => ({
        resultId: 0,
        position: r.pos || 99,
        number: r.number,
        driverId: 0,
        firstName: r.firstName,
        lastName: r.lastName,
        firstNameCn: r.firstNameCn || r.firstName,
        lastNameCn: r.lastNameCn || r.lastName,
        code: r.code,
        team: r.teamCn || r.team,
        laps: 0,
        time: '',
        points: r.points,
        season: 2026,
        roundNo: raceRound.round,
        url: ''
      }));
    });

    return [...dynamicConverted, ...historicalResults];
  }, [state.raceResults, dynamicResults]);

  // 获取所有赛季
  const seasons = useMemo(() => {
    const uniqueSeasons = [...new Set(combinedRaceInfo.map(r => r.season))];
    return uniqueSeasons.sort((a, b) => b - a);
  }, [combinedRaceInfo]);

  // 按比赛分组的结果
  const groupedRaces = useMemo(() => {
    const filtered = combinedRaceInfo.filter(race => {
      const matchesSearch = !state.searchQuery ||
        race.circuit?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        race.country?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        race.poleFirstName?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        race.poleLastName?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        race.poleCode?.toLowerCase().includes(state.searchQuery.toLowerCase());

      const matchesSeason = !state.selectedSeason || race.season === state.selectedSeason;
      return matchesSearch && matchesSeason;
    });

    // 按赛季和场次排序
    return filtered.sort((a, b) => {
      if (a.season !== b.season) return b.season - a.season;
      return a.roundNo - b.roundNo;
    });
  }, [combinedRaceInfo, state.searchQuery, state.selectedSeason]);

  // 获取每个比赛的前3名
  const getTop3ForRace = (season: number, roundNo: number) => {
    return combinedRaceResults
      .filter(r => r.season === season && r.roundNo === roundNo && r.position != null && r.position > 0 && r.position <= 3)
      .sort((a, b) => a.position - b.position)
      .slice(0, 3);
  };

  const totalPages = Math.ceil(groupedRaces.length / ITEMS_PER_PAGE);

  const paginatedRaces = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return groupedRaces.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [groupedRaces, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value });
    setCurrentPage(1);
  };

  const handleSeasonChange = (season: number | null) => {
    dispatch({ type: 'SELECT_SEASON', payload: season });
    setCurrentPage(1);
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/20';
      case 2: return 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-500/20';
      case 3: return 'bg-gradient-to-br from-orange-400 to-orange-600 text-black shadow-lg shadow-orange-500/20';
      default: return 'bg-secondary/20 text-secondary';
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 bg-primary/10 rounded w-64 mb-8 animate-pulse" />
          <div className="space-y-4">
            {Array(5).fill(null).map((_, i) => <SkeletonRaceCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2 flex items-center font-orbitron gap-4">
            <F1Logo className="w-12 md:w-16 h-auto" />
            比赛记录
          </h1>
          <p className="text-secondary text-lg">查看所有 F1 比赛成绩、杆位信息和历史记录</p>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-6 mb-8 border border-border shadow-xl shadow-black/5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
              <input
                type="text"
                placeholder="搜索赛道、国家或车手..."
                value={state.searchQuery}
                onChange={handleSearchChange}
                className="w-full bg-primary/10 border border-border rounded-xl pl-12 pr-4 py-3.5 text-primary placeholder-muted focus:outline-none focus:border-f1-red focus:bg-primary/20 transition-all shadow-inner"
              />
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
              <button
                onClick={() => handleSeasonChange(null)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all font-medium ${state.selectedSeason === null
                  ? 'bg-f1-red text-white shadow-lg shadow-f1-red/30'
                  : 'bg-primary/5 text-secondary hover:bg-primary/20 border border-border'
                  }`}
              >
                全部
              </button>
              {seasons.slice(0, 10).map(season => (
                <button
                  key={season}
                  onClick={() => handleSeasonChange(season)}
                  className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all font-medium ${state.selectedSeason === season
                    ? 'bg-f1-red text-white shadow-lg shadow-f1-red/30'
                    : 'bg-primary/5 text-secondary hover:bg-primary/20 border border-border'
                    }`}
                >
                  {season}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="space-y-6">
          {paginatedRaces.map((race) => {
            const top3 = getTop3ForRace(race.season, race.roundNo);

            return (
              <div
                key={`${race.season}-${race.roundNo}`}
                className="glass rounded-xl p-6 border border-border card-hover shadow-lg shadow-black/5"
              >
                {/* 比赛标题栏 */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
                  <div className="flex items-center space-x-4">
                    <div className="text-f1-red font-bold text-2xl font-orbitron">
                      {race.season}
                    </div>
                    <div>
                      <div className="text-primary font-semibold text-lg">
                        {race.circuitCn}
                        <span className="text-secondary text-sm ml-2 font-normal">({race.circuit})</span>
                      </div>
                      <div className="flex items-center text-secondary text-sm space-x-3">
                        <span className="flex items-center">
                          <MapPin size={14} className="mr-1" />
                          {translateCountry(race.country)} ({race.country})
                        </span>
                        {race.startDate && (
                          <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {race.startDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 杆位信息 */}
                  {race.poleCode && (
                    <div className="flex items-center space-x-3 bg-accent-purple/10 px-4 py-2 rounded-xl border border-accent-purple/20">
                      <Timer size={18} className="text-accent-purple" />
                      <div className="text-right">
                        <div className="text-accent-purple/80 text-[10px] font-bold uppercase tracking-wider">杆位</div>
                        <div className="text-primary font-bold">
                          {race.poleFirstNameCn || race.poleFirstName} {race.poleLastNameCn || race.poleLastName}
                          <span className="text-accent-purple ml-2 text-sm font-mono">({race.poleCode})</span>
                        </div>
                        <div className="text-secondary text-xs font-mono">{race.poleTime}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 前三名 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {top3.length > 0 ? (
                    top3.map((result) => (
                      <div
                        key={`${race.season}-${race.roundNo}-${result.position}`}
                        className="flex items-center space-x-3 bg-secondary/10 dark:bg-primary/10 rounded-xl p-3 border border-border/50 shadow-sm"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${getPositionColor(result.position)}`}>
                          {result.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-primary font-bold truncate">
                            {result.firstNameCn} {result.lastNameCn}
                          </div>
                          <div className="text-f1-red text-sm font-mono">{result.code}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-secondary text-[10px] font-medium">{getTeamDisplayName({ name: result.team })}</div>
                          <div className="text-primary font-bold">{result.points} pts</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-secondary text-center py-4 bg-primary/5 rounded-xl border border-dashed border-border">
                      暂无比赛结果数据
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-primary/10 text-secondary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-border"
            >
              <ChevronLeft size={20} />
            </button>

            {renderPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' && handlePageChange(page)}
                disabled={page === '...'}
                className={`px-4 py-2 rounded-xl transition-all font-medium ${page === currentPage
                  ? 'bg-f1-red text-white shadow-lg shadow-f1-red/30'
                  : page === '...'
                    ? 'bg-transparent text-muted cursor-default'
                    : 'bg-primary/10 text-secondary hover:bg-primary/20 border border-border'
                  }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-primary/10 text-secondary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-border"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Results Info */}
        <div className="mt-6 text-muted text-center text-sm font-medium">
          显示第 {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, groupedRaces.length)} 场，
          共 {groupedRaces.length} 场比赛
          {state.searchQuery && (
            <span>（搜索: "<span className="text-f1-red">{state.searchQuery}</span>"）</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RacesPage;
