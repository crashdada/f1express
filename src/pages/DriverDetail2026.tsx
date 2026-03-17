import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, Users, Trophy, Info, Sparkles, Target } from 'lucide-react';
import { IDriver2026, ITeam2026 } from '../types';
import { translateCountry } from '../utils/translations';

import { useDynamic2026Data } from '../hooks/useDynamic2026Data';

const DriverDetail2026 = () => {
    const { id } = useParams<{ id: string }>();
    const { drivers, teams, raceResults: allRaceResults, loading } = useDynamic2026Data();
    const [driver, setDriver] = useState<IDriver2026 | null>(null);
    const [team, setTeam] = useState<ITeam2026 | null>(null);

    // Compute live 2026 stats from JSON results
    const liveStats = useMemo(() => {
        if (!driver || !allRaceResults.length) return null;

        // Calculate points (including Sprints)
        const totalPoints = allRaceResults.reduce((sum, round) => {
            const racePt = round.results?.find(r => r.code === driver.code)?.points || 0;
            const sprintPt = round.sprintResults?.find(r => r.code === driver.code)?.points || 0;
            return sum + racePt + sprintPt;
        }, 0);

        // Calculate wins/podiums (Main Race ONLY)
        const mainResults = allRaceResults.flatMap(round => 
            (round.results || []).filter(r => r.code === driver.code)
        );
        const wins = mainResults.filter(r => r.pos === 1).length;
        const podiums = mainResults.filter(r => r.pos != null && r.pos <= 3).length;
        const poles = allRaceResults.filter(r => r.polePosition && r.polePosition.code === driver.code).length;

        // Compute rank based on total points (Race + Sprint)
        const allDriverPoints: Record<string, number> = {};
        allRaceResults.forEach(round => {
            round.results?.forEach(r => {
                allDriverPoints[r.code] = (allDriverPoints[r.code] || 0) + (r.points || 0);
            });
            round.sprintResults?.forEach(r => {
                allDriverPoints[r.code] = (allDriverPoints[r.code] || 0) + (r.points || 0);
            });
        });
        const sortedPoints = Object.entries(allDriverPoints).sort((a, b) => b[1] - a[1]);
        const rank = sortedPoints.findIndex(([code]) => code === driver.code) + 1;

        return { points: totalPoints, wins, podiums, rank: rank || undefined, poles, fastestLaps: 0 };
    }, [driver, allRaceResults]);


    useEffect(() => {
        if (!loading && drivers.length > 0) {
            const foundDriver = drivers.find((d: IDriver2026) => d.id === id);
            if (foundDriver) {
                setDriver(foundDriver);
                const foundTeam = teams.find((t: ITeam2026) =>
                    t.name.includes(foundDriver.team) ||
                    t.nameCn === foundDriver.teamCn ||
                    foundDriver.team.includes(t.name)
                );
                setTeam(foundTeam || null);
            }
        }
    }, [id, drivers, teams, loading]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-primary">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-f1-red"></div>
            </div>
        );
    }

    if (!driver) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary p-4 text-center">
                <h2 className="text-3xl font-black text-primary mb-4 font-orbitron italic">未找到车手信息</h2>
                <Link to="/new-season" className="text-f1-red font-bold hover:underline flex items-center">
                    <ChevronLeft className="mr-2" /> 返回 2026 赛季
                </Link>
            </div>
        );
    }

    const teamColor = team?.color || '#e10600';

    return (
        <div className="min-h-screen bg-bg-primary pb-20 animate-fade-in font-inter">
            {/* Hero Section */}
            <div className="relative h-[550px] md:h-[700px] overflow-hidden">
                {/* Dynamic Background */}
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 70% 30%, ${teamColor}33, transparent 70%)`,
                        filter: 'blur(100px)'
                    }}
                ></div>

                <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-primary/80 to-bg-primary z-10"></div>

                <div className="relative z-20 max-w-7xl mx-auto px-4 h-full flex flex-col md:flex-row items-center md:items-end justify-between pb-32">
                    <div className="flex-1 w-full pt-12">
                        <Link to="/new-season?tab=drivers" className="inline-flex items-center text-secondary hover:text-primary mb-8 transition-colors font-bold uppercase tracking-widest text-xs">
                            <ChevronLeft size={20} className="mr-1" /> 返回 2026 车手列表
                        </Link>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: teamColor }}></div>
                            <span className="text-xl font-black font-orbitron italic text-secondary tracking-widest uppercase">
                                {driver.teamCn}
                            </span>
                        </div>

                        <h1 className="text-7xl md:text-9xl font-black text-primary mb-2 font-orbitron tracking-tighter leading-none italic uppercase">
                            <span className="block text-4xl md:text-5xl opacity-40 not-italic tracking-normal mb-2">{driver.firstNameCn || driver.firstName}</span>
                            {driver.lastNameCn || driver.lastName}
                        </h1>

                        <div className="flex items-center gap-8 mt-8">
                            <div className="text-8xl font-black italic font-orbitron text-primary opacity-10 leading-none">
                                #{driver.number}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black uppercase tracking-[0.3em] text-secondary mb-1 italic">国籍</span>
                                <span className="text-2xl font-black text-primary uppercase">
                                    {driver.nationalityCn || translateCountry(driver.country)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full md:w-1/2 h-full flex items-end justify-center md:justify-end mt-12 md:mt-0">
                        {/* Driver Portrait */}
                        <div className="relative w-full aspect-square md:w-[600px] md:h-[700px] flex items-end justify-center">
                            {/* Big Number Background */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[400px] font-black opacity-[0.03] font-orbitron italic select-none pointer-events-none z-0">
                                {driver.number}
                            </div>

                            <img
                                src={driver.image}
                                alt={driver.lastName}
                                className="relative z-10 w-full h-full object-contain object-bottom scale-80 origin-bottom transition-all duration-1000 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                            />

                            {/* Bottom Fade */}
                            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent z-20"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Sections */}
            <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-30">
                <div className="space-y-8">
                    {/* Main Story & Bio Card - Full Width */}
                    <div className="space-y-8">
                        {/* Driver Story (Dynamic Bio) */}
                        {driver.bioCn && (
                            <div className="glass-strong rounded-[2.5rem] p-8 md:p-12 border border-white/5 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] grayscale pointer-events-none">
                                    <Sparkles size={300} />
                                </div>
                                <h3 className="text-2xl font-black text-primary font-orbitron flex items-center mb-8 italic uppercase tracking-tight">
                                    <Target className="text-f1-red mr-4" size={32} />
                                    车手传奇
                                </h3>
                                <div className="relative z-10">
                                    {driver.bioCn.split('\n\n').map((paragraph, idx) => (
                                        <p key={idx} className="text-lg text-secondary font-medium leading-relaxed italic mb-6 last:mb-0">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="glass-strong rounded-[2.5rem] p-8 md:p-12 border border-white/5 overflow-hidden relative group">
                            {/* Background Watermark */}
                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-1000 rotate-12">
                                <Users size={400} />
                            </div>

                            <h3 className="text-2xl font-black text-primary font-orbitron flex items-center mb-10 italic uppercase tracking-tight">
                                <Info className="text-f1-red mr-4" size={32} />
                                车手详情
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 relative z-10">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary opacity-60">名字</span>
                                    <p className="text-2xl font-black text-primary font-orbitron italic">{driver.firstNameCn || driver.firstName}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary opacity-60">姓氏</span>
                                    <p className="text-2xl font-black text-primary font-orbitron italic">{driver.lastNameCn || driver.lastName}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary opacity-60">缩写</span>
                                    <p className="text-2xl font-black text-f1-red font-orbitron italic">{driver.code}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary opacity-60">车队</span>
                                    <p className="text-xl font-bold text-primary">{driver.teamCn || driver.team}</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary opacity-60">国籍</span>
                                    <p className="text-xl font-bold text-primary">
                                        {driver.nationalityCn || translateCountry(driver.country)}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary opacity-60">车号</span>
                                    <p className="text-xl font-bold text-primary font-orbitron">#{driver.number}</p>
                                </div>
                            </div>
                        </div>

                        {/* Statistics Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            {/* Season Performance */}
                            <div className="glass-strong rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden group">
                                <div className="absolute -top-10 -left-10 w-40 h-40 bg-f1-red/10 blur-[80px] rounded-full group-hover:bg-f1-red/20 transition-all duration-1000"></div>
                                <h4 className="text-sm font-black text-secondary uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                                    <Target className="text-f1-red" size={20} />
                                    2026 赛季表现
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">当前积分</span>
                                        <p className="text-4xl font-black text-primary font-sans tabular-nums">{liveStats?.points ?? driver.stats?.points ?? 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">积分榜排名</span>
                                        <p className="text-4xl font-black text-f1-red font-sans tabular-nums">
                                            {(liveStats?.rank ?? driver.stats?.rank) ? `P${liveStats?.rank ?? driver.stats?.rank}` : '--'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">分站冠军</span>
                                        <p className="text-4xl font-black text-primary font-sans tabular-nums">{liveStats?.wins ?? driver.stats?.wins ?? 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">领奖台</span>
                                        <p className="text-4xl font-black text-primary font-sans tabular-nums">{liveStats?.podiums ?? driver.stats?.podiums ?? 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">杆位</span>
                                        <p className="text-4xl font-black text-primary font-sans tabular-nums">{liveStats?.poles ?? driver.stats?.poles ?? 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">最快圈</span>
                                        <p className="text-4xl font-black text-primary font-sans tabular-nums">{liveStats?.fastestLaps ?? driver.stats?.fastestLaps ?? 0}</p>
                                    </div>
                                </div>

                            </div>

                            {/* Career Achievement */}
                            {driver.careerStats && (
                                <div className="glass-strong rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden group">
                                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent-gold/10 blur-[80px] rounded-full group-hover:bg-accent-gold/20 transition-all duration-1000"></div>
                                    <h4 className="text-sm font-black text-secondary uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                                        <Trophy className="text-accent-gold" size={20} />
                                        生涯累计成绩
                                    </h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">世界冠军</span>
                                            <p className="text-4xl font-black text-accent-gold font-sans tabular-nums">
                                                {driver.careerStats.championships}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">分站冠军</span>
                                            <p className="text-4xl font-black text-primary font-sans tabular-nums">
                                                {driver.careerStats.wins + (liveStats?.wins || 0)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">领奖台总数</span>
                                            <p className="text-4xl font-black text-primary font-sans tabular-nums">
                                                {driver.careerStats.podiums + (liveStats?.podiums || 0)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">杆位总数</span>
                                            <p className="text-4xl font-black text-primary font-sans tabular-nums">
                                                {(driver.careerStats.poles || 0) + (liveStats?.poles || 0)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">参加分站总数</span>
                                            <p className="text-4xl font-black text-primary font-sans tabular-nums">
                                                {driver.careerStats.entries + allRaceResults.length}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">职业生涯总积分</span>
                                            <p className="text-4xl font-black text-primary font-sans tabular-nums">
                                                {(driver.careerStats.points + (liveStats?.points || 0)).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Car Preview Section */}
                        {team?.carImage && (
                            <div className="glass-strong rounded-[2.5rem] p-12 border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.05] grayscale">
                                    <img src={team.logo} alt="" className="w-64 h-64 object-contain" />
                                </div>

                                <h3 className="text-2xl font-black text-primary font-orbitron flex items-center mb-8 italic uppercase tracking-tight">
                                    <Sparkles className="text-f1-red mr-4" size={32} />
                                    2026 战驹预览
                                </h3>

                                <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                                    <div className="flex-1">
                                        <p className="text-lg text-secondary font-medium leading-relaxed italic">
                                            {driver.outlookCn || `${driver.lastNameCn} 将在 2026 赛季驾驶由 ${team?.engineCn || team?.engine || '全新'} 提供动力的规则赛车。`}
                                        </p>
                                        <Link
                                            to={`/new-season/team/${team.id}`}
                                            className="inline-flex items-center mt-8 px-8 py-3 bg-f1-red text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-f1-red/20"
                                        >
                                            了解 {team.nameCn} <ChevronLeft className="ml-2 rotate-180" size={16} />
                                        </Link>
                                    </div>
                                    <div className="w-full md:w-1/2">
                                        <img
                                            src={team.carImage}
                                            alt="2026 Car"
                                            className="w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform duration-1000"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverDetail2026;
