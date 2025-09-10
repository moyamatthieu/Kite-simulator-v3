/**
 * Kite.ts - Version simplifiée du cerf-volant pour la simulation
 * Adaptée pour être utilisée uniquement dans le dossier src/simulation
 */

import * as THREE from 'three';

/**
 * La forme du cerf-volant - comme un plan de construction
 * On définit où sont tous les points importants du cerf-volant
 */
export class KiteGeometry {
    // Les points clés du cerf-volant (comme les coins d'une maison)
    // Coordonnées en mètres : [gauche/droite, haut/bas, avant/arrière]
    static readonly POINTS = {
        NEZ: new THREE.Vector3(0, 0.65, 0),                      // Le bout pointu en haut
        SPINE_BAS: new THREE.Vector3(0, 0, 0),                   // Le centre en bas
        BORD_GAUCHE: new THREE.Vector3(-0.825, 0, 0),            // L'extrémité de l'aile gauche
        BORD_DROIT: new THREE.Vector3(0.825, 0, 0),              // L'extrémité de l'aile droite
        WHISKER_GAUCHE: new THREE.Vector3(-0.4125, 0.1, -0.15),  // Stabilisateur gauche (légèrement en arrière)
        WHISKER_DROIT: new THREE.Vector3(0.4125, 0.1, -0.15),    // Stabilisateur droit (légèrement en arrière)
        CTRL_GAUCHE: new THREE.Vector3(-0.15, 0.3, 0.4),         // Où s'attache la ligne gauche
        CTRL_DROIT: new THREE.Vector3(0.15, 0.3, 0.4)            // Où s'attache la ligne droite
    };

    // Le cerf-volant est fait de 4 triangles de tissu
    // Chaque triangle a 3 coins (vertices) et une surface en mètres carrés
    static readonly SURFACES = [
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.BORD_GAUCHE,
                KiteGeometry.POINTS.WHISKER_GAUCHE
            ],
            area: 0.23 // m² - Surface haute gauche
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.WHISKER_GAUCHE,
                KiteGeometry.POINTS.SPINE_BAS
            ],
            area: 0.11 // m² - Surface basse gauche
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.BORD_DROIT,
                KiteGeometry.POINTS.WHISKER_DROIT
            ],
            area: 0.23 // m² - Surface haute droite
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.WHISKER_DROIT,
                KiteGeometry.POINTS.SPINE_BAS
            ],
            area: 0.11 // m² - Surface basse droite
        }
    ];

    static readonly TOTAL_AREA = 0.68; // m² - Surface totale
}

export interface KiteParams {
    width?: number;
    height?: number;
    depth?: number;
    frameDiameter?: number;
    frameColor?: string;
    sailColor?: string;
    sailOpacity?: number;
}

export class Kite extends THREE.Group {
    private pointsMap: Map<string, THREE.Vector3> = new Map();
    private bridleLines: THREE.Group | null = null;

    // Paramètres par défaut
    private params: Required<KiteParams> = {
        width: 1.65,
        height: 0.65,
        depth: 0.15,
        frameDiameter: 0.2,
        frameColor: '#2a2a2a',
        sailColor: '#ff3333',
        sailOpacity: 0.9
    };

    constructor(customParams: KiteParams = {}) {
        super();
        this.params = { ...this.params, ...customParams };
        this.name = 'Kite';
        this.init();
    }

    private init(): void {
        this.definePoints();
        this.buildStructure();
        this.buildSurfaces();
    }

    private definePoints(): void {
        // IMPORTANT : Utiliser EXACTEMENT les points de KiteGeometry pour la cohérence physique
        // Ces points sont utilisés par AerodynamicsCalculator et LineSystem

        this.pointsMap.set('NEZ', KiteGeometry.POINTS.NEZ.clone());
        this.pointsMap.set('SPINE_BAS', KiteGeometry.POINTS.SPINE_BAS.clone());
        this.pointsMap.set('BORD_GAUCHE', KiteGeometry.POINTS.BORD_GAUCHE.clone());
        this.pointsMap.set('BORD_DROIT', KiteGeometry.POINTS.BORD_DROIT.clone());
        this.pointsMap.set('WHISKER_GAUCHE', KiteGeometry.POINTS.WHISKER_GAUCHE.clone());
        this.pointsMap.set('WHISKER_DROIT', KiteGeometry.POINTS.WHISKER_DROIT.clone());
        this.pointsMap.set('CTRL_GAUCHE', KiteGeometry.POINTS.CTRL_GAUCHE.clone());
        this.pointsMap.set('CTRL_DROIT', KiteGeometry.POINTS.CTRL_DROIT.clone());


    }

