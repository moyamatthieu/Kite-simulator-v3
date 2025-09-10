import * as THREE from 'three';

export interface C_objetConfig {
    id?: string;
    name?: string;
    position?: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: THREE.Vector3;
    visible?: boolean;
    [key: string]: any; // Pour les propriétés spécifiques aux sous-classes
}

export const DefaultObjetConfig: C_objetConfig = {
    name: 'C_objet',
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    scale: new THREE.Vector3(1, 1, 1),
    visible: true,
};
