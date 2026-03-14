import { useState, useEffect } from 'react';
import { Timer, MapPin, Calendar } from 'lucide-react';
import { COUNTRY_TRANSLATIONS } from '../utils/translations';
import { useDynamic2026Data } from '../hooks/useDynamic2026Data';

const RaceCountdown = () => {
    const { schedule, loading } = useDynamic2026Data();
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);
    const [nextRace, setNextRace] = useState<any>(null);

    useEffect(() => {
        if (loading || !schedule || schedule.length === 0) return;

        // 寻找下一个还没开始的比赛
        const now = new Date();
        const upcoming = schedule.find((r: any) => {
            // First try: find a Race session
            const raceSession = r.sessions?.find((s: any) => s.name === 'Race');
            if (raceSession) {
                return new Date(raceSession.time) > now;
            }
            // Fallback: use the 'dates' field if sessions are missing (common in scraped 2026 data)
            // dates format: "06 - 08 MAR" or "20 - 22 MAR"
            // We'll treat the last day of the range as the race day
            try {
                const parts = r.dates.split(' ');
                const day = parts[2]; // usually "08" in "06 - 08 MAR"
                const month = parts[3];
                const year = 2026;
                const raceDate = new Date(`${day} ${month} ${year} 15:00:00 GMT+0800`); // Estimate 3 PM
                return raceDate > now;
            } catch (e) {
                return false;
            }
        });

        if (upcoming) {
            setNextRace(upcoming);
            const raceSession = upcoming.sessions?.find((s: any) => s.name === 'Race');

            let targetDate: Date;
            if (raceSession) {
                targetDate = new Date(raceSession.time);
            } else {
                // Synthesize a target date from the 'dates' field
                const parts = upcoming.dates.split(' ');
                const day = parts[2];
                const month = parts[3];
                targetDate = new Date(`${day} ${month} 2026 15:00:00 GMT+0800`);
            }

            const timer = setInterval(() => {
                const diff = targetDate.getTime() - new Date().getTime();

                if (diff <= 0) {
                    clearInterval(timer);
                    setTimeLeft(null);
                } else {
                    setTimeLeft({
                        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                        seconds: Math.floor((diff % (1000 * 60)) / 1000),
                    });
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [schedule, loading]);

    if (!nextRace || !timeLeft) return null;

    return (
        <div className="mt-8 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div className="relative z-10 flex flex-col items-center text-center gap-8">
                <div className="w-full">
                    <div className="flex items-center justify-center gap-2 text-f1-red font-bold mb-3 tracking-widest uppercase text-sm">
                        <Timer size={18} className="animate-pulse" />
                        <span>距离下一场大奖赛</span>
                    </div>
                    <h3 className="text-3xl md:text-5xl font-bold text-primary mb-5 font-orbitron tracking-tight">
                        {(COUNTRY_TRANSLATIONS[nextRace.country] || nextRace.country) + '大奖赛'}
                    </h3>
                    <div className="flex flex-wrap justify-center items-center gap-4 text-secondary font-medium">
                        <div className="flex items-center gap-1.5">
                            <MapPin size={16} className="text-f1-red" />
                            <span>{nextRace.location}, {COUNTRY_TRANSLATIONS[nextRace.country] || nextRace.country}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar size={16} className="text-f1-red" />
                            <span>{nextRace.dates}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-baseline gap-4 md:gap-8 shrink-0 mt-2">
                    <TimeUnit value={timeLeft.days} label="天" />
                    <TimeUnit value={timeLeft.hours} label="时" />
                    <TimeUnit value={timeLeft.minutes} label="分" />
                    <TimeUnit value={timeLeft.seconds} label="秒" />
                </div>
            </div>
        </div>
    );
};

const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
        <div className="flex items-baseline gap-1">
            <span className="text-4xl md:text-6xl font-bold text-primary tracking-tighter tabular-nums font-orbitron">
                {value.toString().padStart(2, '0')}
            </span>
            <span className="text-sm md:text-base font-bold text-secondary">{label}</span>
        </div>
    </div>
);

export default RaceCountdown;
