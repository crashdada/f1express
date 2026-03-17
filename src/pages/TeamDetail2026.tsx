import { ChevronLeft, MapPin, Cpu, Zap, Users, Trophy, Target } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { IDriver2026, ITeam2026 } from '../types';
import { useDynamic2026Data } from '../hooks/useDynamic2026Data';

const TeamDetail2026 = () => {
    const { id } = useParams<{ id: string }>();
    const { drivers: allDrivers, teams, raceResults: allRaceResults, loading } = useDynamic2026Data();
    const [team, setTeam] = useState<ITeam2026 | null>(null);
    const [drivers, setDrivers] = useState<IDriver2026[]>([]);

    // Compute live 2026 team stats from JSON results
    const liveTeamStats = useMemo(() => {
        if (!team || !allRaceResults.length) return null;
        const teamCodes = team.drivers || [];
        
        // Calculate points (including Sprints)
        const totalPoints = allRaceResults.reduce((sum, round) => {
            const racePts = (round.results || []).filter(r => teamCodes.includes(r.code)).reduce((s, r) => s + (r.points || 0), 0);
            const sprintPts = (round.sprintResults || []).filter(r => teamCodes.includes(r.code)).reduce((s, r) => s + (r.points || 0), 0);
            return sum + racePts + sprintPts;
        }, 0);

        // Calculate wins/podiums (Main Race ONLY)
        const mainTeamResults = allRaceResults.flatMap(round => 
            (round.results || []).filter(r => teamCodes.includes(r.code))
        );
        const wins = mainTeamResults.filter(r => r.pos === 1).length;
        const podiums = mainTeamResults.filter(r => r.pos != null && r.pos <= 3).length;

        // Compute team rank based on total points (Race + Sprint)
        const allTeamPoints: Record<string, number> = {};
        const driverToTeamMap: Record<string, string> = {};
        allDrivers.forEach(d => { driverToTeamMap[d.code] = d.team; });

        allRaceResults.forEach(round => {
            round.results?.forEach(r => {
                const tName = driverToTeamMap[r.code] || r.team;
                if (tName) allTeamPoints[tName] = (allTeamPoints[tName] || 0) + (r.points || 0);
            });
            round.sprintResults?.forEach(r => {
                const tName = driverToTeamMap[r.code] || r.team;
                if (tName) allTeamPoints[tName] = (allTeamPoints[tName] || 0) + (r.points || 0);
            });
        });

        const sorted = Object.entries(allTeamPoints).sort((a, b) => b[1] - a[1]);
        const rank = sorted.findIndex(([tName]) => tName === team.name) + 1;

        return { points: totalPoints, wins, podiums, rank: rank || undefined };
    }, [team, allDrivers, allRaceResults]);


    useEffect(() => {
        if (!loading && teams.length > 0) {
            const foundTeam = teams.find((t: ITeam2026) => t.id === id);
            if (foundTeam) {
                setTeam(foundTeam);
                const teamDrivers = allDrivers.filter((d: IDriver2026) =>
                    foundTeam.drivers.includes(d.code)
                );
                setDrivers(teamDrivers);
            }
        }
    }, [id, teams, allDrivers, loading]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-primary">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-f1-red"></div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary p-4 text-center">
                <h2 className="text-3xl font-black text-primary mb-4 font-orbitron italic">未找到车队信息</h2>
                <Link to="/new-season" className="text-f1-red font-bold hover:underline flex items-center">
                    <ChevronLeft className="mr-2" /> 返回 2026 赛季
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary pb-20 animate-fade-in font-inter">
            {/* Hero Section - Car Showcase */}
            <div className="relative h-[600px] md:h-[800px] overflow-hidden">
                {/* Brand Accent Background */}
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        background: `linear-gradient(135deg, ${team.color}, transparent 60%)`,
                        filter: 'blur(120px)'
                    }}
                ></div>

                <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/50 via-bg-primary/80 to-bg-primary z-10"></div>

                <div className="relative z-20 max-w-7xl mx-auto px-4 h-full flex flex-col justify-end pb-16">
                    <Link to="/new-season?tab=teams" className="inline-flex items-center text-secondary hover:text-primary mb-12 transition-colors font-bold uppercase tracking-widest text-xs">
                        <ChevronLeft size={20} className="mr-1" /> 返回 2026 车队列表
                    </Link>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="flex-1 w-full text-center md:text-left">
                            <div className="flex items-center gap-6 mb-8 justify-center md:justify-start">
                                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 p-4 shadow-2xl backdrop-blur-xl">
                                    <img src={team.logo} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <div className="w-1.5 h-16 rounded-full" style={{ backgroundColor: team.color }}></div>
                            </div>

                            <h1 className="text-7xl md:text-9xl font-black text-primary mb-4 font-orbitron tracking-tighter leading-none italic uppercase">
                                {team.nameCn}
                            </h1>
                            <p className="text-xl md:text-2xl text-secondary font-bold uppercase tracking-[0.2em] italic">
                                {team.name}
                            </p>
                        </div>

                        <div className="flex-1 w-full max-w-4xl relative">
                            {/* Watermark Logo */}
                            <img
                                src={team.logo}
                                alt=""
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-auto opacity-[0.03] grayscale select-none pointer-events-none"
                            />
                            <img
                                src={team.carImage}
                                alt="2026 Car"
                                className="relative z-10 w-full h-auto object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.6)] animate-float scale-110"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 py-8 relative z-30">
                <div className="space-y-12">

                    {/* Technical Specs - Full Width */}
                    <div className="space-y-12">
                        <div className="glass-strong rounded-[3rem] p-10 md:p-16 border border-white/5 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.02] -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-1000 rotate-45">
                                <Cpu size={400} />
                            </div>

                            <h3 className="text-3xl font-black text-primary font-orbitron flex items-center mb-16 uppercase italic tracking-tight">
                                <Zap className="text-f1-red mr-4" size={36} />
                                技术架构 & 展望
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 text-f1-red mb-4">
                                        <Cpu size={24} />
                                        <span className="text-xs font-black uppercase tracking-widest">动力单元</span>
                                    </div>
                                    <p className="text-4xl font-black text-primary font-orbitron italic leading-tight">
                                        {team.engineCn || team.engine}
                                    </p>
                                    <p className="text-secondary font-medium italic">
                                        {team.techOutlookCn || '针对 2026 规则深度定制，大幅提升电能输出比例，实现近 50/50 的动燃比输出。'}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 text-f1-red mb-4">
                                        <MapPin size={24} />
                                        <span className="text-xs font-black uppercase tracking-widest">总部</span>
                                    </div>
                                    <p className="text-4xl font-black text-primary font-orbitron italic leading-tight">
                                        {team.baseCn || team.base}
                                    </p>
                                    <p className="text-secondary font-medium italic">
                                        {team.baseCn?.includes('意大利') || team.baseCn?.includes('英国') ? '世界顶尖的研发中心，配备了全新的风洞测试设施与高精度模拟器。' : '正在建设中的现代化工厂，旨在为 2026 规则提供最强力的支持。'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Statistics Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Season Performance */}
                            <div className="glass-strong rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden group">
                                <div className="absolute -top-10 -left-10 w-40 h-40 bg-f1-red/10 blur-[80px] rounded-full group-hover:bg-f1-red/20 transition-all duration-1000"></div>
                                <h4 className="text-sm font-black text-secondary uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                                    <Target className="text-f1-red" size={20} />
                                    2026 赛季当前战绩
                                </h4>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">积分</span>
                                        <p className="text-4xl font-black text-primary font-sans tabular-nums">{liveTeamStats?.points ?? team.stats?.points ?? 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">积分榜排名</span>
                                        <p className="text-4xl font-black text-f1-red font-sans tabular-nums">
                                            {(liveTeamStats?.rank ?? team.stats?.rank) ? `P${liveTeamStats?.rank ?? team.stats?.rank}` : '--'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">分站冠军</span>
                                        <p className="text-4xl font-black text-primary font-sans tabular-nums">{liveTeamStats?.wins ?? team.stats?.wins ?? 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">领奖台</span>
                                        <p className="text-4xl font-black text-primary font-sans tabular-nums">{liveTeamStats?.podiums ?? team.stats?.podiums ?? 0}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Historical Achievement */}
                            {team.history && (
                                <div className="glass-strong rounded-[2.5rem] p-10 border border-white/5 relative overflow-hidden group">
                                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent-gold/10 blur-[80px] rounded-full group-hover:bg-accent-gold/20 transition-all duration-1000"></div>
                                    <h4 className="text-sm font-black text-secondary uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                                        <Trophy className="text-accent-gold" size={20} />
                                        历史成就 (荣誉墙)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">车队冠军头衔</span>
                                            <p className="text-4xl font-black text-accent-gold font-sans tabular-nums">{team.history.championships}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">加入 F1 年份</span>
                                            <p className="text-4xl font-black text-primary font-sans tabular-nums">{team.history.firstEntry}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">大奖赛冠军</span>
                                            <p className="text-4xl font-black text-primary font-sans tabular-nums">
                                                {team.history.wins + (liveTeamStats?.wins || 0)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-secondary opacity-60 uppercase">领奖台总数</span>
                                            <p className="text-4xl font-black text-primary font-sans tabular-nums">
                                                {team.history.podiums + (liveTeamStats?.podiums || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lineup Section */}
                        <div className="space-y-8">
                            <h3 className="text-2xl font-black text-primary font-orbitron flex items-center mb-8 uppercase italic tracking-tight">
                                <Users className="text-f1-red mr-4" size={32} />
                                2026 赛季车手阵容
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {drivers.map((driver) => (
                                    <Link
                                        key={driver.id}
                                        to={`/new-season/driver/${driver.id}`}
                                        className="glass-strong rounded-[2.5rem] p-8 border border-white/5 flex items-center gap-8 group hover:border-f1-red/30 transition-all duration-500"
                                    >
                                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 relative shrink-0">
                                            <img src={driver.image} alt="" className="w-full h-full object-cover object-top scale-[1.5] origin-top group-hover:scale-[1.7] transition-transform duration-700" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-f1-red mb-1 block">#{driver.number}</span>
                                            <h4 className="text-2xl font-black text-primary font-orbitron italic uppercase">{driver.lastNameCn || driver.lastName}</h4>
                                            <span className="text-xs text-secondary font-bold uppercase tracking-widest">{driver.code}</span>
                                        </div>
                                        <ChevronLeft className="rotate-180 text-secondary group-hover:text-f1-red transition-all group-hover:translate-x-2" size={20} />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamDetail2026;
