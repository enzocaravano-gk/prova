import { defineConfig } from 'vite'

// Configurazione minima senza plugin esterni che mancano
export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
