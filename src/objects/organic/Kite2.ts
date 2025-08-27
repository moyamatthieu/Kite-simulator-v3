/**
 * Kite2.ts - Cerf-volant delta utilisant les factories CAO
 * 
 * Approche modulaire avec factories séparées pour:
 * - Points anatomiques (PointFactory)
 * - Structure/Frame (FrameFactory)  
 * - Surfaces/Toile (SurfaceFactory)
 */


import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import { Primitive } from '@core/Primitive';
import { FrameFactory } from '@factories/FrameFactory';
import { SurfaceFactory } from '@factories/SurfaceFactory';

export class Kite2 extends StructuredObject implements ICreatable {
  private frameFactory: FrameFactory;
  private surfaceFactory: SurfaceFactory;
  // Map centrale des points - Single Source of Truth
  private pointsMap: Map<string, [number, number, number]> = new Map();
  private bridleFrame: THREE.Group | null = null;
  private bridleLengthFactor: number = 1.0; // Facteur de longueur virtuelle des brides principales
  
  // Paramètres du cerf-volant
  private params = {
    width: 1.65,      // Envergure
    height: 0.65,     // Hauteur
    depth: 0.15,   // Profondeur whiskers
    frameDiameter: 0.01,
    frameColor: '#2a2a2a',
    sailColor: '#ff3333',
    sailOpacity: 0.9
  };
  
  constructor(customParams = {}) {
    super("Cerf-volant Delta v2", false);
    this.params = { ...this.params, ...customParams };
    this.frameFactory = new FrameFactory();
    this.surfaceFactory = new SurfaceFactory();
    this.init();
  }

  /**
   * Définit tous les points anatomiques du cerf-volant
   * Pattern "Feature-Based Points Repository" : Map centrale partagée
   */
  protected definePoints(): void {
    const { width, height, depth } = this.params;
    
    // Calculs préliminaires pour les positions relatives
    const centreY = height/4;
    const ratio = (height - centreY) / height;
    const interGaucheX = ratio * (-width/2);
    const interDroitX = ratio * (width/2);
    const fixRatio = 2/3;
    
    // Définir LA Map centrale de points - Single Source of Truth
    this.pointsMap = new Map<string, [number, number, number]>([
      // Points structurels principaux
      ['SPINE_BAS', [0, 0, 0]],
      ['CENTRE', [0, height/4, 0]],
      ['NEZ', [0, height, 0]],
      
      // Points des bords d'attaque
      ['BORD_GAUCHE', [-width/2, 0, 0]],
      ['BORD_DROIT', [width/2, 0, 0]],
      
      // Points d'intersection pour le spreader
      ['INTER_GAUCHE', [interGaucheX, centreY, 0]],
      ['INTER_DROIT', [interDroitX, centreY, 0]],
      
      // Points de fixation whiskers
      ['FIX_GAUCHE', [fixRatio * interGaucheX, centreY, 0]],
      ['FIX_DROIT', [fixRatio * interDroitX, centreY, 0]],
      
      // Points des whiskers
      ['WHISKER_GAUCHE', [-width/4, 0.1, -depth]],
      ['WHISKER_DROIT', [width/4, 0.1, -depth]],
      
      // Points de contrôle (bridage) - Position FIXE
      ['CTRL_GAUCHE', [-width*0.15, height*0.3, 0.4]],
      ['CTRL_DROIT', [width*0.15, height*0.3, 0.4]]
    ]);
    
    // Enregistrer dans StructuredObject pour compatibilité avec le système existant
    this.pointsMap.forEach((position, name) => {
      this.setPoint(name, position);
    });
  }

  /**
   * Construit la structure rigide avec FrameFactory
   */
  protected buildStructure(): void {
    const { frameDiameter, frameColor } = this.params;
    
    // Créer le frame principal avec la Map de points partagée
    const mainFrameParams = {
      diameter: frameDiameter,
      material: frameColor,
      points: Array.from(this.pointsMap.entries()),  // Passer LA Map de référence
      connections: [
        // Épine centrale
        ['NEZ', 'SPINE_BAS'] as [string, string],
        // Bords d'attaque
        ['NEZ', 'BORD_GAUCHE'] as [string, string],
        ['NEZ', 'BORD_DROIT'] as [string, string],
        // Spreader
        ['INTER_GAUCHE', 'INTER_DROIT'] as [string, string]
      ]
    };
    
    const mainFrame = this.frameFactory.createObject(mainFrameParams);
    this.add(mainFrame);
    
    // Créer les whiskers avec un frame séparé (plus fin)
    const whiskerFrameParams = {
      diameter: frameDiameter / 2,
      material: '#444444',
      points: Array.from(this.pointsMap.entries()),  // Même Map de référence
      connections: [
        ['WHISKER_GAUCHE', 'FIX_GAUCHE'] as [string, string],
        ['WHISKER_DROIT', 'FIX_DROIT'] as [string, string]
      ]
    };
    
    const whiskerFrame = this.frameFactory.createObject(whiskerFrameParams);
    this.add(whiskerFrame);
    
    // Créer le système de bridage
    const bridleFrameParams = {
      diameter: 0.003,
      material: '#000000',
      points: Array.from(this.pointsMap.entries()),  // Même Map de référence
      connections: [
        // Bridage gauche
        ['CTRL_GAUCHE', 'NEZ'] as [string, string],
        ['CTRL_GAUCHE', 'INTER_GAUCHE'] as [string, string],
        ['CTRL_GAUCHE', 'CENTRE'] as [string, string],
        // Bridage droit
        ['CTRL_DROIT', 'NEZ'] as [string, string],
        ['CTRL_DROIT', 'INTER_DROIT'] as [string, string],
        ['CTRL_DROIT', 'CENTRE'] as [string, string]
      ]
    };
    
    // Supprimer l'ancien bridleFrame si il existe
    if (this.bridleFrame) {
      this.remove(this.bridleFrame);
    }
    
    this.bridleFrame = this.frameFactory.createObject(bridleFrameParams);
    this.add(this.bridleFrame);
  }

