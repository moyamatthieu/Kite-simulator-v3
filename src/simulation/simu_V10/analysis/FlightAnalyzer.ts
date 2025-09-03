import * as THREE from 'three';

interface FlightDataPoint {
    timestamp: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    force: number;
    aoa: number;
}

interface OscillationMetrics {
    frequency: number;    // Hz
    amplitude: number;    // m
    stability: number;    // 0-1
    isWobbling: boolean;
    severity: number;     // 0-1
    description: string;
}

interface FlightTrends {
    altitudeTrend: 'stable' | 'ascending' | 'descending';
    speedTrend: 'stable' | 'accelerating' | 'decelerating';
    forceTrend: 'stable' | 'increasing' | 'decreasing';
}

/**
 * Analyseur de vol avec détection d'oscillations et de frétillements
 * Inspiré de V9 mais optimisé pour V10
 */
export class FlightAnalyzer {
    private static readonly HISTORY_SIZE = 120; // 2s à 60fps
    private static readonly ANALYSIS_WINDOW = 60; // 1s pour l'analyse

    private history: FlightDataPoint[] = [];
    private currentTime = 0;

    /**
     * Ajoute un échantillon à l'historique
     */
    addSample(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        totalForce: number,
        aoa: number,
        dt?: number
    ): void {
        this.currentTime += dt ?? (1 / 60);

        this.history.push({
            timestamp: this.currentTime,
            position: position.clone(),
            velocity: velocity.clone(),
            force: totalForce,
            aoa
        });

        // Maintenir la taille de l'historique
        if (this.history.length > FlightAnalyzer.HISTORY_SIZE) {
            this.history.shift();
        }
    }

    /**
     * Analyse les oscillations dans le mouvement
     */
    analyzeOscillations(): OscillationMetrics {
        if (this.history.length < FlightAnalyzer.ANALYSIS_WINDOW) {
            return {
                frequency: 0,
                amplitude: 0,
                stability: 1,
                isWobbling: false,
                severity: 0,
                description: 'Données insuffisantes'
            };
        }

        const window = this.history.slice(-FlightAnalyzer.ANALYSIS_WINDOW);

        // Calculer l'amplitude (écart-type des positions)
        const positions = window.map(d => d.position);
        const meanPos = this.calculateMeanVector(positions);
        const amplitude = this.calculateStdDeviation(positions, meanPos);

        // Calculer la fréquence (passages par zéro de la vitesse)
        const velocities = window.map(d => d.velocity);
        let zeroCrossings = 0;

        for (let i = 1; i < velocities.length; i++) {
            // Changement de signe en Y (altitude)
            if (velocities[i - 1].y * velocities[i].y < 0) {
                zeroCrossings++;
            }
        }

        const timeWindow = (window[window.length - 1].timestamp - window[0].timestamp);
        const frequency = zeroCrossings / (2 * timeWindow); // Hz

        // Calculer la stabilité
        const maxExpectedAmplitude = 5.0; // 5m max
        const stability = Math.max(0, 1 - (amplitude / maxExpectedAmplitude));

        // Détecter les frétillements
        const highFrequency = frequency > 2.0; // > 2Hz
        const moderateAmplitude = amplitude > 0.5 && amplitude < 2.0;
        const lowStability = stability < 0.7;

        const isWobbling = highFrequency && moderateAmplitude && lowStability;
        let severity = 0;
        let description = "Vol stable";

        if (isWobbling) {
            severity = Math.min(1, (2 - stability) * (frequency / 5.0));

            if (severity < 0.3) {
                description = "Légères oscillations";
            } else if (severity < 0.6) {
                description = "Frétillements modérés";
            } else {
                description = "Frétillements importants";
            }
        }

        return {
            frequency,
            amplitude,
            stability,
            isWobbling,
            severity,
            description
        };
    }

    /**
     * Analyse les tendances récentes
     */
    getRecentTrends(): FlightTrends {
        if (this.history.length < 20) {
            return {
                altitudeTrend: 'stable',
                speedTrend: 'stable',
                forceTrend: 'stable'
            };
        }

        const recent = this.history.slice(-20);
        const older = this.history.slice(-40, -20);

        if (older.length === 0) {
            return {
                altitudeTrend: 'stable',
                speedTrend: 'stable',
                forceTrend: 'stable'
            };
        }

        // Tendance altitude
        const recentAlt = this.mean(recent.map(d => d.position.y));
        const olderAlt = this.mean(older.map(d => d.position.y));
        const altChange = recentAlt - olderAlt;

        const altitudeTrend = Math.abs(altChange) < 0.1 ? 'stable' :
            altChange > 0 ? 'ascending' : 'descending';

        // Tendance vitesse
        const recentSpeed = this.mean(recent.map(d => d.velocity.length()));
        const olderSpeed = this.mean(older.map(d => d.velocity.length()));
        const speedChange = recentSpeed - olderSpeed;

        const speedTrend = Math.abs(speedChange) < 0.1 ? 'stable' :
            speedChange > 0 ? 'accelerating' : 'decelerating';

        // Tendance force
        const recentForce = this.mean(recent.map(d => d.force));
        const olderForce = this.mean(older.map(d => d.force));
        const forceChange = recentForce - olderForce;

        const forceTrend = Math.abs(forceChange) < 5 ? 'stable' :
            forceChange > 0 ? 'increasing' : 'decreasing';

        return { altitudeTrend, speedTrend, forceTrend };
    }

    /**
     * Génère un rapport de vol détaillé
     */
    generateReport(): string {
        const oscMetrics = this.analyzeOscillations();
        const trends = this.getRecentTrends();

        const lines = [
            `📊 ANALYSE DE VOL`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `🎯 Oscillations: Fréq=${oscMetrics.frequency.toFixed(1)}Hz, Ampl=${oscMetrics.amplitude.toFixed(2)}m`,
            `📊 Stabilité: ${(oscMetrics.stability * 100).toFixed(0)}%`,
            `🔄 État: ${oscMetrics.description} (Sévérité: ${(oscMetrics.severity * 100).toFixed(0)}%)`,
            `📈 Tendances: Alt ${trends.altitudeTrend}, Vit ${trends.speedTrend}, Force ${trends.forceTrend}`
        ];

        if (oscMetrics.isWobbling) {
            lines.push(`⚠️  RECOMMANDATIONS:`);
            if (oscMetrics.frequency > 3) {
                lines.push(`   • Fréquence élevée: réduire la réactivité`);
            }
            if (oscMetrics.amplitude > 1.5) {
                lines.push(`   • Amplitude importante: ajuster les gains`);
            }
            if (oscMetrics.stability < 0.5) {
                lines.push(`   • Instabilité: vérifier l'équilibre`);
            }
        }

        return lines.join('\n');
    }

    // Méthodes utilitaires privées
    private calculateMeanVector(vectors: THREE.Vector3[]): THREE.Vector3 {
        const sum = new THREE.Vector3();
        vectors.forEach(v => sum.add(v));
        return sum.divideScalar(vectors.length);
    }

    private calculateStdDeviation(vectors: THREE.Vector3[], mean: THREE.Vector3): number {
        let sumSq = 0;
        vectors.forEach(v => {
            const diff = v.clone().sub(mean);
            sumSq += diff.lengthSq();
        });
        return Math.sqrt(sumSq / vectors.length);
    }

    private mean(values: number[]): number {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
}
