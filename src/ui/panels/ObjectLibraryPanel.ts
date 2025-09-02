/**
 * ObjectLibraryPanel.ts - Panneau listant les objets disponibles (src/objects)
 * Catégorisé via AutoLoader.getCategories()
 */

import { Panel, type PanelConfig } from '../core/Panel.js';
import type { ObjectInfo } from '../../core/AutoLoader.js';

export class ObjectLibraryPanel extends Panel {
  private categories: Record<string, ObjectInfo[]> = {};
  private expanded: Set<string> = new Set();
  private searchQuery = '';
  private containerEl!: HTMLElement;

  // Callbacks
  private onSelectCallbacks: ((objectId: string) => void)[] = [];

  constructor() {
    const config: PanelConfig = {
      id: 'object-library',
      title: 'Bibliothèque d\'Objets',
      position: 'left',
      size: {
        width: 260,
        height: 400,
        minWidth: 200,
        minHeight: 200
      },
      resizable: true,
      collapsible: true,
      closable: false,
      draggable: true,
      visible: true
    };
    super(config);
  }

  public render(): void {
    this.contentElement.innerHTML = `
      <div class="objlib">
        <div class="objlib__toolbar">
          <input type="text" id="objlib-search" placeholder="Rechercher..." />
          <button id="objlib-refresh" title="Actualiser">🔄</button>
        </div>
        <div id="objlib-list" class="objlib__list"></div>
      </div>
    `;

    // Minimal styles scoped to panel
    const style = document.createElement('style');
    style.textContent = `
      .objlib { display:flex; flex-direction:column; height:100%; gap:6px; }
      .objlib__toolbar { display:flex; gap:6px; padding:4px; align-items:center; background: var(--bg-primary); border-bottom:1px solid var(--border-primary); }
      #objlib-search { flex:1; background: var(--bg-tertiary); color: var(--text-primary); border:1px solid var(--border-secondary); border-radius:4px; padding:4px 6px; }
      #objlib-refresh { background: var(--bg-tertiary); color: var(--text-secondary); border:1px solid var(--border-secondary); border-radius:4px; padding:4px 6px; cursor:pointer; }
      #objlib-refresh:hover { background: var(--bg-hover); color: var(--text-primary); }
      .objlib__list { flex:1; overflow:auto; padding:6px; }
      .objlib__cat { margin-bottom:8px; border:1px solid var(--border-primary); border-radius:6px; background: var(--bg-secondary); }
      .objlib__cat-header { display:flex; align-items:center; gap:6px; padding:6px 8px; cursor:pointer; user-select:none; border-bottom:1px solid var(--border-primary); }
      .objlib__cat-title { font-weight:600; color: var(--text-primary); }
      .objlib__items { padding:6px; display:grid; grid-template-columns: 1fr; gap:4px; }
      .objlib__btn { width:100%; text-align:left; background: var(--bg-tertiary); color: var(--text-secondary); border:1px solid var(--border-secondary); border-radius:4px; padding:6px 8px; cursor:pointer; }
      .objlib__btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--accent-primary); }
      .objlib__desc { display:block; font-size:11px; color: var(--text-tertiary); }
    `;
    this.contentElement.appendChild(style);

    this.containerEl = this.contentElement.querySelector('#objlib-list') as HTMLElement;

    // Events
    const search = this.contentElement.querySelector('#objlib-search') as HTMLInputElement;
    search?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
      this.renderList();
    });
    const refreshBtn = this.contentElement.querySelector('#objlib-refresh');
    refreshBtn?.addEventListener('click', () => this.renderList());

    this.renderList();
  }

  private renderList(): void {
    const html: string[] = [];
    const entries = Object.entries(this.categories);

    if (entries.length === 0) {
      this.containerEl.innerHTML = `<div style="padding:8px; color:var(--text-secondary);">Aucun objet détecté</div>`;
      return;
    }

    for (const [cat, items] of entries) {
      const isExpanded = this.expanded.has(cat) || this.searchQuery.length > 0;

      // Filter items by search
      const filtered = this.searchQuery
        ? items.filter(o => o.id.toLowerCase().includes(this.searchQuery) || o.name.toLowerCase().includes(this.searchQuery))
        : items;

      if (this.searchQuery && filtered.length === 0) continue;

      html.push(`
        <div class="objlib__cat" data-cat="${cat}">
          <div class="objlib__cat-header" data-action="toggle">
            <span>${isExpanded ? '▼' : '▶'}</span>
            <span class="objlib__cat-title">${cat}</span>
            <span style="margin-left:auto; color:var(--text-tertiary); font-size:11px;">${filtered.length}</span>
          </div>
          <div class="objlib__items" style="display:${isExpanded ? 'grid' : 'none'}">
            ${filtered.map(o => `
              <button class="objlib__btn" data-action="select" data-id="${o.id}">
                <strong>${o.name}</strong>
                <span class="objlib__desc">${o.id}${o.description ? ' – ' + o.description : ''}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `);
    }

    this.containerEl.innerHTML = html.join('');

    // Attach events (toggle / select)
    this.containerEl.querySelectorAll('.objlib__cat-header').forEach(h => {
      h.addEventListener('click', () => {
        const cat = (h.parentElement as HTMLElement).dataset.cat!;
        if (this.expanded.has(cat)) this.expanded.delete(cat); else this.expanded.add(cat);
        this.renderList();
      });
    });
    this.containerEl.querySelectorAll('.objlib__btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.onSelectCallbacks.forEach(cb => cb(id));
      });
    });
  }

  // Public API
  public setCategories(categories: Record<string, ObjectInfo[]>): void {
    this.categories = categories || {};
    // Expand first few categories by default for discoverability
    if (this.expanded.size === 0) {
      Object.keys(this.categories).slice(0, 2).forEach(k => this.expanded.add(k));
    }
    if (this.contentElement) this.renderList();
  }

  public onSelect(callback: (objectId: string) => void): void {
    this.onSelectCallbacks.push(callback);
  }
}

