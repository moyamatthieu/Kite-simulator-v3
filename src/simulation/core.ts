/**
 * core.ts - Namespace Core extrait en module séparé
 * Contient les constantes physiques et utilitaires de base
 */

import * as THREE from 'three';

/**
 * Constantes physiques fondamentales utilisées dans toute la simulation
 */
export class PhysicsConstants {
    // 🌍 Constantes physiques fondamentales
    static readonly GRAVITY = 9.81;                    // m/s² - Accélération gravitationnelle terrestre
    static readonly AIR_DENSITY = 1.225;               // kg/m³ - Densité de l'air au niveau de la mer
    static readonly WIND_SCALE = 1.0;                  // Facteur d'échelle du vent (1.0 = réaliste)

    // 🎯 Limites de sécurité pour éviter les explosions numériques
    static readonly MAX_VELOCITY = 30.0;               // m/s - Vitesse maximale autorisée (108 km/h)
    static readonly MAX_FORCE = 1000.0;                // N - Force maximale (équivalent à soulever 100kg)
    static readonly MIN_TIMESTEP = 0.001;              // s - Pas de temps minimal pour stabilité
    static readonly MAX_TIMESTEP = 0.02;               // s - Pas de temps maximal (50 FPS minimum)

    // 🔧 Paramètres de convergence et stabilité
    static readonly CONSTRAINT_ITERATIONS = 3;         // Nombre d'itérations pour contraintes
    static readonly POSITION_CORRECTION = 0.8;         // Facteur de correction de position (0-1)
    static readonly VELOCITY_THRESHOLD = 0.01;         // m/s - Seuil en dessous duquel on considère l'arrêt
}

/**
 * Historique et analyse de vol pour diagnostics
 */
export class FlightHistory {
    private positions: THREE.Vector3[] = [];
    private velocities: THREE.Vector3[] = [];
    private timestamps: number[] = [];
    private maxHistorySize = 300; // 5 secondes à 60 FPS

    addFrame(position: THREE.Vector3, velocity: THREE.Vector3): void {
        this.positions.push(position.clone());
        this.velocities.push(velocity.clone());
        this.timestamps.push(Date.now());

        // Limiter la taille de l'historique
        if (this.positions.length > this.maxHistorySize) {
            this.positions.shift();
            this.velocities.shift();
            this.timestamps.shift();
        }
    }

    getRecentPositions(count: number = 30): THREE.Vector3[] {
        return this.positions.slice(-count);
    }

    getRecentVelocities(count: number = 30): THREE.Vector3[] {
        return this.velocities.slice(-count);
    }

    getAverageVelocity(windowSize: number = 10): THREE.Vector3 {
        const recent = this.velocities.slice(-windowSize);
        if (recent.length === 0) return new THREE.Vector3();

        const sum = recent.reduce((acc, vel) => acc.add(vel), new THREE.Vector3());
        return sum.divideScalar(recent.length);
    }

    detectWobble(): { isWobbling: boolean; frequency: number; amplitude: number } {
        if (this.positions.length < 20) {
            return { isWobbling: false, frequency: 0, amplitude: 0 };
        }

        const recent = this.positions.slice(-20);
        const center = recent.reduce((acc, pos) => acc.add(pos), new THREE.Vector3())
            .divideScalar(recent.length);

        // Calculer l'amplitude (distance max du centre)
        const distances = recent.map(pos => pos.distanceTo(center));
        const amplitude = Math.max(...distances);

        // Détecter la fréquence (oscillations)
        let crossings = 0;
        const centerY = center.y;

        for (let i = 1; i < recent.length; i++) {
            if ((recent[i - 1].y - centerY) * (recent[i].y - centerY) < 0) {
                crossings++;
            }
        }

        const frequency = crossings / 2; // Une oscillation = 2 crossings

        return {
            isWobbling: amplitude > 0.5 || frequency > 2,
            frequency,
            amplitude
        };
    }

    analyzeStability(): {
        stability: number;
        trend: 'stable' | 'ascending' | 'descending' | 'oscillating';
        avgSpeed: number;
    } {
        if (this.velocities.length < 10) {
            return { stability: 1.0, trend: 'stable', avgSpeed: 0 };
        }

        const recent = this.velocities.slice(-10);
        const speeds = recent.map(v => v.length());

        // Stabilité = inverse de la variance des vitesses
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const variance = speeds.reduce((acc, speed) => acc + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
        const stability = Math.max(0, 1 - variance / (avgSpeed + 1));

        // Analyser la tendance
        const recentPositions = this.positions.slice(-10);
        const startHeight = recentPositions[0]?.y || 0;
        const endHeight = recentPositions[recentPositions.length - 1]?.y || 0;
        const heightDiff = endHeight - startHeight;

        let trend: 'stable' | 'ascending' | 'descending' | 'oscillating' = 'stable';
        if (Math.abs(heightDiff) > 0.5) {
            trend = heightDiff > 0 ? 'ascending' : 'descending';
        }

        const wobble = this.detectWobble();
        if (wobble.isWobbling) {
            trend = 'oscillating';
        }

        return { stability, trend, avgSpeed };
    }

    generateReport(): string {
        const analysis = this.analyzeStability();
        const wobble = this.detectWobble();

        let report = `📊 ANALYSE DE VOL\n`;
        report += `🎯 Stabilité: ${(analysis.stability * 100).toFixed(1)}%\n`;
        report += `📈 Tendance: ${analysis.trend}\n`;
        report += `💨 Vitesse moy: ${analysis.avgSpeed.toFixed(1)} m/s\n`;

        if (wobble.isWobbling) {
            let description = "";
            if (wobble.frequency > 3) {
                description = "Oscillations rapides";
            } else if (wobble.amplitude > 1.5) {
                description = "Frétillements importants";
            } else {
                description = "Légers balancements";
            }
            report += `⚠️  Instabilité détectée: ${description}\n`;
            report += `   Fréq: ${wobble.frequency.toFixed(1)} Hz, Amp: ${wobble.amplitude.toFixed(1)}m\n`;
        }

        // Analyse des angles d'attaque récents si disponible
        const recentVelocities = this.getRecentVelocities(5);
        if (recentVelocities.length > 0) {
            const recentAoa = recentVelocities.map(v => {
                const windAngle = Math.atan2(v.y, Math.sqrt(v.x * v.x + v.z * v.z));
                return windAngle * 180 / Math.PI;
            });
            const aoaMean = recentAoa.reduce((a, b) => a + b, 0) / recentAoa.length;
            const aoaVariance = recentAoa.reduce((sum, aoa) => sum + Math.pow(aoa - aoaMean, 2), 0) / recentAoa.length;
            report += `📐 AoA: Moy=${aoaMean.toFixed(1)}°, Var=${Math.sqrt(aoaVariance).toFixed(1)}°\n`;
        }

        if (wobble.isWobbling) {
            report += `⚠️  RECOMMANDATIONS:\n`;
            if (wobble.frequency > 3) report += `   • Fréquence élevée: réduire la réactivité des commandes\n`;
            if (wobble.amplitude > 1.5) report += `   • Amplitude importante: ajuster les gains PID\n`;
            if (analysis.stability < 0.5) report += `   • Instabilité: vérifier l'équilibre des forces\n`;
        }

        return report;
    }
}
