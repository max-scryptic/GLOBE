declare module "three" {
  export class Material {}
  export class MeshBasicMaterial extends Material {
    constructor(parameters?: { color?: string });
  }

  export class Camera {}
  export class Light {}
  export class Object3D {}
  export class Scene {}
  export class Texture {}
  export class WebGLRenderer {}
}

declare module "three/examples/jsm/controls/OrbitControls.js" {
  export class OrbitControls {
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableZoom: boolean;
  }
}

declare module "three/examples/jsm/postprocessing/EffectComposer.js" {
  export class EffectComposer {}
}
