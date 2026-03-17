import { Crown, Timer } from 'lucide-react';
import { TeamRow } from '../components/TeamCard';
import { SkeletonTable } from '../components/Skeletons';
import F1Logo from '../components/F1Logo';
import { useCombinedData } from '../hooks/useCombinedData';

const TeamsPage = () => {
  const { combinedTeams, loading } = useCombinedData();

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 bg-primary/10 rounded w-64 mb-8 animate-pulse" />
          <SkeletonTable />
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
            车队数据
          </h1>
          <p className="text-text-secondary text-lg">探索所有 F1 车队的历史成绩和统计数据</p>
        </div>



        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <div className="glass rounded-2xl p-6 border border-border text-center card-hover shadow-lg shadow-black/5">
            <div className="text-4xl font-bold text-accent-blue mb-2 font-orbitron">
              {combinedTeams.length}
            </div>
            <div className="text-secondary text-sm font-medium">车队总数</div>
          </div>
          <div className="glass rounded-2xl p-6 border border-border text-center card-hover shadow-lg shadow-black/5">
            <div className="text-4xl font-bold text-accent-gold mb-2 font-orbitron">
              {combinedTeams.reduce((sum, t) => sum + t.wins, 0).toLocaleString()}
            </div>
            <div className="text-secondary text-sm font-medium">总胜场</div>
          </div>
          <div className="glass rounded-2xl p-6 border border-border text-center card-hover shadow-lg shadow-black/5">
            <div className="text-4xl font-bold text-accent-purple mb-2 font-orbitron">
              {combinedTeams.reduce((sum, t) => sum + t.podiums, 0).toLocaleString()}
            </div>
            <div className="text-secondary text-sm font-medium">领奖台次数</div>
          </div>
          <div className="glass rounded-2xl p-6 border border-border text-center card-hover shadow-lg shadow-black/5">
            <div className="text-4xl font-bold text-accent-pink mb-2 font-orbitron">
              {combinedTeams.reduce((sum, t) => sum + t.poles, 0).toLocaleString()}
            </div>
            <div className="text-secondary text-sm font-medium">杆位总数</div>
          </div>
          <div className="glass rounded-2xl p-6 border border-border text-center card-hover shadow-lg shadow-black/5 block col-span-2 lg:col-span-1">
            <div className="text-4xl font-bold text-accent-gold mb-2 font-orbitron">
              {combinedTeams.reduce((sum, t) => sum + t.championships, 0).toLocaleString()}
            </div>
            <div className="text-secondary text-sm font-medium">车队总冠军总数</div>
          </div>
        </div>

        {/* Teams Table */}
        <div className="glass rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary/5">
                  <th className="text-left py-4 px-6 text-secondary font-semibold uppercase text-xs tracking-wider">排名</th>
                  <th className="text-left py-4 px-6 text-secondary font-semibold uppercase text-xs tracking-wider">车队</th>
                  <th className="text-right py-4 px-6 text-secondary font-semibold uppercase text-xs tracking-wider">积分</th>
                  <th className="text-right py-4 px-6 text-secondary font-semibold uppercase text-xs tracking-wider">胜场</th>
                  <th className="text-right py-4 px-6 text-secondary font-semibold uppercase text-xs tracking-wider">领奖台</th>
                  <th className="text-right py-4 px-6 text-secondary font-semibold uppercase text-xs tracking-wider">
                    <span className="flex items-center justify-end">
                      <Timer size={14} className="mr-1" />
                      杆位
                    </span>
                  </th>
                  <th className="text-right py-4 px-6 text-secondary font-semibold uppercase text-xs tracking-wider">
                    <span className="flex items-center justify-end">
                      <Crown size={14} className="mr-1" />
                      车手总冠军
                    </span>
                  </th>
                  <th className="text-right py-4 px-6 text-secondary font-semibold uppercase text-xs tracking-wider">
                    <span className="flex items-center justify-end">
                      <Crown size={14} className="mr-1" />
                      车队总冠军
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {combinedTeams.map((team, index) => (
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
