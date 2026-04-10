import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
    ChevronLeft, Trophy, Medal, History, Milestone, Zap, Hash, Target, Users, TrendingUp, Calendar, MapPin, Flag
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useF1 } from '../context/F1Context';
import F1Logo from '../components/F1Logo';
import { SkeletonCard } from '../components/Skeletons';
import { COUNTRY_TRANSLATIONS, TEAM_TRANSLATIONS } from '../utils/translations';

const formatDateCn = (dateStr: string) => {
    if (!dateStr) return '';
    const months: Record<string, string> = {
        'january': '1月', 'february': '2月', 'march': '3月', 'april': '4月', 'may': '5月', 'june': '6月',
        'july': '7月', 'august': '8月', 'september': '9月', 'october': '10月', 'november': '11月', 'december': '12月'
    };
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length === 3) {
        return `${parts[2]}年${months[parts[1]] || parts[1]}${parts[0]}日`;
    }
    return dateStr;
};

const DriverDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { state } = useF1();

    const driverId = parseInt(id || '0', 10);

    const driver = useMemo(() => {
        return state.drivers.find(d => d.id === driverId);
    }, [state.drivers, driverId]);

    const driverResults = useMemo(() => {
        if (!driver) return [];
        return state.raceResults.filter(r => r.driverId === driver.id)
            .sort((a, b) => {
                if (a.season !== b.season) return (a.season || 0) - (b.season || 0);
                return (a.roundNo || 0) - (b.roundNo || 0);
            });
    }, [state.raceResults, driver]);

    const milestones = useMemo(() => {
        if (driverResults.length === 0) return null;

        const firstGP = driverResults[0];
        const lastGP = driverResults[driverResults.length - 1];

        const winResults = driverResults.filter(r => r.position === 1);
        const podiumResults = driverResults.filter(r => r.position > 0 && r.position <= 3);
        const poleResults = driverResults.filter(r => r.grid === 1);

        return {
            firstGP: { season: firstGP.season, gp: firstGP.grandPrix, team: firstGP.team },
            lastGP: { season: lastGP.season, gp: lastGP.grandPrix, team: lastGP.team },
            firstWin: winResults.length > 0 ? { season: winResults[0].season, gp: winResults[0].grandPrix, team: winResults[0].team } : null,
            lastWin: winResults.length > 0 ? { season: winResults[winResults.length - 1].season, gp: winResults[winResults.length - 1].grandPrix, team: winResults[winResults.length - 1].team } : null,
            firstPodium: podiumResults.length > 0 ? { season: podiumResults[0].season, gp: podiumResults[0].grandPrix, team: podiumResults[0].team } : null,
            lastPodium: podiumResults.length > 0 ? { season: podiumResults[podiumResults.length - 1].season, gp: podiumResults[podiumResults.length - 1].grandPrix, team: podiumResults[podiumResults.length - 1].team } : null,
            firstPole: poleResults.length > 0 ? { season: poleResults[0].season, gp: poleResults[0].grandPrix, team: poleResults[0].team } : null,
            lastPole: poleResults.length > 0 ? { season: poleResults[poleResults.length - 1].season, gp: poleResults[poleResults.length - 1].grandPrix, team: poleResults[poleResults.length - 1].team } : null,
        };
    }, [driverResults]);

    const seasonSummary = useMemo(() => {
        const summary: Record<number, {
            season: number,
            team: string,
            points: number,
            wins: number,
            podiums: number,
            poles: number,
            rank: number | string
        }> = {};

        driverResults.forEach(r => {
            const s = r.season || 0;
            if (!summary[s]) {
                const champInfo = state.driverChampionships.find(c => c.driverId === driverId && c.season === s);
                summary[s] = {
                    season: s,
                    team: r.team,
                    points: 0,
                    wins: 0,
                    podiums: 0,
                    poles: 0,
                    rank: champInfo ? champInfo.rank : '-'
                };
            }
            summary[s].points += r.points;
            if (r.position === 1) summary[s].wins += 1;
            if (r.position >= 1 && r.position <= 3) summary[s].podiums += 1;
            if (r.grid === 1) summary[s].poles += 1;
        });

        return Object.values(summary).sort((a, b) => b.season - a.season);

    }, [driverResults, state.driverChampionships, driverId]);

    // Antigravity Vision: 1. Rank Progression
    const rankProgression = useMemo(() => {
        return [...seasonSummary].reverse().map(s => {
            const tColor = state.teams.find(t => t.name === s.team)?.color || '#ffffff';
            return {
                season: s.season,
                rank: typeof s.rank === 'number' ? s.rank : 30, // Default for charts if unranked
                displayRank: s.rank,
                team: s.team,
                points: s.points,
                teamColor: tColor
            };
        });
    }, [seasonSummary, state.teams]);

    // Antigravity Vision: 2. Circuit Specialist
    const circuitSpecialists = useMemo(() => {
        const circuits: Record<string, { wins: number, podiums: number, races: number }> = {};
        driverResults.forEach(r => {
            if (!r.grandPrix) return;
            if (!circuits[r.grandPrix]) circuits[r.grandPrix] = { wins: 0, podiums: 0, races: 0 };
            circuits[r.grandPrix].races += 1;
            if (r.position === 1) circuits[r.grandPrix].wins += 1;
            if (r.position >= 1 && r.position <= 3) circuits[r.grandPrix].podiums += 1;
        });
        return Object.entries(circuits)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.wins - a.wins || b.podiums - a.podiums)
            .slice(0, 3);
    }, [driverResults]);

    // Antigravity Vision: 3. Teammate H2H
    const teammateH2H = useMemo(() => {
        const driverRaces = new Map();
        driverResults.forEach(r => {
            driverRaces.set(`${r.season}-${r.roundNo}`, { position: r.position, points: r.points, team: r.team });
        });

        const h2h: Record<string, { races: number, winsA: number, winsB: number, pointsA: number, pointsB: number, teamColor: string }> = {};
        state.raceResults.forEach(r => {
            if (r.driverId === driverId) return;
            const key = `${r.season}-${r.roundNo}`;
            const driverRace = driverRaces.get(key);

            if (driverRace && driverRace.team === r.team) {
                const teammateName = r.firstNameCn && r.lastNameCn
                    ? `${r.lastNameCn}${r.firstNameCn}`
                    : `${r.firstName} ${r.lastName}`;
                if (!h2h[teammateName]) {
                    const tColor = state.teams.find(t => t.name === r.team)?.color || '#555';
                    h2h[teammateName] = { races: 0, winsA: 0, winsB: 0, pointsA: 0, pointsB: 0, teamColor: tColor };
                }

                h2h[teammateName].races += 1;
                h2h[teammateName].pointsA += driverRace.points;
                h2h[teammateName].pointsB += r.points;

                const posA = driverRace.position > 0 ? driverRace.position : 999;
                const posB = r.position > 0 ? r.position : 999;

                if (posA < posB) h2h[teammateName].winsA += 1;
                else if (posB < posA) h2h[teammateName].winsB += 1;
            }
        });

        return Object.entries(h2h)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.races - a.races);
    }, [driverResults, state.raceResults, driverId, state.teams]);

    if (state.loading) return <div className="min-h-screen flex items-center justify-center"><SkeletonCard /></div>;
    if (!driver) return (
        <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4">
            <h2 className="text-2xl font-bold text-primary mb-4">未找到车手信息</h2>
            <button onClick={() => navigate(-1)} className="text-f1-red flex items-center gap-2 hover:underline">
                <ChevronLeft size={20} /> 返回
            </button>
        </div>
    );

    const teamColor = driver.teamColor || '#e10600';

    return (
        <div className="min-h-screen bg-bg-primary pb-20 animate-fade-in font-inter">
            {/* Hero Section - StatsF1 Inspiration */}
            <div className="relative py-12 md:py-24 overflow-hidden">
                {/* Background Dynamic Pattern */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-10">
                    <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[120%] bg-gradient-to-br from-f1-red/30 to-transparent blur-[120px] rounded-full rotate-12"></div>
                    <div className="absolute top-[20%] -right-[10%] w-[50%] h-[80%] bg-gradient-to-bl from-accent-blue/20 to-transparent blur-[150px] rounded-full -rotate-12"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center text-secondary hover:text-primary mb-12 transition-all p-2 hover:bg-bg-secondary/50 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                    >
                        <ChevronLeft size={16} className="mr-1" /> 返回列表
                    </button>

                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                        {/* Driver Portrait Space */}
                        <div className="flex flex-col items-center w-full max-w-sm lg:max-w-md group">
                            {/* Portrait Image (No Frame) */}
                            <div className="w-full relative transform-gpu transition-transform duration-700 group-hover:scale-[1.02] flex justify-center">
                                {driver.avatar ? (
                                    <img
                                        src={driver.avatar}
                                        alt={driver.lastName}
                                        className="w-full max-w-[320px] lg:max-w-[400px] h-auto object-contain object-bottom drop-shadow-2xl filter group-hover:brightness-110 transition-all duration-700"
                                        style={{ WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 15%)', maskImage: 'linear-gradient(to top, transparent 0%, black 15%)' }}
                                    />
                                ) : (
                                    <div className="w-full aspect-[4/5] bg-bg-secondary flex flex-col items-center justify-center p-12 rounded-3xl">
                                        <Hash size={120} className="text-secondary opacity-20 mb-4" />
                                        <span className="text-6xl font-black text-secondary opacity-30">{driver.code}</span>
                                    </div>
                                )}
                            </div>

                            {/* Key Stats Below Image */}
                            <div className="w-full lg:w-[90%] flex items-center justify-between border-t border-border pt-6 mt-4">
                                <div className="text-center w-1/3 border-r border-border">
                                    <div className="text-[10px] text-secondary uppercase font-black tracking-widest mb-1">冠军</div>
                                    <div className="text-3xl font-black text-accent-gold font-orbitron italic z-10 relative">x{driver.championships}</div>
                                </div>
                                <div className="text-center w-1/3 border-r border-border">
                                    <div className="text-[10px] text-secondary uppercase font-black tracking-widest mb-1">分站胜</div>
                                    <div className="text-3xl font-black text-primary font-orbitron italic">x{driver.wins}</div>
                                </div>
                                <div className="text-center w-1/3">
                                    <div className="text-[10px] text-secondary uppercase font-black tracking-widest mb-1">首发</div>
                                    <div className="text-3xl font-black text-accent-blue font-orbitron italic">{seasonSummary.length}s</div>
                                </div>
                            </div>
                        </div>

                        {/* Detail Info Panel */}
                        <div className="flex-1 w-full space-y-8">
                            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                                <h1 className="flex flex-wrap items-baseline gap-4 text-5xl md:text-7xl font-black text-primary leading-tight font-orbitron italic tracking-tighter uppercase">
                                    <span className="text-2xl md:text-3xl opacity-40 not-italic tracking-normal font-inter font-bold">
                                        {driver.firstNameCn || driver.firstName}
                                    </span>
                                    <span>{driver.lastNameCn || driver.lastName}</span>
                                </h1>
                                <div className="flex items-center gap-4 justify-end pb-2 md:pb-4">
                                    <div className="h-2 w-12 rounded-full" style={{ backgroundColor: teamColor }}></div>
                                    <span className="text-sm font-black uppercase tracking-[0.4em] text-secondary italic">
                                        {seasonSummary.length > 0 ? TEAM_TRANSLATIONS[seasonSummary[0].team] || seasonSummary[0].team : 'FORMULA 1 DRIVER'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                                <InfoItem icon={<Hash className="text-f1-red" />} label="车号" value={`#${driver.number || '--'}`} />
                                <InfoItem icon={<Milestone className="text-accent-blue" />} label="职业代码" value={driver.code} />
                                {driver.nationality && <InfoItem icon={<Flag className="text-[#0093CC]" />} label="国籍" value={COUNTRY_TRANSLATIONS[driver.nationality] || driver.nationality} />}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                {driver.birthDate && <InfoItem icon={<Calendar className="text-[#229971]" />} label="出生日期" value={`${formatDateCn(driver.birthDate)}${driver.age ? ` (${driver.age}岁)` : ''}`} />}
                                {driver.birthPlace && <InfoItem icon={<MapPin className="text-[#FF8000]" />} label="出生地" value={driver.birthPlace} />}
                                <InfoItem icon={<Trophy className="text-accent-gold" />} label="生涯积分" value={driver.points.toLocaleString()} />
                                <InfoItem icon={<Medal className="text-accent-purple" />} label="领奖台数" value={driver.podiums} />
                            </div>

                            {/* Milestone Section (StatsF1 Style) */}
                            {milestones && (
                                <div className="glass rounded-[2rem] p-8 border border-white/5 space-y-6 mt-12 bg-white/[0.02]">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-f1-red flex items-center gap-2 mb-6">
                                        <Zap size={14} /> 传奇里程碑
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
                                        <MilestoneItem title="职业生涯首秀" data={milestones.firstGP} />
                                        <MilestoneItem title="最近一场分站" data={milestones.lastGP} />
                                        <MilestoneItem title="首个分站冠军" data={milestones.firstWin} />
                                        <MilestoneItem title="最近一次获胜" data={milestones.lastWin} />
                                        <MilestoneItem title="首次杆位发车" data={milestones.firstPole} />
                                        <MilestoneItem title="最近一次杆位" data={milestones.lastPole} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* The Antigravity Vision: Analytics Panel */}
            <div className="max-w-7xl mx-auto px-4 pb-12 flex flex-col gap-8">

                {/* Trend Chart - Full Width */}
                <div className="glass-strong rounded-[2.5rem] p-8 border border-border relative overflow-hidden group w-full min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="text-accent-blue" size={24} />
                            <h3 className="text-2xl font-black text-primary font-orbitron italic uppercase pt-1">生涯排名趋势</h3>
                        </div>
                    </div>
                    <div className="w-full h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={rankProgression} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" vertical={false} />
                                <XAxis dataKey="season" stroke="currentColor" className="opacity-50 text-secondary" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis reversed domain={[1, 24]} stroke="currentColor" className="opacity-50 text-secondary" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--text-primary)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                    labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                                    formatter={(_value: any, _name: any, props: any) => [props.payload.displayRank === 30 ? '无排名' : props.payload.displayRank, '年度排名']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="rank"
                                    stroke={teamColor}
                                    strokeWidth={4}
                                    dot={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        return <circle cx={cx} cy={cy} r={4} fill={payload.teamColor} stroke="currentColor" className="text-bg-primary" strokeWidth={1.5} key={`dot-${payload.season}`} />;
                                    }}
                                    activeDot={{ r: 6, fill: 'currentColor', className: "text-primary", stroke: teamColor, strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                    {/* Circuit Specialist */}
                    {circuitSpecialists.length > 0 && (
                        <div className="glass-strong rounded-[2.5rem] p-8 border border-border flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                                <Target className="text-accent-gold" size={24} />
                                <h3 className="text-2xl font-black text-primary font-orbitron italic uppercase pt-1">赛道统治力</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                                {circuitSpecialists.map((c, idx) => (
                                    <div key={idx} className="bg-bg-secondary w-full rounded-2xl p-4 border border-border text-center relative overflow-hidden group hover:border-accent-gold/30 transition-colors flex flex-col justify-center">
                                        <div className="absolute top-0 right-0 p-2 opacity-[0.03] dark:opacity-5 translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform text-primary"><Trophy size={48} /></div>
                                        <div className="text-3xl font-black text-primary font-orbitron italic mb-1">{c.wins}胜</div>
                                        <div className="text-xs font-bold text-secondary uppercase tracking-widest truncate mt-2" title={c.name}>{c.name}</div>
                                        <div className="text-[10px] text-tertiary mt-2">{c.podiums} 台 | {c.races} 赛</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Teammate H2H */}
                    {teammateH2H.length > 0 && (
                        <div className="glass-strong rounded-[2.5rem] p-8 border border-border flex flex-col h-[400px]">
                            <div className="flex items-center gap-3 mb-6 shrink-0">
                                <Users className="text-accent-purple" size={24} />
                                <h3 className="text-2xl font-black text-primary font-orbitron italic uppercase pt-1">队友生涯对比</h3>
                            </div>
                            <div className="space-y-3 flex-1 overflow-y-auto pr-3 custom-scrollbar">
                                {teammateH2H.map((h2h, idx) => (
                                    <div key={idx} className="flex flex-col gap-2 p-5 rounded-xl bg-bg-secondary border border-border hover:border-accent-purple/30 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: h2h.teamColor }}></div>
                                                <span className="text-base font-bold text-primary relative group">
                                                    {h2h.name}
                                                </span>
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-secondary">{h2h.races} 场同队</div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-secondary uppercase text-[10px] font-bold mb-1 tracking-wider">正赛胜负</span>
                                                <span className="font-orbitron font-black text-primary text-base"><span className={h2h.winsA > h2h.winsB ? "text-accent-blue" : ""}>{h2h.winsA}</span> - <span className={h2h.winsB > h2h.winsA ? "text-accent-purple" : ""}>{h2h.winsB}</span></span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-secondary uppercase text-[10px] font-bold mb-1 tracking-wider">总积分比</span>
                                                <span className="font-orbitron font-black text-primary text-base"><span className={h2h.pointsA > h2h.pointsB ? "text-accent-blue" : ""}>{h2h.pointsA}</span> : <span className={h2h.pointsB > h2h.pointsA ? "text-accent-purple" : ""}>{h2h.pointsB}</span></span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Career Table Section */}
            <div className="max-w-7xl mx-auto px-4 pb-12">
                <div className="glass-strong rounded-[2.5rem] p-8 md:p-12 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] grayscale pointer-events-none">
                        <History size={400} />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 relative z-10">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-primary font-orbitron italic uppercase tracking-tight">职业生涯全纪实</h3>
                            <p className="text-sm text-secondary font-medium italic opacity-60 uppercase tracking-widest">Year-by-Year Career Statistics</p>
                        </div>
                        <div className="flex items-center gap-4 bg-bg-secondary/50 p-2 rounded-2xl border border-border">
                            <div className="px-4 py-2 text-center">
                                <div className="text-[10px] text-secondary uppercase font-bold tracking-tighter">赛季</div>
                                <div className="text-lg font-black text-primary">{seasonSummary.length}</div>
                            </div>
                            <div className="px-4 py-2 text-center border-l border-white/10">
                                <div className="text-[10px] text-secondary uppercase font-bold tracking-tighter">车队</div>
                                <div className="text-lg font-black text-primary">{new Set(driverResults.map(r => r.team)).size}</div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-secondary">赛季</th>
                                    <th className="px-4 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-secondary">车队 (Constructor)</th>
                                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-secondary">排名</th>
                                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-secondary">冠军</th>
                                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-secondary">杆位</th>
                                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-secondary">领奖台</th>
                                    <th className="px-4 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-secondary">赛季积分</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {seasonSummary.map((s, i) => (
                                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-8">
                                            <span className="text-2xl font-black font-orbitron italic text-primary group-hover:text-f1-red transition-colors whitespace-nowrap">
                                                {s.season}
                                            </span>
                                        </td>
                                        <td className="px-4 py-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: teamColor }}></div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-primary text-lg tracking-tight">{s.team}</span>
                                                    <span className="text-[10px] text-secondary uppercase font-bold opacity-40">Main Entry</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-8 text-center">
                                            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl font-black font-orbitron italic ${s.rank === 1 ? 'bg-accent-gold text-black shadow-lg shadow-yellow-500/20' :
                                                s.rank === 2 ? 'bg-gray-300 text-black' :
                                                    s.rank === 3 ? 'bg-orange-500 text-black' :
                                                        'text-secondary opacity-60'
                                                }`}>
                                                {s.rank === 1 ? 'WC' : s.rank !== '-' ? `P${s.rank}` : '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-8 text-center">
                                            <span className={`text-xl font-bold ${s.wins > 0 ? 'text-primary' : 'text-secondary/20'}`}>
                                                {s.wins || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-8 text-center">
                                            <span className={`text-xl font-bold ${s.poles > 0 ? 'text-accent-pink' : 'text-secondary/20'}`}>
                                                {s.poles || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-8 text-center">
                                            <span className={`text-xl font-bold ${s.podiums > 0 ? 'text-accent-purple' : 'text-secondary/20'}`}>
                                                {s.podiums || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-8 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-2xl font-black tabular-nums text-accent-blue">{s.points}</span>
                                                <span className="text-[10px] text-secondary uppercase font-black opacity-30 tracking-widest">PTS</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Logo */}
                    <div className="mt-20 flex justify-center opacity-10">
                        <F1Logo className="w-48" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
    <div className="flex items-center gap-5 p-6 glass rounded-3xl border border-white/5 hover:border-white/10 transition-all bg-white/[0.01]">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
            {icon}
        </div>
        <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary opacity-50 mb-1">{label}</span>
            <span className="text-xl font-black text-primary font-orbitron tracking-tight">{value}</span>
        </div>
    </div>
);

const MilestoneItem = ({ title, data }: { title: string, data: any }) => (
    <div className="space-y-3">
        <div className="text-[10px] font-black text-secondary/60 uppercase tracking-widest">{title}</div>
        {data ? (
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-primary font-orbitron italic text-f1-red">{data.season}</span>
                    <span className="text-sm font-bold text-primary truncate">{COUNTRY_TRANSLATIONS[data.gp] || data.gp}</span>
                </div>
                <div className="text-[10px] text-secondary font-mono opacity-60 pl-[3.2rem]">车队: {TEAM_TRANSLATIONS[data.team] || data.team}</div>
            </div>
        ) : (
            <div className="text-sm font-bold text-secondary italic opacity-20">暂无记录</div>
        )}
    </div>
);

export default DriverDetailPage;
