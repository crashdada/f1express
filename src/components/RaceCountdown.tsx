import { useEffect, useMemo, useState } from 'react';
import { Timer, MapPin, Calendar } from 'lucide-react';
import { translateCountry } from '../utils/translations';
import { useDynamic2026Data } from '../hooks/useDynamic2026Data';

const isTestEnvironment =
  typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

const getTimeLeft = (targetDate: Date, now: Date = new Date()) => {
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return null;
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
};

const RaceCountdown = () => {
  const { schedule, loading } = useDynamic2026Data();
  const [now, setNow] = useState(() => new Date());

  const nextRace = useMemo(() => {
    if (loading || schedule.length === 0) {
      return null;
    }

    return (
      schedule.find((race) => {
        if (race.status === 'CANCELLED') {
          return false;
        }

        const raceSession = race.sessions?.find((session) => session.name === 'Race');
        if (raceSession) {
          return new Date(raceSession.time) > now;
        }

        try {
          const parts = race.dates.split(' ');
          const day = parts[2];
          const month = parts[3];
          const raceDate = new Date(`${day} ${month} 2026 15:00:00 GMT+0800`);
          return raceDate > now;
        } catch {
          return false;
        }
      }) || null
    );
  }, [loading, now, schedule]);

  const targetDate = useMemo(() => {
    if (!nextRace) {
      return null;
    }

    const raceSession = nextRace.sessions?.find((session) => session.name === 'Race');
    if (raceSession) {
      return new Date(raceSession.time);
    }

    const parts = nextRace.dates.split(' ');
    const day = parts[2];
    const month = parts[3];
    return new Date(`${day} ${month} 2026 15:00:00 GMT+0800`);
  }, [nextRace]);

  useEffect(() => {
    if (!targetDate || isTestEnvironment) {
      return;
    }

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const timeLeft = useMemo(() => {
    if (!targetDate) {
      return null;
    }

    return getTimeLeft(targetDate, now);
  }, [targetDate, now]);

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
            {translateCountry(nextRace.country) + '大奖赛'}
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-4 text-secondary font-medium">
            <div className="flex items-center gap-1.5">
              <MapPin size={16} className="text-f1-red" />
              <span>
                {nextRace.location}, {translateCountry(nextRace.country)}
              </span>
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