    private buildStructure(): void {
        const { frameDiameter, frameColor } = this.params;

        // Créer le cadre principal
        const frameMaterial = new THREE.MeshStandardMaterial({ color: frameColor });

        // Structure principale du kite (delta + whiskers)
        const mainFramePoints = [
            this.pointsMap.get('NEZ')!,
            this.pointsMap.get('BORD_GAUCHE')!,
            this.pointsMap.get('SPINE_BAS')!,
            this.pointsMap.get('BORD_DROIT')!,
            this.pointsMap.get('NEZ')!
        ];

        // Cadre principal 
        const frameGeometry = new THREE.BufferGeometry().setFromPoints(mainFramePoints);
        const frame = new THREE.Line(frameGeometry, new THREE.LineBasicMaterial({ color: frameColor, linewidth: 3 }));
        this.add(frame);

        // Whiskers (stabilisateurs arrière) - CRUCIAL pour la physique !
        const whiskerPoints = [
            this.pointsMap.get('BORD_GAUCHE')!,
            this.pointsMap.get('WHISKER_GAUCHE')!,
            this.pointsMap.get('SPINE_BAS')!,
            this.pointsMap.get('WHISKER_DROIT')!,
            this.pointsMap.get('BORD_DROIT')!
        ];
        const whiskerGeometry = new THREE.BufferGeometry().setFromPoints(whiskerPoints);
        const whiskerFrame = new THREE.Line(whiskerGeometry, new THREE.LineBasicMaterial({ color: frameColor, linewidth: 2 }));
        this.add(whiskerFrame);

        // Lignes transversales (bords du kite)
        const crossPoints = [
            this.pointsMap.get('BORD_GAUCHE')!,
            this.pointsMap.get('BORD_DROIT')!
        ];
        const crossGeometry = new THREE.BufferGeometry().setFromPoints(crossPoints);
        const crossLine = new THREE.Line(crossGeometry, new THREE.LineBasicMaterial({ color: frameColor, linewidth: 2 }));
        this.add(crossLine);

        // Points de contrôle
        const ctrlPoints = [
            this.pointsMap.get('CTRL_GAUCHE')!,
            this.pointsMap.get('CTRL_DROIT')!
        ];
        const ctrlGeometry = new THREE.BufferGeometry().setFromPoints(ctrlPoints);
        const ctrlLine = new THREE.Line(ctrlGeometry, new THREE.LineBasicMaterial({ color: '#444444', linewidth: 2 }));
        this.add(ctrlLine);

        this.createBridleLines();
    }

