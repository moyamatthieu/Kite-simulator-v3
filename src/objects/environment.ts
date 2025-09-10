/**
 * `environment.ts` - Création de l'environnement 3D pour la simulation.
 *
 * Ajoute un décor lisible et utile pour le pilotage:
 * - Sol recevant les ombres + grille de repère
 * - Dôme de ciel à gradient vertical (BackSide)
 * - Boîte de limites du monde (helper)
 * - Indicateur direction/vitesse du vent
 */

import * as THREE from 'three';
import { C_objet, C_objetConfig } from './C_objet';

export class Environment extends C_objet {
  // Eléments
  private skyDome: THREE.Mesh | null = null;
  private boundsHelper: THREE.Box3Helper | null = null;
  private windArrow: THREE.ArrowHelper | null = null;
  private grid: THREE.GridHelper;
  private axes: THREE.AxesHelper;
  private ground: THREE.Mesh;

  constructor(config: C_objetConfig = {}) {
    super(config);

    // Sol (grand disque)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d7d2a });
    const groundGeo = new THREE.CircleGeometry(70, 72); // un peu plus large
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.name = 'Ground';
    this.group.add(this.ground);

    // Grille de repère (semi-transparente)
    this.grid = new THREE.GridHelper(80, 80, 0x335533, 0x224422);
    (this.grid.material as THREE.Material).opacity = 0.4;
    (this.grid.material as THREE.Material).transparent = true;
    this.group.add(this.grid);

    // Axes 3D
    this.axes = new THREE.AxesHelper(2);
    this.axes.position.set(1, 0, 0);
    this.axes.name = 'AxesHelper';
    this.group.add(this.axes);

    // Dôme de ciel (gradient vertical en VertexColors)
    this.buildSkyDome();

    // Indicateur de vent
    this.buildWindIndicator();

    // Limites du monde par défaut
    this.setBounds({ minX: -50, maxX: 50, minY: 0, maxY: 100, minZ: -50, maxZ: 50 });
  }

  protected createGeometry(): void {
    // La géométrie est créée dans le constructeur
  }

  get object3d(): THREE.Object3D { return this.group; }

  // --- Public API ---

  setGridVisible(v: boolean): void { this.grid.visible = v; }
  setAxesVisible(v: boolean): void { this.axes.visible = v; }
  setSkyVisible(v: boolean): void { if (this.skyDome) this.skyDome.visible = v; }

  setBounds(bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }): void {
    // Nettoyer l'ancien helper
    if (this.boundsHelper) {
      this.group.remove(this.boundsHelper);
      (this.boundsHelper.geometry as any)?.dispose?.();
      (this.boundsHelper.material as any)?.dispose?.();
      this.boundsHelper = null;
    }

    const box = new THREE.Box3(
      new THREE.Vector3(bounds.minX, bounds.minY, bounds.minZ),
      new THREE.Vector3(bounds.maxX, bounds.maxY, bounds.maxZ)
    );
    this.boundsHelper = new THREE.Box3Helper(box, 0x3b82f6); // bleu
    // Légèrement transparent via material
    const mat = (this.boundsHelper as any).material as THREE.Material | undefined;
    if (mat) { (mat as any).transparent = true; (mat as any).opacity = 0.35; }
    this.group.add(this.boundsHelper);
  }

  updateWindVector(v: THREE.Vector3): void {
    if (!this.windArrow) return;
    const speed = v.length();
    if (speed < 1e-6) {
      this.windArrow.setLength(0.01);
      return;
    }
    const dir = v.clone().normalize();
    this.windArrow.setDirection(dir);
    // Echelle visible: 0.25m + 0.06m par m/s (max ~ 25 m/s)
    this.windArrow.setLength(0.25 + 0.06 * Math.min(25, speed));
  }

  // --- Internals ---

  private buildSkyDome(): void {
    const radius = 500;
    const geo = new THREE.SphereGeometry(radius, 32, 24);
    // Créer un attribut de couleur par vertex (gradient vertical)
    const pos = geo.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color(0x87ceeb);    // bleu ciel
    const bottom = new THREE.Color(0x1a237e); // bleu foncé
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = (pos.getY(i) / radius + 1) * 0.5; // 0 bas → 1 haut
      c.copy(bottom).lerp(top, y);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, depthWrite: false });
    this.skyDome = new THREE.Mesh(geo, mat);
    this.skyDome.name = 'SkyDome';
    this.group.add(this.skyDome);
  }

  private buildWindIndicator(): void {
    // Petite flèche posée près de l'origine
    const dir = new THREE.Vector3(0, 0, -1);
    const origin = new THREE.Vector3(-2, 1.6, 0);
    const length = 0.6;
    const color = 0x00e0ff;
    this.windArrow = new THREE.ArrowHelper(dir, origin, length, color, 0.18, 0.1);
    this.windArrow.name = 'WindArrow';
    this.group.add(this.windArrow);
  }
}
