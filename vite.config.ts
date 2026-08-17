import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this as a project site under /episode-tier-ranker/.
  // Local dev and other hosts are unaffected: the workflow sets the variable.
  base: process.env.VITE_BASE_PATH ?? '/',
})
