/**
 * WindSimulator.ts - Gestion du vent et turbulences (V8 style)
 */

import * as THREE from 'three';
import { WindParams, CONFIG } from '@core/constants';

export class WindSimulator {
    private params: WindParams;
    private time: number = 0;  // Compteur de temps pour faire varier les turbulences

    constructor() {
        // On démarre avec les réglages par défaut du vent
        this.params = {
            speed: CONFIG.wind.defaultSpeed,
            direction: CONFIG.wind.defaultDirection,
            turbulence: CONFIG.wind.defaultTurbulence
        };
    }

    /**
     * Calcule le vent que "ressent" le cerf-volant
     * C'est comme quand vous mettez la main par la fenêtre d'une voiture :
     * - Si la voiture roule vite, vous sentez plus de vent
     * - Si vous allez contre le vent, il est plus fort
     * - Si vous allez avec le vent, il est plus faible
     */
    getApparentWind(kiteVelocity: THREE.Vector3, deltaTime: number): THREE.Vector3 {
        this.time += deltaTime;

        const windSpeedMs = this.params.speed / 3.6;
        const windRad = (this.params.direction * Math.PI) / 180;

        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windSpeedMs,
            0,
            -Math.cos(windRad) * windSpeedMs
        );

        // Ajouter des rafales aléatoires mais réalistes
        // Les turbulences font bouger le vent de façon imprévisible
        // Comme les tourbillons qu'on sent parfois dehors
        if (this.params.turbulence > 0) {
            const turbIntensity = this.params.turbulence / 100 * CONFIG.wind.turbulenceScale;
            const freq = CONFIG.wind.turbulenceFreqBase;  // Fréquence des changements

            // On utilise des sinus pour créer des variations douces et naturelles
            windVector.x += Math.sin(this.time * freq) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityXZ;
            windVector.y += Math.sin(this.time * freq * CONFIG.wind.turbulenceFreqY) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityY;
            windVector.z += Math.cos(this.time * freq * CONFIG.wind.turbulenceFreqZ) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityXZ;
        }

        // Le vent apparent = vent réel - vitesse du kite
        // PHYSIQUE PURE : pas de comportement artificiel
        const apparent = windVector.clone().sub(kiteVelocity);

        // On limite pour éviter des valeurs irréalistes
        if (apparent.length() > CONFIG.wind.maxApparentSpeed) {
            apparent.setLength(CONFIG.wind.maxApparentSpeed);
        }
        return apparent;
    }

    /**
     * Obtient le vecteur de vent à une position donnée
     */
    getWindAt(_position: THREE.Vector3): THREE.Vector3 {
        const windSpeedMs = this.params.speed / 3.6;
        const windRad = (this.params.direction * Math.PI) / 180;

        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windSpeedMs,
            0,
            -Math.cos(windRad) * windSpeedMs
        );

        if (this.params.turbulence > 0) {
            const turbIntensity = this.params.turbulence / 100 * CONFIG.wind.turbulenceScale;
            const freq = 0.5;

            windVector.x += Math.sin(this.time * freq) * windSpeedMs * turbIntensity;
            windVector.y += Math.sin(this.time * freq * 1.3) * windSpeedMs * turbIntensity * 0.3;
            windVector.z += Math.cos(this.time * freq * 0.7) * windSpeedMs * turbIntensity;
        }

        return windVector;
    }

    setParams(params: Partial<WindParams>): void {
        Object.assign(this.params, params);
    }

    getParams(): WindParams {
        return { ...this.params };
    }
}
