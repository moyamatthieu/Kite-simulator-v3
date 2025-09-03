/**
 * input.ts — Gestion des entrées utilisateur (basique)
 */

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
    // -1 gauche, +1 droite
    return (this.right ? 1 : 0) - (this.left ? 1 : 0);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') this.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') this.right = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') this.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') this.right = false;
  };
}

