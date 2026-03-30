import { Link } from 'react-router-dom';
import { Trophy, Crown, ChevronRight, Medal, Timer } from 'lucide-react';
import { Team } from '../types';
import { getTeamDisplayName } from '../utils/f1Data';

// 根据背景色计算合适的文字颜色（深色或浅色）
const getContrastTextColor = (bgColor: string): string => {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
};

const getAccessibleBgColor = (team: Team): string => {
  const color = team.color || '#6b7280';
  const teamId = (team.id || team.name || '').toLowerCase();

  // 统一回归车队主色调背景 (去除法拉利的白色背景)
  if (color.toLowerCase() === '#ff8700' || teamId.includes('mclaren')) {
    return '#cc6b00'; // 迈凯伦压深以突出白色
  }

  // 法拉利官方红
  if (color.toLowerCase() === '#e8002d' || teamId.includes('ferrari')) {
    return 'rgb(237, 17, 49)';
  }

  return color;
};

// 现在统一使用官方 White 素材，不再需要 CSS 滤镜处理
const shouldInvertLogo = (teamId: string, teamName: string = ''): boolean => {
  return false;
};

interface TeamCardProps {
  team: Team;
  index: number;
  variant?: 'compact' | 'full';
}

const silverRankBadgeClass = 'bg-gradient-to-br from-[#f3f6fb] to-[#aeb8c8] text-slate-900 border border-white/60 shadow-lg shadow-[#d9e1ef]/40';
const neutralRankBadgeClass = 'bg-bg-secondary text-primary border border-border shadow-black/5';

const normalizeTeamLabel = (value?: string | null) =>
  (value || '').trim().toLowerCase();

const getInlineEnglishName = (team: Team) => {
  const chinese = normalizeTeamLabel(team.nameCn);
  const english = (team.name || '').trim();
  return english && normalizeTeamLabel(english) !== chinese ? english : '';
};

const getSecondaryTeamLabel = (team: Team) => {
  const secondary = (team.fullName || '').trim();
  const inlineEnglish = getInlineEnglishName(team);

  if (!secondary) return '';
  if (normalizeTeamLabel(secondary) === normalizeTeamLabel(inlineEnglish)) return '';
  if (normalizeTeamLabel(secondary) === normalizeTeamLabel(team.name)) return '';
  if (normalizeTeamLabel(secondary) === normalizeTeamLabel(team.nameCn)) return '';

  return secondary;
};

