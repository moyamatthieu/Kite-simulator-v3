export interface VersionInfo {
    version: string;
    name: string;
    description?: string;
}

export type Mode = 'cao' | 'simulation';

export class MenuBar {
    private container: HTMLElement;
    private element: HTMLElement;
    private onModeChange?: (mode: Mode) => void;
    private onVersionSelect?: (version: string) => void;
    private versions: VersionInfo[] = [];

    constructor(container: HTMLElement = document.body, opts?: { onModeChange?: (m: Mode) => void, onVersionSelect?: (v: string) => void }) {
        this.container = container;
        if (opts?.onModeChange) this.onModeChange = opts.onModeChange;
        if (opts?.onVersionSelect) this.onVersionSelect = opts.onVersionSelect;
        this.element = this.build();
        this.container.appendChild(this.element);
    }

    private build(): HTMLElement {
        const wrap = document.createElement('div');
        wrap.className = 'app-menubar no-select';
        wrap.style.position = 'absolute';
        wrap.style.top = '10px';
        wrap.style.left = '10px';
        wrap.style.zIndex = '1200';

        const label = document.createElement('span');
        label.textContent = 'MODE:';
        label.style.color = 'var(--muted)';
        label.style.fontWeight = '700';
        label.style.marginRight = '10px';
        label.style.letterSpacing = '1px';
        wrap.appendChild(label);

        const caoBtn = document.createElement('button');
        caoBtn.id = 'menubar-mode-cao';
        caoBtn.className = 'mode-btn';
        caoBtn.textContent = 'CAO';
        caoBtn.onclick = () => this.emitMode('cao');
        wrap.appendChild(caoBtn);

        const simBtn = document.createElement('button');
        simBtn.id = 'menubar-mode-simulation';
        simBtn.className = 'mode-btn';
        simBtn.style.marginLeft = '8px';
        simBtn.textContent = 'Simulation';
        simBtn.onclick = () => this.emitMode('simulation');
        wrap.appendChild(simBtn);

        // versions container
        const versionsWrap = document.createElement('div');
        versionsWrap.id = 'menubar-versions';
        versionsWrap.style.display = 'inline-block';
        versionsWrap.style.marginLeft = '20px';
        versionsWrap.style.verticalAlign = 'middle';
        wrap.appendChild(versionsWrap);

        // style minimal
        const style = document.createElement('style');
        style.textContent = `
            .app-menubar .mode-btn{ padding:6px 10px; border-radius:6px; border:2px solid transparent; background:#333; color:#fff; cursor:pointer }
            .app-menubar .mode-btn.active{ background:var(--accent-1); border-color:var(--accent-2); box-shadow:0 0 10px rgba(102,126,234,0.4) }
            .app-menubar .version-btn{ padding:6px 8px; margin-left:6px; background:#444; color:#fff; border-radius:6px; border:2px solid transparent; cursor:pointer }
            .app-menubar .version-btn.active{ background:linear-gradient(135deg,var(--accent-1),var(--accent-2)); border-color:var(--accent-2); box-shadow:0 0 8px rgba(0,0,0,0.2) }
        `;
        wrap.appendChild(style);

        return wrap;
    }

    private emitMode(mode: Mode) {
        // toggle body classes
        if (mode === 'simulation') {
            document.body.classList.add('simulation-mode');
            document.body.classList.remove('cao-mode');
        } else {
            document.body.classList.add('cao-mode');
            document.body.classList.remove('simulation-mode');
        }

        // update active visual
        this.updateModeActive(mode);
        this.onModeChange?.(mode);
    }

    public updateModeActive(mode: Mode) {
        const caoBtn = this.element.querySelector('#menubar-mode-cao') as HTMLElement;
        const simBtn = this.element.querySelector('#menubar-mode-simulation') as HTMLElement;
        if (caoBtn && simBtn) {
            caoBtn.classList.toggle('active', mode === 'cao');
            simBtn.classList.toggle('active', mode === 'simulation');
        }
    }

    public setOnModeChange(cb: (m: Mode) => void) {
        this.onModeChange = cb;
    }

    public setOnVersionSelect(cb: (v: string) => void) {
        this.onVersionSelect = cb;
    }

    public setVersions(list: VersionInfo[]) {
        this.versions = list || [];
        const container = this.element.querySelector('#menubar-versions') as HTMLElement;
        container.innerHTML = '';
        if (!this.versions.length) return;

        // small label
        const lbl = document.createElement('span');
        lbl.textContent = 'VERSION:';
        lbl.style.color = 'var(--muted)';
        lbl.style.fontWeight = '700';
        lbl.style.marginRight = '8px';
        container.appendChild(lbl);

        this.versions.forEach(v => {
            const btn = document.createElement('button');
            btn.className = 'version-btn';
            btn.textContent = v.version;
            btn.title = `${v.name} ${v.description || ''}`;
            btn.onclick = () => {
                this.setActiveVersion(v.version);
                this.onVersionSelect?.(v.version);
            };
            container.appendChild(btn);
        });
    }

    public setActiveVersion(version: string) {
        const buttons = Array.from(this.element.querySelectorAll('.version-btn')) as HTMLElement[];
        buttons.forEach(b => b.classList.toggle('active', b.textContent === version));
    }

    public destroy() {
        this.element.remove();
    }
}
