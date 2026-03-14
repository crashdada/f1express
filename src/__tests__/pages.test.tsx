import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { F1Provider } from '../context/F1Context';
import HomePage from '../pages/HomePage';
import DriversPage from '../pages/DriversPage';
import TeamsPage from '../pages/TeamsPage';
import RacesPage from '../pages/RacesPage';

// Helper to render with all required providers
const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <F1Provider>
        {component}
      </F1Provider>
    </BrowserRouter>
  );
};

describe('HomePage', () => {
  it('renders page section titles correctly', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/积分榜/i)).toBeInTheDocument();
    expect(screen.getByText(/车队排名/i)).toBeInTheDocument();
  });

  it('renders main navigation buttons', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getAllByText(/查看更多/i).length).toBeGreaterThan(0);
  });

  it('renders stats section', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/记录车手/i)).toBeInTheDocument();
    expect(screen.getByText(/参与车队/i)).toBeInTheDocument();
  });
});

describe('DriversPage', () => {
  it('renders page title correctly', () => {
    renderWithProviders(<DriversPage />);
    expect(screen.getByRole('heading', { name: 'F1 车手数据' })).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<DriversPage />);
    expect(screen.getByPlaceholderText('搜索车手姓名、代码或车队...')).toBeInTheDocument();
  });

  it('renders view mode toggles', () => {
    renderWithProviders(<DriversPage />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('allows search input interaction', async () => {
    renderWithProviders(<DriversPage />);
    const searchInput = screen.getByPlaceholderText('搜索车手姓名、代码或车队...');
    
    await userEvent.type(searchInput, 'Hamilton');
    
    expect(searchInput).toHaveValue('Hamilton');
  });
});

describe('TeamsPage', () => {
  it('renders page title correctly', () => {
    renderWithProviders(<TeamsPage />);
    expect(screen.getByRole('heading', { name: 'F1 车队数据' })).toBeInTheDocument();
  });

  it('renders stats cards', () => {
    renderWithProviders(<TeamsPage />);
    expect(screen.getByText('车队总数')).toBeInTheDocument();
    expect(screen.getByText('总胜场')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    renderWithProviders(<TeamsPage />);
    expect(screen.getByText('排名')).toBeInTheDocument();
    expect(screen.getByText('车队')).toBeInTheDocument();
  });
});

describe('RacesPage', () => {
  it('renders page title correctly', () => {
    renderWithProviders(<RacesPage />);
    expect(screen.getByRole('heading', { name: 'F1 比赛记录' })).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<RacesPage />);
    expect(screen.getByPlaceholderText('搜索赛道、国家或车手...')).toBeInTheDocument();
  });

  it('allows search input interaction', async () => {
    renderWithProviders(<RacesPage />);
    const searchInput = screen.getByPlaceholderText('搜索赛道、国家或车手...');
    
    await userEvent.type(searchInput, 'Bahrain');
    
    expect(searchInput).toHaveValue('Bahrain');
  });
});
