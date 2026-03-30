import { describe, expect, it } from 'vitest';
import { TeamCard } from '../../../src/components/TeamCard';
import { renderWithRouter } from '../../support/render';

const mockTeam = {
  id: 'mercedes',
  name: 'Mercedes',
  fullName: 'Mercedes-AMG Petronas Formula One Team',
  nameCn: '梅赛德斯',
  points: 98,
  wins: 2,
  podiums: 4,
  poles: 1,
  championships: 8,
  driverChampionships: 9,
  color: '#27f4d2',
  logo: '/logos/mercedes.png',
};

describe('TeamCard', () => {
  it('uses the brighter silver style for the second-place compact rank badge', () => {
    const { container } = renderWithRouter(<TeamCard team={mockTeam} index={1} variant="compact" />);
    const rankBadge = container.querySelector('.w-10.h-10.rounded-full');

    expect(rankBadge).toBeInTheDocument();
    expect(rankBadge).toHaveClass('bg-gradient-to-br');
    expect(rankBadge).toHaveClass('from-[#f3f6fb]');
    expect(rankBadge).toHaveClass('to-[#aeb8c8]');
    expect(rankBadge).toHaveClass('shadow-[#d9e1ef]/40');
  });

  it('uses the brighter silver style for the second-place full rank badge', () => {
    const { container } = renderWithRouter(<TeamCard team={mockTeam} index={1} variant="full" />);
    const rankBadge = container.querySelector('.w-14.h-14.rounded-full');

    expect(rankBadge).toBeInTheDocument();
    expect(rankBadge).toHaveClass('bg-gradient-to-br');
    expect(rankBadge).toHaveClass('from-[#f3f6fb]');
    expect(rankBadge).toHaveClass('to-[#aeb8c8]');
    expect(rankBadge).toHaveClass('shadow-[#d9e1ef]/40');
  });

  it('uses the unified dark badge style for non-podium team ranks', () => {
    const { container } = renderWithRouter(<TeamCard team={mockTeam} index={4} variant="compact" />);
    const rankBadge = container.querySelector('.w-10.h-10.rounded-full');

    expect(rankBadge).toBeInTheDocument();
    expect(rankBadge).toHaveClass('bg-bg-secondary');
    expect(rankBadge).toHaveClass('text-primary');
    expect(rankBadge).toHaveClass('border');
    expect(rankBadge).toHaveClass('border-border');
  });
});
