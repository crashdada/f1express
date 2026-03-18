import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx,js}', 'tests/integration/**/*.test.{ts,tsx,js}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', 'tests/config/', 'tests/support/', '**/*.d.ts', '**/*.config.*', '**/mockData.*'],
    },
  },
});
