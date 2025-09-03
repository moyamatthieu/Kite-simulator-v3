import { AppState } from "../core/AppState";
import { logger } from "../core/Logger";

/**
 * Interface pour les éléments UI
 */
export interface UIElements {
    [key: string]: HTMLElement | null;
}

/**
 * Gère l'interface utilisateur globale, sa création et ses interactions.
 * Respecte le principe de Single Responsibility (SRP) pour la gestion de l'UI.
 */
export class UIManager {
    private static instance: UIManager;
    private elements: UIElements = {};
    private appState: AppState;
    private container: HTMLElement;

    private constructor(container: HTMLElement) {
        this.container = container;
        this.appState = AppState.getInstance();
        this.initializeUI();
    }

    public static getInstance(container?: HTMLElement): UIManager {
        if (!UIManager.instance) {
            if (!container) {
                logger.error('UIManager: Le conteneur UI doit être fourni lors de la première initialisation', 'UIManager');
                throw new Error('UIManager: Le conteneur UI doit être fourni lors de la première initialisation');
            }
            UIManager.instance = new UIManager(container);
        } else if (container && UIManager.instance.container !== container) {
            logger.warn('UIManager: Instance déjà existante avec un autre conteneur, mise à jour du conteneur.', 'UIManager');
            UIManager.instance.container = container; // Mettre à jour le container
        }
        return UIManager.instance;
    }

    private initializeUI(): void {
        this.createBaseLayout();
        this.createSimulationControls();
        this.createDebugControls();
        this.updateUIBasedOnState();
        this.setupEventListeners();
    }

    private createBaseLayout(): void {
        this.elements.mainContainer = document.createElement('div');
        this.elements.mainContainer.id = 'ui-container';
        this.elements.mainContainer.className = 'absolute top-0 left-0 w-full h-full pointer-events-none p-4';
        this.container.appendChild(this.elements.mainContainer);
    }

    private createSimulationControls(): void {
        const controlsPanel = document.createElement('div');
        controlsPanel.className = 'absolute top-4 left-4 p-3 bg-gray-800 bg-opacity-75 rounded-lg shadow-lg pointer-events-auto text-white text-sm';
        controlsPanel.innerHTML = `
            <h3 class="font-bold mb-2">Contrôles Simulation</h3>
            <div class="mb-2">
                <label for="kite-selector" class="block mb-1">Objet 3D :</label>
                <select id="kite-selector" class="w-full p-1 bg-gray-700 rounded text-white"></select>
            </div>
            <div class="mb-2">
                <label for="wind-speed" class="block mb-1">Vitesse Vent (m/s): <span id="wind-speed-val">10</span></label>
                <input type="range" id="wind-speed" min="0" max="30" value="10" step="0.1" class="w-full">
            </div>
            <div class="mb-2">
                <label for="wind-direction" class="block mb-1">Direction Vent (°): <span id="wind-direction-val">0</span></label>
                <input type="range" id="wind-direction" min="0" max="360" value="0" step="1" class="w-full">
            </div>
            <div class="mb-2">
                <label for="line-length" class="block mb-1">Longueur Lignes (m): <span id="line-length-val">15</span></label>
                <input type="range" id="line-length" min="5" max="50" value="15" step="1" class="w-full">
            </div>
            <div class="mb-2">
                <label for="steer-input" class="block mb-1">Gouverne : <span id="steer-val">0.00</span></label>
                <input type="range" id="steer-input" min="-1" max="1" value="0" step="0.01" class="w-full">
            </div>
            <button id="reset-button" class="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded w-full mt-2">Réinitialiser Simulation</button>
            <button id="export-godot-button" class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded w-full mt-2">Exporter Godot</button>
            <button id="export-obj-button" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded w-full mt-2">Exporter OBJ</button>
        `;
        this.elements.mainContainer?.appendChild(controlsPanel);

        // Références des éléments pour l'update
        this.elements.kiteSelector = controlsPanel.querySelector('#kite-selector');
        this.elements.windSpeedInput = controlsPanel.querySelector('#wind-speed');
        this.elements.windSpeedVal = controlsPanel.querySelector('#wind-speed-val');
        this.elements.windDirectionInput = controlsPanel.querySelector('#wind-direction');
        this.elements.windDirectionVal = controlsPanel.querySelector('#wind-direction-val');
        this.elements.lineLengthInput = controlsPanel.querySelector('#line-length');
        this.elements.lineLengthVal = controlsPanel.querySelector('#line-length-val');
        this.elements.steerInput = controlsPanel.querySelector('#steer-input');
        this.elements.steerVal = controlsPanel.querySelector('#steer-val');
        this.elements.resetButton = controlsPanel.querySelector('#reset-button');
        this.elements.exportGodotButton = controlsPanel.querySelector('#export-godot-button');
        this.elements.exportObjButton = controlsPanel.querySelector('#export-obj-button');
    }