  /**
   * Construit les surfaces avec SurfaceFactory
   */
  protected buildSurfaces(): void {
    const { sailColor, sailOpacity } = this.params;
    
    // Créer la toile avec 4 panneaux triangulaires
    const sailParams = {
      points: Array.from(this.pointsMap.entries()),  // Même Map de référence
      panels: [
        // Toile gauche
        ['NEZ', 'BORD_GAUCHE', 'WHISKER_GAUCHE'],
        ['NEZ', 'WHISKER_GAUCHE', 'SPINE_BAS'],
        // Toile droite
        ['NEZ', 'BORD_DROIT', 'WHISKER_DROIT'],
        ['NEZ', 'WHISKER_DROIT', 'SPINE_BAS']
      ],
      material: {
        color: sailColor,
        transparent: true,
        opacity: sailOpacity,
        doubleSided: true  // Visible des deux côtés
      }
    };
    
    const sail = this.surfaceFactory.createObject(sailParams);
    this.add(sail);
    
    // Ajouter des marqueurs visuels aux points clés
    this.addVisualMarkers();
  }
  
  /**
   * Méthode helper pour obtenir la Map de points
   * Peut être utilisée si d'autres objets ont besoin des points
   */
  public getPointsMap(): Map<string, [number, number, number]> {
    return new Map(this.pointsMap);  // Retourner une copie pour éviter les modifications externes
  }
  
  /**
   * Ajuste le facteur de longueur virtuelle des brides principales (NEZ vers CTRL_*)
   * @param factor - Facteur de longueur (0.5 = 50% plus court, 1.0 = normal, 1.5 = 50% plus long)
   */
  public adjustBridleLength(factor: number): void {
    // Limiter la valeur entre 0.5 et 1.5
    this.bridleLengthFactor = Math.max(0.5, Math.min(1.5, factor));
    console.log(`📏 Facteur de longueur des brides principales: ${this.bridleLengthFactor}`);
  }
  
  /**
   * Retourne la longueur de repos virtuelle pour les brides principales
   * Utilisé par la physique pour calculer les tensions
   * @param bridleName - 'left' ou 'right'
   * @returns La longueur de repos modifiée ou undefined si pas une bride principale
   */
  public getBridleRestLength(bridleName: 'left' | 'right'): number | undefined {
    const nez = this.getPoint('NEZ');
    const ctrl = this.getPoint(bridleName === 'left' ? 'CTRL_GAUCHE' : 'CTRL_DROIT');
    
    if (!nez || !ctrl) return undefined;
    
    // Calculer la distance géométrique réelle
    const realDistance = nez.distanceTo(ctrl);
    
    // Appliquer le facteur de longueur virtuelle
    // factor < 1 = bride plus courte = plus de tension
    // factor > 1 = bride plus longue = moins de tension
    return realDistance * this.bridleLengthFactor;
  }
  
  /**
   * Retourne le facteur de longueur actuel des brides
   */
  public getBridleLengthFactor(): number {
    return this.bridleLengthFactor;
  }
  
  /**
   * Ajoute des marqueurs visuels aux points importants
   */
  private addVisualMarkers(): void {
    // Nez (point rouge)
    const nez = this.getPoint('NEZ');
    if (nez) {
      const marker = Primitive.sphere(0.025, '#ff0000');
      this.addPrimitiveAt(marker, [nez.x, nez.y, nez.z]);
    }
    
    // Points de contrôle
    const ctrlG = this.getPoint('CTRL_GAUCHE');
    if (ctrlG) {
      const marker = Primitive.sphere(0.025, '#dc143c');
      this.addPrimitiveAt(marker, [ctrlG.x, ctrlG.y, ctrlG.z]);
    }
    
    const ctrlD = this.getPoint('CTRL_DROIT');
    if (ctrlD) {
      const marker = Primitive.sphere(0.025, '#b22222');
      this.addPrimitiveAt(marker, [ctrlD.x, ctrlD.y, ctrlD.z]);
    }
  }

  // Implémentation de l'interface ICreatable
  create(): this {
    return this;
  }

  getName(): string {
    return "Cerf-volant Delta v2";
  }

  getDescription(): string {
    return "Cerf-volant delta construit avec les factories CAO";
  }

  getPrimitiveCount(): number {
    return 25; // Frame + surfaces + marqueurs
  }
}

/**
 * AVANTAGES de cette approche avec factories:
 * 
 * 1. **Modularité** : Points, frames et surfaces sont gérés par des factories dédiées
 * 2. **Réutilisabilité** : Les factories peuvent être utilisées pour d'autres objets
 * 3. **Paramétrage** : Facile de modifier les paramètres de chaque composant
 * 4. **Composition** : On peut combiner différentes factories
 * 5. **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités aux factories
 * 
 * UTILISATION DE POINTFACTORY:
 * - Tous les points sont définis dans une Map centralisée
 * - PointFactory crée un objet points réutilisable
 * - Pas de symétrie automatique : chaque point est défini explicitement
 * - Permet une gestion cohérente et validée des points anatomiques
 * 
 * WORKFLOW CAO:
 * 1. PointFactory → Définir tous les points anatomiques
 * 2. FrameFactory → Construire la structure rigide
 * 3. SurfaceFactory → Ajouter les surfaces/toiles
 * 4. Assembly → Combiner le tout (futur)
 */