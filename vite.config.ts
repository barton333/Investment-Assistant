import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '')
  
  // Get API_KEY from .env file OR system environment (Cloudflare Pages Dashboard)
  const apiKey = env.API_KEY || process.env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY is replaced by the actual string value during build
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Polyfill process.env for other potential uses (optional)
      'process.env': {}
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  }
})