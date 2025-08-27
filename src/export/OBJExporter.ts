/**
 * OBJExporter.ts - Exportateur pour format Wavefront OBJ
 * Compatible avec l'impression 3D et la plupart des logiciels CAO
 */

import * as THREE from 'three';

export class OBJExporter {
  /**
   * Exporte un objet Three.js vers le format OBJ
   * @param object L'objet à exporter
   * @param scale Facteur d'échelle (1 = unités Three.js, 1000 = millimètres)
   */
  static export(object: THREE.Object3D, scale: number = 1): string {
    let output = '';
    let indexVertex = 0;
    let indexVertexUvs = 0;
    let indexNormals = 0;
    
    const vertex = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const uv = new THREE.Vector2();
    
    const vertices: string[] = [];
    const normals: string[] = [];
    const uvs: string[] = [];
    const faces: string[] = [];
    
    // Header du fichier OBJ
    output += '# OBJ File exported from CAO-KISS\n';
    output += '# Created on ' + new Date().toISOString() + '\n';
    output += '\n';
    
    // Fonction récursive pour parcourir la scène
    const parseMesh = (mesh: THREE.Mesh) => {
      const geometry = mesh.geometry;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      
      // Si c'est une BufferGeometry
      if (geometry instanceof THREE.BufferGeometry) {
        const positionAttribute = geometry.getAttribute('position');
        const normalAttribute = geometry.getAttribute('normal');
        const uvAttribute = geometry.getAttribute('uv');
        const indexAttribute = geometry.getIndex();
        
        // Exporter les vertices avec mise à l'échelle
        if (positionAttribute) {
          for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);
            vertex.applyMatrix4(mesh.matrixWorld);
            // Appliquer le facteur d'échelle
            vertices.push(`v ${vertex.x * scale} ${vertex.y * scale} ${vertex.z * scale}`);
          }
        }
        
        // Exporter les normales
        if (normalAttribute) {
          for (let i = 0; i < normalAttribute.count; i++) {
            normal.fromBufferAttribute(normalAttribute, i);
            normal.applyMatrix3(normalMatrix).normalize();
            normals.push(`vn ${normal.x} ${normal.y} ${normal.z}`);
          }
        }
        
        // Exporter les coordonnées UV
        if (uvAttribute) {
          for (let i = 0; i < uvAttribute.count; i++) {
            uv.fromBufferAttribute(uvAttribute as THREE.BufferAttribute, i);
            uvs.push(`vt ${uv.x} ${uv.y}`);
          }
        }
        
        // Exporter les faces
        if (indexAttribute) {
          // Géométrie indexée
          for (let i = 0; i < indexAttribute.count; i += 3) {
            const a = indexAttribute.getX(i) + indexVertex + 1;
            const b = indexAttribute.getX(i + 1) + indexVertex + 1;
            const c = indexAttribute.getX(i + 2) + indexVertex + 1;
            
            let face = `f ${a}`;
            if (uvAttribute) face += `/${a + indexVertexUvs}`;
            if (normalAttribute) face += `/${a + indexNormals}`;
            
            face += ` ${b}`;
            if (uvAttribute) face += `/${b + indexVertexUvs}`;
            if (normalAttribute) face += `/${b + indexNormals}`;
            
            face += ` ${c}`;
            if (uvAttribute) face += `/${c + indexVertexUvs}`;
            if (normalAttribute) face += `/${c + indexNormals}`;
            
            faces.push(face);
          }
        } else {
          // Géométrie non-indexée
          for (let i = 0; i < positionAttribute.count; i += 3) {
            const a = i + indexVertex + 1;
            const b = i + 1 + indexVertex + 1;
            const c = i + 2 + indexVertex + 1;
            
            let face = `f ${a}`;
            if (uvAttribute) face += `/${a + indexVertexUvs}`;
            if (normalAttribute) face += `/${a + indexNormals}`;
            
            face += ` ${b}`;
            if (uvAttribute) face += `/${b + indexVertexUvs}`;
            if (normalAttribute) face += `/${b + indexNormals}`;
            
            face += ` ${c}`;
            if (uvAttribute) face += `/${c + indexVertexUvs}`;
            if (normalAttribute) face += `/${c + indexNormals}`;
            
            faces.push(face);
          }
        }
        
        indexVertex += positionAttribute.count;
        if (normalAttribute) indexNormals += normalAttribute.count;
        if (uvAttribute) indexVertexUvs += uvAttribute.count;
      }
    };
    
    // Parcourir récursivement l'objet
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        parseMesh(child);
      }
    });
    
    // Construire le fichier OBJ final
    if (vertices.length > 0) {
      output += '# Vertices\n';
      output += vertices.join('\n') + '\n\n';
    }
    
    if (normals.length > 0) {
      output += '# Normals\n';
      output += normals.join('\n') + '\n\n';
    }
    
    if (uvs.length > 0) {
      output += '# Texture Coordinates\n';
      output += uvs.join('\n') + '\n\n';
    }
    
    if (faces.length > 0) {
      output += '# Faces\n';
      output += faces.join('\n') + '\n';
    }
    
    return output;
  }
  
  /**
   * Télécharge le fichier OBJ
   * @param object L'objet à exporter
   * @param filename Nom du fichier
   * @param scale Facteur d'échelle (1 = unités Three.js, utiliser 1 pour millimètres si l'objet est déjà en mm)
   */
  static download(object: THREE.Object3D, filename: string = 'model.obj', scale: number = 1): void {
    const objContent = this.export(object, scale);
    const blob = new Blob([objContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
  }
  
  /**
   * Exporte avec le fichier MTL (matériaux) associé
   */
  static exportWithMTL(object: THREE.Object3D): { obj: string; mtl: string } {
    const obj = this.export(object);
    
    // Générer le fichier MTL basique
    let mtl = '# MTL File exported from CAO-KISS\n';
    mtl += '# Created on ' + new Date().toISOString() + '\n\n';
    
    const materials = new Set<THREE.Material>();
    
    // Collecter tous les matériaux uniques
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => materials.add(mat));
        } else {
          materials.add(child.material);
        }
      }
    });
    
    // Exporter chaque matériau
    materials.forEach((material, index) => {
      const matName = material.name || `material_${index}`;
      mtl += `newmtl ${matName}\n`;
      
      if ('color' in material) {
        const color = (material as any).color;
        mtl += `Kd ${color.r} ${color.g} ${color.b}\n`;
      }
      
      if ('emissive' in material) {
        const emissive = (material as any).emissive;
        mtl += `Ke ${emissive.r} ${emissive.g} ${emissive.b}\n`;
      }
      
      if ('opacity' in material) {
        mtl += `d ${(material as any).opacity}\n`;
      }
      
      if ('metalness' in material) {
        mtl += `Ns ${(material as any).metalness * 1000}\n`;
      }
      
      mtl += '\n';
    });
    
    return { obj, mtl };
  }
  
  /**
   * Télécharge les fichiers OBJ et MTL
   */
  static downloadWithMTL(object: THREE.Object3D, basename: string = 'model'): void {
    const { obj, mtl } = this.exportWithMTL(object);
    
    // Télécharger le fichier OBJ
    const objBlob = new Blob([obj], { type: 'text/plain' });
    const objUrl = URL.createObjectURL(objBlob);
    const objLink = document.createElement('a');
    objLink.href = objUrl;
    objLink.download = `${basename}.obj`;
    objLink.click();
    
    // Télécharger le fichier MTL
    setTimeout(() => {
      const mtlBlob = new Blob([mtl], { type: 'text/plain' });
      const mtlUrl = URL.createObjectURL(mtlBlob);
      const mtlLink = document.createElement('a');
      mtlLink.href = mtlUrl;
      mtlLink.download = `${basename}.mtl`;
      mtlLink.click();
      
      URL.revokeObjectURL(objUrl);
      URL.revokeObjectURL(mtlUrl);
    }, 100);
  }
}