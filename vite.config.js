import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    base: '/map/',
    plugins: [react()],
    // Allow passing `--config=prod` or `--config=test` to npm scripts
    // (npm exposes that as `npm_config_config`) so we inject it at build time
    // as `__BUILD_CONFIG__` for the client code to read.
    define: {
        __BUILD_CONFIG__: JSON.stringify(
            process.env.npm_config_config || process.env.npm_config_mode || process.env.NODE_ENV || ''
        ),
    },
    build: {
        outDir: '../administrator-server/public/map',
        emptyOutDir: true,
    }
})
