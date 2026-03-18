import { useMemo, useState } from 'react';
import { Crown, Timer } from 'lucide-react';
import { TeamRow } from '../components/TeamCard';
import { SkeletonTable } from '../components/Skeletons';
import F1Logo from '../components/F1Logo';
import { useCombinedData } from '../hooks/useCombinedData';

const TeamsPage = () => {
  const { combinedTeams, activeTeamKeys, loading } = useCombinedData();
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const filteredTeams = useMemo(() => {
    if (!showActiveOnly) {
      return combinedTeams;
    }

    return combinedTeams.filter((team) => (team as typeof team & { isActive2026?: boolean }).isActive2026);
  }, [activeTeamKeys, combinedTeams, showActiveOnly]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 h-8 w-64 animate-pulse rounded bg-primary/10" />
          <SkeletonTable />
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
                车队数据
              </h1>
              <p className="text-lg text-text-secondary">探索所有 F1 车队的历史成绩和统计数据</p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={showActiveOnly}
              aria-label="只显示现役车队"
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

        <div className="glass mb-8 flex flex-col gap-4 rounded-2xl border border-border p-6 shadow-xl shadow-black/5 md:flex-row md:items-center md:justify-between">
          <div className="text-muted">
            显示 <span className="font-semibold text-primary">{filteredTeams.length}</span> 支车队（共 {combinedTeams.length} 支）
            {showActiveOnly && <span>，仅现役</span>}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
          <div className="glass card-hover rounded-2xl border border-border p-6 text-center shadow-lg shadow-black/5">
            <div className="mb-2 font-orbitron text-4xl font-bold text-accent-blue">{filteredTeams.length}</div>
            <div className="text-sm font-medium text-secondary">车队总数</div>
          </div>
          <div className="glass card-hover rounded-2xl border border-border p-6 text-center shadow-lg shadow-black/5">
            <div className="mb-2 font-orbitron text-4xl font-bold text-accent-gold">
              {filteredTeams.reduce((sum, t) => sum + t.wins, 0).toLocaleString()}
            </div>
            <div className="text-sm font-medium text-secondary">总胜场</div>
          </div>
          <div className="glass card-hover rounded-2xl border border-border p-6 text-center shadow-lg shadow-black/5">
            <div className="mb-2 font-orbitron text-4xl font-bold text-accent-purple">
              {filteredTeams.reduce((sum, t) => sum + t.podiums, 0).toLocaleString()}
            </div>
            <div className="text-sm font-medium text-secondary">领奖台次数</div>
          </div>
          <div className="glass card-hover rounded-2xl border border-border p-6 text-center shadow-lg shadow-black/5">
            <div className="mb-2 font-orbitron text-4xl font-bold text-accent-pink">
              {filteredTeams.reduce((sum, t) => sum + t.poles, 0).toLocaleString()}
            </div>
            <div className="text-sm font-medium text-secondary">杆位总数</div>
          </div>
          <div className="glass card-hover col-span-2 block rounded-2xl border border-border p-6 text-center shadow-lg shadow-black/5 lg:col-span-1">
            <div className="mb-2 font-orbitron text-4xl font-bold text-accent-gold">
              {filteredTeams.reduce((sum, t) => sum + t.championships, 0).toLocaleString()}
            </div>
            <div className="text-sm font-medium text-secondary">车队总冠军总数</div>
          </div>
        </div>

        <div className="glass overflow-hidden rounded-2xl border border-border shadow-2xl shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary/5">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-secondary">排名</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-secondary">车队</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-secondary">积分</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-secondary">胜场</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-secondary">领奖台</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-secondary">
                    <span className="flex items-center justify-end">
                      <Timer size={14} className="mr-1" />
                      杆位
                    </span>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-secondary">
                    <span className="flex items-center justify-end">
                      <Crown size={14} className="mr-1" />
                      车手总冠军
                    </span>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-secondary">
                    <span className="flex items-center justify-end">
                      <Crown size={14} className="mr-1" />
                      车队总冠军
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team, index) => (
                  <TeamRow key={team.fullName || team.name} team={team} index={index} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamsPage;
