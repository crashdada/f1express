import { Link } from 'react-router-dom';
import { Trophy, Medal, Crown, ChevronRight, Timer } from 'lucide-react';
import { Driver } from '../types';

// 移除硬编码的 getTeamColor，改用从数据库获取的 teamColor


const silverRankBadgeClass = 'bg-gradient-to-br from-[#f3f6fb] to-[#aeb8c8] text-slate-900 border border-white/60 shadow-lg shadow-[#d9e1ef]/40';
const neutralRankBadgeClass = 'bg-bg-secondary text-primary border border-border shadow-black/5';

interface DriverCardProps {
  driver: Driver;
  index: number;
  showStats?: boolean;
  variant?: 'grid' | 'list';
  preferLocalPhoto?: boolean;
}

export const DriverCard = ({
  driver,
  index,
  showStats = true,
  variant = 'grid',
}: DriverCardProps) => {
  const avatarUrl = driver.avatar;
  const isLocal = avatarUrl && avatarUrl.startsWith('/photos/');

  return (
    <Link
      to={`/driver/${driver.id}`}
      className={`glass rounded-2xl p-4 md:p-5 border border-border card-hover group shadow-lg shadow-black/5 dark:shadow-none flex ${variant === 'list' ? 'flex-col lg:flex-row lg:items-center justify-between gap-6' : 'flex-col'} no-underline text-inherit`}
    >
      <div className={`flex flex-col gap-3 ${variant === 'list' ? 'flex-1 min-w-0' : ''}`}>
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-lg ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-yellow-500/30' :
            index === 1 ? silverRankBadgeClass :
              index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black shadow-orange-500/30' :
                neutralRankBadgeClass
            }`}>
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <div className={`w-14 h-14 rounded-full overflow-hidden bg-white/10 ring-2 ring-f1-red/50 shrink-0 group-hover:ring-f1-red transition-all duration-300 ${avatarUrl.includes('/archive/') ? 'p-2' : isLocal ? 'p-1' : ''
                  }`}>
                  <img
                    src={avatarUrl}
                    alt={`${driver.firstName} ${driver.lastName}`}
                    className={`w-full h-full transition-transform duration-500 group-hover:scale-110 object-top ${avatarUrl.includes('/archive/') ? 'object-contain' : 'object-cover'
                      }`}
                    loading="lazy"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-f1-red/30 to-f1-red/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-f1-red">{driver.code}</span>
                </div>
              )}

              <div className="flex-1 min-w-0 py-1">
                <div className="space-y-1">
                  <span className="text-lg font-bold text-primary group-hover:text-f1-red transition-colors block leading-tight">
                    {driver.firstNameCn || driver.firstName} {driver.lastNameCn || driver.lastName}
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="text-sm text-secondary leading-tight">
                      {driver.firstName} {driver.lastName}
                    </span>
                    <div className="flex items-center gap-2 opacity-80">
                      <div className="w-2 rounded-full h-2" style={{ backgroundColor: driver.teamColor || '#6b7280' }} />
                      <span className="text-xs text-secondary font-medium tracking-tight whitespace-nowrap">
                        {driver.team}
                      </span>
                      <span className="text-[10px] text-secondary/40 font-mono">|</span>
                      <span className="text-[10px] text-secondary/60 font-mono">{driver.code}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {driver.championshipYears && driver.championshipYears.length > 0 && (
          <div className="mt-1 grid grid-cols-[auto_max-content_repeat(7,minmax(0,1fr))] items-center gap-x-1 gap-y-1 text-xs text-secondary">
            <Crown size={12} className="text-yellow-500 shrink-0" />
            <span>冠军年份:</span>
            {driver.championshipYears.map((year) => (
              <span key={year} className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                {year}
              </span>
            ))}
          </div>
        )}
      </div>

      {(showStats || variant === 'list') && (
        <div className={`grid grid-cols-5 ${variant === 'list' ? 'gap-2 shrink-0 mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-none border-border lg:w-[480px] xl:w-[560px]' : 'gap-2 mt-4 pt-4 border-t border-border'}`}>
          <div className="text-center group/stat">
            <div className="flex flex-col items-center gap-1 text-secondary mb-1 group-hover/stat:text-primary transition-colors">
              <Trophy size={14} className="text-accent-gold" />
              <span className={`font-bold uppercase tracking-tight ${variant === 'list' ? 'text-[10px] md:text-xs' : 'text-[10px]'}`}>积分</span>
            </div>
            <div className={`font-bold text-primary tabular-nums ${variant === 'list' ? 'text-base md:text-xl text-accent-blue' : 'text-base'}`}>{driver.points.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
          </div>
          <div className="text-center group/stat">
            <div className="flex flex-col items-center gap-1 text-secondary mb-1 group-hover/stat:text-primary transition-colors">
              <Medal size={14} className="text-f1-red" />
              <span className={`font-bold uppercase tracking-tight ${variant === 'list' ? 'text-[10px] md:text-xs' : 'text-[10px]'}`}>胜场</span>
            </div>
            <div className={`font-bold text-primary tabular-nums ${variant === 'list' ? 'text-base md:text-xl' : 'text-base'}`}>{driver.wins}</div>
          </div>
          <div className="text-center group/stat">
            <div className="flex flex-col items-center gap-1 text-secondary mb-1 group-hover/stat:text-primary transition-colors">
              <Medal size={14} className="text-accent-purple" />
              <span className={`font-bold uppercase tracking-tight ${variant === 'list' ? 'text-[10px] md:text-xs' : 'text-[10px]'}`}>领奖台</span>
            </div>
            <div className={`font-bold text-primary tabular-nums ${variant === 'list' ? 'text-base md:text-xl' : 'text-base'}`}>{driver.podiums}</div>
          </div>
          <div className="text-center group/stat">
            <div className="flex flex-col items-center gap-1 text-secondary mb-1 group-hover/stat:text-primary transition-colors">
              <Timer size={14} className={`${driver.poles > 0 ? 'text-accent-pink' : 'text-secondary'}`} />
              <span className={`font-bold uppercase tracking-tight ${variant === 'list' ? 'text-[10px] md:text-xs' : 'text-[10px]'}`}>杆位</span>
            </div>
            <div className={`font-bold text-primary tabular-nums ${variant === 'list' ? 'text-base md:text-xl' : 'text-base'}`}>{driver.poles}</div>
          </div>
          <div className="text-center group/stat">
            <div className="flex flex-col items-center gap-1 text-secondary mb-1 group-hover/stat:text-primary transition-colors">
              <Crown size={14} className={`${driver.championships > 0 ? 'text-accent-gold' : 'text-secondary'}`} />
              <span className={`font-bold uppercase tracking-tight ${variant === 'list' ? 'text-[10px] md:text-xs' : 'text-[10px]'}`}>总冠军</span>
            </div>
            <div className={`font-bold text-primary tabular-nums ${variant === 'list' ? 'text-base md:text-xl text-accent-gold' : 'text-base'}`}>{driver.championships}</div>
          </div>
        </div>
      )}
    </Link>
  );
};



export const CompactDriverCard = ({
  driver,
  index,
}: {
  driver: Driver;
  index: number;
}) => {
  const avatarUrl = driver.avatar;
  const isLocal = avatarUrl && avatarUrl.startsWith('/photos/');

  return (
    <Link
      to={`/drivers?id=${driver.id}`}
      className="glass rounded-xl p-4 border border-border card-hover flex items-center space-x-4 group shadow-lg shadow-black/10 dark:shadow-white/5"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm ${index === 0 ? 'bg-yellow-500 text-black' :
        index === 1 ? silverRankBadgeClass :
          index === 2 ? 'bg-orange-500 text-black' :
            neutralRankBadgeClass
        }`}>
        {index + 1}
      </div>

      {avatarUrl ? (
        <div className={`w-12 h-12 rounded-full overflow-hidden bg-white/10 shrink-0 ${avatarUrl.includes('/archive/') ? 'p-1.5' : isLocal ? 'p-0.5' : ''
          }`}>
          <img
            src={avatarUrl}
            alt={driver.lastName}
            className={`w-full h-full transition-transform duration-500 group-hover:scale-110 object-top ${avatarUrl.includes('/archive/') ? 'object-contain' : 'object-cover'
              }`}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.classList.add('hidden');
            }}
          />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-f1-red/30 to-f1-red/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-f1-red">{driver.code}</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: driver.teamColor || '#6b7280' }} />
          <span className="font-bold text-primary truncate group-hover:text-f1-red transition-colors">
            {driver.firstNameCn || driver.firstName} {driver.lastNameCn || driver.lastName}
          </span>
        </div>
        <div className="text-[10px] text-secondary truncate ml-4">{driver.firstName} {driver.lastName}</div>
      </div>

      <div className="text-right shrink-0 mr-2">
        <div className="text-xl font-bold text-accent-blue">{driver.points.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
        <div className="text-secondary text-[10px]">积分</div>
      </div>

      <ChevronRight size={18} className="text-secondary group-hover:text-f1-red transition-all group-hover:translate-x-1" />
    </Link>
  );
};
