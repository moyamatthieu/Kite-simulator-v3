/**
 * input.ts — Gestion des entrées utilisateur avec compatibilité AZERTY/QWERTY
 */

import { PhysicsConstants } from '@/simulation/physics/PhysicsConstants';

export class InputHandler {
  private left = false;
  private right = false;
  private currentRotation = 0;        // Rotation actuelle de la barre
  private readonly rotationSpeed = 2.5; // Vitesse de rotation (rad/s)
  private readonly returnSpeed = 3.0;   // Vitesse de retour au centre (rad/s)
  private readonly maxRotation = Math.PI / 6; // Rotation max (~30 degrés)

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  /**
   * Met à jour l'état des contrôles avec retour automatique
   * COMPORTEMENT ÉMERGENT V8 : Retour automatique de la barre au centre
   */
  update(deltaTime: number): void {
    const leftPressed = this.left;
    const rightPressed = this.right;
    const dir = (leftPressed ? 1 : 0) + (rightPressed ? -1 : 0);

    if (dir !== 0) {
      // Appliquer la rotation demandée
      this.currentRotation += dir * this.rotationSpeed * deltaTime;
    } else {
      // Retour automatique au centre quand aucune touche n'est pressée
      if (Math.abs(this.currentRotation) > PhysicsConstants.EPSILON) {
        const sign = Math.sign(this.currentRotation);
        this.currentRotation -= sign * this.returnSpeed * deltaTime;
        if (Math.sign(this.currentRotation) !== sign) {
          this.currentRotation = 0;
        }
      } else {
        this.currentRotation = 0;
      }
    }

    // Limiter la rotation maximale
    this.currentRotation = Math.max(-this.maxRotation, Math.min(this.maxRotation, this.currentRotation));
  }

  get steer(): number {
    // Retourne la rotation actuelle normalisée entre -1 et 1
    return this.currentRotation / this.maxRotation;
  }

  /**
   * Détecte si c'est une touche de mouvement vers la gauche
   * Compatibilité AZERTY/QWERTY via event.code (position physique)
   */
  private isLeftKey(e: KeyboardEvent): boolean {
    return e.key === 'ArrowLeft' ||
      e.code === 'KeyA' ||           // Position physique A (QWERTY) = Q (AZERTY)
      e.key === 'a' ||               // Fallback pour caractère 'a' (QWERTY)
      e.key === 'q';                 // Fallback pour caractère 'q' (AZERTY)
  }

  /**
   * Détecte si c'est une touche de mouvement vers la droite
   * Compatibilité AZERTY/QWERTY via event.code (position physique)
   */
  private isRightKey(e: KeyboardEvent): boolean {
    return e.key === 'ArrowRight' ||
      e.code === 'KeyD' ||           // Position physique D (universelle)
      e.key === 'd';                 // Fallback pour caractère 'd' (universel)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isLeftKey(e)) this.left = true;
    if (this.isRightKey(e)) this.right = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (this.isLeftKey(e)) this.left = false;
    if (this.isRightKey(e)) this.right = false;
  };
}

