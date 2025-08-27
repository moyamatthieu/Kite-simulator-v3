import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // 🎯 Alias principaux
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@abstractions': resolve(__dirname, 'src/abstractions'),
      '@base': resolve(__dirname, 'src/base'),
      '@factories': resolve(__dirname, 'src/factories'),
      '@objects': resolve(__dirname, 'src/objects'),
      '@renderer': resolve(__dirname, 'src/renderer/index'),
      '@types': resolve(__dirname, 'src/types'),
      '@export': resolve(__dirname, 'src/export/index'),
      
      // 🏭 Factories par métier  
      '@factories/furniture': resolve(__dirname, 'src/factories/FurnitureFactory'),
      '@factories/shapes': resolve(__dirname, 'src/factories/ShapesFactory'),
      '@factories/mechanical': resolve(__dirname, 'src/factories/MechanicalFactory'),
      '@factories/organic': resolve(__dirname, 'src/factories/OrganicFactory'),
      
      // 📦 Objets par catégorie
      '@objects/furniture': resolve(__dirname, 'src/objects/furniture'),
      '@objects/shapes': resolve(__dirname, 'src/objects/shapes'),
      '@objects/mechanical': resolve(__dirname, 'src/objects/mechanical'),
      '@objects/organic': resolve(__dirname, 'src/objects/organic'),
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    // Configuration multi-pages
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        simulation: resolve(__dirname, 'simulation.html')
      }
    }
  }
})