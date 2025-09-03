/**
 * RendererUtils.ts - Utilitaires pour les opérations de rendu Three.js
 * Centralise les fonctions de capture d'écran, mode wireframe, etc.
 */

import * as THREE from 'three';
import { logger } from '@core/Logger';

export class RendererUtils {
    /**
     * Capture d'écran du renderer
     */
    static takeScreenshot(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, filename: string = 'screenshot.png'): void {
        renderer.render(scene, camera);

        const canvas = renderer.domElement;
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL();
        link.click();
        logger.info(`Capture d'écran '${filename}' prise`, 'RendererUtils');
    }

    /**
     * Active/désactive le mode wireframe pour tous les matériaux des maillages dans la scène
     */
    static setWireframeMode(scene: THREE.Scene, enabled: boolean): void {
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat instanceof THREE.Material) {
                            (mat as THREE.MeshStandardMaterial).wireframe = enabled;
                        }
                    });
                } else if (child.material instanceof THREE.Material) {
                    (child.material as THREE.MeshStandardMaterial).wireframe = enabled;
                }
            }
        });
        logger.info(`Mode wireframe ${enabled ? 'activé' : 'désactivé'}`, 'RendererUtils');
    }
}