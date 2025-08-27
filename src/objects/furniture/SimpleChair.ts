/**
 * SimpleChair.ts - Chaise simple utilisant StructuredObject
 * Exemple de migration vers le système de points structurés
 */

import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import { Primitive } from '@core/Primitive';

export class SimpleChair extends StructuredObject implements ICreatable {
    // Paramètres de la chaise
    private params = {
        seatWidth: 0.45,
        seatDepth: 0.40,
        seatHeight: 0.45,
        seatThickness: 0.03,
        backHeight: 0.40,
        backThickness: 0.02,
        legRadius: 0.02,
        woodColor: '#8B4513'
    };
    
    constructor(customParams: Partial<typeof SimpleChair.prototype.params> = {}) {
        super("Chaise Simple", false);
        this.params = { ...this.params, ...customParams };
        this.init(); // Initialiser après la configuration
    }
    
    /**
     * Définit tous les points structurels de la chaise
     */
    protected definePoints(): void {
        const p = this.params;
        
        // Points de l'assise (coins supérieurs)
        this.setPoint('ASSISE_AVANT_GAUCHE', [-p.seatWidth/2, p.seatHeight, -p.seatDepth/2]);
        this.setPoint('ASSISE_AVANT_DROIT', [p.seatWidth/2, p.seatHeight, -p.seatDepth/2]);
        this.setPoint('ASSISE_ARRIERE_GAUCHE', [-p.seatWidth/2, p.seatHeight, p.seatDepth/2]);
        this.setPoint('ASSISE_ARRIERE_DROIT', [p.seatWidth/2, p.seatHeight, p.seatDepth/2]);
        this.setPoint('CENTRE_ASSISE', [0, p.seatHeight, 0]);
        
        // Points des pieds (base au sol)
        this.setPoint('PIED_BAS_AVANT_GAUCHE', [-p.seatWidth/2 + p.legRadius, 0, -p.seatDepth/2 + p.legRadius]);
        this.setPoint('PIED_BAS_AVANT_DROIT', [p.seatWidth/2 - p.legRadius, 0, -p.seatDepth/2 + p.legRadius]);
        this.setPoint('PIED_BAS_ARRIERE_GAUCHE', [-p.seatWidth/2 + p.legRadius, 0, p.seatDepth/2 - p.legRadius]);
        this.setPoint('PIED_BAS_ARRIERE_DROIT', [p.seatWidth/2 - p.legRadius, 0, p.seatDepth/2 - p.legRadius]);
        
        // Points des pieds (haut, connexion avec assise)
        this.setPoint('PIED_HAUT_AVANT_GAUCHE', [-p.seatWidth/2 + p.legRadius, p.seatHeight, -p.seatDepth/2 + p.legRadius]);
        this.setPoint('PIED_HAUT_AVANT_DROIT', [p.seatWidth/2 - p.legRadius, p.seatHeight, -p.seatDepth/2 + p.legRadius]);
        this.setPoint('PIED_HAUT_ARRIERE_GAUCHE', [-p.seatWidth/2 + p.legRadius, p.seatHeight, p.seatDepth/2 - p.legRadius]);
        this.setPoint('PIED_HAUT_ARRIERE_DROIT', [p.seatWidth/2 - p.legRadius, p.seatHeight, p.seatDepth/2 - p.legRadius]);
        
        // Points du dossier
        this.setPoint('DOSSIER_BAS_GAUCHE', [-p.seatWidth/2, p.seatHeight, p.seatDepth/2]);
        this.setPoint('DOSSIER_BAS_DROIT', [p.seatWidth/2, p.seatHeight, p.seatDepth/2]);
        this.setPoint('DOSSIER_HAUT_GAUCHE', [-p.seatWidth/2, p.seatHeight + p.backHeight, p.seatDepth/2]);
        this.setPoint('DOSSIER_HAUT_DROIT', [p.seatWidth/2, p.seatHeight + p.backHeight, p.seatDepth/2]);
        this.setPoint('CENTRE_DOSSIER', [0, p.seatHeight + p.backHeight/2, p.seatDepth/2 - p.backThickness/2]);
        
        // Points des barres de support
        this.setPoint('BARRE_AVANT_GAUCHE', [-p.seatWidth/2 + p.legRadius, p.seatHeight * 0.3, -p.seatDepth/2 + p.legRadius]);
        this.setPoint('BARRE_AVANT_DROIT', [p.seatWidth/2 - p.legRadius, p.seatHeight * 0.3, -p.seatDepth/2 + p.legRadius]);
        this.setPoint('BARRE_ARRIERE_GAUCHE', [-p.seatWidth/2 + p.legRadius, p.seatHeight * 0.3, p.seatDepth/2 - p.legRadius]);
        this.setPoint('BARRE_ARRIERE_DROIT', [p.seatWidth/2 - p.legRadius, p.seatHeight * 0.3, p.seatDepth/2 - p.legRadius]);
    }
    
    /**
     * Construit la structure (pieds et barres de support)
     */
    protected buildStructure(): void {
        const p = this.params;
        
        // Les 4 pieds
        this.addCylinderBetweenPoints('PIED_BAS_AVANT_GAUCHE', 'PIED_HAUT_AVANT_GAUCHE', p.legRadius, p.woodColor);
        this.addCylinderBetweenPoints('PIED_BAS_AVANT_DROIT', 'PIED_HAUT_AVANT_DROIT', p.legRadius, p.woodColor);
        this.addCylinderBetweenPoints('PIED_BAS_ARRIERE_GAUCHE', 'PIED_HAUT_ARRIERE_GAUCHE', p.legRadius, p.woodColor);
        this.addCylinderBetweenPoints('PIED_BAS_ARRIERE_DROIT', 'PIED_HAUT_ARRIERE_DROIT', p.legRadius, p.woodColor);
        
        // Barres de support horizontales
        this.addCylinderBetweenPoints('BARRE_AVANT_GAUCHE', 'BARRE_AVANT_DROIT', p.legRadius * 0.8, p.woodColor);
        this.addCylinderBetweenPoints('BARRE_ARRIERE_GAUCHE', 'BARRE_ARRIERE_DROIT', p.legRadius * 0.8, p.woodColor);
    }
    
    /**
     * Construit les surfaces (assise et dossier)
     */
    protected buildSurfaces(): void {
        const p = this.params;
        
        // Assise - utiliser une boîte car plus approprié qu'une surface fine
        const assisePos = this.getPoint('CENTRE_ASSISE');
        if (assisePos) {
            const seat = Primitive.box(p.seatWidth, p.seatThickness, p.seatDepth, p.woodColor);
            this.addPrimitiveAt(seat, [assisePos.x, assisePos.y, assisePos.z]);
        }
        
        // Dossier
        const dossierPos = this.getPoint('CENTRE_DOSSIER');
        if (dossierPos) {
            const backrest = Primitive.box(p.seatWidth, p.backHeight, p.backThickness, p.woodColor);
            this.addPrimitiveAt(backrest, [dossierPos.x, dossierPos.y, dossierPos.z]);
        }
    }
    
    // Implémentation de l'interface ICreatable
    create(): this {
        return this;
    }
    
    getName(): string {
        return "Chaise Simple";
    }
    
    getDescription(): string {
        return "Chaise simple avec structure de points nommés";
    }
    
    getPrimitiveCount(): number {
        return 8; // 1 assise + 4 pieds + 1 dossier + 2 barres
    }
}