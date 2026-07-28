import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // Unique port for super admin portal to prevent collisions
    host: true,
    strictPort: true
  }
})
