/**
 * physics.ts - Namespace Physics extrait en module séparé
 * Contient toutes les classes liées à la physique des lignes
 */

import * as THREE from 'three';

/**
 * Classe de base pour toutes les lignes du système
 * Une ligne a toujours deux points d'ancrage et une longueur de repos
 */
export class Line {
    public pointA: string;          // ID du premier point d'ancrage
    public pointB: string;          // ID du deuxième point d'ancrage
    public restLength: number;      // Longueur de repos (naturelle) en mètres
    public strength: number;        // Résistance de la ligne (0-1, 1 = incassable)
    public elasticity: number;      // Élasticité (0 = rigide, 1 = très élastique)

    constructor(pointA: string, pointB: string, restLength: number, strength: number = 1.0, elasticity: number = 0.1) {
        this.pointA = pointA;
        this.pointB = pointB;
        this.restLength = restLength;
        this.strength = strength;
        this.elasticity = elasticity;
    }

    /**
     * Calcule la force de contrainte entre les deux points
     * @param posA Position du point A
     * @param posB Position du point B
     * @returns Force à appliquer pour maintenir la contrainte
     */
    calculateConstraintForce(posA: THREE.Vector3, posB: THREE.Vector3): THREE.Vector3 {
        const direction = new THREE.Vector3().subVectors(posB, posA);
        const currentLength = direction.length();

        if (currentLength < 0.001) {
            return new THREE.Vector3(); // Éviter division par zéro
        }

        // Normaliser la direction
        direction.normalize();

        // Calculer l'extension/compression
        const deltaLength = currentLength - this.restLength;

        // Force proportionnelle à l'extension (loi de Hooke modifiée)
        const forceMagnitude = deltaLength * (1.0 - this.elasticity) * this.strength;

        // La force va de A vers B pour raccourcir si trop long
        return direction.multiplyScalar(forceMagnitude);
    }

    /**
     * Vérifie si la ligne est sous tension (étirée)
     */
    isUnderTension(posA: THREE.Vector3, posB: THREE.Vector3): boolean {
        const currentLength = posA.distanceTo(posB);
        return currentLength > this.restLength * (1.0 + this.elasticity);
    }

    /**
     * Obtient des informations de debug sur la ligne
     */
    getDebugInfo(posA: THREE.Vector3, posB: THREE.Vector3): string {
        const currentLength = posA.distanceTo(posB);
        const tension = currentLength > this.restLength;
        const extensionPercent = ((currentLength - this.restLength) / this.restLength * 100).toFixed(1);

        return `${this.pointA}->${this.pointB}: ${currentLength.toFixed(2)}m (${extensionPercent}% ${tension ? 'tendu' : 'relâché'})`;
    }
}

/**
 * Ligne de bride spécialisée - relie un point du cerf-volant à un point de convergence
 * Les brides sont généralement courtes et rigides
 */
export class BridleLine extends Line {
    constructor(pointA: string, pointB: string, restLength: number) {
        // Les brides sont rigides (faible élasticité) et très résistantes
        super(pointA, pointB, restLength, 1.0, 0.05);
    }

    /**
     * Les brides ont un comportement spécial : elles peuvent seulement tirer, jamais pousser
     */
    calculateConstraintForce(posA: THREE.Vector3, posB: THREE.Vector3): THREE.Vector3 {
        const direction = new THREE.Vector3().subVectors(posB, posA);
        const currentLength = direction.length();

        // Si la ligne est plus courte que sa longueur de repos, pas de force (bride relâchée)
        if (currentLength <= this.restLength) {
            return new THREE.Vector3();
        }

        // Sinon, appliquer la force normale
        return super.calculateConstraintForce(posA, posB);
    }

    /**
     * Vérifie si cette bride est active (sous tension)
     */
    isActive(posA: THREE.Vector3, posB: THREE.Vector3): boolean {
        return posA.distanceTo(posB) > this.restLength;
    }
}

/**
 * Ligne de contrôle spécialisée - relie un point de convergence à la barre de contrôle
 * Ces lignes sont longues et peuvent être raccourcies/allongées par le pilote
 */
export class ControlLine extends Line {
    private adjustmentFactor: number = 1.0; // Facteur d'ajustement de longueur (contrôlé par le pilote)

    constructor(pointA: string, pointB: string, restLength: number) {
        // Les lignes de contrôle sont un peu plus élastiques et très résistantes
        super(pointA, pointB, restLength, 1.0, 0.15);
    }

    /**
     * Ajuste la longueur effective de la ligne (simulation du raccourcissement/allongement)
     * @param factor Facteur multiplicateur (0.8 = 20% plus court, 1.2 = 20% plus long)
     */
    adjustLength(factor: number): void {
        this.adjustmentFactor = Math.max(0.5, Math.min(1.5, factor)); // Limiter entre 50% et 150%
    }

    /**
     * Obtient la longueur effective actuelle (longueur de repos × facteur d'ajustement)
     */
    getEffectiveLength(): number {
        return this.restLength * this.adjustmentFactor;
    }

    /**
     * Force de contrainte en tenant compte de l'ajustement
     */
    calculateConstraintForce(posA: THREE.Vector3, posB: THREE.Vector3): THREE.Vector3 {
        const direction = new THREE.Vector3().subVectors(posB, posA);
        const currentLength = direction.length();

        if (currentLength < 0.001) {
            return new THREE.Vector3();
        }

        direction.normalize();
        const effectiveLength = this.getEffectiveLength();
        const deltaLength = currentLength - effectiveLength;

        // Force proportionnelle à l'extension
        const forceMagnitude = deltaLength * (1.0 - this.elasticity) * this.strength;

        return direction.multiplyScalar(forceMagnitude);
    }

    /**
     * Debug info avec longueur ajustée
     */
    getDebugInfo(posA: THREE.Vector3, posB: THREE.Vector3): string {
        const currentLength = posA.distanceTo(posB);
        const effectiveLength = this.getEffectiveLength();
        const adjustmentPercent = ((this.adjustmentFactor - 1.0) * 100).toFixed(1);

        return `${this.pointA}->${this.pointB}: ${currentLength.toFixed(2)}m (eff: ${effectiveLength.toFixed(2)}m, adj: ${adjustmentPercent}%)`;
    }
}
