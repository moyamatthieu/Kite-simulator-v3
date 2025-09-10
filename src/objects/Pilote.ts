/**
 * `Pilote.ts` - Pilote et système de contrôle intégré.
 *
 * Cette classe représente le pilote de cerf-volant et sa barre de contrôle.
 * Le pilote est la référence principale pour le positionnement dans la simulation.
 * La barre de contrôle est un objet enfant positionné relativement aux mains du pilote.
 */

import * as THREE from 'three';
import { ControlBar3D } from './controlbar';
import { C_objet, C_objetConfig } from './C_objet';

// Position fixe du pilote (référence principale)
export const PILOTE_POSITION = new THREE.Vector3(0, 0.8, 8.5);

// Constantes spécifiques à la géométrie du pilote
const PILOTE_WIDTH = 0.4;      // Largeur du pilote (épaules)
const PILOTE_HEIGHT = 1.6;     // Hauteur du pilote (taille debout)
const PILOTE_DEPTH = 0.3;      // Profondeur du pilote
const PILOTE_COLOR = 0x4a4a4a; // Couleur gris foncé

// Position relative de la barre par rapport au pilote (aux mains)
const BARRE_OFFSET = new THREE.Vector3(0, 0.6, -1.0); // Devant du pilote et un peu plus haut

export class Pilote3D extends C_objet {
    private piloteMesh!: THREE.Mesh;
    private controlBar!: ControlBar3D;

    constructor(config: C_objetConfig = {}) {
        super(config);

        this.group.name = 'Pilote3D';
        this.createPilote();
        this.createControlBar();
        this.positionPilote();
    }

    protected createGeometry(): void {
        // La géométrie est créée dans le constructeur
    }

    /**
     * Crée la géométrie et le matériau du pilote
     */
    private createPilote(): void {
        // Création du rectangle représentant le pilote
        const piloteGeometry = new THREE.BoxGeometry(PILOTE_WIDTH, PILOTE_HEIGHT, PILOTE_DEPTH);
        const piloteMaterial = new THREE.MeshStandardMaterial({
            color: PILOTE_COLOR,
            roughness: 0.8,
            metalness: 0.1
        });

        this.piloteMesh = new THREE.Mesh(piloteGeometry, piloteMaterial);
        this.piloteMesh.name = 'PiloteMesh';
        this.piloteMesh.castShadow = true;
        this.piloteMesh.receiveShadow = true;

        this.group.add(this.piloteMesh);
    }

    /**
     * Crée la barre de contrôle comme objet enfant
     */
    private createControlBar(): void {
        this.controlBar = new ControlBar3D();

        // Positionne la barre relativement au pilote (aux mains)
        this.controlBar.getGroup().position.copy(BARRE_OFFSET);

        // Ajoute la barre au groupe du pilote
        this.group.add(this.controlBar.getGroup());
    }

    /**
     * Positionne le pilote à sa position fixe (référence principale)
     */
    private positionPilote(): void {
        // Position fixe du pilote - référence principale pour toute la simulation
        this.group.position.copy(PILOTE_POSITION);
    }

    /**
     * Met à jour la position du pilote si nécessaire
     */
    public updatePosition(newPosition?: THREE.Vector3): void {
        if (newPosition) {
            this.group.position.copy(newPosition);
        } else {
            this.positionPilote();
        }
    }

    /**
     * Retourne le groupe THREE.js pour ajout à la scène
     */
    public getGroup(): THREE.Group {
        return this.group;
    }

    /**
     * Retourne la position actuelle du pilote
     */
    public getPosition(): THREE.Vector3 {
        return this.group.position.clone();
    }

    /**
     * Retourne la barre de contrôle
     */
    public getControlBar(): ControlBar3D {
        return this.controlBar;
    }

    /**
     * Retourne la position de la barre de contrôle dans l'espace monde
     */
    public getControlBarWorldPosition(): THREE.Vector3 {
        const worldPos = new THREE.Vector3();
        this.controlBar.getGroup().getWorldPosition(worldPos);
        return worldPos;
    }

    /**
     * Met à jour l'inclinaison de la barre de contrôle
     */
    public updateControlBarTilt(tiltAngle: number): void {
        this.controlBar.updateTilt(tiltAngle);
    }

    /**
     * Nettoie les ressources
     */
    public dispose(): void {
        // Nettoie la barre de contrôle
        if (this.controlBar) {
            this.controlBar.dispose();
        }

        // Nettoie le pilote
        if (this.piloteMesh.geometry) {
            this.piloteMesh.geometry.dispose();
        }
        if (this.piloteMesh.material) {
            if (Array.isArray(this.piloteMesh.material)) {
                this.piloteMesh.material.forEach(material => material.dispose());
            } else {
                this.piloteMesh.material.dispose();
            }
        }
        this.group.clear();
    }
}
