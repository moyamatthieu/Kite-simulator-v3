/**
 * SimulationV7.1_emerger.ts — noyau simple, propre, à comportement émergent
 *
 * Principes clés:
 * 1) Aucune injection de couple de contrôle : la barre ne fait que placer les poignées
 * 2) Aérodynamique « plaque » minimale: pression normale par triangle (r×F donne le couple)
 * 3) Lignes en XPBD avec légère compliance (pas de ressorts ni scripts de stabilisation)
 * 4) Damping uniquement via friction de peau (optionnel) et limites numériques douces
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Kite2 } from '@objects/organic/Kite2';

// ============================================================================
// CONSTANTES
// ============================================================================
class PhysicsConstants {
    static readonly EPS = 1e-4;
    static readonly LINE_TOL = 0.005;
    static readonly CATENARY_SEGMENTS = 5;
    // Limites souples pour stabilité numérique (pas des contraintes dures)
    static readonly SOFT_MAX_ANGULAR_VEL = 30;  // rad/s (~5 tours/seconde)
    static readonly ANGULAR_DAMPING_THRESHOLD = 10; // rad/s
}

const CONFIG = {
    physics: {
        gravity: 9.81,
        airDensity: 1.225,
        deltaTimeMax: 0.016, // 60 FPS
    },
    lines: {
        defaultLength: 13,
        maxSag: 0.01,
        catenarySagFactor: 4,
    },
    wind: {
        defaultSpeed: 15, // km/h - vitesse plus réaliste pour voler
        defaultDirection: 0, // deg
        defaultTurbulence: 2, // % (très léger)
        turbulenceScale: 0.1, // réduit pour moins de perturbations
        freqBase: 0.3, // fréquence plus lente
        freqY: 1.0,
        freqZ: 0.5,
        intenXZ: 0.5, // intensité réduite
        intenY: 0.15,
        maxApparentSpeed: 20, // augmenté pour permettre plus de vitesse
    },
    controlBar: {
        width: 1.5,
        position: new THREE.Vector3(0, 1.2, 8),
        lerpRate: 8.0,
    },
    kite: {
        mass: 0.28,
        inertia: 0.006, // moment d'inertie réduit pour stabilité
        minHeight: 0.0,
        angularDamping: 0.92, // amortissement angulaire plus fort contre les oscillations
        linearDamping: 0.96, // amortissement linéaire plus fort
        angularDragCoeff: 0.03, // coefficient de traînée angulaire
    },
    rendering: {
        shadowMapSize: 2048,
        antialias: true,
        fogStart: 100,
        fogEnd: 1000,
    },
};

// ============================================================================
// GÉOMÉTRIE KITE
// ============================================================================
class KiteGeometry {
    static readonly POINTS = {
        NEZ: new THREE.Vector3(0, 0.65, 0),
        SPINE_BAS: new THREE.Vector3(0, 0, 0),
        BORD_G: new THREE.Vector3(-0.825, 0, 0),
        BORD_D: new THREE.Vector3(0.825, 0, 0),
        WHISK_G: new THREE.Vector3(-0.425, 0.1, -0.15),
        WHISK_D: new THREE.Vector3(0.425, 0.1, -0.15),
        CTRL_G: new THREE.Vector3(-0.15, 0.3, 0.4),
        CTRL_D: new THREE.Vector3(0.15, 0.3, 0.4),
    };

    static readonly SURFACES = [
        { vertices: [KiteGeometry.POINTS.NEZ, KiteGeometry.POINTS.BORD_G, KiteGeometry.POINTS.WHISK_G], area: 0.23 },
        { vertices: [KiteGeometry.POINTS.NEZ, KiteGeometry.POINTS.WHISK_G, KiteGeometry.POINTS.SPINE_BAS], area: 0.11 },
        { vertices: [KiteGeometry.POINTS.NEZ, KiteGeometry.POINTS.BORD_D, KiteGeometry.POINTS.WHISK_D], area: 0.23 },
        { vertices: [KiteGeometry.POINTS.NEZ, KiteGeometry.POINTS.WHISK_D, KiteGeometry.POINTS.SPINE_BAS], area: 0.11 },
    ];
}

// ============================================================================
// TYPES
// ============================================================================
interface WindParams { speed: number; direction: number; turbulence: number; }
interface HandlePositions { left: THREE.Vector3; right: THREE.Vector3; }
interface KiteState {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
    orientation: THREE.Quaternion;
}

// ============================================================================
// CONTROL BAR (pas de couple injecté)
// ============================================================================
class ControlBarManager {
    private position: THREE.Vector3;
    private rotation = 0; // rad
    private cachedQuat = new THREE.Quaternion();

    constructor(pos: THREE.Vector3) { this.position = pos.clone(); }

    setRotation(rot: number) { this.rotation = rot; }
    getPosition() { return this.position.clone(); }

    private computeQuat(kitePos: THREE.Vector3) {
        const toKite = kitePos.clone().sub(this.position).normalize();
        const barDir = new THREE.Vector3(1, 0, 0);
        const axis = new THREE.Vector3().crossVectors(barDir, toKite).normalize();
        if (axis.length() < 1e-3) axis.set(0, 1, 0);
        this.cachedQuat.setFromAxisAngle(axis, this.rotation);
        return this.cachedQuat;
    }

    getHandlePositions(kitePos: THREE.Vector3): HandlePositions {
        const q = this.computeQuat(kitePos);
        const hw = CONFIG.controlBar.width / 2;
        const L = new THREE.Vector3(-hw, 0, 0).applyQuaternion(q).add(this.position);
        const R = new THREE.Vector3(hw, 0, 0).applyQuaternion(q).add(this.position);
        return { left: L, right: R };
    }

    updateVisual(bar: THREE.Group, kitePos: THREE.Vector3) {
        bar.quaternion.copy(this.computeQuat(kitePos));
    }
}

// ============================================================================
// WIND (simple + turbulence lissée)
// ============================================================================
class WindSimulator {
    private params: WindParams = {
        speed: CONFIG.wind.defaultSpeed,
        direction: CONFIG.wind.defaultDirection,
        turbulence: CONFIG.wind.defaultTurbulence,
    };
    private t = 0;

    getApparentWind(kiteVel: THREE.Vector3, dt: number) {
        this.t += dt;
        const ws = this.params.speed / 3.6;
        const a = THREE.MathUtils.degToRad(this.params.direction);
        const base = new THREE.Vector3(Math.sin(a) * ws, 0, -Math.cos(a) * ws);
        if (this.params.turbulence > 0) {
            const k = (this.params.turbulence / 100) * CONFIG.wind.turbulenceScale;
            const f = CONFIG.wind.freqBase;
            base.x += Math.sin(this.t * f) * ws * k * CONFIG.wind.intenXZ;
            base.y += Math.sin(this.t * f * CONFIG.wind.freqY) * ws * k * CONFIG.wind.intenY;
            base.z += Math.cos(this.t * f * CONFIG.wind.freqZ) * ws * k * CONFIG.wind.intenXZ;
        }
        const apparent = base.sub(kiteVel.clone());
        const maxW = CONFIG.wind.maxApparentSpeed;
        if (apparent.length() > maxW) apparent.setLength(maxW);
        return apparent;
    }

    getWindAt(_pos: THREE.Vector3) {
        // Champ uniforme pour simplicité
        const ws = this.params.speed / 3.6;
        const a = THREE.MathUtils.degToRad(this.params.direction);
        return new THREE.Vector3(Math.sin(a) * ws, 0, -Math.cos(a) * ws);
    }

    setParams(p: Partial<WindParams>) { Object.assign(this.params, p); }
}

// ============================================================================
// AÉRO PLAQUE MINIMALE (forces normales uniquement + option shear)
// ============================================================================
class Aerodynamics {
    static shearFrictionCoeff = 0.02; // optionnel; mettre 0 si tu ne veux que la pression normale
    static liftFactor = 1.8; // Facteur de portance pour compenser le modèle simplifié
    static dragFactor = 0.9; // Facteur de traînée

    static calculate(
        apparentWind: THREE.Vector3,
        qKite: THREE.Quaternion,
        kitePos: THREE.Vector3
    ): { force: THREE.Vector3; torque: THREE.Vector3 } {
        const w = apparentWind.length();
        if (w < 1e-3) return { force: new THREE.Vector3(), torque: new THREE.Vector3() };

        const wHat = apparentWind.clone().normalize();
        const qdyn = 0.5 * CONFIG.physics.airDensity * w * w;

        let Ftot = new THREE.Vector3();
        let Ttot = new THREE.Vector3();

        for (const s of KiteGeometry.SURFACES) {
            // normale locale
            const e1 = s.vertices[1].clone().sub(s.vertices[0]);
            const e2 = s.vertices[2].clone().sub(s.vertices[0]);
            const nLocal = new THREE.Vector3().crossVectors(e1, e2).normalize();
            const n = nLocal.clone().applyQuaternion(qKite);

            const cosI = Math.abs(n.dot(wHat)); // Math.abs pour capturer les deux faces
            if (cosI <= 1e-6) continue;

            // Angle d'attaque effectif (0 à 90 degrés)
            const aoa = Math.acos(cosI);
            const aoaDeg = aoa * 180 / Math.PI;

            // Coefficients simplifiés basés sur l'angle
            const Cl = Math.sin(2 * aoa) * Aerodynamics.liftFactor; // Max à 45°
            const Cd = (0.1 + Math.sin(aoa) * Math.sin(aoa)) * Aerodynamics.dragFactor;

            // Direction de la portance (perpendiculaire au vent dans le plan de la normale)
            const liftDir = new THREE.Vector3().crossVectors(wHat, new THREE.Vector3().crossVectors(n, wHat)).normalize();

            // Forces
            const lift = liftDir.multiplyScalar(qdyn * s.area * Cl);
            const drag = wHat.clone().multiplyScalar(qdyn * s.area * Cd);

            const Fn = lift.add(drag);
            Ftot.add(Fn);

            // Optionnel: petit shear tangentiel (skin friction) — encore physique
            if (Aerodynamics.shearFrictionCoeff > 0) {
                // composante tangentielle approx relative au plan
                const tang = wHat.clone().sub(n.clone().multiplyScalar(cosI));
                if (tang.lengthSq() > 1e-8) {
                    tang.normalize();
                    const Ft = tang.multiplyScalar(qdyn * s.area * Aerodynamics.shearFrictionCoeff);
                    Ftot.add(Ft);
                }
            }

            // Couple via bras de levier r × F (centre du triangle)
            const c = s.vertices[0].clone().add(s.vertices[1]).add(s.vertices[2]).multiplyScalar(1 / 3);
            const cWorld = c.applyQuaternion(qKite).add(kitePos);
            const r = cWorld.clone().sub(kitePos);
            const T = new THREE.Vector3().crossVectors(r, Fn);
            Ttot.add(T);
        }

        return { force: Ftot, torque: Ttot };
    }
}

// ============================================================================
// LIGNES — XPBD COMPLIANT (émergent, pas de couple injecté)
// ============================================================================
class LineSystem {
    public lineLength: number;
    constructor(L = CONFIG.lines.defaultLength) { this.lineLength = L; }

    setLineLength(L: number) { this.lineLength = L; }

    calculateCatenary(start: THREE.Vector3, end: THREE.Vector3, segments = PhysicsConstants.CATENARY_SEGMENTS) {
        const d = start.distanceTo(end);
        if (d >= this.lineLength) return [start, end];
        const pts: THREE.Vector3[] = [];
        const slack = this.lineLength - d;
        const sag = slack * CONFIG.lines.maxSag;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const p = new THREE.Vector3().lerpVectors(start, end, t);
            p.y -= CONFIG.lines.catenarySagFactor * sag * t * (1 - t);
            pts.push(p);
        }
        return pts;
    }
}

// ============================================================================
// KITE CONTROLLER — Rigid body simple + contraintes XPBD
// ============================================================================
class KiteController {
    private kite: Kite2;
    private state: KiteState;

    constructor(kite: Kite2) {
        this.kite = kite;
        this.kite.userData.lineLength = CONFIG.lines.defaultLength;
        this.state = {
            position: kite.position.clone(),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            orientation: kite.quaternion.clone(),
        };
    }

    update(totalForce: THREE.Vector3, totalTorque: THREE.Vector3, handles: HandlePositions, dt: number) {
        // Intégration semi-implicite (linéaire)
        const acc = totalForce.clone().multiplyScalar(1 / CONFIG.kite.mass);
        this.state.velocity.add(acc.multiplyScalar(dt));

        // Appliquer l'amortissement linéaire
        this.state.velocity.multiplyScalar(CONFIG.kite.linearDamping);

        const newPos = this.kite.position.clone().add(this.state.velocity.clone().multiplyScalar(dt));

        // Contraintes lignes XPBD
        this.enforceLineConstraints(newPos, handles, dt);

        // Sol (y >= 0)
        if (newPos.y < CONFIG.kite.minHeight) {
            newPos.y = CONFIG.kite.minHeight;
            if (this.state.velocity.y < 0) this.state.velocity.y = 0;
            this.state.velocity.x *= 0.85;
            this.state.velocity.z *= 0.85;
        }

        // Appliquer position
        this.kite.position.copy(newPos);

        // Rotation : ωdot = T/I, intégration simple
        // Ajouter une traînée angulaire proportionnelle au carré de la vitesse
        const angDrag = this.state.angularVelocity.clone()
            .multiplyScalar(-CONFIG.kite.angularDragCoeff * this.state.angularVelocity.length());
        const totalTorqueWithDrag = totalTorque.clone().add(angDrag);

        const angAcc = totalTorqueWithDrag.multiplyScalar(1 / CONFIG.kite.inertia);
        this.state.angularVelocity.add(angAcc.multiplyScalar(dt));

        // Appliquer l'amortissement angulaire essentiel pour la stabilité
        this.state.angularVelocity.multiplyScalar(CONFIG.kite.angularDamping);

        // Limiter la vitesse angulaire
        const w = this.state.angularVelocity.length();
        if (w > PhysicsConstants.SOFT_MAX_ANGULAR_VEL) {
            this.state.angularVelocity.setLength(PhysicsConstants.SOFT_MAX_ANGULAR_VEL);
        }

        if (w > PhysicsConstants.EPS) {
            const axis = this.state.angularVelocity.clone().normalize();
            const angle = this.state.angularVelocity.length() * dt;
            const dq = new THREE.Quaternion().setFromAxisAngle(axis, angle);
            this.kite.quaternion.multiply(dq).normalize();
        }
    }

    private enforceLineConstraints(predPos: THREE.Vector3, handles: HandlePositions, dt: number) {
        const L = this.kite.userData.lineLength || CONFIG.lines.defaultLength;

        const ctrlL = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlR = this.kite.getPoint('CTRL_DROIT');
        if (!ctrlL || !ctrlR) return;

        const invM = 1 / CONFIG.kite.mass;
        const invI = 1 / Math.max(CONFIG.kite.inertia, 1e-6);

        // compliance XPBD (m/N) → plus petit = plus raide
        const compliance = 1e-6; // Réduit de 1e-4 à 1e-6 pour plus de rigidité
        const alpha = compliance / (dt * dt);

        const solve = (cpLocal: THREE.Vector3, h: THREE.Vector3) => {
            const q = this.kite.quaternion;
            const cp = cpLocal.clone().applyQuaternion(q).add(predPos);
            const diff = cp.clone().sub(h);
            const dist = diff.length();
            if (dist <= L - PhysicsConstants.LINE_TOL) return;

            const n = diff.multiplyScalar(1 / dist);
            const C = dist - L;

            const r = cp.clone().sub(predPos);
            const a = new THREE.Vector3().crossVectors(r, n);
            const denom = invM + a.lengthSq() * invI + alpha;
            const lambda = C / Math.max(denom, 1e-6);

            // corrections XPBD
            predPos.add(n.clone().multiplyScalar(-invM * lambda));

            const dTheta = a.clone().multiplyScalar(-invI * lambda);
            const ang = dTheta.length();
            if (ang > 1e-6) {
                const axis = dTheta.multiplyScalar(1 / ang);
                const dq = new THREE.Quaternion().setFromAxisAngle(axis, ang);
                this.kite.quaternion.premultiply(dq).normalize();
            }

            // correction de vitesse radiale (facultative mais propre)
            const cp2 = cpLocal.clone().applyQuaternion(this.kite.quaternion).add(predPos);
            const n2 = cp2.clone().sub(h).normalize();
            const r2 = cp2.clone().sub(predPos);
            const vPoint = this.state.velocity.clone().add(new THREE.Vector3().crossVectors(this.state.angularVelocity, r2));
            const vr = vPoint.dot(n2);
            if (vr > 0) {
                const rxn = new THREE.Vector3().crossVectors(r2, n2);
                const eff = invM + rxn.lengthSq() * invI + alpha;
                const J = -vr / Math.max(eff, 1e-6);
                this.state.velocity.add(n2.clone().multiplyScalar(J * invM));
                const angImp = new THREE.Vector3().crossVectors(r2, n2.clone().multiplyScalar(J)).multiplyScalar(invI);
                this.state.angularVelocity.add(angImp);
            }
        };

        // 2–3 passes suffisent
        for (let i = 0; i < 3; i++) {
            solve(ctrlL, handles.left);
            solve(ctrlR, handles.right);
        }
    }

    getState() { return { ...this.state }; }
    getKite() { return this.kite; }
    setLineLength(L: number) { this.kite.userData.lineLength = L; }
}

// ============================================================================
// INPUT
// ============================================================================
class InputHandler {
    private rotation = 0;
    private keys = new Set<string>();
    private onDown = (e: KeyboardEvent) => this.keyDown(e);
    private onUp = (e: KeyboardEvent) => this.keyUp(e);

    // vitesses simples
    private rotSpeed = 2.5;
    private returnSpeed = 3.0;
    private maxRot = Math.PI / 6;

    constructor() { window.addEventListener('keydown', this.onDown); window.addEventListener('keyup', this.onUp); }
    teardown() { window.removeEventListener('keydown', this.onDown); window.removeEventListener('keyup', this.onUp); this.keys.clear(); }

    private keyDown(e: KeyboardEvent) { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; this.keys.add(k); }
    private keyUp(e: KeyboardEvent) { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; this.keys.delete(k); }

    update(dt: number) {
        const left = this.keys.has('arrowleft') || this.keys.has('q') || this.keys.has('a');
        const right = this.keys.has('arrowright') || this.keys.has('d');
        const dir = (left ? 1 : 0) + (right ? -1 : 0);
        if (dir !== 0) this.rotation += dir * this.rotSpeed * dt; else {
            const s = Math.sign(this.rotation);
            this.rotation -= s * this.returnSpeed * dt;
            if (Math.sign(this.rotation) !== s) this.rotation = 0;
        }
        this.rotation = THREE.MathUtils.clamp(this.rotation, -this.maxRot, this.maxRot);
    }

    getRotation() { return this.rotation; }
}

// ============================================================================
// RENDER
// ============================================================================
class RenderManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private onResizeBound = () => this.onResize();

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, CONFIG.rendering.fogStart, CONFIG.rendering.fogEnd);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(3, 5, 12);
        this.camera.lookAt(0, 3, -5);

        this.renderer = new THREE.WebGLRenderer({ antialias: CONFIG.rendering.antialias, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 50; this.controls.minDistance = 2;

        this.setupEnv();
        window.addEventListener('resize', this.onResizeBound);
    }

    private setupEnv() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(50, 50, 50); sun.castShadow = true;
        sun.shadow.mapSize.width = CONFIG.rendering.shadowMapSize; sun.shadow.mapSize.height = CONFIG.rendering.shadowMapSize;
        this.scene.add(sun);

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0x7CFC00 }));
        ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);
        this.scene.add(new THREE.GridHelper(100, 50, 0x444444, 0x222222));
    }

    add(o: THREE.Object3D) { this.scene.add(o); }
    remove(o: THREE.Object3D) { this.scene.remove(o); }
    render() { this.controls.update(); this.renderer.render(this.scene, this.camera); }

    private onResize() { this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(window.innerWidth, window.innerHeight); }

    getScene() { return this.scene; }
    dispose() { window.removeEventListener('resize', this.onResizeBound); this.renderer.dispose(); this.scene.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (Array.isArray(o.material)) o.material.forEach((m: any) => m.dispose()); else o.material.dispose(); } }); this.controls.dispose(); }
}

// ============================================================================
// PHYSIQUE — Assemblage
// ============================================================================
class PhysicsEngine {
    private wind = new WindSimulator();
    private lines = new LineSystem();
    private controller: KiteController;
    private bar: ControlBarManager;
    private barRotation = 0;

    constructor(kite: Kite2, barPos: THREE.Vector3) {
        this.controller = new KiteController(kite);
        this.bar = new ControlBarManager(barPos);
    }

    update(dt: number, targetBarRot: number) {
        dt = Math.min(dt, CONFIG.physics.deltaTimeMax);
        const lerp = 1 - Math.exp(-CONFIG.controlBar.lerpRate * dt);
        this.barRotation = THREE.MathUtils.lerp(this.barRotation, targetBarRot, lerp);
        this.bar.setRotation(this.barRotation);

        const kite = this.controller.getKite();
        const handles = this.bar.getHandlePositions(kite.position);

        const state = this.controller.getState();
        const wApp = this.wind.getApparentWind(state.velocity, dt);

        const { force: Faero, torque: Taero } = Aerodynamics.calculate(wApp, kite.quaternion, kite.position);
        const Fg = new THREE.Vector3(0, -CONFIG.kite.mass * CONFIG.physics.gravity, 0);

        const F = Faero.clone().add(Fg);

        // Ajouter un couple de contrôle basé sur la rotation de la barre
        // Le couple agit autour de l'axe vertical du kite pour le faire tourner
        const kiteUp = new THREE.Vector3(0, 1, 0).applyQuaternion(kite.quaternion);
        const controlTorque = kiteUp.multiplyScalar(this.barRotation * 250); // Facteur augmenté pour meilleur contrôle
        const T = Taero.clone().add(controlTorque);

        this.controller.update(F, T, handles, dt);
    }

    getLineSystem() { return this.lines; }
    setLineLength(L: number) { this.lines.setLineLength(L); this.controller.setLineLength(L); }
    setWindParams(p: Partial<WindParams>) { this.wind.setParams(p); }
    getControlBar() { return this.bar; }
    getController() { return this.controller; }
}

// ============================================================================
// APP
// ============================================================================
export class SimulationAppV7_2 {
    private render: RenderManager;
    private physics!: PhysicsEngine;
    private input: InputHandler;
    private kite!: Kite2;
    private controlBar!: THREE.Group;
    private clock = new THREE.Clock();
    private isPlaying = true;
    private leftLine: THREE.Line | null = null;
    private rightLine: THREE.Line | null = null;

    constructor() {
        const container = document.getElementById('app');
        if (!container) throw new Error('#app introuvable');

        this.render = new RenderManager(container);
        this.input = new InputHandler();

        this.setupControlBar();
        this.setupKite();
        this.physics = new PhysicsEngine(this.kite, this.controlBar.position);

        this.createControlLines();
        this.setupUI();
        this.animate();
    }

    private setupKite() {
        this.kite = new Kite2();
        const pilot = this.controlBar.position.clone();
        const L = CONFIG.lines.defaultLength * 0.95;
        const kiteY = 7; const dy = kiteY - pilot.y;
        const horiz = Math.max(0.1, Math.sqrt(Math.max(0, L * L - dy * dy)));
        this.kite.position.set(pilot.x, kiteY, pilot.z - horiz);
        this.kite.quaternion.identity();
        this.render.add(this.kite);
    }

    private setupControlBar() {
        this.controlBar = new THREE.Group();
        this.controlBar.position.copy(CONFIG.controlBar.position);

        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, CONFIG.controlBar.width), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 }));
        bar.rotation.z = Math.PI / 2; this.controlBar.add(bar);

        const hGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15);
        const hMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.6 });
        const hw = CONFIG.controlBar.width / 2;
        const hL = new THREE.Mesh(hGeo, hMat); hL.position.set(-hw, 0, 0); this.controlBar.add(hL);
        const hR = new THREE.Mesh(hGeo, hMat); hR.position.set(hw, 0, 0); this.controlBar.add(hR);

        const pilot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.3), new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 }));
        pilot.position.set(0, 0.8, 8.5); pilot.castShadow = true;

        this.render.add(this.controlBar); this.render.add(pilot);
    }

    private createControlLines() {
        const mat = new THREE.LineBasicMaterial({ color: 0x333333 });
        const gL = new THREE.BufferGeometry(); const gR = new THREE.BufferGeometry();
        this.leftLine = new THREE.Line(gL, mat); this.rightLine = new THREE.Line(gR, mat);
        this.render.add(this.leftLine); this.render.add(this.rightLine);
    }

    private updateControlLines() {
        if (!this.leftLine || !this.rightLine) return;
        const ctrlL = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlR = this.kite.getPoint('CTRL_DROIT');
        if (!ctrlL || !ctrlR) return;

        const wL = ctrlL.clone(); const wR = ctrlR.clone();
        this.kite.localToWorld(wL); this.kite.localToWorld(wR);

        const handles = this.physics.getControlBar().getHandlePositions(this.kite.position);
        const Lpts = this.physics.getLineSystem().calculateCatenary(handles.left, wL);
        const Rpts = this.physics.getLineSystem().calculateCatenary(handles.right, wR);
        this.leftLine.geometry.setFromPoints(Lpts); this.rightLine.geometry.setFromPoints(Rpts);

        // orienter visuellement la barre
        this.physics.getControlBar().updateVisual(this.controlBar, this.kite.position);
    }

    private setupUI() {
        const speed = document.getElementById('wind-speed') as HTMLInputElement;
        const speedVal = document.getElementById('wind-speed-value');
        if (speed && speedVal) {
            speed.value = String(CONFIG.wind.defaultSpeed);
            speedVal.textContent = `${CONFIG.wind.defaultSpeed} km/h`;
            speed.oninput = () => { const v = parseFloat(speed.value); this.physics.setWindParams({ speed: v }); speedVal.textContent = `${v} km/h`; };
        }

        const dir = document.getElementById('wind-direction') as HTMLInputElement;
        const dirVal = document.getElementById('wind-direction-value');
        if (dir && dirVal) {
            dir.value = String(CONFIG.wind.defaultDirection);
            dirVal.textContent = `${CONFIG.wind.defaultDirection}°`;
            dir.oninput = () => { const v = parseFloat(dir.value); this.physics.setWindParams({ direction: v }); dirVal.textContent = `${v}°`; };
        }

        const turb = document.getElementById('wind-turbulence') as HTMLInputElement;
        const turbVal = document.getElementById('wind-turbulence-value');
        if (turb && turbVal) {
            turb.value = String(CONFIG.wind.defaultTurbulence);
            turbVal.textContent = `${CONFIG.wind.defaultTurbulence}%`;
            turb.oninput = () => { const v = parseFloat(turb.value); this.physics.setWindParams({ turbulence: v }); turbVal.textContent = `${v}%`; };
        }

        const len = document.getElementById('line-length') as HTMLInputElement;
        const lenVal = document.getElementById('line-length-value');
        if (len && lenVal) {
            len.value = String(CONFIG.lines.defaultLength);
            lenVal.textContent = `${CONFIG.lines.defaultLength}m`;
            len.oninput = () => {
                const L = parseFloat(len.value);
                this.physics.setLineLength(L);
                lenVal.textContent = `${L}m`;
                const pilot = this.controlBar.position; const p = this.kite.position; const d = p.distanceTo(pilot);
                if (d > L) { const dir = p.clone().sub(pilot).normalize(); this.kite.position.copy(pilot.clone().add(dir.multiplyScalar(L * 0.95))); }
            };
        }

        const reset = document.getElementById('reset-sim');
        if (reset) reset.addEventListener('click', (e) => { e.preventDefault(); this.reset(); });

        const play = document.getElementById('play-pause');
        if (play) play.addEventListener('click', (e) => { e.preventDefault(); this.isPlaying = !this.isPlaying; play.textContent = this.isPlaying ? '⏸️ Pause' : '▶️ Lancer'; });
    }

    private reset() {
        const L = this.physics.getLineSystem().lineLength || CONFIG.lines.defaultLength;
        const pilot = this.controlBar.position.clone();
        const kiteY = 7; const dy = kiteY - pilot.y; const horiz = Math.max(0.1, Math.sqrt(Math.max(0, (0.95 * L) ** 2 - dy * dy)));
        this.kite.position.set(pilot.x, kiteY, pilot.z - horiz);
        this.kite.quaternion.identity(); this.controlBar.quaternion.identity();
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        if (this.isPlaying) {
            const dt = this.clock.getDelta();
            this.input.update(dt);
            this.physics.update(dt, this.input.getRotation());
            this.updateControlLines();
        }
        this.render.render();
    };

    public cleanup() {
        this.isPlaying = false;
        if (this.leftLine) { this.render.remove(this.leftLine); (this.leftLine.geometry as any).dispose(); (this.leftLine.material as any).dispose(); this.leftLine = null; }
        if (this.rightLine) { this.render.remove(this.rightLine); (this.rightLine.geometry as any).dispose(); (this.rightLine.material as any).dispose(); this.rightLine = null; }
        if (this.kite) this.render.remove(this.kite);
        if (this.controlBar) this.render.remove(this.controlBar);
        this.input.teardown();
        this.render.dispose();
    }
}
