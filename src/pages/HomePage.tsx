import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, TrendingUp, ChevronRight, Trophy } from 'lucide-react';
import { useF1 } from '../context/F1Context';
import { CompactDriverCard } from '../components/DriverCard';
import { TeamCard } from '../components/TeamCard';
import { StatCard } from '../components/StatCard';
import F1Logo from '../components/F1Logo';
import RaceCountdown from '../components/RaceCountdown';
import { useDynamic2026Data } from '../hooks/useDynamic2026Data';

const HomePage = () => {
  const { state } = useF1();
  const [mounted, setMounted] = useState(false);
  const { raceResults: liveResults } = useDynamic2026Data();

  useEffect(() => {
    setMounted(true);
  }, []);

  const combinedDrivers = useMemo(() => {
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

    return state.drivers
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
      .sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [state.drivers, liveResults]);

  const combinedTeams = useMemo(() => {
    const liveStatsMap = new Map<string, { points: number; wins: number; podiums: number; poles: number; teamEn: string }>();
    if (liveResults && liveResults.length > 0) {
      liveResults.forEach(r => {
        if (r.polePosition && r.polePosition.code) {
          const poleDriver = r.results.find(res => res.code === r.polePosition!.code);
          if (poleDriver && poleDriver.team) {
            const teamCn = poleDriver.teamCn || poleDriver.team;
            if (!liveStatsMap.has(teamCn)) {
              liveStatsMap.set(teamCn, { points: 0, wins: 0, podiums: 0, poles: 0, teamEn: poleDriver.team });
            }
            liveStatsMap.get(teamCn)!.poles += 1;
          }
        }

        r.results.forEach(res => {
          const teamCn = res.teamCn || res.team;
          if (!liveStatsMap.has(teamCn)) {
            liveStatsMap.set(teamCn, { points: 0, wins: 0, podiums: 0, poles: 0, teamEn: res.team });
          }
          const stats = liveStatsMap.get(teamCn)!;
          stats.points += res.points || 0;
          if (res.pos === 1) stats.wins += 1;
          if (res.pos && res.pos <= 3) stats.podiums += 1;
        });
      });
    }

    return state.teams.map(team => {
      let liveStats = liveStatsMap.get(team.name) || liveStatsMap.get(team.nameCn);

      if (!liveStats) {
        for (const [key, value] of liveStatsMap.entries()) {
          const enName = value.teamEn;
          if (team.name.includes(key) || key.includes(team.name) ||
            (enName && (enName.includes(team.fullName) || team.fullName.includes(enName)))) {
            liveStats = value;
            break;
          }
        }
      }

      if (!liveStats) return team;
      return {
        ...team,
        points: (team.points || 0) + liveStats.points,
        wins: (team.wins || 0) + liveStats.wins,
        podiums: (team.podiums || 0) + liveStats.podiums,
        poles: (team.poles || 0) + liveStats.poles
      };
    }).sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [state.teams, liveResults]);

  const topDrivers = combinedDrivers.slice(0, 5);
  const topTeams = combinedTeams.slice(0, 5);
  const totalRaces = state.raceResults.length;

  return (
    <div className="animate-fade-in">
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
  );
};

export default HomePage;
