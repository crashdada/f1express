import { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { F1Provider } from '../../src/context/F1Context';

export function renderWithProviders(component: ReactNode) {
  return render(
    <BrowserRouter>
      <F1Provider>{component}</F1Provider>
    </BrowserRouter>
  );
}

export function renderWithRouter(component: ReactNode) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}
