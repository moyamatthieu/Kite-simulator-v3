import * as THREE from 'three';

interface SurfaceDebug {
  apparentWind: THREE.ArrowHelper;
  lift: THREE.ArrowHelper;
  drag: THREE.ArrowHelper;
  normal: THREE.ArrowHelper;
  resultante: THREE.ArrowHelper;
}

export class DebugVectors {
  private group = new THREE.Group();
  private ltensionArrow: THREE.ArrowHelper;
  private rtensionArrow: THREE.ArrowHelper;
  private scale = 0.15; // échelle des vecteurs (plus petit pour clarté)

  // Debug global du kite
  private globalVelocityArrow: THREE.ArrowHelper;
  private stallIndicator: THREE.Mesh;
  private aoaText: HTMLDivElement | null = null;

  // Vecteurs par surface (4 triangles du kite)
  private surfaceDebug: SurfaceDebug[] = [];

  constructor() {
    this.group.name = 'DebugVectors';
    
    // Vecteurs globaux
    this.globalVelocityArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x00ff00); // vitesse globale (vert)
    this.ltensionArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0x1e90ff); // tension gauche (bleu)
    this.rtensionArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0xff5555); // tension droite (rouge)

    // Indicateur de stall
    const stallGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const stallMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 });
    this.stallIndicator = new THREE.Mesh(stallGeo, stallMat);
    this.stallIndicator.visible = false;

    // Créer 4 ensembles complets de vecteurs (un par surface)
    const surfaceNames = ['Surface_HG', 'Surface_BG', 'Surface_HD', 'Surface_BD']; // Haut/Bas + Gauche/Droite
    const baseColors = [
      { base: 0x0088ff, accent: 0x66aaff }, // Bleu pour surfaces gauches
      { base: 0x0088ff, accent: 0x66aaff },
      { base: 0xff8800, accent: 0xffaa66 }, // Orange pour surfaces droites  
      { base: 0xff8800, accent: 0xffaa66 }
    ];

    for (let i = 0; i < 4; i++) {
      const colors = baseColors[i];
      const surfaceDebug: SurfaceDebug = {
        apparentWind: new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x00e0ff), // cyan
        lift: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, colors.base), // couleur de base
        drag: new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 1, 0xff0000), // rouge
        normal: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.5, 0x888888), // gris
        resultante: new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, colors.accent) // couleur accentuée
      };

      // Nommer tous les vecteurs pour le debug
      Object.entries(surfaceDebug).forEach(([type, arrow]) => {
        arrow.name = `${surfaceNames[i]}_${type}`;
      });

      // Ajouter à la scène
      Object.values(surfaceDebug).forEach(arrow => this.group.add(arrow));
      
      this.surfaceDebug.push(surfaceDebug);
    }

    this.group.add(this.globalVelocityArrow, this.ltensionArrow, this.rtensionArrow, this.stallIndicator);
    this.setVisible(false);
  }

  get object3d(): THREE.Object3D { return this.group; }
  setVisible(v: boolean) { this.group.visible = v; }

  update(kitePosition: THREE.Vector3, data: {
    globalVelocity: THREE.Vector3;
    surfaceData: {
      center: THREE.Vector3;
      normal: THREE.Vector3;
      apparentWind: THREE.Vector3;
      lift: THREE.Vector3;
      drag: THREE.Vector3;
      resultant: THREE.Vector3;
    }[];
    leftLine?: { from: THREE.Vector3; to: THREE.Vector3 };
    rightLine?: { from: THREE.Vector3; to: THREE.Vector3 };
    isStalling?: boolean;
  }) {
    // Mise à jour de la vitesse globale (au centre du kite)
    const baseOffset = new THREE.Vector3(0, 0.5, 0); // Légèrement au-dessus du kite
    this.globalVelocityArrow.position.copy(kitePosition.clone().add(baseOffset));
    if (data.globalVelocity.lengthSq() > 1e-8) {
      this.globalVelocityArrow.setDirection(data.globalVelocity.clone().normalize());
      this.globalVelocityArrow.setLength(Math.max(0.05, data.globalVelocity.length() * this.scale));
    }

    // Mise à jour des vecteurs par surface (4 surfaces)
    data.surfaceData.forEach((surface, index) => {
      if (index >= this.surfaceDebug.length) return; // Sécurité

      const surfaceVectors = this.surfaceDebug[index];

      // Vent apparent sur cette surface
      if (surface.apparentWind.lengthSq() > 1e-8) {
        surfaceVectors.apparentWind.position.copy(surface.center);
        surfaceVectors.apparentWind.setDirection(surface.apparentWind.clone().normalize());
        surfaceVectors.apparentWind.setLength(Math.max(0.05, surface.apparentWind.length() * this.scale));
      }

      // Portance sur cette surface
      if (surface.lift.lengthSq() > 1e-8) {
        surfaceVectors.lift.position.copy(surface.center);
        surfaceVectors.lift.setDirection(surface.lift.clone().normalize());
        surfaceVectors.lift.setLength(Math.max(0.05, surface.lift.length() * this.scale));
      }

      // Traînée sur cette surface
      if (surface.drag.lengthSq() > 1e-8) {
        surfaceVectors.drag.position.copy(surface.center);
        surfaceVectors.drag.setDirection(surface.drag.clone().normalize());
        surfaceVectors.drag.setLength(Math.max(0.05, surface.drag.length() * this.scale));
      }

      // Normale de la surface
      if (surface.normal.lengthSq() > 1e-8) {
        surfaceVectors.normal.position.copy(surface.center);
        surfaceVectors.normal.setDirection(surface.normal.clone().normalize());
        surfaceVectors.normal.setLength(0.3); // Longueur fixe pour la normale
      }

      // Force résultante sur cette surface
      if (surface.resultant.lengthSq() > 1e-8) {
        surfaceVectors.resultante.position.copy(surface.center);
        surfaceVectors.resultante.setDirection(surface.resultant.clone().normalize());
        surfaceVectors.resultante.setLength(Math.max(0.05, surface.resultant.length() * this.scale));
      }
    });

    // Lignes de tension
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
    this.stallIndicator.position.copy(kitePosition);
    this.stallIndicator.visible = data.isStalling || false;
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