    private buildSurfaces(): void {
        const { sailColor, sailOpacity } = this.params;

        // Créer les 4 surfaces triangulaires EXACTEMENT comme dans KiteGeometry
        // Ceci assure la cohérence PARFAITE avec AerodynamicsCalculator

        KiteGeometry.SURFACES.forEach((surface, index) => {
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                surface.vertices[0].x, surface.vertices[0].y, surface.vertices[0].z,
                surface.vertices[1].x, surface.vertices[1].y, surface.vertices[1].z,
                surface.vertices[2].x, surface.vertices[2].y, surface.vertices[2].z
            ]);

            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.computeVertexNormals();

            // Différentes couleurs pour distinguer les surfaces en debug
            const colors = [
                sailColor,        // Surface 0 : NEZ-BORD_GAUCHE-WHISKER_GAUCHE (haute gauche)
                '#ff6666',        // Surface 1 : NEZ-WHISKER_GAUCHE-SPINE_BAS (basse gauche)
                sailColor,        // Surface 2 : NEZ-BORD_DROIT-WHISKER_DROIT (haute droite) 
                '#ff6666'         // Surface 3 : NEZ-WHISKER_DROIT-SPINE_BAS (basse droite)
            ];

            const material = new THREE.MeshStandardMaterial({
                color: colors[index],
                transparent: true,
                opacity: sailOpacity * 0.8, // Légèrement plus transparent pour voir les overlaps
                side: THREE.DoubleSide
            });

            const surfaceMesh = new THREE.Mesh(geometry, material);
            surfaceMesh.receiveShadow = true;
            surfaceMesh.name = `surface_${index}`;
            this.add(surfaceMesh);
        });

        // Ajouter des marqueurs visuels pour les points importants
        this.addVisualMarkers();
    }

    private createBridleLines(): void {
        if (this.bridleLines) this.remove(this.bridleLines);

        this.bridleLines = new THREE.Group();
        this.bridleLines.name = 'BridleLines';

        // Lignes de brides depuis le nez vers les points de contrôle
        const nez = this.pointsMap.get('NEZ')!;
        const ctrlGauche = this.pointsMap.get('CTRL_GAUCHE')!;
        const ctrlDroit = this.pointsMap.get('CTRL_DROIT')!;

        // Bride gauche
        const leftGeometry = new THREE.BufferGeometry().setFromPoints([nez, ctrlGauche]);
        const leftLine = new THREE.Line(leftGeometry, new THREE.LineBasicMaterial({ color: '#666666', linewidth: 1 }));
        this.bridleLines.add(leftLine);

        // Bride droite
        const rightGeometry = new THREE.BufferGeometry().setFromPoints([nez, ctrlDroit]);
        const rightLine = new THREE.Line(rightGeometry, new THREE.LineBasicMaterial({ color: '#666666', linewidth: 1 }));
        this.bridleLines.add(rightLine);

        this.add(this.bridleLines);
    }

    private addVisualMarkers(): void {
        // Marqueurs pour les points importants
        const markerGeometry = new THREE.SphereGeometry(0.02, 8, 8);

        // Nez (rouge)
        const nezMarker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: '#ff0000' }));
        const nez = this.pointsMap.get('NEZ')!;
        nezMarker.position.copy(nez);
        this.add(nezMarker);

        // Points de contrôle (rouge foncé)
        const ctrlGauche = this.pointsMap.get('CTRL_GAUCHE')!;
        const ctrlDroit = this.pointsMap.get('CTRL_DROIT')!;

        const leftMarker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: '#dc143c' }));
        leftMarker.position.copy(ctrlGauche);
        this.add(leftMarker);

        const rightMarker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: '#b22222' }));
        rightMarker.position.copy(ctrlDroit);
        this.add(rightMarker);

        // Whiskers (violet) - NOUVEAUX points critiques pour la physique
        const whiskerGauche = this.pointsMap.get('WHISKER_GAUCHE')!;
        const whiskerDroit = this.pointsMap.get('WHISKER_DROIT')!;

        const whiskerLeftMarker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: '#8a2be2' }));
        whiskerLeftMarker.position.copy(whiskerGauche);
        this.add(whiskerLeftMarker);

        const whiskerRightMarker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: '#9932cc' }));
        whiskerRightMarker.position.copy(whiskerDroit);
        this.add(whiskerRightMarker);
    }

    /**
     * Obtient un point par son nom
     */
    public getPoint(name: string): THREE.Vector3 | null {
        return this.pointsMap.get(name) || null;
    }

    /**
     * Définit un point
     */
    public setPoint(name: string, position: THREE.Vector3): void {
        this.pointsMap.set(name, position.clone());
    }

    /**
     * Met à jour les lignes de brides
     */
    public updateBridleLines(): void {
        if (!this.bridleLines) return;
        this.createBridleLines();
    }

    /**
     * Ajuste la longueur des brides
     */
    public adjustBridleLength(factor: number): void {
        // Pour compatibilité - non implémenté dans cette version simplifiée
    }

    /**
     * Obtient la longueur de repos d'une bride
     */
    public getBridleRestLength(bridleName: 'left' | 'right'): number | undefined {
        const nez = this.getPoint('NEZ');
        const ctrl = this.getPoint(bridleName === 'left' ? 'CTRL_GAUCHE' : 'CTRL_DROIT');
        if (!nez || !ctrl) return undefined;
        return nez.distanceTo(ctrl);
    }

    /**
     * Obtient le facteur de longueur des brides
     */
    public getBridleLengthFactor(): number {
        return 1.0;
    }

    /**
     * Convertit les coordonnées locales en coordonnées mondiales
     */
    public localToWorld(vector: THREE.Vector3): THREE.Vector3 {
        const worldVector = vector.clone();
        this.updateMatrixWorld();
        return worldVector.applyMatrix4(this.matrixWorld);
    }

    /**
     * Convertit les coordonnées mondiales en coordonnées locales
     */
    public worldToLocal(vector: THREE.Vector3): THREE.Vector3 {
        const localVector = vector.clone();
        this.updateMatrixWorld();
        return localVector.applyMatrix4(new THREE.Matrix4().copy(this.matrixWorld).invert());
    }

    // Méthodes de compatibilité pour maintenir l'interface existante
    public get bridleLengthFactor(): number {
        return 1.0;
    }

    public create(): this {
        return this;
    }

    public getName(): string {
        return 'Cerf-volant Delta Simplifié';
    }

    public getDescription(): string {
        return 'Version simplifiée du cerf-volant pour la simulation autonome';
    }

    public getPrimitiveCount(): number {
        return 10; // Nombre approximatif de primitives
    }

    // Propriétés et méthodes supplémentaires pour compatibilité
    public userData: any = {};

    // Méthodes de StructuredObject pour compatibilité
    // (setPoint déjà définie plus haut)

    public addPrimitiveAt(primitive: any, position: [number, number, number]): void {
        // Pour compatibilité - non implémenté dans cette version
    }

    public add(child: THREE.Object3D): THREE.Object3D {
        return super.add(child);
    }

    public remove(child: THREE.Object3D): THREE.Object3D {
        return super.remove(child);
    }

    // Méthodes de gestion des points pour compatibilité
    public getPoints(): Map<string, THREE.Vector3> {
        return this.pointsMap;
    }

    // Méthodes de transformation pour compatibilité
    public localToWorldPoint(localPoint: THREE.Vector3): THREE.Vector3 {
        return this.localToWorld(localPoint);
    }

    public worldToLocalPoint(worldPoint: THREE.Vector3): THREE.Vector3 {
        return this.worldToLocal(worldPoint);
    }
}

export default Kite;
