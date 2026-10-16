import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.ts'], coverage: { reporter: ['text', 'html'], include: ['packages/contracts/src/**/*.ts', 'apps/extension/src/background/**/*.ts'] } } });
