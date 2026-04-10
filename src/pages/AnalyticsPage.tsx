import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line, Radar } from 'react-chartjs-2';
import { Users, Flag, TrendingUp, History, Calendar } from 'lucide-react';
import { useF1 } from '../context/F1Context';
import { SkeletonChart } from '../components/Skeletons';
import F1Logo from '../components/F1Logo';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Filler
);

const AnalyticsPage = () => {
  const { state, resolvedTheme } = useF1();
  const [timeRange, setTimeRange] = useState<'all' | number>('all');

  // 获取所有可用的年份选项
  const seasonOptions = useMemo(() => {
    const seasons = [...new Set(state.raceResults.map(r => r.season))]
      .filter((s): s is number => typeof s === 'number')
      .sort((a, b) => b - a);
    return seasons;
  }, [state.raceResults]);

  // 动态聚合所选时间范围内的数据
  const filteredData = useMemo(() => {
    if (!state.raceResults.length) return null;

    const results = timeRange === 'all'
      ? state.raceResults
      : state.raceResults.filter(r => r.season === timeRange);

    // 汇总车手统计
    const driverStats: Record<string, {
      code: string;
      points: number;
      wins: number;
      podiums: number;
      fullName: string;
      mainTeam: string;
    }> = {};
    const driverTeamPoints: Record<string, Record<string, number>> = {};

    results.forEach(r => {
      if (!driverStats[r.code]) {
        driverStats[r.code] = {
          code: r.code,
          points: 0,
          wins: 0,
          podiums: 0,
          fullName: r.firstNameCn ? `${r.firstNameCn} ${r.lastNameCn}` : `${r.firstName} ${r.lastName}`,
          mainTeam: r.team || ''
        };
      }
      driverStats[r.code].points += r.points;
      
      // 只有正赛（非冲刺赛）才计入胜场和领奖台统计
      // 同时检查 isSprint 标志和比赛名称中是否包含 "Sprint"
      const isSprint = r.isSprint === true || (r.grandPrix && r.grandPrix.includes('Sprint'));
      if (!isSprint) {
        if (r.position === 1) driverStats[r.code].wins += 1;
        if (r.position >= 1 && r.position <= 3) driverStats[r.code].podiums += 1;
      }

      if (r.team) {
        if (!driverTeamPoints[r.code]) driverTeamPoints[r.code] = {};
        driverTeamPoints[r.code][r.team] = (driverTeamPoints[r.code][r.team] || 0) + r.points;
      }
    });

    // 确定每个车手在当前时间范围内的“主队”（贡献积分最多的车队）
    Object.keys(driverStats).forEach(code => {
      const teams = driverTeamPoints[code];
      if (teams && Object.keys(teams).length > 0) {
        driverStats[code].mainTeam = Object.entries(teams).sort((a, b) => b[1] - a[1])[0][0];
      }
    });

    // 汇总车队统计
    const teamStats: Record<string, { name: string; points: number; wins: number; podiums: number }> = {};
    results.forEach(r => {
      if (!r.team) return;
      if (!teamStats[r.team]) {
        teamStats[r.team] = { name: r.team, points: 0, wins: 0, podiums: 0 };
      }
      teamStats[r.team].points += r.points;
      
      // 只有正赛才计入车队胜场和领奖台统计
      const isSprint = r.isSprint === true || (r.grandPrix && r.grandPrix.includes('Sprint'));
      if (!isSprint) {
        if (r.position === 1) teamStats[r.team].wins += 1;
        if (r.position >= 1 && r.position <= 3) teamStats[r.team].podiums += 1;
      }
    });

    const sortedDriversByPoints = Object.values(driverStats).sort((a, b) => b.points - a.points);
    const sortedTeamsByPoints = Object.values(teamStats).sort((a, b) => b.points - a.points);
    const sortedDriversByWins = Object.values(driverStats).sort((a, b) => b.wins - a.wins);
    const sortedDriversByPodiums = Object.values(driverStats).sort((a, b) => b.podiums - a.podiums);

    return {
      drivers: sortedDriversByPoints,
      teams: sortedTeamsByPoints,
      winsDrivers: sortedDriversByWins,
      podiumDrivers: sortedDriversByPodiums,
      results
    };
  }, [state.raceResults, timeRange]);

  const teamColorMap: Record<string, string> = {
    // 2026 Teams
    '梅赛德斯': '#27f4d2',
    'Mercedes': '#27f4d2',
    '法拉利': '#e10600',
    'Ferrari': '#e10600',
    '红牛': '#0600ef',
    'Red Bull': '#0600ef',
    'Red Bull Racing': '#0600ef',
    '迈凯伦': '#ff8700',
    'McLaren': '#ff8700',
    '阿斯顿马丁': '#229971',
    '阿斯顿·马丁': '#229971',
    'Aston Martin': '#229971',
    '奥迪': '#f50537',
    'audi': '#f50537',
    'Audi F1 Team': '#f50537',
    '哈斯': '#b6babd',
    'Haas': '#b6babd',
    '威廉姆斯': '#64c4ff',
    'Williams': '#64c4ff',
    '阿尔派': '#0093cc',
    'Alpine': '#0093cc',
    'RB': '#6692ff',
    'Racing Bulls': '#6692ff',
    '红牛二队': '#6692ff',
    '凯迪拉克': '#ffce00',
    'Cadillac': '#ffce00',
    'Cadillac F1 Team': '#ffce00',
    
    // Historical Teams
    '索伯': '#52e252',
    'Sauber': '#52e252',
    '雷诺': '#fff000',
    'Renault': '#fff000',
    '莲花': '#c5a059',
    'Lotus': '#c5a059',
    '印度力量': '#f596c8',
    'Force India': '#f596c8',
    '贝纳通': '#00d2ff',
    'Benetton': '#00d2ff',
    '飞箭': '#ff5f00',
    'Arrows': '#ff5f00',
  };

  const getTeamColor = (teamName: string) => {
    if (teamColorMap[teamName]) return teamColorMap[teamName];
    const match = state.teams.find(st => st.name === teamName || st.nameCn === teamName);
    return match?.color || '#e10600';
  };

  const topDrivers = filteredData?.drivers.slice(0, 10) || [];
  const topTeams = filteredData?.teams.slice(0, 8) || [];

  const driverChartData = {
    labels: topDrivers.map(d => d.code),
    datasets: [
      {
        label: '积分',
        data: topDrivers.map(d => d.points),
        backgroundColor: topDrivers.map(d => getTeamColor(d.mainTeam)),
        borderWidth: 0,
      },
    ],
  };

  const teamChartData = {
    labels: topTeams.map(t => {
      const match = state.teams.find(st => st.name === t.name);
      return match?.nameCn || t.name;
    }),
    datasets: [
      {
        label: '积分',
        data: topTeams.map(t => t.points),
        backgroundColor: topTeams.map(t => getTeamColor(t.name)),
        borderWidth: 0,
      },
    ],
  };

  const topDriversByWins = filteredData?.winsDrivers.slice(0, 10) || [];

  const winsChartData = {
    labels: topDriversByWins.map(d => d.code),
    datasets: [
      {
        label: '胜场',
        data: topDriversByWins.map(d => d.wins),
        backgroundColor: topDriversByWins.map(d => getTeamColor(d.mainTeam)),
        borderRadius: 8,
      },
    ],
  };

  const seasonTrendData = useMemo(() => {
    const results = filteredData?.results || [];
    
    // 如果是“全历史”，显示历年总积分趋势
    if (timeRange === 'all') {
      const seasonStats: Record<number, { totalPoints: number }> = {};
      results.forEach(result => {
        const season = result.season || 2025;
        if (!seasonStats[season]) seasonStats[season] = { totalPoints: 0 };
        seasonStats[season].totalPoints += result.points || 0;
      });

      const sortedSeasons = Object.keys(seasonStats).sort((a, b) => parseInt(a) - parseInt(b));
      return {
        labels: sortedSeasons,
        datasets: [
          {
            label: '赛季总积分趋势',
            data: sortedSeasons.map(season => seasonStats[parseInt(season)].totalPoints),
            borderColor: '#e10600',
            backgroundColor: 'rgba(225, 6, 0, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#e10600',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
          },
        ],
      };
    } 
    
    // 如果选择了特定年份，显示该赛季的积分增长路径
    const roundStats: Record<number, number> = {};
    results.forEach(result => {
      const round = result.roundNo || 0;
      if (round === 0) return;
      roundStats[round] = (roundStats[round] || 0) + (result.points || 0);
    });

    const sortedRounds = Object.keys(roundStats).map(Number).sort((a, b) => a - b);
    let runningTotal = 0;
    const accumulatedPoints = sortedRounds.map(round => {
      runningTotal += roundStats[round];
      return runningTotal;
    });

    return {
      labels: sortedRounds.map(r => `R${r}`),
      datasets: [
        {
          label: `${timeRange} 赛季积分增长`,
          data: accumulatedPoints,
          borderColor: '#27f4d2', // 2026 风格的主题色
          backgroundColor: 'rgba(39, 244, 210, 0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#27f4d2',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
      ],
    };
  }, [filteredData, timeRange]);

  const teamRadarData = useMemo(() => {
    const topTeamsGlobal = filteredData?.teams.slice(0, 5) || [];
    if (!topTeamsGlobal.length) return { labels: [], datasets: [] };

    const maxPoints = Math.max(...(filteredData?.teams.map(t => t.points) || [1])) || 1;
    const maxWins = Math.max(...(filteredData?.teams.map(t => t.wins) || [1])) || 1;
    const maxPodiums = Math.max(...(filteredData?.teams.map(t => t.podiums) || [1])) || 1;

    return {
      labels: ['积分', '胜场', '领奖台', '综合'],
      datasets: topTeamsGlobal.map((team, index) => {
        const match = state.teams.find(st => st.name === team.name);
        return {
          label: match?.nameCn || team.name,
          data: [
            (team.points / maxPoints) * 100,
            (team.wins / maxWins) * 100,
            (team.podiums / maxPodiums) * 100,
            ((team.points / maxPoints) * 0.4 + (team.wins / maxWins) * 0.3 + (team.podiums / maxPodiums) * 0.3) * 100,
          ],
          borderColor: match?.color || `hsl(${index * 60}, 70%, 50%)`,
          backgroundColor: match?.color ? `${match.color}33` : `hsla(${index * 60}, 70%, 50%, 0.2)`,
          borderWidth: 2,
        };
      }),
    };
  }, [filteredData, state.teams]);

  const podiumDistributionData = useMemo(() => {
    const top8DriversByPodiums = filteredData?.podiumDrivers.slice(0, 8) || [];

    return {
      labels: top8DriversByPodiums.map(d => d.code),
      datasets: [
        {
          label: '冠军',
          data: top8DriversByPodiums.map(d => d.wins),
          backgroundColor: '#FFD700',
          borderRadius: 4,
        },
        {
          label: '领奖台(非冠)',
          data: top8DriversByPodiums.map(d => Math.max(0, d.podiums - d.wins)),
          backgroundColor: '#C0C0C0',
          borderRadius: 4,
        },
      ],
    };
  }, [filteredData]);

  const isDark = resolvedTheme === 'dark';
  const labelColor = isDark ? '#9ca3af' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  if (state.loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 bg-primary/10 rounded w-64 mb-8 animate-pulse" />
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {Array(4).fill(null).map((_, i) => (
              <div key={i} className="h-32 bg-primary/10 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            {Array(4).fill(null).map((_, i) => <SkeletonChart key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header with Filter */}
        <div className="flex flex-col mb-8 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2 flex items-center font-orbitron gap-4">
              <F1Logo className="w-12 md:w-16 h-auto" />
              数据分析
            </h1>
            <p className="text-secondary text-lg font-medium">可视化分析 F1 历史数据</p>
          </div>

          <div className="flex glass rounded-2xl border border-border w-full overflow-hidden">
            <div className="flex-none p-1 border-r border-border bg-white/5">
              <button
                onClick={() => setTimeRange('all')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${timeRange === 'all'
                  ? 'bg-f1-red text-white shadow-lg shadow-f1-red/30'
                  : 'text-secondary hover:text-primary hover:bg-white/10'
                  }`}
              >
                <History size={16} />
                全历史
              </button>
            </div>
            <div className="flex overflow-x-auto p-1 gap-2 no-scrollbar scroll-smooth">
              {seasonOptions.map(year => (
                <button
                  key={year}
                  onClick={() => setTimeRange(year)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${timeRange === year
                    ? 'bg-f1-red text-white shadow-lg shadow-f1-red/30'
                    : 'text-secondary hover:text-primary hover:bg-white/5'
                    }`}
                >
                  <Calendar size={16} />
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6 border border-border text-center card-hover shadow-lg shadow-black/5">
            <div className="text-4xl font-bold text-f1-red mb-2 font-orbitron">
              {filteredData?.drivers.length || 0}
            </div>
            <div className="text-secondary text-sm font-medium">参与车手</div>
          </div>
          <div className="glass rounded-2xl p-6 border border-border text-center card-hover shadow-lg shadow-black/5">
            <div className="text-4xl font-bold text-f1-red mb-2 font-orbitron">
              {filteredData?.teams.length || 0}
            </div>
            <div className="text-secondary text-sm font-medium">参与车队</div>
          </div>
          <div className="glass rounded-2xl p-6 border border-border text-center card-hover shadow-lg shadow-black/5">
            <div className="text-4xl font-bold text-f1-red mb-2 font-orbitron">
              {filteredData?.results.reduce((sum, d) => (d.position === 1 ? sum + 1 : sum), 0)}
            </div>
            <div className="text-secondary text-sm font-medium">分站总数</div>
          </div>
          <div className="glass rounded-2xl p-6 border border-border text-center card-hover shadow-lg shadow-black/5">
            <div className="text-4xl font-bold text-f1-red mb-2 font-orbitron">
              {[...new Set(filteredData?.results.map(r => r.season))].length}
            </div>
            <div className="text-secondary text-sm font-medium">覆盖赛季</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Driver Points Doughnut */}
          <div className="glass rounded-2xl p-6 border border-border shadow-xl shadow-black/5">
            <h3 className="text-xl font-bold text-primary mb-6 flex items-center font-orbitron">
              <Users className="text-f1-red mr-3" size={24} />
              Top 10 车手积分分布
            </h3>
            <div className="h-80">
              <Doughnut
                data={driverChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        color: labelColor,
                        font: { size: 11, weight: 'bold' },
                        padding: 15,
                        usePointStyle: true,
                      },
                    },
                    tooltip: {
                      backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                      titleColor: isDark ? '#fff' : '#1a1a1a',
                      bodyColor: isDark ? '#ccc' : '#4a4a4a',
                      padding: 12,
                      cornerRadius: 12,
                      callbacks: {
                        afterLabel: (context) => {
                          const driver = topDrivers[context.dataIndex];
                          const match = state.teams.find(st => st.name === driver.mainTeam);
                          return `主队: ${match?.nameCn || driver.mainTeam}`;
                        }
                      }
                    }
                  },
                }}
              />
            </div>
          </div>

          {/* Team Points Bar */}
          <div className="glass rounded-2xl p-6 border border-border shadow-xl shadow-black/5">
            <h3 className="text-xl font-bold text-primary mb-6 flex items-center font-orbitron">
              <F1Logo className="mr-3" fill="#e10600" style={{ height: '20px' }} />
              Top 8 车队积分
            </h3>
            <div className="h-80">
              <Bar
                data={teamChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    x: {
                      ticks: { color: labelColor, font: { weight: 'bold' } },
                      grid: { color: gridColor },
                    },
                    y: {
                      ticks: { color: labelColor, font: { weight: 'bold' } },
                      grid: { display: false },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Wins Bar Chart */}
          <div className="glass rounded-2xl p-6 border border-border shadow-xl shadow-black/5">
            <h3 className="text-xl font-bold text-primary mb-6 flex items-center font-orbitron">
              <Flag className="text-f1-red mr-3" size={24} />
              Top 10 车手胜场数
            </h3>
            <div className="h-80">
              <Bar
                data={winsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        afterLabel: (context) => {
                          const driver = topDriversByWins[context.dataIndex];
                          const match = state.teams.find(st => st.name === driver.mainTeam);
                          return `车队: ${match?.nameCn || driver.mainTeam}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      ticks: { color: labelColor, font: { weight: 'bold' } },
                      grid: { display: false },
                    },
                    y: {
                      ticks: { color: labelColor, font: { weight: 'bold' } },
                      grid: { color: gridColor },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Season Trend */}
          <div className="glass rounded-2xl p-6 border border-border shadow-xl shadow-black/5">
            <h3 className="text-xl font-bold text-primary mb-6 flex items-center font-orbitron">
              <TrendingUp className="text-f1-red mr-3" size={24} />
              赛季积分趋势
            </h3>
            <div className="h-80">
              <Line
                data={seasonTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: { color: labelColor, font: { weight: 'bold' } },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: labelColor, font: { weight: 'bold' } },
                      grid: { color: gridColor },
                    },
                    y: {
                      ticks: { color: labelColor, font: { weight: 'bold' } },
                      grid: { color: gridColor },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Team Radar */}
          <div className="glass rounded-2xl p-6 border border-border shadow-xl shadow-black/5">
            <h3 className="text-xl font-bold text-primary mb-6 flex items-center font-orbitron">
              <F1Logo className="mr-3" fill="#e10600" style={{ height: '20px' }} />
              Top 5 车队综合能力对比
            </h3>
            <div className="h-80">
              <Radar
                data={teamRadarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: labelColor,
                        font: { size: 11, weight: 'bold' },
                        padding: 10,
                        usePointStyle: true,
                      },
                    },
                  },
                  scales: {
                    r: {
                      angleLines: { color: gridColor },
                      grid: { color: gridColor },
                      pointLabels: { color: labelColor, font: { weight: 'bold' } },
                      ticks: { display: false, backdropColor: 'transparent' },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Podium Distribution */}
          <div className="glass rounded-2xl p-6 border border-border shadow-xl shadow-black/5">
            <h3 className="text-xl font-bold text-primary mb-6 flex items-center font-orbitron">
              <Users className="text-f1-red mr-3" size={24} />
              Top 8 车手领奖台分布
            </h3>
            <div className="h-80">
              <Bar
                data={podiumDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: labelColor, font: { weight: 'bold' }, usePointStyle: true },
                    },
                    tooltip: {
                      callbacks: {
                        afterLabel: (context) => {
                          const top8DriversByPodiums = filteredData?.podiumDrivers.slice(0, 8) || [];
                          const driver = top8DriversByPodiums[context.dataIndex];
                          const match = state.teams.find(st => st.name === driver.mainTeam);
                          return `车队: ${match?.nameCn || driver.mainTeam}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      ticks: { color: labelColor, font: { weight: 'bold' } },
                      grid: { display: false },
                    },
                    y: {
                      ticks: { color: labelColor, font: { weight: 'bold' } },
                      grid: { color: gridColor },
                      stacked: true,
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
