import { useState, useMemo } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { useF1 } from '../context/F1Context';
import { DriverCard } from '../components/DriverCard';
import { SkeletonCard } from '../components/Skeletons';
import F1Logo from '../components/F1Logo';
import { useDynamic2026Data } from '../hooks/useDynamic2026Data';


type SortOption = 'points' | 'wins' | 'podiums' | 'poles' | 'championships';

const DriversPage = () => {
  const { state, dispatch } = useF1();
  const { raceResults: liveResults } = useDynamic2026Data();
  const [sortBy, setSortBy] = useState<SortOption>('points');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredDrivers = useMemo(() => {
    const query = state.searchQuery.toLowerCase();

    // Process 2026 live stats
    const liveStatsMap = new Map<string, { points: number; wins: number; podiums: number; poles: number }>();
    if (liveResults && liveResults.length > 0) {
      liveResults.forEach(r => {
        if (r.polePosition && r.polePosition.code) {
          const code = r.polePosition.code;
          if (!liveStatsMap.has(code)) {
            liveStatsMap.set(code, { points: 0, wins: 0, podiums: 0, poles: 0 });
          }
          liveStatsMap.get(code)!.poles += 1;
        }

        r.results.forEach(res => {
          const code = res.code;
          if (!liveStatsMap.has(code)) {
            liveStatsMap.set(code, { points: 0, wins: 0, podiums: 0, poles: 0 });
          }
          const stats = liveStatsMap.get(code)!;
          stats.points += res.points || 0;
          if (res.pos === 1) stats.wins += 1;
          if (res.pos && res.pos <= 3) stats.podiums += 1;
        });
      });
    }

    const filtered = state.drivers
      .map(driver => {
        const liveStats = liveStatsMap.get(driver.code);
        if (!liveStats) return driver;
        return {
          ...driver,
          points: (driver.points || 0) + liveStats.points,
          wins: (driver.wins || 0) + liveStats.wins,
          podiums: (driver.podiums || 0) + liveStats.podiums,
          poles: (driver.poles || 0) + liveStats.poles
        };
      })
      .filter(driver => {
        return (
          driver.firstName.toLowerCase().includes(query) ||
          driver.lastName.toLowerCase().includes(query) ||
          (driver.firstNameCn && driver.firstNameCn.toLowerCase().includes(query)) ||
          (driver.lastNameCn && driver.lastNameCn.toLowerCase().includes(query)) ||
          driver.code.toLowerCase().includes(query) ||
          driver.team.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'wins') return (b.wins || 0) - (a.wins || 0);
        if (sortBy === 'podiums') return (b.podiums || 0) - (a.podiums || 0);
        if (sortBy === 'poles') return (b.poles || 0) - (a.poles || 0);
        if (sortBy === 'championships') return (b.championships || 0) - (a.championships || 0);
        return (b.points || 0) - (a.points || 0);
      });

    return filtered;
  }, [state.drivers, state.searchQuery, sortBy, liveResults]);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'points', label: '积分' },
    { value: 'wins', label: '胜场' },
    { value: 'podiums', label: '领奖台' },
    { value: 'poles', label: '杆位' },
    { value: 'championships', label: '车手总冠军' },
  ];

  if (state.loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 bg-primary/10 rounded w-64 mb-8 animate-pulse" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(null).map((_, i) => <SkeletonCard key={i} />)}
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
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-2 flex items-center font-orbitron gap-4">
            <F1Logo className="w-12 md:w-16 h-auto" />
            车手数据
          </h1>
          <p className="text-text-secondary text-lg">探索所有 F1 车手的历史成绩和统计数据</p>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-6 mb-8 border border-border shadow-xl shadow-black/5">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
              <input
                type="text"
                placeholder="搜索车手姓名、代码或车队..."
                value={state.searchQuery}
                onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
                className="w-full bg-bg-primary/10 border border-border rounded-xl pl-12 pr-4 py-3.5 text-text-primary placeholder-muted focus:outline-none focus:border-f1-red focus:bg-bg-primary/20 transition-all shadow-inner"
              />
            </div>

            {/* Sort Options */}
            <div className="flex gap-2 flex-wrap">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 font-medium ${sortBy === option.value
                    ? 'bg-f1-red text-white shadow-lg shadow-f1-red/30'
                    : 'bg-bg-primary/10 text-text-secondary hover:bg-bg-primary/20 hover:text-text-primary border border-border'
                    } `}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* View Mode */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-xl transition-all ${viewMode === 'grid'
                  ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                  : 'bg-bg-primary/10 text-text-secondary hover:bg-bg-primary/20 border border-border'
                  } `}
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-xl transition-all ${viewMode === 'list'
                  ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                  : 'bg-bg-primary/10 text-text-secondary hover:bg-bg-primary/20 border border-border'
                  } `}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 text-muted">
          显示 <span className="text-primary font-semibold">{filteredDrivers.length}</span> 位车手 (共 {state.drivers.length} 位)
          {state.searchQuery && (
            <span>，搜索: "<span className="text-f1-red">{state.searchQuery}</span>"</span>
          )}
        </div>

        {/* Drivers Grid/List */}
        <div className="w-full">
          {filteredDrivers.length > 0 && (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12'
              : 'flex flex-col gap-4 pb-12'}>
              {filteredDrivers.map((driver, index) => (
                <DriverCard
                  key={driver.id || driver.code || index}
                  driver={driver}
                  index={index}
                  variant={viewMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredDrivers.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">未找到车手</h3>
            <p className="text-text-secondary">尝试调整搜索条件</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriversPage;
