/**
 * Configuration pour les cubes - remplace CubeFactory
 * Utilise le nouveau système unifié ConfigurableObjectFactory
 */
import { ObjectConfiguration } from '@factories/unified/ConfigurableObjectFactory';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';

export interface CubeParams {
  size: number;
  printable: boolean;
  color: string;
}

export const CubeConfiguration: ObjectConfiguration<CubeParams> = {
  metadata: {
    category: 'shapes',
    name: 'Cube',
    description: 'Cube paramétrique',
    tags: ['cube', 'forme', 'géométrie'],
    complexity: 'simple'
  },

  defaultParams: {
    size: 2,
    printable: false,
    color: '#8B4513'
  },

  variants: {
    small: { size: 1 },
    medium: { size: 2 },
    large: { size: 4 },
    printable: { printable: true },
    colored: {
      color: '#FF0000'
    }
  },

  builder: {
    definePoints: (params, context) => {
      const halfSize = params.size / 2;

      // Définition des 8 sommets du cube
      context.setPoint('bottom-back-left', [-halfSize, -halfSize, -halfSize]);
      context.setPoint('bottom-back-right', [halfSize, -halfSize, -halfSize]);
      context.setPoint('top-back-right', [halfSize, halfSize, -halfSize]);
      context.setPoint('top-back-left', [-halfSize, halfSize, -halfSize]);
      context.setPoint('bottom-front-left', [-halfSize, -halfSize, halfSize]);
      context.setPoint('bottom-front-right', [halfSize, -halfSize, halfSize]);
      context.setPoint('top-front-right', [halfSize, halfSize, halfSize]);
      context.setPoint('top-front-left', [-halfSize, halfSize, halfSize]);

      // Point central pour référence
      context.setPoint('center', [0, 0, 0]);
    },

    buildStructure: (params, context) => {
      if (!params.printable) {
        // Structure filaire pour visualisation
        const material = new THREE.LineBasicMaterial({ color: 0x000000 });

        // Arêtes du cube
        const edges = [
          // Face arrière
          ['bottom-back-left', 'bottom-back-right'],
          ['bottom-back-right', 'top-back-right'],
          ['top-back-right', 'top-back-left'],
          ['top-back-left', 'bottom-back-left'],
          
          // Face avant  
          ['bottom-front-left', 'bottom-front-right'],
          ['bottom-front-right', 'top-front-right'],
          ['top-front-right', 'top-front-left'],
          ['top-front-left', 'bottom-front-left'],
          
          // Connexions avant-arrière
          ['bottom-back-left', 'bottom-front-left'],
          ['bottom-back-right', 'bottom-front-right'],
          ['top-back-right', 'top-front-right'],
          ['top-back-left', 'top-front-left']
        ];

        edges.forEach(([point1, point2]) => {
          const pos1 = context.getPoint(point1);
          const pos2 = context.getPoint(point2);
          if (pos1 && pos2) {
            const points = [
              new THREE.Vector3(pos1.x, pos1.y, pos1.z),
              new THREE.Vector3(pos2.x, pos2.y, pos2.z)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            context.addExistingObject(line);
          }
        });
      }
    },

    buildSurfaces: (params, context) => {
      if (params.printable) {
        // Surfaces triangulaires pour impression 3D
        const buildPrintableSurfaces = () => {
          const color = params.color;

          // Front face (z = halfSize)
          context.addSurfaceBetweenPoints(['bottom-front-left', 'bottom-front-right', 'top-front-right'], color);
          context.addSurfaceBetweenPoints(['bottom-front-left', 'top-front-right', 'top-front-left'], color);

          // Back face (z = -halfSize)
          context.addSurfaceBetweenPoints(['bottom-back-left', 'bottom-back-right', 'top-back-right'], color);
          context.addSurfaceBetweenPoints(['bottom-back-left', 'top-back-right', 'top-back-left'], color);

          // Left face (x = -halfSize)
          context.addSurfaceBetweenPoints(['bottom-back-left', 'top-back-left', 'top-front-left'], color);
          context.addSurfaceBetweenPoints(['bottom-back-left', 'top-front-left', 'bottom-front-left'], color);

          // Right face (x = halfSize)
          context.addSurfaceBetweenPoints(['bottom-back-right', 'top-back-right', 'top-front-right'], color);
          context.addSurfaceBetweenPoints(['bottom-back-right', 'top-front-right', 'bottom-front-right'], color);

          // Top face (y = halfSize)
          context.addSurfaceBetweenPoints(['top-back-left', 'top-back-right', 'top-front-right'], color);
          context.addSurfaceBetweenPoints(['top-back-left', 'top-front-right', 'top-front-left'], color);

          // Bottom face (y = -halfSize)
          context.addSurfaceBetweenPoints(['bottom-back-left', 'bottom-back-right', 'bottom-front-right'], color);
          context.addSurfaceBetweenPoints(['bottom-back-left', 'bottom-front-right', 'bottom-front-left'], color);
        };

        buildPrintableSurfaces();
      } else {
        // Cube solide simple pour visualisation
        const box = Primitive.box(params.size, params.size, params.size, params.color);
        context.addExistingObject(box);
      }
    },

    getName: (params) => params.printable ? 'Cube (Impression 3D)' : 'Cube',
    
    getDescription: (params) => params.printable 
      ? `Cube optimisé pour l'impression 3D - Taille: ${params.size} unités`
      : `Cube simple - Taille: ${params.size} unités`,
    
    getPrimitiveCount: (params) => params.printable ? 12 : 1 // 12 triangles ou 1 primitive
  }
};