export const TeamCard = ({ team, index, variant = 'full' }: TeamCardProps) => {
  const inlineEnglishName = getInlineEnglishName(team);
  const secondaryTeamLabel = getSecondaryTeamLabel(team);

  if (variant === 'compact') {
    return (
      <Link
        to="/teams"
        className="glass rounded-xl p-4 border border-border card-hover flex items-center space-x-4 group shadow-lg shadow-black/10 dark:shadow-white/5"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${index === 0 ? 'bg-yellow-500 text-black' :
          index === 1 ? silverRankBadgeClass :
            index === 2 ? 'bg-orange-500 text-black' :
              neutralRankBadgeClass
          }`}>
          {index + 1}
        </div>

        {team.logo ? (
          <div
            className={`w-12 h-12 rounded-full p-2 shrink-0 flex items-center justify-center relative shadow-sm border ${(team.id || team.name)?.toLowerCase().includes('ferrari') ? 'border-f1-red/20' : 'shadow-inner'
              }`}
            style={{ backgroundColor: getAccessibleBgColor(team) }}
          >
            <img
              src={team.logo}
              alt={getTeamDisplayName(team)}
              className={`w-full h-full object-contain ${shouldInvertLogo(team.id || '', team.name) ? 'filter brightness-0 invert' : ''
                }`}
            />
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center p-1"
            style={{ backgroundColor: team.color || '#6b7280' }}
          >
            <span
              className="font-bold text-center leading-tight"
              style={{
                color: getContrastTextColor(team.color || '#6b7280'),
                fontSize: getTeamDisplayName(team).length > 4 ? '0.5rem' : '0.625rem'
              }}
            >
              {getTeamDisplayName(team)}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: team.color || '#6b7280' }} />
            <span className="font-semibold text-primary truncate group-hover:text-f1-red transition-colors">
              {team.nameCn} {inlineEnglishName && <span className="text-secondary text-xs font-normal">({inlineEnglishName})</span>}
            </span>
            {team.championships > 0 && (
              <span className="flex items-center text-accent-gold text-xs">
                <Crown size={12} className="mr-0.5" />
                {team.championships}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 mr-2">
          <div className="text-xl font-bold text-accent-blue">{team.points}</div>
          <div className="text-secondary text-[10px]">积分</div>
        </div>

        <ChevronRight size={18} className="text-secondary group-hover:text-f1-red transition-all group-hover:translate-x-1" />
      </Link>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 border border-border card-hover group shadow-xl shadow-black/10 dark:shadow-white/5">
      <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0 ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/30' :
          index === 1 ? silverRankBadgeClass :
            index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black shadow-lg shadow-orange-500/30' :
              neutralRankBadgeClass
          }`}>
          {index + 1}
        </div>

        <div className="flex items-center space-x-3">
          {team.logo ? (
            <div
              className={`w-16 h-16 rounded-full overflow-hidden p-2.5 transition-all group-hover:scale-105 shadow-xl flex items-center justify-center ${(team.id || team.name)?.toLowerCase().includes('ferrari') ? 'border border-f1-red/10' : ''
                }`}
              style={{ backgroundColor: getAccessibleBgColor(team) }}
            >
              <img
                src={team.logo}
                alt={getTeamDisplayName(team)}
                className={`w-full h-full object-contain ${shouldInvertLogo(team.id || '', team.name) ? 'filter brightness-0 invert' : ''
                  }`}
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-bold p-2 shadow-lg"
              style={{
                backgroundColor: team.color || '#6b7280',
                color: getContrastTextColor(team.color || '#6b7280')
              }}
            >
              <span
                className="text-center leading-tight"
                style={{ fontSize: getTeamDisplayName(team).length > 4 ? '0.65rem' : '0.75rem' }}
              >
                {getTeamDisplayName(team)}
              </span>
            </div>
          )}

          <div className="flex-1">
            <h3 className="text-xl font-bold text-primary mb-1 group-hover:text-f1-red transition-colors">
              {team.nameCn}
            </h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#6b7280' }} />
              {secondaryTeamLabel && <span className="text-xs text-secondary font-medium">{secondaryTeamLabel}</span>}
          </div>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <div className="text-center transition-colors group/stat">
          <div className="text-xl font-bold text-accent-blue mb-1 group-hover/stat:scale-110 transition-transform">{team.points.toLocaleString()}</div>
          <div className="text-secondary text-[10px] font-medium uppercase tracking-tight">总积分</div>
        </div>
        <div className="text-center transition-colors group/stat">
          <div className="text-xl font-bold text-accent-gold flex items-center justify-center mb-1 group-hover/stat:scale-110 transition-transform">
            <Trophy size={16} className="mr-1" />
            {team.wins}
          </div>
          <div className="text-secondary text-[10px] font-medium uppercase tracking-tight">分站冠军</div>
        </div>
        <div className="text-center transition-colors group/stat">
          <div className="text-xl font-bold text-accent-purple flex items-center justify-center mb-1 group-hover/stat:scale-110 transition-transform">
            <Medal size={16} className="mr-1" />
            {team.podiums}
          </div>
          <div className="text-secondary text-[10px] font-medium uppercase tracking-tight">领奖台</div>
        </div>
        <div className="text-center transition-colors group/stat">
          <div className={`text-xl font-bold flex items-center justify-center mb-1 group-hover/stat:scale-110 transition-transform ${team.poles > 0 ? 'text-accent-cyan' : 'text-muted'}`}>
            <Timer size={16} className="mr-1" />
            {team.poles}
          </div>
          <div className="text-secondary text-[10px] font-medium uppercase tracking-tight">杆位</div>
        </div>
        <div className="text-center transition-colors col-span-2 md:col-span-1 group/stat">
          <div className={`text-xl font-bold flex items-center justify-center mb-1 group-hover/stat:scale-110 transition-transform ${team.championships > 0 ? 'text-accent-gold' : 'text-muted'}`}>
            <Crown size={18} className="mr-1" />
            {team.championships}
          </div>
          <div className="text-secondary text-[10px] font-medium uppercase tracking-tight">总冠军</div>
        </div>
      </div>

      {team.championshipYears && team.championshipYears.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex items-center flex-wrap gap-1.5">
          <Crown size={12} className="text-accent-gold" />
          <span className="text-[10px] font-bold text-secondary mr-1">冠军年份:</span>
          {team.championshipYears.map((year) => (
            <span key={year} className="bg-accent-gold/10 text-accent-gold px-2 py-0.5 rounded text-[10px] font-bold border border-accent-gold/20">
              {year}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const TeamRow = ({ team, index }: { team: Team; index: number }) => {
  const inlineEnglishName = getInlineEnglishName(team);
  const secondaryTeamLabel = getSecondaryTeamLabel(team);

  return (
    <tr className="border-t border-border hover:bg-primary/5 transition-colors group">
      <td className="py-4 px-6">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' :
          index === 1 ? silverRankBadgeClass :
            index === 2 ? 'bg-orange-500 text-black' :
              neutralRankBadgeClass
          }`}>
          {index + 1}
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center space-x-3">
          {team.logo ? (
            <div
              className={`w-12 h-12 rounded-full overflow-hidden p-2 shadow-md flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 border ${(team.id || team.name)?.toLowerCase().includes('ferrari') ? 'border-f1-red/20' : ''
                }`}
              style={{ backgroundColor: getAccessibleBgColor(team) }}
            >
              <img
                src={team.logo}
                alt={team.name}
                className={`w-full h-full object-contain ${shouldInvertLogo(team.id || '', team.name) ? 'filter brightness-0 invert' : ''
                  }`}
              />
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold p-1 shadow-md flex-shrink-0"
              style={{
                backgroundColor: team.color || '#6b7280',
                color: getContrastTextColor(team.color || '#6b7280')
              }}
            >
              <span className="text-[10px] leading-tight text-center">{getTeamDisplayName(team)}</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-primary truncate group-hover:text-f1-red transition-colors">
                {team.nameCn}
                {inlineEnglishName && <span className="text-secondary text-xs font-normal ml-2">({inlineEnglishName})</span>}
              </span>
              {team.championships > 0 && (
                <Crown size={12} className="text-accent-gold shrink-0" />
              )}
            </div>
            {secondaryTeamLabel && <div className="text-[10px] text-secondary truncate">{secondaryTeamLabel}</div>}
          </div>
        </div>
      </td>
      <td className="py-4 px-6 text-right">
        <span className="text-xl font-bold text-accent-blue">{team.points.toLocaleString()}</span>
      </td>
      <td className="py-4 px-6 text-right">
        <div className="flex items-center justify-end space-x-1 text-primary">
          <Trophy size={16} className="text-accent-gold" />
          <span className="font-bold">{team.wins}</span>
        </div>
      </td>
      <td className="py-4 px-6 text-right">
        <div className="flex items-center justify-end space-x-1 text-primary">
          <Medal size={16} className="text-accent-purple" />
          <span className="font-bold">{team.podiums}</span>
        </div>
      </td>
      <td className="py-4 px-6 text-right">
        <div className="flex items-center justify-end space-x-1 text-primary">
          <Timer size={16} className={team.poles > 0 ? 'text-accent-pink' : 'text-secondary'} />
          <span className="font-bold">{team.poles}</span>
        </div>
      </td>
      <td className="py-4 px-6 text-right">
        <div className="flex items-center justify-end space-x-1 text-primary">
          <Crown size={16} className={team.driverChampionships > 0 ? 'text-accent-gold' : 'text-secondary'} />
          <span className="font-bold">{team.driverChampionships}</span>
        </div>
      </td>
      <td className="py-4 px-6 text-right">
        <div className="flex items-center justify-end space-x-1 text-primary">
          <Crown size={16} className={team.championships > 0 ? 'text-accent-gold' : 'text-secondary'} />
          <span className="font-bold">{team.championships}</span>
        </div>
      </td>
    </tr>
  );
};
