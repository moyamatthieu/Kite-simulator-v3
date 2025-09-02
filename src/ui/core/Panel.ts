/**
 * Panel.ts - Classe base pour tous les panels UI redimensionnables
 * Architecture modulaire inspirée de Godot Editor
 */

export interface PanelConfig {
    id: string;
    title: string;
    position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'floating';
    size: {
        width?: number;
        height?: number;
        minWidth?: number;
        minHeight?: number;
        maxWidth?: number;
        maxHeight?: number;
    };
    resizable: boolean;
    collapsible: boolean;
    closable: boolean;
    draggable: boolean;
    visible: boolean;
    zIndex?: number;
}

export interface PanelState {
    width: number;
    height: number;
    x: number;
    y: number;
    collapsed: boolean;
    visible: boolean;
    docked: boolean;
    dockPosition?: 'left' | 'right' | 'top' | 'bottom';
}

/**
 * Classe base pour tous les panels de l'interface
 */
export abstract class Panel {
    public config: PanelConfig;
    public state: PanelState;
    protected panelElement!: HTMLElement;
    protected headerElement!: HTMLElement;
    protected contentElement!: HTMLElement;
    protected resizeHandles: HTMLElement[] = [];
    
    // Événements
    protected onResizeCallbacks: ((width: number, height: number) => void)[] = [];
    protected onMoveCallbacks: ((x: number, y: number) => void)[] = [];
    protected onCollapseCallbacks: ((collapsed: boolean) => void)[] = [];
    
    constructor(config: PanelConfig) {
        this.config = { ...config };
        this.state = {
            width: config.size.width || 300,
            height: config.size.height || 400,
            x: 0,
            y: 0,
            collapsed: false,
            visible: config.visible,
            docked: config.position !== 'floating'
        };
        
        this.createElement();
        this.setupEventListeners();
    }

    /**
     * Crée l'élément DOM du panel
     */
    protected createElement(): void {
        this.panelElement = document.createElement('div');
        this.panelElement.className = `panel panel--${this.config.position}`;
        this.panelElement.id = `panel-${this.config.id}`;
        
        // Header avec titre et contrôles
        this.headerElement = document.createElement('div');
        this.headerElement.className = 'panel__header';
        this.headerElement.innerHTML = `
            <span class="panel__title">${this.config.title}</span>
            <div class="panel__controls">
                ${this.config.collapsible ? '<button class="panel__btn panel__btn--collapse" title="Réduire/Développer">−</button>' : ''}
                ${this.config.closable ? '<button class="panel__btn panel__btn--close" title="Fermer">×</button>' : ''}
            </div>
        `;
        
        // Contenu du panel
        this.contentElement = document.createElement('div');
        this.contentElement.className = 'panel__content';
        
        this.panelElement.appendChild(this.headerElement);
        this.panelElement.appendChild(this.contentElement);
        
        // Poignées de redimensionnement
        if (this.config.resizable) {
            this.createResizeHandles();
        }
        
        // Styles initiaux
        this.updateStyles();
    }

    /**
     * Crée les poignées de redimensionnement
     */
    protected createResizeHandles(): void {
        const handles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
        
        handles.forEach(direction => {
            const handle = document.createElement('div');
            handle.className = `panel__resize-handle panel__resize-handle--${direction}`;
            handle.dataset.direction = direction;
            this.panelElement.appendChild(handle);
            this.resizeHandles.push(handle);
        });
    }

    /**
     * Configure les écouteurs d'événements
     */
    protected setupEventListeners(): void {
        // Header drag (pour déplacer le panel)
        if (this.config.draggable) {
            this.setupDragListeners();
        }
        
        // Resize handles
        if (this.config.resizable) {
            this.setupResizeListeners();
        }
        
        // Boutons de contrôle
        this.setupControlListeners();
    }

    /**
     * Configuration du drag & drop
     */
    protected setupDragListeners(): void {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startPosX = 0;
        let startPosY = 0;

        this.headerElement.addEventListener('mousedown', (e) => {
            if ((e.target as HTMLElement).closest('.panel__controls')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startPosX = this.state.x;
            startPosY = this.state.y;
            
            this.panelElement.classList.add('panel--dragging');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            this.setPosition(startPosX + deltaX, startPosY + deltaY);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.panelElement.classList.remove('panel--dragging');
            }
        });
    }

