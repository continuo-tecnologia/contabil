import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// A API é a mesma (Express/Mongo): em produção o nginx da imagem a serve em /api (nginx.conf); em desenvolvimento o Vite a repassa.
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: { '/api': { target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3333', rewrite: path => path.replace(/^\/api/, '') } },
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.{ts,tsx}'],
        setupFiles: ['src/setup.ts'],
    },
});
