/**
 * RenderLoop.ts - Gère la boucle de rendu Three.js
 * Sépare la gestion de la boucle du ThreeRenderer principal.
 */

import * as THREE from 'three';
import { logger } from '@core/Logger';

export interface RenderLoopCallback {
    (delta: number): void;
}

export class RenderLoop {
    private animationId: number | null = null;
    private clock = new THREE.Clock();
    private callbacks: RenderLoopCallback[] = [];

    constructor() {
        logger.debug('RenderLoop initialisé', 'RenderLoop');
    }

    /**
     * Ajoute une fonction de rappel à exécuter à chaque frame.
     */
    public addCallback(callback: RenderLoopCallback): void {
        this.callbacks.push(callback);
        logger.debug('Callback ajouté à la boucle de rendu', 'RenderLoop');
    }

    /**
     * Supprime une fonction de rappel.
     */
    public removeCallback(callback: RenderLoopCallback): void {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
        logger.debug('Callback retiré de la boucle de rendu', 'RenderLoop');
    }

    /**
     * Démarre la boucle de rendu.
     */
    public start(): void {
        if (this.animationId !== null) {
            logger.warn('La boucle de rendu est déjà démarrée', 'RenderLoop');
            return;
        }

        const animate = () => {
            this.animationId = requestAnimationFrame(animate);

            const delta = this.clock.getDelta(); // Temps écoulé depuis la dernière frame

            this.callbacks.forEach(callback => {
                callback(delta);
            });
        };

        animate();
        logger.info('Boucle de rendu démarrée', 'RenderLoop');
    }

    /**
     * Arrête la boucle de rendu.
     */
    public stop(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            logger.info('Boucle de rendu arrêtée', 'RenderLoop');
        }
    }

    /**
     * Nettoie les ressources.
     */
    public dispose(): void {
        this.stop();
        this.callbacks = [];
        logger.debug('RenderLoop nettoyé', 'RenderLoop');
    }
}