/**
 * Export centralisé de tous les objets CAO
 * Un fichier par objet pour une architecture claire
 */

// Importer tous les objets
import { SimpleChair } from './SimpleChair';
import { Box } from './Box';
import { Table } from './Table';
import { TableStructured } from './TableStructured';
import { Chair } from './Chair';
import { ModularChair } from './ModularChair';
import { Gear } from './Gear';
import { FractalTree } from './FractalTree';
import { Pyramid } from './Pyramid';
import { Kite } from './Kite';

// Importer le Registry
import { Registry } from '../core/Registry';

// Fonction d'initialisation du registre
export function registerAllObjects(): void {
    const registry = Registry.getInstance();
    
    // === MOBILIER ===
    registry.register('simple-chair', new SimpleChair());
    registry.register('chair', new Chair());
    registry.register('modular-chair', new ModularChair());
    registry.register('table', new Table());
    registry.register('table-structured', new TableStructured());
    
    // === CONTENANTS ===
    registry.register('box', new Box());
    registry.register('box-open', new Box({ lidOpen: true }));
    
    // === MÉCANIQUES ===
    registry.register('gear', new Gear());
    
    // === GÉNÉRATIFS ===
    registry.register('tree', new FractalTree());
    
    // === FORMES GÉOMÉTRIQUES ===
    registry.register('pyramid', new Pyramid());
    
    // === JOUETS / SPORTS ===
    registry.register('kite', new Kite());
}

// Export des classes pour utilisation directe
export { SimpleChair, Chair, ModularChair, Box, Table, TableStructured, Gear, FractalTree, Pyramid, Kite };