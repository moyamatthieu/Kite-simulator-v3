/**
 * Test script pour diagnostiquer le problème du cube
 */
import { Cube } from './src/objects/shapes/Cube';
import * as THREE from 'three';

// Créer une scène de test
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a1a2e');

// Créer une caméra
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10);
camera.position.set(0.1, 0.1, 0.1);

// Créer un renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Créer le cube
console.log('🚀 Creating test cube...');
const cube = new Cube(20, false); // 20mm, mode visualisation

// Ajouter le cube à la scène
scene.add(cube);

// Centrer la caméra sur le cube
const box = new THREE.Box3().setFromObject(cube);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
const maxSize = Math.max(size.x, size.y, size.z);
const distance = Math.max(maxSize * 3, 0.05);

camera.position.copy(center);
camera.position.y += distance * 0.3;
camera.position.z += distance;
camera.lookAt(center);

console.log('📦 Cube bounding box:', {
    center: center.toArray(),
    size: size.toArray(),
    maxSize: maxSize,
    distance: distance,
    cameraPosition: camera.position.toArray()
});

// Fonction d'animation
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

console.log('🎮 Test scene ready - Check browser console for cube creation logs');
