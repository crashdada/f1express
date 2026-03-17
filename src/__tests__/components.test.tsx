import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import Navigation from '../components/Navigation';
import { F1Provider } from '../context/F1Context';

describe('Layout', () => {
  it('renders children content', () => {
    render(
      <BrowserRouter>
        <F1Provider>
          <Layout>
            <div data-testid="test-content">Test Content</div>
          </Layout>
        </F1Provider>
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('renders navigation component', () => {
    render(
      <BrowserRouter>
        <F1Provider>
          <Layout>
            <div>Content</div>
          </Layout>
        </F1Provider>
      </BrowserRouter>
    );
    
    expect(screen.getByText(/EXPRESS/i)).toBeInTheDocument();
  });
});

describe('Navigation', () => {
  it('renders all navigation links', () => {
    render(
      <BrowserRouter>
        <F1Provider>
          <Navigation />
        </F1Provider>
      </BrowserRouter>
    );
    
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('车手')).toBeInTheDocument();
    expect(screen.getByText('车队')).toBeInTheDocument();
    expect(screen.getByText('比赛')).toBeInTheDocument();
    // Use a more specific query for '数据' if needed, or keeping it as is if it's unique enough
    expect(screen.getAllByText('数据').length).toBeGreaterThan(0);
  });

  it('has correct navigation structure', () => {
    render(
      <BrowserRouter>
        <F1Provider>
          <Navigation />
        </F1Provider>
      </BrowserRouter>
    );
    
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });
});
