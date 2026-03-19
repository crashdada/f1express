import { ChevronLeft, Clock, Map as MapIcon, Info, Trophy, Calendar, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { translateCountry, GP_TRANSLATIONS, DRIVER_TRANSLATIONS } from '../utils/translations';
import F1Logo from '../components/F1Logo';
import { useDynamic2026Data } from '../hooks/useDynamic2026Data';

interface Session {
    name: string;
    time: string;
}

interface CircuitSpecs {
    length?: string;
    laps?: number;
    record?: string | null;
    first_gp?: number;
    distance?: string;
}

interface F1Event {
    round: string;
    roundNumber: number;
    country: string;
    gpName: string;
    location: string;
    dates: string;
    slug: string;
    isTest: boolean;
    image: string | null;
    detailedImage?: string | null;
    flag?: string;
    sessions: Session[];
    circuitSpecs: CircuitSpecs;
    gmtOffset?: string;
}

const RaceDetailPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const { schedule, raceResults: allRaceResults, loading: dataLoading } = useDynamic2026Data();
    const [event, setEvent] = useState<F1Event | null>(null);
    const [prevEvent, setPrevEvent] = useState<{ slug: string; name: string } | null>(null);
    const [nextEvent, setNextEvent] = useState<{ slug: string; name: string } | null>(null);
    const [useShanghaiTime, setUseShanghaiTime] = useState(true);

    // Get race results from JSON for this slug
    const { results: raceResults, sprintResults } = useMemo(() => {
        if (!slug || !allRaceResults.length) return { results: [], sprintResults: [] };
        const round = allRaceResults.find(r => r.slug === slug);
        if (!round) return { results: [], sprintResults: [] };
        
        const sortedResults = [...round.results].sort((a, b) => {
            if (a.pos != null && b.pos != null) return a.pos - b.pos;
            if (a.pos != null) return -1;
            if (b.pos != null) return 1;
            return 0;
        });

        const sortedSprint = round.sprintResults ? [...round.sprintResults].sort((a, b) => {
            if (a.pos != null && b.pos != null) return a.pos - b.pos;
            if (a.pos != null) return -1;
            if (b.pos != null) return 1;
            return 0;
        }) : [];

        return { results: sortedResults, sprintResults: sortedSprint };
    }, [slug, allRaceResults]);


    useEffect(() => {
        if (dataLoading || !schedule.length) return;

        const index = schedule.findIndex((e: any) => e.slug === slug);
        if (index !== -1) {
            const found = schedule[index];
            setEvent(found as F1Event);

            // Find neighbors
            const prev = index > 0 ? schedule[index - 1] : null;
            const next = index < schedule.length - 1 ? schedule[index + 1] : null;

            setPrevEvent(prev ? { slug: prev.slug || '', name: translateCountry(prev.country) } : null);
            setNextEvent(next ? { slug: next.slug || '', name: translateCountry(next.country) } : null);
        } else {
            setEvent(null);
        }
    }, [slug, schedule, dataLoading]);

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        if (useShanghaiTime) {
            // 转换为北京时间 (UTC+8)
            return date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Shanghai',
                hour12: false
            });
        }

        // 使用该分站的 gmtOffset
        if (event?.gmtOffset) {
            try {
                // gmtOffset 格式如 "+02:00" 或 "-04:00" 或 "Z"
                if (event.gmtOffset === 'Z') {
                    return date.getUTCHours().toString().padStart(2, '0') + ':' +
                        date.getUTCMinutes().toString().padStart(2, '0');
                }

                const sign = event.gmtOffset.startsWith('-') ? -1 : 1;
                const offsetPart = event.gmtOffset.replace(/[+-]/, '');
                const [hoursStr, minutesStr] = offsetPart.split(':');
                const hours = parseInt(hoursStr) || 0;
                const minutes = parseInt(minutesStr) || 0;

                const totalOffsetMs = sign * (hours * 3600000 + minutes * 60000);
                const localDate = new Date(date.getTime() + totalOffsetMs);

                // 使用 UTC 方法提取已偏移的时间，避免系统本地时区干扰
                return localDate.getUTCHours().toString().padStart(2, '0') + ':' +
                    localDate.getUTCMinutes().toString().padStart(2, '0');
            } catch (e) {
                console.error('Timezone parsing failed', e);
            }
        }

        // 彻底的降级处理：退回到 UTC 并在控制台警告
        console.warn(`Missing gmtOffset for ${event?.country}, falling back to UTC`);
        return date.getUTCHours().toString().padStart(2, '0') + ':' +
            date.getUTCMinutes().toString().padStart(2, '0');
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
    };

    if (dataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-primary">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-f1-red"></div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary p-4 text-center">
                <h2 className="text-3xl font-black text-primary mb-4 font-orbitron">未找到该分站信息</h2>
                <Link to="/new-season" className="text-f1-red font-bold hover:underline flex items-center">
                    <ChevronLeft className="mr-2" /> 返回赛程列表
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary pb-20 animate-fade-in font-inter">
            {/* Dynamic Background Header */}
            <div className="relative h-[450px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-bg-secondary via-bg-primary/80 to-bg-primary z-10"></div>
                <div className="absolute inset-0 opacity-30 scale-110">

                    <div className="absolute inset-0 bg-f1-red/10 mix-blend-overlay"></div>
                </div>

                <div className="relative z-20 max-w-7xl mx-auto px-4 h-full flex flex-col justify-end pb-12">
                    <Link to="/new-season?tab=schedule" className="inline-flex items-center text-secondary hover:text-primary mb-8 transition-colors font-bold uppercase tracking-widest text-xs">
                        <ChevronLeft size={20} className="mr-1" /> 返回 2026 赛程
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between items-start gap-8">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-6 mb-4">
                                <Link to="/" className="group/logo">
                                    <div className="p-1 group-hover/logo:scale-110 transition-all duration-300">
                                        <F1Logo className="w-10 md:w-12 h-auto" />
                                    </div>
                                </Link>
                                <span className="px-5 py-2 bg-secondary/10 backdrop-blur-md border border-border text-primary text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                                    {event.round.includes('TESTING') ? 'Pre-Season' : `Round ${event.roundNumber}`}
                                </span>
                                {event.flag && (
                                    <div className="w-14 h-14 rounded-full border-2 border-border overflow-hidden shadow-lg bg-white flex items-center justify-center p-1">
                                        <img src={event.flag} className="w-full h-full object-contain" alt="flag" />
                                    </div>
                                )}
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black text-primary mb-4 font-orbitron tracking-tighter leading-none italic uppercase">
                                {translateCountry(event.country)}
                            </h1>
                            <p className="text-xl md:text-2xl text-secondary font-bold max-w-2xl uppercase tracking-widest italic">
                                {GP_TRANSLATIONS[event.gpName] || event.gpName}
                            </p>
                        </div>

                        {event.image && (
                            <div className="w-full md:w-80 h-64 flex items-center justify-center bg-transparent">
                                <img src={event.image} alt="Track outline" className="max-w-full max-h-full object-contain dark:invert dark:brightness-150 dark:contrast-125 opacity-90 transition-all duration-500 drop-shadow-[0_0_20px_rgba(225,6,0,0.1)] animate-float" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hero Detailed Track View */}
            {event.detailedImage && (
                <div className="max-w-7xl mx-auto px-4 mb-20 -mt-10 relative z-20">
                    <div className="rounded-[3rem] overflow-hidden relative">
                        <div className="flex flex-col justify-center items-center min-h-[500px] md:min-h-[900px] relative z-10">
                            {/* The Image Container - Pure immersion as requested */}
                            <div className="w-full h-full flex justify-center items-center">
                                <img
                                    className="w-full max-h-[1100px] object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
                                    src={event.detailedImage}
                                    alt={`${event.country} detailed track`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8 relative z-30">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Schedule Section */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="glass-strong rounded-[2rem] p-8 md:p-12 border border-white/5 shadow-2xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000">
                                <Clock size={350} />
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 relative z-10 gap-6">
                                <h3 className="text-3xl font-black text-primary font-orbitron flex items-center uppercase tracking-tight italic animate-pulse-glow px-4 py-2 rounded-xl">
                                    <Clock className="text-f1-red mr-4" size={32} />
                                    竞赛时刻表
                                </h3>

                                <div className="flex items-center bg-bg-secondary p-1.5 rounded-2xl border border-border backdrop-blur-md">
                                    <button
                                        onClick={() => setUseShanghaiTime(false)}
                                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all tracking-widest ${!useShanghaiTime ? 'bg-f1-red text-white shadow-lg' : 'text-secondary hover:text-primary'}`}
                                    >
                                        当地时间
                                    </button>
                                    <button
                                        onClick={() => setUseShanghaiTime(true)}
                                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all tracking-widest ${useShanghaiTime ? 'bg-f1-red text-white shadow-lg' : 'text-secondary hover:text-primary'}`}
                                    >
                                        北京时间
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {event.sessions && event.sessions.length > 0 ? (
                                    event.sessions.map((session, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-6 rounded-3xl bg-bg-primary/50 hover:bg-bg-primary transition-all duration-300 border border-transparent hover:border-border group/item">
                                            <div className="flex items-center gap-6">
                                                <div className="w-1.5 h-12 bg-f1-red rounded-full opacity-40 group-hover/item:opacity-100 transition-opacity"></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1.5">{session.name}</p>
                                                    <p className="text-primary font-black text-xl tracking-tight">{formatDate(session.time)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-4xl font-black text-primary font-orbitron tabular-nums tracking-tighter italic">
                                                    {formatTime(session.time)}
                                                </p>
                                                <p className="text-[10px] font-black text-f1-red/60 uppercase tracking-widest">
                                                    {useShanghaiTime ? 'GMT+8 (SHA)' : `GMT${event.gmtOffset || 'Z'}`}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 bg-bg-primary/50 rounded-3xl border-2 border-dashed border-border opacity-60">
                                        <p className="text-secondary font-bold italic tracking-wide">赛程细节尚未公布，请关注 F1 官方更新</p>
                                    </div>
                                )}
                            </div>
                        </div>



                    </div>

                    {/* Sidebar Section */}
                    <div className="space-y-10">
                        <div className="glass-strong rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute -bottom-20 -right-20 opacity-[0.08] rotate-12">
                                <MapIcon size={400} />
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-0 bg-f1-red/10 blur-xl rounded-full animate-float" />
                                <div className="relative p-2 animate-float">
                                    <F1Logo className="w-14 md:w-20 h-auto" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-black font-orbitron mb-10 flex items-center uppercase tracking-tight italic relative z-10">
                                <MapIcon className="text-f1-red mr-4" size={32} />
                                赛道参数
                            </h3>

                            <div className="space-y-8 relative z-10">
                                <div className="flex justify-between items-center border-b border-white/5 pb-5">
                                    <span className="text-secondary text-xs font-black uppercase tracking-[0.2em] flex items-center">
                                        <Info size={14} className="mr-3 text-f1-red" /> 赛道长度
                                    </span>
                                    <span className="font-orbitron font-black text-xl italic text-primary">{event.circuitSpecs?.length || '--'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/5 pb-5">
                                    <span className="text-secondary text-xs font-black uppercase tracking-[0.2em] flex items-center">
                                        <Calendar size={14} className="mr-3 text-f1-red" /> 圈数
                                    </span>
                                    <span className="font-orbitron font-black text-xl italic text-primary">{event.circuitSpecs?.laps || '--'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/5 pb-5">
                                    <span className="text-secondary text-xs font-black uppercase tracking-[0.2em] flex items-center">
                                        <Trophy size={14} className="mr-3 text-f1-red" /> 总比赛距离
                                    </span>
                                    <span className="font-orbitron font-black text-xl italic text-primary">{event.circuitSpecs?.distance || '--'}</span>
                                </div>
                                <div className="flex flex-col border-b border-white/5 pb-5">
                                    {(() => {
                                        const recordStr = event.circuitSpecs?.record;
                                        if (!recordStr) return (
                                            <div className="flex justify-between items-center">
                                                <span className="text-secondary text-xs font-black uppercase tracking-[0.2em] flex items-center">
                                                    <Sparkles size={14} className="mr-3 text-f1-red" /> 赛道纪录
                                                </span>
                                                <span className="font-orbitron font-black text-3xl text-primary italic leading-none">--</span>
                                            </div>
                                        );

                                        // 1:30.965 (Kimi Antonelli (2025)) -> time: 1:30.965, holderRaw: Kimi Antonelli (2025)
                                        const parts = recordStr.split(/\s+\(/);
                                        const time = parts[0].trim();
                                        let holderRaw = parts.length > 1 ? parts.slice(1).join(' (').replace(/\)$/, '') : '';

                                        // Translate holder
                                        let translatedHolder = holderRaw;
                                        const holderLower = holderRaw.toLowerCase();
                                        for (const [en, cn] of Object.entries(DRIVER_TRANSLATIONS)) {
                                            if (holderLower.includes(en.toLowerCase())) {
                                                translatedHolder = holderRaw.replace(new RegExp(en, 'gi'), cn);
                                                break;
                                            }
                                        }

                                        return (
                                            <>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-secondary text-xs font-black uppercase tracking-[0.2em] flex items-center">
                                                        <Sparkles size={14} className="mr-3 text-f1-red" /> 赛道纪录
                                                    </span>
                                                    <span className="font-orbitron font-black text-3xl text-primary italic tracking-tighter leading-none">
                                                        {time}
                                                    </span>
                                                </div>
                                                {translatedHolder && (
                                                    <div className="flex justify-end">
                                                        <span className="text-secondary text-sm font-bold uppercase tracking-wider italic opacity-80">
                                                            {translatedHolder}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-secondary text-xs font-black uppercase tracking-[0.2em] flex items-center">
                                        <Trophy size={14} className="mr-3 text-f1-red" /> 首届大奖赛
                                    </span>
                                    <span className="font-orbitron font-black text-xl italic text-primary">{event.circuitSpecs?.first_gp || '--'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Sprint Results Section (if available) */}
                {sprintResults && sprintResults.length > 0 && (
                    <div className="mt-12 glass-strong rounded-[2rem] p-8 md:p-12 border border-white/5 shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000">
                            <Sparkles size={250} />
                        </div>
                        <h3 className="text-3xl font-black text-primary font-orbitron flex items-center mb-10 uppercase tracking-tight italic">
                            <Sparkles className="text-f1-red mr-4" size={32} />
                            冲刺赛成绩 (Sprint)
                        </h3>
                        <div className="overflow-x-auto pb-4 relative z-10">
                            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                                <thead>
                                    <tr className="border-b-2 border-f1-red/30">
                                        <th className="py-4 px-4 text-center text-secondary text-sm font-black uppercase tracking-widest w-16">Pos</th>
                                        <th className="py-4 px-4 text-center text-secondary text-sm font-black uppercase tracking-widest w-16">No</th>
                                        <th className="py-4 px-4 text-secondary text-sm font-black uppercase tracking-widest">Driver</th>
                                        <th className="py-4 px-4 text-secondary text-sm font-black uppercase tracking-widest">Team</th>
                                        <th className="py-4 px-4 text-right text-secondary text-sm font-black uppercase tracking-widest w-24">Pts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sprintResults.map((result, idx) => {
                                        const isPodium = result.pos && result.pos <= 3;
                                        const posColor = result.pos === 1
                                            ? 'text-yellow-400 bg-yellow-400/10'
                                            : result.pos === 2
                                                ? 'text-gray-300 bg-gray-300/10'
                                                : result.pos === 3
                                                    ? 'text-orange-400 bg-orange-400/10'
                                                    : 'text-primary bg-bg-secondary/40 border border-white/5';

                                        const bgClass = idx % 2 === 0 ? 'bg-bg-primary/20' : 'bg-transparent';

                                        return (
                                            <tr key={idx} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${bgClass} group`}>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black font-orbitron text-sm italic ${posColor}`}>
                                                        {result.pos || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className="text-secondary font-mono font-bold text-sm">
                                                        {result.number}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center">
                                                        <span className={`text-base ${isPodium ? 'font-black text-primary' : 'font-bold text-slate-300'}`}>
                                                            {result.firstNameCn || result.firstName} {result.lastNameCn || result.lastName}
                                                        </span>
                                                        <span className="text-f1-red ml-3 text-xs font-mono bg-f1-red/10 px-2 py-0.5 rounded border border-f1-red/20 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            {result.code}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <p className="text-secondary text-sm font-bold uppercase tracking-wider">
                                                        {result.teamCn || result.team}
                                                    </p>
                                                </td>
                                                <td className={`py-4 px-4 text-right font-black font-orbitron italic tabular-nums text-xl ${result.points > 0 ? 'text-primary' : 'text-slate-500'}`}>
                                                    {result.points > 0 ? `${result.points}` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Full Width Results Section */}
                <div className={`mt-12 glass-strong rounded-[2rem] p-8 md:p-12 border border-white/5 shadow-2xl overflow-hidden relative group ${raceResults.length === 0 ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <h3 className="text-3xl font-black text-primary font-orbitron flex items-center mb-10 uppercase tracking-tight italic">
                        <Trophy className="text-f1-red mr-4" size={32} />
                        比赛成绩
                    </h3>
                    {raceResults.length > 0 ? (
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
                                <thead>
                                    <tr className="border-b-2 border-f1-red/30">
                                        <th className="py-4 px-4 text-center text-secondary text-sm font-black uppercase tracking-widest w-16">Pos</th>
                                        <th className="py-4 px-4 text-center text-secondary text-sm font-black uppercase tracking-widest w-16">No</th>
                                        <th className="py-4 px-4 text-secondary text-sm font-black uppercase tracking-widest">Driver</th>
                                        <th className="py-4 px-4 text-secondary text-sm font-black uppercase tracking-widest">Team</th>
                                        <th className="py-4 px-4 text-center text-secondary text-sm font-black uppercase tracking-widest">Status</th>
                                        <th className="py-4 px-4 text-right text-secondary text-sm font-black uppercase tracking-widest w-24">Pts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {raceResults.map((result, idx) => {
                                        const isPodium = result.pos && result.pos <= 3;
                                        const posColor = result.pos === 1
                                            ? 'text-yellow-400 bg-yellow-400/10'
                                            : result.pos === 2
                                                ? 'text-gray-300 bg-gray-300/10'
                                                : result.pos === 3
                                                    ? 'text-orange-400 bg-orange-400/10'
                                                    : 'text-primary bg-bg-secondary/40 border border-white/5';

                                        const bgClass = idx % 2 === 0 ? 'bg-bg-primary/20' : 'bg-transparent';

                                        return (
                                            <tr key={idx} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${bgClass} group`}>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black font-orbitron text-sm italic ${posColor}`}>
                                                        {result.pos || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className="text-secondary font-mono font-bold text-sm">
                                                        {result.number}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center">
                                                        <span className={`text-base ${isPodium ? 'font-black text-primary' : 'font-bold text-slate-300'}`}>
                                                            {result.firstNameCn || result.firstName} {result.lastNameCn || result.lastName}
                                                        </span>
                                                        <span className="text-f1-red ml-3 text-xs font-mono bg-f1-red/10 px-2 py-0.5 rounded border border-f1-red/20 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            {result.code}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <p className="text-secondary text-sm font-bold uppercase tracking-wider">
                                                        {result.teamCn || result.team}
                                                    </p>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded border ${result.status === 'Finished' || (result.status && result.status.includes('Lap'))
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        : 'bg-f1-red/10 text-f1-red border-f1-red/20'
                                                        }`}>
                                                        {result.status}
                                                    </span>
                                                </td>
                                                <td className={`py-4 px-4 text-right font-black font-orbitron italic tabular-nums text-xl ${result.points > 0 ? 'text-primary' : 'text-slate-500'}`}>
                                                    {result.points > 0 ? `${result.points}` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-3xl">
                            <p className="text-slate-500 font-black uppercase tracking-widest">2026 赛季尚未开始</p>
                            <p className="text-slate-400 text-sm mt-2">决赛结束后，此处将展示详细排名与积分数据</p>
                        </div>
                    )}
                </div>

                {/* Navigation Links */}
                <div className="mt-20 flex flex-col md:flex-row gap-6">
                    {prevEvent ? (
                        <Link
                            to={`/new-season/race/${prevEvent.slug}`}
                            className="flex-1 glass-strong rounded-3xl p-8 group hover:border-f1-red/30 transition-all duration-300 relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <div className="flex items-center text-slate-400 text-xs font-black uppercase tracking-widest mb-4 group-hover:text-f1-red transition-colors">
                                    <ArrowLeft size={16} className="mr-2" /> Previous Race
                                </div>
                                <div className="text-2xl font-black text-primary font-orbitron uppercase italic">
                                    {prevEvent.name}
                                </div>
                            </div>
                            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <F1Logo className="w-40 h-auto" />
                            </div>
                        </Link>
                    ) : (
                        <div className="flex-1" />
                    )}

                    {nextEvent ? (
                        <Link
                            to={`/new-season/race/${nextEvent.slug}`}
                            className="flex-1 glass-strong rounded-3xl p-8 group hover:border-f1-red/30 transition-all duration-300 relative overflow-hidden text-right"
                        >
                            <div className="relative z-10">
                                <div className="flex items-center justify-end text-slate-400 text-xs font-black uppercase tracking-widest mb-4 group-hover:text-f1-red transition-colors">
                                    Next Race <ArrowRight size={16} className="ml-2" />
                                </div>
                                <div className="text-2xl font-black text-primary font-orbitron uppercase italic">
                                    {nextEvent.name}
                                </div>
                            </div>
                            <div className="absolute top-1/2 left-4 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity -rotate-12">
                                <F1Logo className="w-40 h-auto" />
                            </div>
                        </Link>
                    ) : (
                        <div className="flex-1" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default RaceDetailPage;
