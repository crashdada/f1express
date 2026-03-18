import { useMemo, useState } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { useF1 } from '../context/F1Context';
import { DriverCard } from '../components/DriverCard';
import { SkeletonCard } from '../components/Skeletons';
import F1Logo from '../components/F1Logo';
import { TEAM_TRANSLATIONS } from '../utils/translations';
import { useCombinedData } from '../hooks/useCombinedData';

type SortOption = 'points' | 'wins' | 'podiums' | 'poles' | 'championships';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'points', label: '积分' },
  { value: 'wins', label: '胜场' },
  { value: 'podiums', label: '领奖台' },
  { value: 'poles', label: '杆位' },
  { value: 'championships', label: '总冠军' },
];

const DriversPage = () => {
  const { state, dispatch } = useF1();
  const { combinedDrivers, loading } = useCombinedData();
  const [sortBy, setSortBy] = useState<SortOption>('points');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const filteredDrivers = useMemo(() => {
    const query = state.searchQuery.toLowerCase();

    return combinedDrivers
      .filter((driver) => {
        if (showActiveOnly && !(driver as typeof driver & { isActive2026?: boolean }).isActive2026) {
          return false;
        }

        const teamCn = TEAM_TRANSLATIONS[driver.team] || '';
        const fullName = `${driver.firstName} ${driver.lastName}`.toLowerCase();
        const fullNameCn = `${driver.firstNameCn || ''}${driver.lastNameCn || ''}`.toLowerCase();

        return (
          fullName.includes(query) ||
          fullNameCn.includes(query) ||
          driver.firstName.toLowerCase().includes(query) ||
          driver.lastName.toLowerCase().includes(query) ||
          (driver.firstNameCn && driver.firstNameCn.toLowerCase().includes(query)) ||
          (driver.lastNameCn && driver.lastNameCn.toLowerCase().includes(query)) ||
          driver.code.toLowerCase().includes(query) ||
          driver.team.toLowerCase().includes(query) ||
          teamCn.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'wins') return (b.wins || 0) - (a.wins || 0);
        if (sortBy === 'podiums') return (b.podiums || 0) - (a.podiums || 0);
        if (sortBy === 'poles') return (b.poles || 0) - (a.poles || 0);
        if (sortBy === 'championships') return (b.championships || 0) - (a.championships || 0);
        return (b.points || 0) - (a.points || 0);
      });
  }, [combinedDrivers, showActiveOnly, sortBy, state.searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 h-8 w-64 animate-pulse rounded bg-primary/10" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array(6).fill(null).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="mb-2 flex items-center gap-4 font-orbitron text-4xl font-bold text-text-primary md:text-5xl">
                <F1Logo className="h-auto w-12 md:w-16" />
                车手数据
              </h1>
              <p className="text-lg text-text-secondary">探索所有 F1 车手的历史成绩和统计数据</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showActiveOnly}
              aria-label="只显示现役车手"
              onClick={() => setShowActiveOnly((value) => !value)}
              className={`group inline-flex self-start items-center gap-3 rounded-full border px-2.5 py-2 pl-4 text-sm transition-all duration-300 md:self-auto ${
                showActiveOnly
                  ? 'border-f1-red/30 bg-white/85 text-f1-red shadow-[0_14px_32px_rgba(225,6,0,0.16)] backdrop-blur'
                  : 'border-white/50 bg-white/72 text-text-secondary shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur hover:border-f1-red/20 hover:text-text-primary'
              }`}
            >
              <span className="flex flex-col items-start leading-none">
                <span className="text-[11px] uppercase tracking-[0.22em] text-text-secondary/70">2026</span>
                <span className={`mt-1 inline-flex items-center gap-2 text-sm font-semibold ${showActiveOnly ? 'text-f1-red' : 'text-text-primary'}`}>
                  <span
                    className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                      showActiveOnly ? 'bg-f1-red shadow-[0_0_0_4px_rgba(225,6,0,0.12)]' : 'bg-slate-400/80'
                    }`}
                  />
                  {showActiveOnly ? '现役' : '显示现役'}
                </span>
              </span>
              <span
                className={`relative inline-flex h-8 w-14 items-center rounded-full border transition-all duration-300 ${
                  showActiveOnly
                    ? 'border-f1-red/25 bg-gradient-to-r from-f1-red to-red-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                    : 'border-slate-300/70 bg-slate-200/90'
                }`}
              >
                <span
                  className={`absolute inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_rgba(15,23,42,0.18)] transition-all duration-300 ${
                    showActiveOnly ? 'left-[1.7rem]' : 'left-1'
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                      showActiveOnly ? 'bg-f1-red' : 'bg-slate-400'
                    }`}
                  />
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="glass mb-8 rounded-2xl border border-border p-6 shadow-xl shadow-black/5">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 transform text-muted" size={20} />
              <input
                type="text"
                placeholder="搜索车手姓名、代码或车队..."
                value={state.searchQuery}
                onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
                className="w-full rounded-xl border border-border bg-bg-primary/10 py-3.5 pl-12 pr-4 text-text-primary placeholder-muted shadow-inner transition-all focus:border-f1-red focus:bg-bg-primary/20 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`rounded-xl px-4 py-2 font-medium transition-all duration-300 ${
                    sortBy === option.value
                      ? 'bg-f1-red text-white shadow-lg shadow-f1-red/30'
                      : 'border border-border bg-bg-primary/10 text-text-secondary hover:bg-bg-primary/20 hover:text-text-primary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-xl p-3 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                    : 'border border-border bg-bg-primary/10 text-text-secondary hover:bg-bg-primary/20'
                }`}
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-xl p-3 transition-all ${
                  viewMode === 'list'
                    ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                    : 'border border-border bg-bg-primary/10 text-text-secondary hover:bg-bg-primary/20'
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 text-muted">
          显示 <span className="font-semibold text-primary">{filteredDrivers.length}</span> 位车手（共 {combinedDrivers.length} 位）
          {showActiveOnly && <span>，仅现役</span>}
          {state.searchQuery && (
            <span>
              ，搜索 “<span className="text-f1-red">{state.searchQuery}</span>”
            </span>
          )}
        </div>

        <div className="w-full">
          {filteredDrivers.length > 0 && (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-6 pb-12 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-4 pb-12'}>
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

        {filteredDrivers.length === 0 && (
          <div className="py-16 text-center">
            <div className="mb-4 text-6xl">未找到</div>
            <h3 className="mb-2 text-xl font-bold text-text-primary">没有匹配的车手</h3>
            <p className="text-text-secondary">试试调整搜索条件或关闭现役筛选</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriversPage;
