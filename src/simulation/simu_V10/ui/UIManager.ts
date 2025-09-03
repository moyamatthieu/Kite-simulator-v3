/**
 * UIManager.ts - Système d'interface orienté objet (copie locale V10)
 */

export interface PanelConfig {
  id: string;
  title: string;
  width: number;
  height: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  priority: number;
  resizable?: boolean;
  collapsible?: boolean;
  content?: string | HTMLElement;
  className?: string;
}

export interface PanelInstance {
  config: PanelConfig;
  element: HTMLElement;
  isCollapsed: boolean;
  actualPosition: { x: number; y: number };
  userPositioned?: boolean;
}

export class UIManager {
  private panels: Map<string, PanelInstance> = new Map();
  private container: HTMLElement;
  private readonly PANEL_MARGIN = 15;
  private readonly HEADER_HEIGHT = 30;
  private readonly STORAGE_KEY = 'ui_layout_v10';

  constructor(container: HTMLElement) {
    this.container = container;
    this.initializeBaseStyles();
  }

  private initializeBaseStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .ui-panel { 
        position: absolute; 
        background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95)); 
        backdrop-filter: blur(16px); 
        border-radius: 16px; 
        border: 1px solid rgba(102,126,234,0.3); 
        box-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(102,126,234,0.1), inset 0 1px 0 rgba(255,255,255,0.1); 
        color: white; 
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; 
        transition: all 0.4s cubic-bezier(0.4,0,0.2,1); 
        overflow: hidden; 
        z-index: 1000;
        will-change: transform;
      }
      .ui-panel:hover { 
        border-color: rgba(102,126,234,0.6); 
        box-shadow: 0 15px 50px rgba(0,0,0,0.5), 0 6px 16px rgba(102,126,234,0.2), inset 0 1px 0 rgba(255,255,255,0.15); 
        transform: translateY(-3px) scale(1.01); 
      }
      .ui-panel-header { 
        background: linear-gradient(90deg, rgba(102,126,234,0.9), rgba(118,75,162,0.9)); 
        padding: 10px 16px; 
        font-weight: 600; 
        font-size: 13px; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        cursor: move; 
        user-select: none;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        position: relative;
        overflow: hidden;
      }
      .ui-panel-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s;
      }
      .ui-panel:hover .ui-panel-header::before {
        transform: translateX(100%);
      }
      .ui-panel-title { 
        color: white; 
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .ui-panel-controls { 
        display: flex; 
        gap: 6px; 
        z-index: 10;
        position: relative;
      }
      .ui-panel-btn { 
        background: rgba(255,255,255,0.2); 
        border: none; 
        color: white; 
        width: 22px; 
        height: 22px; 
        border-radius: 6px; 
        cursor: pointer; 
        font-size: 12px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        backdrop-filter: blur(4px);
      }
      .ui-panel-btn:hover { 
        background: rgba(255,255,255,0.35); 
        transform: scale(1.15);
        box-shadow: 0 2px 8px rgba(255,255,255,0.2);
      }
      .ui-panel-btn:active {
        transform: scale(0.95);
      }
      .ui-panel-content { 
        padding: 16px; 
        font-size: 12px; 
        line-height: 1.6; 
        max-height: calc(100% - 44px); 
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(102,126,234,0.5) transparent;
      }
      .ui-panel-content::-webkit-scrollbar {
        width: 6px;
      }
      .ui-panel-content::-webkit-scrollbar-track {
        background: transparent;
      }
      .ui-panel-content::-webkit-scrollbar-thumb {
        background: rgba(102,126,234,0.5);
        border-radius: 3px;
      }
      .ui-panel-content::-webkit-scrollbar-thumb:hover {
        background: rgba(102,126,234,0.7);
      }
      .ui-panel.collapsed { 
        height: 44px !important; 
      }
      .ui-panel.collapsed .ui-panel-content {
        display: none;
      }
      .ui-panel.no-header .ui-panel-content {
        max-height: 100%;
      }
    `;
    document.head.appendChild(style);
  }

  createPanel(config: PanelConfig): PanelInstance {
    const panel = this.buildPanelElement(config);
    const instance: PanelInstance = { config, element: panel, isCollapsed: false, actualPosition: { x: 0, y: 0 } };
    this.panels.set(config.id, instance);
    this.container.appendChild(panel);
    this.repositionAllPanels();

    // Restaurer la position/état sauvegardés
    const layout = this.loadLayout();
    const saved = layout[config.id];
    if (saved) {
      instance.userPositioned = true;
      instance.actualPosition = { x: saved.x, y: saved.y };
      panel.style.left = `${saved.x}px`;
      panel.style.top = `${saved.y}px`;
      if (saved.collapsed !== undefined) {
        instance.isCollapsed = !!saved.collapsed;
        panel.classList.toggle('collapsed', instance.isCollapsed);
      }
    }
    // Repositionner le reste sans toucher aux panneaux fixés
    this.repositionAllPanels();
    return instance;
  }

  private buildPanelElement(config: PanelConfig): HTMLElement {
    const panel = document.createElement('div');
    panel.className = `ui-panel ${config.className || ''}`;
    panel.id = config.id;
    panel.setAttribute('data-v10', 'true'); // Marquer comme panneau V10
    const header = document.createElement('div');
    header.className = 'ui-panel-header';
    const title = document.createElement('span');
    title.className = 'ui-panel-title';
    title.textContent = config.title;
    const controls = document.createElement('div');
    controls.className = 'ui-panel-controls';
    if (config.collapsible !== false) {
      const collapseBtn = document.createElement('button');
      collapseBtn.className = 'ui-panel-btn';
      collapseBtn.innerHTML = '−';
      collapseBtn.onclick = () => this.togglePanel(config.id);
      controls.appendChild(collapseBtn);
    }
    header.appendChild(title);
    header.appendChild(controls);
    const content = document.createElement('div');
    content.className = 'ui-panel-content';
    if (typeof config.content === 'string') content.innerHTML = config.content; else if (config.content instanceof HTMLElement) content.appendChild(config.content);
    panel.appendChild(header); panel.appendChild(content);
    panel.style.width = `${config.width}px`; panel.style.height = `${config.height}px`;
    this.makeDraggable(panel, header);
    return panel;
  }

  private repositionAllPanels(): void {
    const positions: Record<string, PanelInstance[]> = { 'top-left': [], 'top-right': [], 'bottom-left': [], 'bottom-right': [], 'center': [] };
    this.panels.forEach(p => positions[p.config.position].push(p));
    Object.keys(positions).forEach(pos => positions[pos].sort((a, b) => b.config.priority - a.config.priority));
    this.calculatePositions(positions['top-left'], 'top-left');
    this.calculatePositions(positions['top-right'], 'top-right');
    this.calculatePositions(positions['bottom-left'], 'bottom-left');
    this.calculatePositions(positions['bottom-right'], 'bottom-right');
    this.calculatePositions(positions['center'], 'center');
  }

  private calculatePositions(panels: PanelInstance[], position: string): void {
    const containerRect = this.container.getBoundingClientRect();
    let currentX = this.PANEL_MARGIN;
    let currentY = this.PANEL_MARGIN;
    panels.forEach((panel, index) => {
      // Ne pas déplacer les panneaux que l'utilisateur a positionnés
      if (panel.userPositioned) return;
      const width = panel.config.width;
      const height = panel.isCollapsed ? this.HEADER_HEIGHT : panel.config.height;
      switch (position) {
        case 'top-left': panel.actualPosition = { x: currentX, y: currentY }; currentY += height + this.PANEL_MARGIN; break;
        case 'top-right': panel.actualPosition = { x: containerRect.width - width - currentX, y: currentY }; currentY += height + this.PANEL_MARGIN; break;
        case 'bottom-left': panel.actualPosition = { x: currentX, y: containerRect.height - height - currentY }; currentY += height + this.PANEL_MARGIN; break;
        case 'bottom-right': panel.actualPosition = { x: containerRect.width - width - currentX, y: containerRect.height - height - currentY }; currentY += height + this.PANEL_MARGIN; break;
        case 'center': panel.actualPosition = { x: (containerRect.width - width) / 2, y: (containerRect.height - height) / 2 + (index * 50) }; break;
      }
      panel.element.style.left = `${panel.actualPosition.x}px`;
      panel.element.style.top = `${panel.actualPosition.y}px`;
    });
  }

  private makeDraggable(panel: HTMLElement, handle: HTMLElement): void {
    let isDragging = false; let startX = 0; let startY = 0; let startLeft = 0; let startTop = 0;
    handle.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX; startY = e.clientY; startLeft = parseInt(panel.style.left) || 0; startTop = parseInt(panel.style.top) || 0; panel.style.zIndex = '2000'; document.body.style.cursor = 'grabbing'; });
    document.addEventListener('mousemove', (e) => { if (!isDragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY; panel.style.left = `${startLeft + dx}px`; panel.style.top = `${startTop + dy}px`; });
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false; panel.style.zIndex = '1000'; document.body.style.cursor = '';
        const inst = this.panels.get(panel.id); if (inst) {
          inst.userPositioned = true;
          inst.actualPosition = { x: parseInt(panel.style.left) || 0, y: parseInt(panel.style.top) || 0 };
          this.saveLayout();
        }
      }
    });
  }

  togglePanel(panelId: string): void {
    const panel = this.panels.get(panelId); if (!panel) return;
    panel.isCollapsed = !panel.isCollapsed; panel.element.classList.toggle('collapsed', panel.isCollapsed);
    const btn = panel.element.querySelector('.ui-panel-btn') as HTMLElement; if (btn) btn.innerHTML = panel.isCollapsed ? '+' : '−';
    this.saveLayout();
    this.repositionAllPanels();
  }

  updatePanelContent(panelId: string, content: string | HTMLElement): void {
    const panel = this.panels.get(panelId); if (!panel) return;
    const contentElement = panel.element.querySelector('.ui-panel-content') as HTMLElement;
    if (typeof content === 'string') contentElement.innerHTML = content; else { contentElement.innerHTML = ''; contentElement.appendChild(content); }
  }

  removePanel(panelId: string): void {
    const panel = this.panels.get(panelId); if (!panel) return;
    panel.element.remove(); this.panels.delete(panelId); this.repositionAllPanels();
  }

  resize(): void { this.keepPanelsInBounds(); this.repositionAllPanels(); }
  getPanel(panelId: string): PanelInstance | undefined { return this.panels.get(panelId); }
  getAllPanels(): Map<string, PanelInstance> { return new Map(this.panels); }

  private loadLayout(): Record<string, { x: number; y: number; collapsed?: boolean }> {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  private saveLayout(): void {
    const layout: Record<string, { x: number; y: number; collapsed?: boolean }> = {};
    this.panels.forEach((p, id) => {
      const left = parseInt(p.element.style.left) || p.actualPosition.x;
      const top = parseInt(p.element.style.top) || p.actualPosition.y;
      layout[id] = { x: left, y: top, collapsed: p.isCollapsed };
    });
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layout)); } catch {}
  }

  private keepPanelsInBounds(): void {
    const rect = this.container.getBoundingClientRect();
    this.panels.forEach(p => {
      if (!p.userPositioned) return;
      const el = p.element;
      let x = parseInt(el.style.left) || p.actualPosition.x;
      let y = parseInt(el.style.top) || p.actualPosition.y;
      const maxX = Math.max(0, rect.width - p.config.width - this.PANEL_MARGIN);
      const maxY = Math.max(0, rect.height - (p.isCollapsed ? this.HEADER_HEIGHT : p.config.height) - this.PANEL_MARGIN);
      x = Math.min(Math.max(this.PANEL_MARGIN, x), maxX);
      y = Math.min(Math.max(this.PANEL_MARGIN, y), maxY);
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      p.actualPosition = { x, y };
    });
    this.saveLayout();
  }
}
