import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import Layout from '../../../src/components/Layout';
import Navigation from '../../../src/components/Navigation';
import { renderWithProviders } from '../../support/render';

describe('Layout', () => {
  it('renders children content', () => {
    renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('renders navigation component', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText(/EXPRESS/i)).toBeInTheDocument();
  });
});

describe('Navigation', () => {
  it('renders all navigation links', () => {
    renderWithProviders(<Navigation />);

    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('车手')).toBeInTheDocument();
    expect(screen.getByText('车队')).toBeInTheDocument();
    expect(screen.getByText('比赛')).toBeInTheDocument();
    expect(screen.getAllByText('数据').length).toBeGreaterThan(0);
  });

  it('has correct navigation structure', () => {
    renderWithProviders(<Navigation />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
