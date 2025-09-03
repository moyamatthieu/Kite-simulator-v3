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
    private static readonly HISTORY_SIZE = 120; // Conserve 2 secondes d'historique à 60 FPS
    private static readonly ANALYSIS_WINDOW = 60; // Fenêtre d'analyse de 1 seconde (60 échantillons)
    private static readonly LOG_HISTORY_SIZE = 5; // Nombre de messages de log à conserver

    private history: FlightDataPoint[] = [];
    private currentTime = 0;
    private logMessages: string[] = []; // Historique des messages de log pour l'UI

    /**
     * Ajoute un échantillon de données de vol à l'historique.
     * @param {THREE.Vector3} position - La position actuelle du kite.
     * @param {THREE.Vector3} velocity - La vitesse actuelle du kite.
     * @param {number} totalForce - La magnitude de la force totale appliquée au kite.
     * @param {number} aoa - L'angle d'attaque en degrés.
     * @param {number} [dt=1/60] - Le pas de temps depuis le dernier échantillon.
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

        // Maintient la taille de l'historique de vol
        if (this.history.length > FlightAnalyzer.HISTORY_SIZE) {
            this.history.shift();
        }
    }

    /**
     * Réinitialise l'historique de vol et les logs.
     */
    reset(): void {
        this.history = [];
        this.currentTime = 0;
        this.logMessages = [];
        this.addLog('Analyse de vol réinitialisée.');
    }

    /**
     * Ajoute un message de log à l'historique des logs, visible dans l'UI de debug.
     * @param {string} message - Le message de log à ajouter.
     */
    addLog(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.logMessages.push(`[${timestamp}] ${message}`);
        if (this.logMessages.length > FlightAnalyzer.LOG_HISTORY_SIZE) {
            this.logMessages.shift(); // Supprime le plus ancien
        }
    }

    /**
     * Retourne les derniers messages de log formatés pour l'affichage UI.
     * @returns {string} Une chaîne de caractères contenant les messages de log, séparés par des retours à la ligne.
     */
    getLatestLog(): string {
        return this.logMessages.join('\n');
    }

    /**
     * Analyse les oscillations du mouvement du kite et retourne des métriques.
     * @returns {OscillationMetrics} Les métriques d'oscillation, incluant fréquence, amplitude et stabilité.
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

        // Calcul de l'amplitude (écart-type des positions en Y)
        const yPositions = window.map(d => d.position.y);
        const meanY = this.mean(yPositions);
        const amplitude = Math.sqrt(yPositions.map(y => (y - meanY) * (y - meanY)).reduce((sum, val) => sum + val, 0) / yPositions.length);


        // Calcul de la fréquence (passages par zéro de la vitesse verticale)
        const yVelocities = window.map(d => d.velocity.y);
        let zeroCrossings = 0;

        for (let i = 1; i < yVelocities.length; i++) {
            if (yVelocities[i - 1] * yVelocities[i] < 0) { // Changement de signe
                zeroCrossings++;
            }
        }

        const timeWindow = (window[window.length - 1].timestamp - window[0].timestamp);
        const frequency = timeWindow > 0 ? zeroCrossings / (2 * timeWindow) : 0; // Hz, divisé par 2 car chaque cycle a deux passages par zéro

        // Calcul de la stabilité
        const maxExpectedAmplitude = 5.0; // Amplitude max "acceptable" de variation de l'altitude
        const stability = Math.max(0, 1 - (amplitude / maxExpectedAmplitude)); // 1 = parfaitement stable, 0 = très instable

        // Détection des frétillements (wobbling)
        const highFrequency = frequency > 2.0; // Fréquence > 2 Hz
        const moderateAmplitude = amplitude > 0.5 && amplitude < 2.0; // Amplitude entre 0.5m et 2m
        const lowStability = stability < 0.7; // Stabilité inférieure à 70%

        const isWobbling = highFrequency && moderateAmplitude && lowStability;
        let severity = 0;
        let description = "Vol stable";

        if (isWobbling) {
            // Intensité des frétillements, normalisée entre 0 et 1
            severity = Math.min(1, (2 - stability) * (frequency / 5.0)); // Formule empirique
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
     * Analyse les tendances récentes du vol (altitude, vitesse, force).
     * @returns {FlightTrends} Les tendances calculées.
     */
    getRecentTrends(): FlightTrends {
        if (this.history.length < 40) { // Nécessite suffisamment de données pour comparer "récent" et "ancien"
            return {
                altitudeTrend: 'stable',
                speedTrend: 'stable',
                forceTrend: 'stable'
            };
        }

        const recentWindow = this.history.slice(-20); // Les 20 derniers échantillons
        const olderWindow = this.history.slice(-40, -20); // Les 20 échantillons précédents

        const threshold = 0.1; // Seuil de changement pour considérer une tendance

        // Tendance altitude
        const recentAlt = this.mean(recentWindow.map(d => d.position.y));
        const olderAlt = this.mean(olderWindow.map(d => d.position.y));
        const altChange = recentAlt - olderAlt;
        const altitudeTrend = Math.abs(altChange) < threshold ? 'stable' :
            altChange > 0 ? 'ascending' : 'descending';

        // Tendance vitesse
        const recentSpeed = this.mean(recentWindow.map(d => d.velocity.length()));
        const olderSpeed = this.mean(olderWindow.map(d => d.velocity.length()));
        const speedChange = recentSpeed - olderSpeed;
        const speedTrend = Math.abs(speedChange) < threshold ? 'stable' :
            speedChange > 0 ? 'accelerating' : 'decelerating';

        // Tendance force (seuil plus élevé pour la force)
        const recentForce = this.mean(recentWindow.map(d => d.force));
        const olderForce = this.mean(olderWindow.map(d => d.force));
        const forceChange = recentForce - olderForce;
        const forceThreshold = 5; // N
        const forceTrend = Math.abs(forceChange) < forceThreshold ? 'stable' :
            forceChange > 0 ? 'increasing' : 'decreasing';

        return { altitudeTrend, speedTrend, forceTrend };
    }

    /**
     * Génère un rapport de vol détaillé basé sur les analyses.
     * @returns {string} Le rapport de vol formaté.
     */
    generateReport(): string {
        const oscMetrics = this.analyzeOscillations();
        const trends = this.getRecentTrends();

        const lines = [
            `📊 ANALYSE DE VOL (${new Date().toLocaleTimeString()})`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            `🎯 Oscillations: Fréq=${oscMetrics.frequency.toFixed(1)}Hz, Ampl=${oscMetrics.amplitude.toFixed(2)}m`,
            `📊 Stabilité: ${(oscMetrics.stability * 100).toFixed(0)}%`,
            `🔄 État: ${oscMetrics.description} (Sévérité: ${(oscMetrics.severity * 100).toFixed(0)}%)`,
            `📈 Tendances: Alt ${trends.altitudeTrend}, Vit ${trends.speedTrend}, Force ${trends.forceTrend}`
        ];

        if (oscMetrics.isWobbling) {
            lines.push(`\n⚠️  RECOMMANDATIONS POUR LA STABILITÉ:`);
            if (oscMetrics.frequency > 3) {
                lines.push(`   • Fréquence élevée: Réduire potentiellement les gains de contrôle ou la réactivité mécanique.`);
            }
            if (oscMetrics.amplitude > 1.5) {
                lines.push(`   • Amplitude importante: Ajuster les points d'attache (bridle) ou la rigidité du kite.`);
            }
            if (oscMetrics.stability < 0.5) {
                lines.push(`   • Instabilité générale: Vérifier l'équilibre aérodynamique et le centre de gravité du kite.`);
            }
        }

        return lines.join('\n');
    }

    // --- Méthodes utilitaires privées ---

    /**
     * Calcule le vecteur moyen d'un tableau de vecteurs Three.js.
     * @param {THREE.Vector3[]} vectors - Tableau de vecteurs.
     * @returns {THREE.Vector3} Le vecteur moyen.
     */
    private calculateMeanVector(vectors: THREE.Vector3[]): THREE.Vector3 {
        const sum = new THREE.Vector3();
        vectors.forEach(v => sum.add(v));
        return sum.divideScalar(vectors.length);
    }

    /**
     * Calcule l'écart-type des magnitudes d'un tableau de vecteurs par rapport à une moyenne vectorielle.
     * Non utilisé directement pour l'amplitude des oscillations Y, mais utile pour d'autres mesures.
     * @param {THREE.Vector3[]} vectors - Tableau de vecteurs.
     * @param {THREE.Vector3} mean - Le vecteur moyen.
     * @returns {number} L'écart-type des magnitudes.
     */
    private calculateStdDeviation(vectors: THREE.Vector3[], mean: THREE.Vector3): number {
        let sumSqDiff = 0;
        vectors.forEach(v => {
            const diff = v.clone().sub(mean);
            sumSqDiff += diff.lengthSq(); // Carré de la magnitude de la différence
        });
        return Math.sqrt(sumSqDiff / vectors.length);
    }

    /**
     * Calcule la moyenne arithmétique d'un tableau de nombres.
     * @param {number[]} values - Tableau de nombres.
     * @returns {number} La moyenne.
     */
    private mean(values: number[]): number {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
}
