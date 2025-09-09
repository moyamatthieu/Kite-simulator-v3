/**
 * Kite.ts - Cerf-volant delta utilisant nos factories (Frame/Surface)
 * Orchestrateur: définit les points (alignés sur simulationV8), frame, toile, brides
 */

import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import { Primitive } from '@core/Primitive';
import { KiteFactoryTools } from '@factories/KiteFactory';
import * as THREE from 'three';

// Déclare un type pour éviter d'accéder à `this` dans la signature du constructeur
type KiteParams = {
  width: number;
  height: number;
  depth: number;
  frameDiameter: number;
  frameColor: string;
  sailColor: string;
  sailOpacity: number;
  ctrlX: number;
  ctrlY: number;
  ctrlZ: number;
};

export class Kite extends StructuredObject implements ICreatable {
  private pointsMap: Map<string, [number, number, number]> = new Map();
  private bridleLines: THREE.Group | null = null;
  private bridleLengthFactor = 1.0;

  // Paramètres (visuels/échelle) et points de contrôle cibles (simulationV8)
  private params: KiteParams = {
    width: 1.65,
    height: 0.65,
    depth: 0.15,
    frameDiameter: 0.01,
    frameColor: '#2a2a2a',
    sailColor: '#ff3333',
    sailOpacity: 0.9,
    ctrlX: 0.30,
    ctrlY: 0.3,
    ctrlZ: 0.4
  };

  constructor(customParams: Partial<KiteParams> = {}) {
    super('Kite');
    this.params = { ...this.params, ...customParams };
    this.init();
  }

  protected definePoints(): void {
    const { width, height, depth, ctrlX, ctrlY, ctrlZ } = this.params;

    this.pointsMap = KiteFactoryTools.computePoints({ width, height, depth, ctrlX, ctrlY, ctrlZ });

    this.pointsMap.forEach((pos, name) => this.setPoint(name, pos));
  }

  protected buildStructure(): void {
    const { frameDiameter, frameColor } = this.params;

    const mainFrame = KiteFactoryTools.createMainFrame(this.pointsMap, { diameter: frameDiameter, material: frameColor });
    this.add(mainFrame);

    const whiskerFrame = KiteFactoryTools.createWhiskerFrame(this.pointsMap, { diameter: frameDiameter / 2, material: '#444444' });
    this.add(whiskerFrame);

    this.createBridleLines();
  }

  protected buildSurfaces(): void {
    const { sailColor, sailOpacity } = this.params;
    const sail = KiteFactoryTools.createSail(this.pointsMap, { color: sailColor, transparent: true, opacity: sailOpacity, doubleSided: true });
    this.add(sail);
    this.addVisualMarkers();
  }

  private createBridleLines(): void {
    if (this.bridleLines) this.remove(this.bridleLines);
    this.bridleLines = KiteFactoryTools.createBridleLines(this.pointsMap);
    this.add(this.bridleLines);
  }

  public updateBridleLines(): void {
    if (!this.bridleLines) return;
    this.bridleLines.children.forEach((line) => {
      if (!(line instanceof THREE.Line)) return;
      const a = (line as any).userData.startPoint;
      const b = (line as any).userData.endPoint;
      const pa = this.pointsMap.get(a);
      const pb = this.pointsMap.get(b);
      if (!pa || !pb) return;
      const geom = line.geometry as THREE.BufferGeometry;
      geom.setFromPoints([new THREE.Vector3(...pa), new THREE.Vector3(...pb)]);
      (geom.attributes as any).position.needsUpdate = true;
    });
  }

  public adjustBridleLength(factor: number): void {
    this.bridleLengthFactor = Math.max(0.5, Math.min(1.5, factor));
  }
  public getBridleRestLength(bridleName: 'left' | 'right'): number | undefined {
    const nez = this.getPoint('NEZ');
    const ctrl = this.getPoint(bridleName === 'left' ? 'CTRL_GAUCHE' : 'CTRL_DROIT');
    if (!nez || !ctrl) return undefined;
    return nez.distanceTo(ctrl) * this.bridleLengthFactor;
  }
  public getBridleLengthFactor(): number { return this.bridleLengthFactor; }

  private addVisualMarkers(): void {
    const nez = this.getPoint('NEZ');
    if (nez) this.addPrimitiveAt(Primitive.sphere(0.025, '#ff0000'), [nez.x, nez.y, nez.z]);
    const cg = this.getPoint('CTRL_GAUCHE');
    if (cg) this.addPrimitiveAt(Primitive.sphere(0.025, '#dc143c'), [cg.x, cg.y, cg.z]);
    const cd = this.getPoint('CTRL_DROIT');
    if (cd) this.addPrimitiveAt(Primitive.sphere(0.025, '#b22222'), [cd.x, cd.y, cd.z]);
  }

  // ICreatable
  create(): this { return this; }
  getName(): string { return 'Cerf-volant Delta v2'; }
  getDescription(): string { return 'Cerf-volant delta construit avec Frame/Surface factories'; }
  getPrimitiveCount(): number { return 25; }
}

export default Kite;

export function createKite(params: Partial<typeof Kite.prototype['params']> = {}): Kite {
  return new Kite(params as any);
}
