/**
 * Interfaces séparées pour respecter l'Interface Segregation Principle (ISP)
 * Remplace l'interface monolithique IGodotLifecycle
 */

/**
 * Interface pour les objets qui peuvent être initialisés
 */
export interface IInitializable {
  _ready(): void;
}

/**
 * Interface pour les objets qui peuvent être mis à jour chaque frame
 */
export interface IUpdateable {
  _process(delta: number): void;
}

/**
 * Interface pour les objets qui participent à la simulation physique
 */
export interface IPhysicsProcessable {
  _physics_process(delta: number): void;
}

/**
 * Interface pour les objets qui peuvent être disposés/nettoyés
 */
export interface IDisposable {
  dispose(): void;
}

/**
 * Interface pour les objets qui supportent les signaux
 */
export interface ISignalEmitter {
  define_signal(name: string): void;
  emit_signal(name: string, ...args: any[]): void;
  connect(signal: string, target: any, method: string): void;
}

/**
 * Interface pour la gestion hiérarchique des nodes
 */
export interface ITreeManageable {
  add_child(child: ITreeNode): void;
  remove_child(child: ITreeNode): void;
  get_node(path: string): ITreeNode | null;
  get_parent(): ITreeNode | null;
  get_children(): readonly ITreeNode[];
}

/**
 * Interface de base pour un node dans l'arbre
 */
export interface ITreeNode {
  readonly nodeId: string;
  readonly name: string;
  readonly nodeType: string;
}

/**
 * Interface pour les transformations 3D
 */
export interface ITransformable {
  readonly transform: ITransform3D;
}

export interface ITransform3D {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

/**
 * Interface pour les objets qui peuvent être décrits/debuggués
 */
export interface IDebuggable {
  get_description(): string;
  print_tree?(indent?: number): void;
}