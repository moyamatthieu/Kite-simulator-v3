import * as THREE from 'three';

export class DebugVectors {
  private group = new THREE.Group();
  private velArrow: THREE.ArrowHelper;
  private windArrow: THREE.ArrowHelper;
  private liftArrow: THREE.ArrowHelper;
  private dragArrow: THREE.ArrowHelper;
  private ltensionArrow: THREE.ArrowHelper;
  private rtensionArrow: THREE.ArrowHelper;
  private scale = 0.2; // échelle des vecteurs

  // Nouveaux vecteurs pour debug avancé (comme V9)
  private apparentWindArrow: THREE.ArrowHelper;
  private stallIndicator: THREE.Mesh;
  private aoaText: HTMLElement | null = null;

  constructor() {
    this.group.name = 'DebugVectors';
    this.velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x00ff00); // vitesse (vert)
    this.windArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x00e0ff); // vent global (cyan)
    this.liftArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, 0x0088ff); // portance (bleu)
    this.dragArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 1, 0xff0000); // traînée (rouge)
    this.ltensionArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0x1e90ff); // tension gauche
    this.rtensionArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0xff5555); // tension droite

    // Vecteurs avancés
    this.apparentWindArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xffaa00); // vent apparent (orange)

    // Indicateur de stall
    const stallGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const stallMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 });
    this.stallIndicator = new THREE.Mesh(stallGeo, stallMat);
    this.stallIndicator.visible = false;

    this.group.add(this.velArrow, this.windArrow, this.liftArrow, this.dragArrow, this.ltensionArrow, this.rtensionArrow, this.apparentWindArrow, this.stallIndicator);
    this.setVisible(false);
  }

  get object3d(): THREE.Object3D { return this.group; }
  setVisible(v: boolean) { this.group.visible = v; }

  update(anchor: THREE.Vector3, data: {
    velocity: THREE.Vector3;
    apparentWind: THREE.Vector3;
    globalWind: THREE.Vector3;
    lift: THREE.Vector3;
    drag: THREE.Vector3;
    leftLine?: { from: THREE.Vector3; to: THREE.Vector3 };
    rightLine?: { from: THREE.Vector3; to: THREE.Vector3 };
    aoaDeg?: number;
    isStalling?: boolean;
  }) {
    const base = anchor.clone();
    const off = 0.1;
    this.velArrow.position.copy(base.clone().add(new THREE.Vector3(0, off, 0)));
    if (data.velocity.lengthSq() > 1e-8) {
      this.velArrow.setDirection(data.velocity.clone().normalize());
      this.velArrow.setLength(Math.max(0.05, data.velocity.length() * this.scale));
    }

    // Vent global
    this.windArrow.position.copy(base.clone().add(new THREE.Vector3(0, off * 2, 0)));
    if (data.globalWind.lengthSq() > 1e-8) {
      this.windArrow.setDirection(data.globalWind.clone().normalize());
      this.windArrow.setLength(Math.max(0.05, data.globalWind.length() * this.scale));
    }

    // Vent apparent (nouveau)
    this.apparentWindArrow.position.copy(base.clone().add(new THREE.Vector3(0, off * 3, 0)));
    if (data.apparentWind.lengthSq() > 1e-8) {
      this.apparentWindArrow.setDirection(data.apparentWind.clone().normalize());
      this.apparentWindArrow.setLength(Math.max(0.05, data.apparentWind.length() * this.scale));
    }

    this.liftArrow.position.copy(base.clone().add(new THREE.Vector3(off, 0, 0)));
    if (data.lift.lengthSq() > 1e-8) {
      this.liftArrow.setDirection(data.lift.clone().normalize());
      this.liftArrow.setLength(Math.max(0.05, data.lift.length() * this.scale));
    }

    this.dragArrow.position.copy(base.clone().add(new THREE.Vector3(-off, 0, 0)));
    if (data.drag.lengthSq() > 1e-8) {
      this.dragArrow.setDirection(data.drag.clone().normalize());
      this.dragArrow.setLength(Math.max(0.05, data.drag.length() * this.scale));
    }

    if (data.leftLine) {
      const dirL = data.leftLine.to.clone().sub(data.leftLine.from);
      this.ltensionArrow.position.copy(data.leftLine.from);
      if (dirL.lengthSq() > 1e-6) {
        this.ltensionArrow.setDirection(dirL.clone().normalize());
        this.ltensionArrow.setLength(Math.max(0.05, dirL.length() * 0.2));
      }
    }
    if (data.rightLine) {
      const dirR = data.rightLine.to.clone().sub(data.rightLine.from);
      this.rtensionArrow.position.copy(data.rightLine.from);
      if (dirR.lengthSq() > 1e-6) {
        this.rtensionArrow.setDirection(dirR.clone().normalize());
        this.rtensionArrow.setLength(Math.max(0.05, dirR.length() * 0.2));
      }
    }

    // Indicateur de stall
    this.stallIndicator.position.copy(anchor);
    this.stallIndicator.visible = data.isStalling || false;

    // Affichage AoA
    this.updateAoaDisplay(data.aoaDeg || 0);
  }

  /**
   * Affiche l'angle d'attaque en overlay (comme V9)
   */
  private updateAoaDisplay(aoaDeg: number): void {
    if (!this.aoaText) {
      this.aoaText = document.createElement('div');
      this.aoaText.style.cssText = `
        position: fixed;
        top: 50px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 14px;
        z-index: 1000;
      `;
      document.body.appendChild(this.aoaText);
    }

    const color = Math.abs(aoaDeg) > 15 ? '#ff6b6b' : Math.abs(aoaDeg) > 10 ? '#ffff00' : '#00ff88';
    this.aoaText.innerHTML = `AoA: <span style="color: ${color}">${aoaDeg.toFixed(1)}°</span>`;
    this.aoaText.style.display = this.group.visible ? 'block' : 'none';
  }

  /**
   * Nettoie l'affichage AoA
   */
  dispose(): void {
    if (this.aoaText) {
      document.body.removeChild(this.aoaText);
      this.aoaText = null;
    }
  }
}