    private createDebugControls(): void {
        const debugPanel = document.createElement('div');
        debugPanel.className = 'absolute bottom-4 left-4 p-3 bg-gray-800 bg-opacity-75 rounded-lg shadow-lg pointer-events-auto text-white text-sm';
        debugPanel.innerHTML = `
            <h3 class="font-bold mb-2">Options Debug</h3>
            <div class="mb-2">
                <input type="checkbox" id="show-labels" class="mr-2">
                <label for="show-labels">Afficher Labels</label>
            </div>
            <div class="mb-2">
                <input type="checkbox" id="show-debug-points" class="mr-2">
                <label for="show-debug-points">Afficher Points Debug</label>
            </div>
            <div class="mb-2">
                <input type="checkbox" id="is-animating" class="mr-2">
                <label for="is-animating">Animer</label>
            </div>
            <button id="screenshot-button" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded w-full mt-2">Screenshot</button>
        `;
        this.elements.mainContainer?.appendChild(debugPanel);

        this.elements.showLabelsCheckbox = debugPanel.querySelector('#show-labels');
        this.elements.showDebugPointsCheckbox = debugPanel.querySelector('#show-debug-points');
        this.elements.isAnimatingCheckbox = debugPanel.querySelector('#is-animating');
        this.elements.screenshotButton = debugPanel.querySelector('#screenshot-button');
    }

    private updateUIBasedOnState(): void {
        if (this.elements.showLabelsCheckbox) {
            (this.elements.showLabelsCheckbox as HTMLInputElement).checked = this.appState.getShowingLabels();
        }
        if (this.elements.showDebugPointsCheckbox) {
            (this.elements.showDebugPointsCheckbox as HTMLInputElement).checked = this.appState.getShowingDebugPoints();
        }
        if (this.elements.isAnimatingCheckbox) {
            (this.elements.isAnimatingCheckbox as HTMLInputElement).checked = this.appState.getIsAnimating();
        }
        // Mise à jour des valeurs initiales du vent et des lignes pourrait être nécessaire
    }

    private setupEventListeners(): void {
        this.elements.showLabelsCheckbox?.addEventListener('change', (e) => {
            this.appState.setShowingLabels((e.target as HTMLInputElement).checked);
        });
        this.elements.showDebugPointsCheckbox?.addEventListener('change', (e) => {
            this.appState.setShowingDebugPoints((e.target as HTMLInputElement).checked);
        });
        this.elements.isAnimatingCheckbox?.addEventListener('change', (e) => {
            this.appState.setIsAnimating((e.target as HTMLInputElement).checked);
        });
    }

    /**
     * Met à jour les valeurs affichées dans l'UI des contrôles de simulation.
     */
    public updateControlValues(values: {
        windSpeed?: number;
        windDirection?: number;
        lineLength?: number;
        steer?: number;
    }): void {
        if (this.elements.windSpeedVal && values.windSpeed !== undefined) {
            this.elements.windSpeedVal.textContent = values.windSpeed.toFixed(1);
            (this.elements.windSpeedInput as HTMLInputElement).value = values.windSpeed.toString();
        }
        if (this.elements.windDirectionVal && values.windDirection !== undefined) {
            this.elements.windDirectionVal.textContent = values.windDirection.toFixed(0);
            (this.elements.windDirectionInput as HTMLInputElement).value = values.windDirection.toString();
        }
        if (this.elements.lineLengthVal && values.lineLength !== undefined) {
            this.elements.lineLengthVal.textContent = values.lineLength.toFixed(1);
            (this.elements.lineLengthInput as HTMLInputElement).value = values.lineLength.toString();
        }
        if (this.elements.steerVal && values.steer !== undefined) {
            this.elements.steerVal.textContent = values.steer.toFixed(2);
            (this.elements.steerInput as HTMLInputElement).value = values.steer.toString();
        }
    }

    /**
     * Ajoute des options d'objets 3D au sélecteur.
     * @param objects - Un tableau d'objets avec id et name.
     */
    public populateObjectSelector(objects: { id: string; name: string }[]): void {
        if (!this.elements.kiteSelector) return;

        (this.elements.kiteSelector as HTMLSelectElement).innerHTML = ''; // Nettoyer les options existantes
        objects.forEach(obj => {
            const option = document.createElement('option');
            option.value = obj.id;
            option.textContent = obj.name;
            (this.elements.kiteSelector as HTMLSelectElement).appendChild(option);
        });

        // Sélectionner l'objet courant par défaut
        const currentObjectId = this.appState.getCurrentObjectId();
        if (currentObjectId) {
            (this.elements.kiteSelector as HTMLSelectElement).value = currentObjectId;
        }
    }

    /**
     * Définit l'objet sélectionné par programme.
     * @param id - L'ID de l'objet à sélectionner.
     */
    public setSelectedObject(id: string): void {
        if (this.elements.kiteSelector) {
            (this.elements.kiteSelector as HTMLSelectElement).value = id;
            this.appState.setCurrentObjectId(id);
        }
    }

    /**
     * Récupère la valeur d'un élément par son ID.
     * Utile pour récupérer les valeurs des inputs/sliders externes au UIManager.
     */
    public getElementValue(id: string): string {
        const element = this.elements[id] as HTMLInputElement | HTMLSelectElement;
        return element ? element.value : '';
    }

    /**
     * Ajoute un écouteur d'événement à un élément UI.
     */
    public addEventListener(elementId: string, eventType: string, handler: EventListener): void {
        const element = this.elements[elementId];
        if (element) {
            element.addEventListener(eventType, handler);
        } else {
            logger.warn(`UIManager: Élément UI avec l'ID '${elementId}' non trouvé pour ajouter un écouteur d'événement`, 'UIManager');
        }
    }

    /**
     * Supprime un écouteur d'événement d'un élément UI.
     */
    public removeEventListener(elementId: string, eventType: string, handler: EventListener): void {
        const element = this.elements[elementId];
        if (element) {
            element.removeEventListener(eventType, handler);
        } else {
            logger.warn(`UIManager: Élément UI avec l'ID '${elementId}' non trouvé pour supprimer un écouteur d'événement`, 'UIManager');
        }
    }
}
