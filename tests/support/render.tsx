import { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { F1Provider } from '../../src/context/F1Context';

export function renderWithProviders(component: ReactNode) {
  return render(
    <MemoryRouter>
      <F1Provider>{component}</F1Provider>
    </MemoryRouter>
  );
}

export function renderWithRouter(
  component: ReactNode,
  initialEntries?: string[],
  routePath?: string
) {
  if (routePath) {
    return render(
      <MemoryRouter initialEntries={initialEntries ?? ['/']}>
        <Routes>
          <Route path={routePath} element={component} />
        </Routes>
      </MemoryRouter>
    );
  }
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  );
}
