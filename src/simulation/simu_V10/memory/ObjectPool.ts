import * as THREE from 'three';

/**
 * Pool générique pour réutiliser des objets et éviter le garbage collection
 * @template T Type de l'objet à pooler
 */
export class ObjectPool<T> {
    private pool: T[] = [];
    private inUse = new Set<T>();
    private readonly factory: () => T;
    private readonly reset: (obj: T) => void;
    private readonly maxSize: number;

    constructor(
        factory: () => T,
        reset: (obj: T) => void,
        maxSize = 100
    ) {
        this.factory = factory;
        this.reset = reset;
        this.maxSize = maxSize;
    }

    /**
     * Acquiert un objet du pool ou en crée un nouveau
     */
    acquire(): T {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.factory();
        }
        this.inUse.add(obj);
        return obj;
    }

    /**
     * Libère un objet pour le réutiliser
     */
    release(obj: T): void {
        if (!this.inUse.has(obj)) return;

        this.inUse.delete(obj);
        this.reset(obj);

        if (this.pool.length < this.maxSize) {
            this.pool.push(obj);
        }
    }

    /**
     * Libère tous les objets en cours d'utilisation
     */
    releaseAll(): void {
        this.inUse.forEach(obj => {
            this.reset(obj);
            if (this.pool.length < this.maxSize) {
                this.pool.push(obj);
            }
        });
        this.inUse.clear();
    }

    /**
     * Statistiques du pool
     */
    getStats(): { pooled: number; inUse: number; total: number } {
        return {
            pooled: this.pool.length,
            inUse: this.inUse.size,
            total: this.pool.length + this.inUse.size
        };
    }
}

/**
 * Pool spécialisé pour THREE.Vector3
 * Évite les allocations fréquentes lors des calculs
 */
export class Vector3Pool {
    private static instance: ObjectPool<THREE.Vector3>;

    static get(): ObjectPool<THREE.Vector3> {
        if (!this.instance) {
            this.instance = new ObjectPool(
                () => new THREE.Vector3(),
                (v) => v.set(0, 0, 0),
                200 // Plus grand pour les calculs intensifs
            );
        }
        return this.instance;
    }

    // Méthodes de commodité
    static acquire(): THREE.Vector3 {
        return this.get().acquire();
    }

    static release(v: THREE.Vector3): void {
        this.get().release(v);
    }

    /**
     * Exécute une fonction avec des vecteurs temporaires auto-libérés
     */
    static withTemp<R>(count: number, fn: (...vecs: THREE.Vector3[]) => R): R {
        const temps = Array.from({ length: count }, () => this.acquire());
        try {
            return fn(...temps);
        } finally {
            temps.forEach(v => this.release(v));
        }
    }
}

/**
 * Pool pour THREE.Quaternion
 */
export class QuaternionPool {
    private static instance: ObjectPool<THREE.Quaternion>;

    static get(): ObjectPool<THREE.Quaternion> {
        if (!this.instance) {
            this.instance = new ObjectPool(
                () => new THREE.Quaternion(),
                (q) => q.identity(),
                50
            );
        }
        return this.instance;
    }

    static acquire(): THREE.Quaternion {
        return this.get().acquire();
    }

    static release(q: THREE.Quaternion): void {
        this.get().release(q);
    }
}

/**
 * Gestionnaire de mémoire pour les calculs temporaires
 * Utilise des arrays pré-alloués pour éviter les allocations
 */
export class TempArrays {
    private static float32Arrays = new Map<number, Float32Array>();

    static getFloat32(size: number): Float32Array {
        let arr = this.float32Arrays.get(size);
        if (!arr) {
            arr = new Float32Array(size);
            this.float32Arrays.set(size, arr);
        }
        return arr;
    }

    /**
     * Copie efficace sans allocation
     */
    static copyVector3ToArray(v: THREE.Vector3, arr: Float32Array, offset = 0): void {
        arr[offset] = v.x;
        arr[offset + 1] = v.y;
        arr[offset + 2] = v.z;
    }

    static copyArrayToVector3(arr: Float32Array, v: THREE.Vector3, offset = 0): void {
        v.set(arr[offset], arr[offset + 1], arr[offset + 2]);
    }
}

/**
 * Exemple d'utilisation optimisée dans les calculs
 */
export function optimizedVectorCalculation(a: THREE.Vector3, b: THREE.Vector3): number {
    // Au lieu de: const diff = a.clone().sub(b);
    return Vector3Pool.withTemp(1, (diff) => {
        diff.copy(a).sub(b);
        return diff.length();
    });
}