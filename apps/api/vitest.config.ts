import 'reflect-metadata';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: { transform: { legacyDecorator: true, decoratorMetadata: true } },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['reflect-metadata'],
    coverage: {
      provider: 'v8',
      include: ['src/auth/**/*.ts'],
      exclude: ['src/auth/**/*.spec.ts', 'src/auth/**/*.module.ts'],
    },
  },
});