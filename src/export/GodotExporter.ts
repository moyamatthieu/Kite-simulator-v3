/**
 * GodotExporter.ts - Export vers Godot Engine
 * Génère des fichiers .tscn compatibles avec Godot
 */

import { StructuredObject } from '@core/StructuredObject';
import { Node3D } from '@core/Node3D';
import * as THREE from 'three';

export interface GodotExportOptions {
    includeDebugPoints?: boolean;
    optimizeGeometry?: boolean;
    exportMaterials?: boolean;
    format?: 'tscn' | 'json';
}

/**
 * Exporte des objets StructuredObject vers Godot
 */
export class GodotExporter {
    
    /**
     * Exporte un StructuredObject vers un fichier .tscn Godot
     */
    public static exportToTSCN(
        object: StructuredObject, 
        options: GodotExportOptions = {}
    ): string {
        const opts = {
            includeDebugPoints: false,
            optimizeGeometry: true,
            exportMaterials: true,
            format: 'tscn' as const,
            ...options
        };
        
        let tscn = '[gd_scene load_steps=1 format=3]\n\n';
        
        // Nœud racine
        tscn += `[node name="${object.name}" type="Node3D"]\n`;
        
        // Exporter tous les enfants
        let nodeIndex = 1;
        tscn += this.exportNode3DChildren(object, nodeIndex, '');
        
        return tscn;
    }
    
    /**
     * Exporte les enfants d'un Node3D récursivement
     */
    private static exportNode3DChildren(
        node: Node3D, 
        nodeIndex: number, 
        parentPath: string
    ): string {
        let tscn = '';
        
        node.children.forEach((child, index) => {
            if (child instanceof THREE.Mesh) {
                // Mesh → MeshInstance3D
                const nodeName = child.name || `Mesh_${nodeIndex}`;
                const nodePath = parentPath ? `${parentPath}/${nodeName}` : nodeName;
                
                tscn += `\n[node name="${nodeName}" type="MeshInstance3D"`;
                if (parentPath) {
                    tscn += ` parent="${parentPath}"`;
                }
                tscn += ']\n';
                
                // Transform
                const pos = child.position;
                const rot = child.rotation;
                const scale = child.scale;
                
                if (!pos.equals(new THREE.Vector3(0, 0, 0))) {
                    tscn += `transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, ${pos.x}, ${pos.y}, ${pos.z})\n`;
                }
                
                // Géométrie → Mesh Resource
                tscn += this.exportGeometry(child.geometry);
                
                // Matériau
                if (child.material) {
                    tscn += this.exportMaterial(child.material as THREE.MeshStandardMaterial);
                }
                
                nodeIndex++;
                
            } else if (child instanceof Node3D) {
                // Node3D → Node3D
                const nodeName = child.name || `Node3D_${nodeIndex}`;
                const nodePath = parentPath ? `${parentPath}/${nodeName}` : nodeName;
                
                tscn += `\n[node name="${nodeName}" type="Node3D"`;
                if (parentPath) {
                    tscn += ` parent="${parentPath}"`;
                }
                tscn += ']\n';
                
                // Transform
                const pos = child.position;
                if (!pos.equals(new THREE.Vector3(0, 0, 0))) {
                    tscn += `transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, ${pos.x}, ${pos.y}, ${pos.z})\n`;
                }
                
                // Récursion pour les enfants
                tscn += this.exportNode3DChildren(child, nodeIndex + 1, nodePath);
                
                nodeIndex++;
            }
        });
        
        return tscn;
    }
    