    /**
     * Configuration du redimensionnement
     */
    protected setupResizeListeners(): void {
        let isResizing = false;
        let resizeDirection = '';
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;

        this.resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                isResizing = true;
                resizeDirection = handle.dataset.direction!;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = this.state.width;
                startHeight = this.state.height;
                
                this.panelElement.classList.add('panel--resizing');
                e.preventDefault();
                e.stopPropagation();
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            this.handleResize(resizeDirection, deltaX, deltaY, startWidth, startHeight);
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizeDirection = '';
                this.panelElement.classList.remove('panel--resizing');
            }
        });
    }

    /**
     * Gère le redimensionnement selon la direction
     */
    protected handleResize(direction: string, deltaX: number, deltaY: number, startWidth: number, startHeight: number): void {
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newX = this.state.x;
        let newY = this.state.y;

        if (direction.includes('e')) newWidth = startWidth + deltaX;
        if (direction.includes('w')) {
            newWidth = startWidth - deltaX;
            newX = this.state.x + deltaX;
        }
        if (direction.includes('s')) newHeight = startHeight + deltaY;
        if (direction.includes('n')) {
            newHeight = startHeight - deltaY;
            newY = this.state.y + deltaY;
        }

        // Contraintes de taille
        newWidth = Math.max(this.config.size.minWidth || 100, newWidth);
        newHeight = Math.max(this.config.size.minHeight || 100, newHeight);
        
        if (this.config.size.maxWidth) newWidth = Math.min(this.config.size.maxWidth, newWidth);
        if (this.config.size.maxHeight) newHeight = Math.min(this.config.size.maxHeight, newHeight);

        this.setSize(newWidth, newHeight);
        if (direction.includes('w') || direction.includes('n')) {
            this.setPosition(newX, newY);
        }
    }

    /**
     * Configuration des boutons de contrôle
     */
    protected setupControlListeners(): void {
        // Bouton collapse
        const collapseBtn = this.headerElement.querySelector('.panel__btn--collapse');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                this.toggleCollapse();
            });
        }

        // Bouton close
        const closeBtn = this.headerElement.querySelector('.panel__btn--close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }
    }

    /**
     * Met à jour les styles CSS du panel
     */
    protected updateStyles(): void {
        if (this.config.position === 'floating') {
            Object.assign(this.panelElement.style, {
                position: 'absolute',
                left: `${this.state.x}px`,
                top: `${this.state.y}px`,
                width: `${this.state.width}px`,
                height: `${this.state.height}px`,
                zIndex: this.config.zIndex?.toString() || '1000'
            });
        } else {
            // Panel docké
            Object.assign(this.panelElement.style, {
                width: `${this.state.width}px`,
                height: `${this.state.height}px`
            });
        }

        this.panelElement.style.display = this.state.visible ? 'flex' : 'none';
        
        if (this.state.collapsed) {
            this.panelElement.classList.add('panel--collapsed');
            this.contentElement.style.display = 'none';
        } else {
            this.panelElement.classList.remove('panel--collapsed');
            this.contentElement.style.display = 'block';
        }
    }

    // === MÉTHODES PUBLIQUES ===

    /**
     * Définit la taille du panel
     */
    setSize(width: number, height: number): void {
        this.state.width = width;
        this.state.height = height;
        this.updateStyles();
        this.onResizeCallbacks.forEach(callback => callback(width, height));
    }

    /**
     * Définit la position du panel
     */
    setPosition(x: number, y: number): void {
        this.state.x = x;
        this.state.y = y;
        this.updateStyles();
        this.onMoveCallbacks.forEach(callback => callback(x, y));
    }

    /**
     * Bascule l'état collapsed/expanded
     */
    toggleCollapse(): void {
        this.state.collapsed = !this.state.collapsed;
        this.updateStyles();
        this.onCollapseCallbacks.forEach(callback => callback(this.state.collapsed));
    }

    /**
     * Affiche le panel
     */
    show(): void {
        this.state.visible = true;
        this.updateStyles();
    }

    /**
     * Cache le panel
     */
    hide(): void {
        this.state.visible = false;
        this.updateStyles();
    }

    /**
     * Ajoute le panel au DOM
     */
    public mount(container: HTMLElement): void {
        console.log(`Mounting panel ${this.config.id} to container:`, container);
        container.appendChild(this.panelElement);
        this.onMount();
    }

    /**
     * Supprime le panel du DOM
     */
    unmount(): void {
        if (this.panelElement.parentNode) {
            this.panelElement.parentNode.removeChild(this.panelElement);
        }
        this.onUnmount();
    }

    // === MÉTHODES ABSTRAITES ===
    
    /**
     * Rendu du contenu spécifique au panel
     */
    public abstract render(): void;

    /**
     * Appelée quand le panel est ajouté au DOM
     */
    protected onMount(): void {}

    /**
     * Appelée quand le panel est retiré du DOM
     */
    protected onUnmount(): void {}

    // === ÉVÉNEMENTS ===

    onResize(callback: (width: number, height: number) => void): void {
        this.onResizeCallbacks.push(callback);
    }

    onMove(callback: (x: number, y: number) => void): void {
        this.onMoveCallbacks.push(callback);
    }

    onCollapse(callback: (collapsed: boolean) => void): void {
        this.onCollapseCallbacks.push(callback);
    }

    // === GETTERS ===

    get element(): HTMLElement {
        return this.panelElement;
    }

    get contentContainer(): HTMLElement {
        return this.contentElement;
    }

    get isVisible(): boolean {
        return this.state.visible;
    }

    get isCollapsed(): boolean {
        return this.state.collapsed;
    }

    get size(): { width: number; height: number } {
        return { width: this.state.width, height: this.state.height };
    }

    get position(): { x: number; y: number } {
        return { x: this.state.x, y: this.state.y };
    }
}