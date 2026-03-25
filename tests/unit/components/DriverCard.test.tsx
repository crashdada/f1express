import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { DriverCard } from '../../../src/components/DriverCard';
import { renderWithRouter } from '../../support/render';
import type { Driver } from '../../../src/types';

const mockDriver: Driver = {
  id: 44,
  number: 44,
  firstName: 'Lewis',
  lastName: 'Hamilton',
  firstNameCn: 'Lewis',
  lastNameCn: 'Hamilton',
  code: 'HAM',
  team: 'Ferrari',
  nationality: 'British',
  points: 100,
  wins: 2,
  podiums: 5,
  poles: 1,
  championships: 7,
  championshipYears: [2008, 2014, 2015, 2017, 2018, 2019, 2020],
  teamColor: '#dc2626',
  avatar: '/photos/drivers/hamilton.png',
};

describe('DriverCard', () => {
  it('keeps championship years row aligned to the left edge of the rank badge in list variant', () => {
    const { container } = renderWithRouter(
      <DriverCard driver={mockDriver} index={0} variant="list" />
    );

    const championshipRow = screen.getByText('冠军年份:').parentElement;

    expect(championshipRow).toBeInTheDocument();
    expect(championshipRow).not.toHaveClass('md:pl-14');
    expect(container.querySelector('.md\\:pl-14')).toBeNull();
  });

  it('uses a row layout with seven dedicated year columns', () => {
    renderWithRouter(<DriverCard driver={mockDriver} index={0} variant="list" />);

    const championshipRow = screen.getByText('冠军年份:').parentElement;

    expect(championshipRow).toBeInTheDocument();
    expect(championshipRow).toHaveClass(
      'grid-cols-[auto_max-content_repeat(7,minmax(0,1fr))]'
    );
  });
});