    /**
     * Exporte une géométrie Three.js vers Godot
     */
    private static exportGeometry(geometry: THREE.BufferGeometry): string {
        let meshData = '';
        
        if (geometry instanceof THREE.BoxGeometry) {
            // BoxGeometry → BoxMesh
            const params = geometry.parameters;
            meshData += `mesh = SubResource("BoxMesh_1")\n`;
            meshData += `\n[sub_resource type="BoxMesh" id="BoxMesh_1"]\n`;
            meshData += `size = Vector3(${params.width}, ${params.height}, ${params.depth})\n`;
            
        } else if (geometry instanceof THREE.SphereGeometry) {
            // SphereGeometry → SphereMesh
            const params = geometry.parameters;
            meshData += `mesh = SubResource("SphereMesh_1")\n`;
            meshData += `\n[sub_resource type="SphereMesh" id="SphereMesh_1"]\n`;
            meshData += `radius = ${params.radius}\n`;
            meshData += `height = ${params.radius * 2}\n`;
            
        } else if (geometry instanceof THREE.CylinderGeometry) {
            // CylinderGeometry → CylinderMesh
            const params = geometry.parameters;
            meshData += `mesh = SubResource("CylinderMesh_1")\n`;
            meshData += `\n[sub_resource type="CylinderMesh" id="CylinderMesh_1"]\n`;
            meshData += `top_radius = ${params.radiusTop}\n`;
            meshData += `bottom_radius = ${params.radiusBottom}\n`;
            meshData += `height = ${params.height}\n`;
            
        } else if (geometry instanceof THREE.ConeGeometry) {
            // ConeGeometry → CylinderMesh (avec top_radius = 0)
            const params = geometry.parameters;
            meshData += `mesh = SubResource("CylinderMesh_1")\n`;
            meshData += `\n[sub_resource type="CylinderMesh" id="CylinderMesh_1"]\n`;
            meshData += `top_radius = 0\n`;
            meshData += `bottom_radius = ${params.radius}\n`;
            meshData += `height = ${params.height}\n`;
            
        } else {
            // Géométrie générique → ArrayMesh
            meshData += `mesh = SubResource("ArrayMesh_1")\n`;
            meshData += `\n[sub_resource type="ArrayMesh" id="ArrayMesh_1"]\n`;
            // TODO: Exporter les vertices/faces pour géométries custom
        }
        
        return meshData;
    }
    
    /**
     * Exporte un matériau Three.js vers Godot
     */
    private static exportMaterial(material: THREE.MeshStandardMaterial): string {
        let materialData = `material_override = SubResource("StandardMaterial3D_1")\n`;
        materialData += `\n[sub_resource type="StandardMaterial3D" id="StandardMaterial3D_1"]\n`;
        
        // Couleur
        if (material.color) {
            const color = material.color;
            materialData += `albedo_color = Color(${color.r}, ${color.g}, ${color.b}, 1)\n`;
        }
        
        // Propriétés PBR
        if (material.metalness !== undefined) {
            materialData += `metallic = ${material.metalness}\n`;
        }
        
        if (material.roughness !== undefined) {
            materialData += `roughness = ${material.roughness}\n`;
        }
        
        // Transparence
        if (material.transparent && material.opacity < 1) {
            materialData += `transparency = 1\n`; // TRANSPARENCY_ALPHA
            materialData += `albedo_color = Color(${material.color.r}, ${material.color.g}, ${material.color.b}, ${material.opacity})\n`;
        }
        
        return materialData;
    }
    
    /**
     * Exporte la structure de points anatomiques comme commentaires
     */
    public static exportPointsStructure(object: StructuredObject): string {
        let pointsDoc = '\n# Points anatomiques:\n';
        
        object.getPointNames().forEach(pointName => {
            const pointInfo = object.getPointInfo(pointName);
            if (pointInfo) {
                const pos = pointInfo.position;
                pointsDoc += `# ${pointName}: (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})\n`;
            }
        });
        
        return pointsDoc;
    }
    
    /**
     * Télécharge le fichier .tscn
     */
    public static downloadTSCN(object: StructuredObject, filename?: string): void {
        const tscnContent = this.exportToTSCN(object);
        const pointsStructure = this.exportPointsStructure(object);
        const fullContent = tscnContent + pointsStructure;
        
        const blob = new Blob([fullContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `${object.name.toLowerCase()}.tscn`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
}
