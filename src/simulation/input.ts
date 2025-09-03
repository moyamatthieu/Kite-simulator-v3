/**
 * input.ts — Gestion des entrées utilisateur avec compatibilité AZERTY/QWERTY
 */

import { PhysicsConstants } from '@/simulation/physics/PhysicsConstants';

export class InputHandler {
  private left = false;
  private right = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  get steer(): number {
    // -1 gauche, +1 droite. Applique une zone morte autour de 0 pour les très petits mouvements.
    const rawSteer = (this.right ? 1 : 0) - (this.left ? 1 : 0);
    // Applique la zone morte définie dans PhysicsConstants
    if (Math.abs(rawSteer) < PhysicsConstants.CONTROL_DEADZONE) {
      return 0;
    }
    return rawSteer;
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

