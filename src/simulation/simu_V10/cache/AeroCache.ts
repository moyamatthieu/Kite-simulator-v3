/**
 * Cache LRU pour les calculs aérodynamiques avec lissage
 * Évite les recalculs coûteux frame par frame et lisse les forces pour un vol plus fluide
 * Inspiré de V9 avec ajout de lissage exponentiel
 */
export class AeroCache<K, V> {
    private cache = new Map<K, { value: V; timestamp: number; smoothedValue?: V }>();
    private readonly maxSize: number;
    private readonly ttl: number; // Time to live en ms
    private readonly smoothingFactor = 0.15; // 15% nouveau, 85% ancien pour lissage doux

    constructor(maxSize = 100, ttl = 16) { // 16ms = 1 frame à 60fps
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    get(key: K): V | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return undefined;
        }

        // LRU: déplacer en fin
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.smoothedValue || entry.value;
    }

    /**
     * Récupère la valeur lissée, en créant si nécessaire
     */
    getSmoothed(key: K, newValue: V): V {
        const existing = this.get(key);
        if (!existing) {
            this.set(key, newValue);
            return newValue;
        }

        // Appliquer le lissage exponentiel
        if (this.isVector3(existing) && this.isVector3(newValue)) {
            const smoothed = (existing as any).clone();
            smoothed.multiplyScalar(1 - this.smoothingFactor);
            smoothed.addScaledVector(newValue as any, this.smoothingFactor);
            this.updateSmoothed(key, smoothed as V);
            return smoothed as V;
        }

        // Pour les autres types, retourner la valeur existante
        return existing;
    }

    /**
     * Met à jour la valeur lissée dans le cache
     */
    private updateSmoothed(key: K, smoothedValue: V): void {
        const entry = this.cache.get(key);
        if (entry) {
            entry.smoothedValue = smoothedValue;
            this.cache.set(key, entry);
        }
    }

    /**
     * Vérifie si une valeur est un Vector3
     */
    private isVector3(value: any): boolean {
        return value && typeof value.x === 'number' && typeof value.y === 'number' && typeof value.z === 'number';
    }

    set(key: K, value: V): void {
        // Éviction LRU si plein
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, { value, timestamp: Date.now() });
    }

    clear(): void {
        this.cache.clear();
    }

    // Génération de clé pour les calculs aéro
    static makeKey(wind: THREE.Vector3, orientation: THREE.Quaternion): string {
        return `${wind.x.toFixed(2)},${wind.y.toFixed(2)},${wind.z.toFixed(2)}|` +
            `${orientation.x.toFixed(3)},${orientation.y.toFixed(3)},${orientation.z.toFixed(3)},${orientation.w.toFixed(3)}`;
    }
}