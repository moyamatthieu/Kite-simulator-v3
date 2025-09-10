import { SimulationApp } from './SimulationApp';

// Bootstrap the app once the DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('#app container not found');
  }

  // Instantiate the simulation
  const app = new SimulationApp(container);

  // Expose for quick debugging in console
  // @ts-expect-error attach to window for dev tools
  window.kiteSim = app;
});

