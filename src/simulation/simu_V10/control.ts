/**
 * control.ts — Gestion smooth de la barre/contrôle (inspiré de V9)
 */

export class ControlBarManager {
  private _tilt: number = 0; // -1..1
  private targetTilt: number = 0; // Valeur cible pour le lissage
  private readonly INPUT_SMOOTHING = 0.85; // Lissage des entrées (85% ancien, 15% nouveau)
  private readonly RETURN_SPEED = 3.0; // Vitesse de retour au centre
  private readonly MAX_TILT = 1.0; // Inclinaison maximale

  /**
   * Définit la valeur cible avec lissage (comme V9)
   */
  setTargetTilt(value: number): void {
    this.targetTilt = Math.max(-this.MAX_TILT, Math.min(this.MAX_TILT, value));
    // Lissage exponentiel pour éviter les changements brusques
    this._tilt = this._tilt * this.INPUT_SMOOTHING + this.targetTilt * (1 - this.INPUT_SMOOTHING);
  }

  /**
   * Met à jour automatiquement le retour au centre
   */
  update(deltaTime: number): void {
    if (Math.abs(this.targetTilt) < 0.01) {
      // Retour automatique au centre
      const sign = Math.sign(this._tilt);
      this._tilt -= sign * this.RETURN_SPEED * deltaTime;
      if (Math.sign(this._tilt) !== sign) {
        this._tilt = 0;
      }
    }
  }

  set tilt(value: number) {
    this.setTargetTilt(value);
  }

  get tilt(): number {
    return this._tilt;
  }

  getTargetTilt(): number {
    return this.targetTilt;
  }
}

