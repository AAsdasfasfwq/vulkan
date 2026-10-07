import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, DepthOfFieldEffect, KernelSize } from 'postprocessing';
import { MotionBlurEffect, GradeEffect, LensEffect } from '../fx/effects.js';
import { evalCamera, makeCamState } from './camera.js';
import { clamp, lerp } from './math.js';
import { FPS } from './transcript.js';

// Grades: [contrast, saturation, lift, gamma, gain, shadowTint, highTint, vignette, grain]
export const GRADES = {
  film: { contrast: 1.06, saturation: 1.12, lift: [0.0, 0.004, 0.012], gamma: [1, 1, 1], gain: [1.0, 0.99, 0.97], sh: [-0.004, 0.004, 0.016], hi: [0.018, 0.008, -0.01], vignette: 0.38, grain: 0.03 },
  tropical: { contrast: 1.08, saturation: 1.12, lift: [0, 0.006, 0.012], gamma: [1, 1.01, 1], gain: [1.0, 1.0, 0.98], sh: [-0.006, 0.008, 0.018], hi: [0.02, 0.012, -0.012], vignette: 0.32, grain: 0.028 },
  warm: { contrast: 1.08, saturation: 1.12, lift: [0.01, 0.004, 0.0], gamma: [1.02, 1, 0.97], gain: [1.03, 0.99, 0.93], sh: [0.0, -0.002, 0.01], hi: [0.025, 0.01, -0.02], vignette: 0.42, grain: 0.034 },
  fire: { contrast: 1.12, saturation: 1.15, lift: [0.012, 0.002, 0.0], gamma: [1.03, 0.98, 0.95], gain: [1.04, 0.96, 0.88], sh: [0.006, -0.004, 0.004], hi: [0.03, 0.006, -0.03], vignette: 0.5, grain: 0.04 },
  night: { contrast: 1.08, saturation: 1.05, lift: [0.0, 0.006, 0.02], gamma: [0.98, 1, 1.04], gain: [0.96, 0.99, 1.04], sh: [-0.006, 0.0, 0.02], hi: [0.01, 0.0, -0.01], vignette: 0.5, grain: 0.04 },
  ash: { contrast: 1.1, saturation: 0.82, lift: [0.006, 0.006, 0.006], gamma: [1, 1, 1], gain: [1.0, 0.98, 0.95], sh: [0.0, 0.0, 0.004], hi: [0.012, 0.004, -0.012], vignette: 0.5, grain: 0.045 },
  cold: { contrast: 1.05, saturation: 0.95, lift: [0.0, 0.006, 0.016], gamma: [0.98, 1, 1.03], gain: [0.96, 1.0, 1.04], sh: [-0.008, 0.002, 0.018], hi: [-0.004, 0.006, 0.012], vignette: 0.38, grain: 0.032 },
  clean: { contrast: 1.03, saturation: 1.05, lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], sh: [0, 0, 0], hi: [0, 0, 0], vignette: 0.18, grain: 0.012 },
  space: { contrast: 1.08, saturation: 1.1, lift: [0, 0.002, 0.008], gamma: [1, 1, 1], gain: [1, 1, 1.02], sh: [-0.004, 0, 0.012], hi: [0.01, 0.006, 0], vignette: 0.42, grain: 0.025 },
};

export class Engine {
  constructor(opts) {
    this.width = opts.width;
    this.height = opts.height;
    this.glCanvas = document.createElement('canvas');
    this.glCanvas.width = this.width;
    this.glCanvas.height = this.height;
    const renderer = new THREE.WebGLRenderer({
      canvas: this.glCanvas,
      antialias: false,
      alpha: false,
      stencil: false,
      depth: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.setSize(this.width, this.height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.5, 60000);
    this.prevCamera = this.camera.clone();
    this.emptyScene = new THREE.Scene();

    const composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: opts.msaa ?? 4,
    });
    this.renderPass = new RenderPass(this.emptyScene, this.camera);
    composer.addPass(this.renderPass);

    this.mb = new MotionBlurEffect();
    this.mbPass = new EffectPass(this.camera, this.mb);
    composer.addPass(this.mbPass);

    this.dof = new DepthOfFieldEffect(this.camera, {
      focusDistance: 10,
      focusRange: 5,
      bokehScale: 2.0,
      resolutionScale: 0.5,
    });
    this.dofPass = new EffectPass(this.camera, this.dof);
    this.dofPass.enabled = false;
    composer.addPass(this.dofPass);

    this.bloom = new BloomEffect({
      mipmapBlur: true,
      intensity: 0.8,
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.35,
      radius: 0.75,
      levels: 8,
    });
    this.grade = new GradeEffect();
    this.gradePass = new EffectPass(this.camera, this.bloom, this.grade);
    composer.addPass(this.gradePass);

    this.lens = new LensEffect();
    this.lensPass = new EffectPass(this.camera, this.lens);
    composer.addPass(this.lensPass);
    this.composer = composer;

    this.camState = makeCamState();
    this.prevState = makeCamState();
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envCache = new Map();
  }

  setScene(scene) {
    this.renderPass.mainScene = scene;
  }

  // PMREM environment from a sky dome (cached by key).
  envFor(key, buildScene) {
    if (this.envCache.has(key)) return this.envCache.get(key);
    if (this.envCache.size > 24) {
      const first = this.envCache.keys().next().value;
      this.envCache.get(first).dispose();
      this.envCache.delete(first);
    }
    const sc = buildScene();
    const rt = this.pmrem.fromScene(sc, 0, 0.1, 1000);
    this.envCache.set(key, rt.texture);
    return rt.texture;
  }

  applyCamera(shot, lt, near, far) {
    const c = this.camera;
    evalCamera(shot, lt, this.camState);
    evalCamera(shot, lt - 1 / FPS, this.prevState);
    c.position.copy(this.camState.pos);
    c.quaternion.copy(this.camState.quat);
    c.fov = this.camState.fov;
    c.near = near;
    c.far = far;
    c.aspect = this.width / this.height;
    c.updateProjectionMatrix();
    c.updateMatrixWorld(true);
    const p = this.prevCamera;
    p.position.copy(this.prevState.pos);
    p.quaternion.copy(this.prevState.quat);
    p.fov = this.prevState.fov;
    p.near = near; p.far = far; p.aspect = c.aspect;
    p.updateProjectionMatrix();
    p.updateMatrixWorld(true);
    // motion blur matrices
    const prevVP = new THREE.Matrix4().multiplyMatrices(p.projectionMatrix, p.matrixWorldInverse);
    const curVP = new THREE.Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
    this.mb.uniforms.get('uPrevViewProj').value.copy(prevVP);
    this.mb.uniforms.get('uInvViewProj').value.copy(curVP).invert();
    return this.camState;
  }

  applyFx(fx, lt, dur, t) {
    const g = GRADES[fx.grade || 'film'] || GRADES.film;
    const G = this.grade.uniforms;
    G.get('uExposure').value = fx.exposure ?? 1;
    G.get('uContrast').value = fx.contrast ?? g.contrast;
    G.get('uSaturation').value = fx.saturation ?? g.saturation;
    G.get('uLift').value.set(...g.lift);
    G.get('uGamma').value.set(...g.gamma);
    G.get('uGain').value.set(...g.gain);
    G.get('uShadowTint').value.set(...g.sh);
    G.get('uHighTint').value.set(...g.hi);
    G.get('uVignette').value = fx.vignette ?? g.vignette;
    G.get('uGrain').value = fx.grain ?? g.grain;
    G.get('uSeed').value = (Math.floor(t * FPS) % 977) * 0.731;
    G.get('uSepia').value = fx.sepia ?? 0;
    G.get('uDesat').value = fx.desat ?? 0;
    // fades and flashes
    let fade = 0;
    if (fx.fadeIn) fade = Math.max(fade, 1 - clamp(lt / fx.fadeIn));
    if (fx.fadeOut) fade = Math.max(fade, clamp((lt - (dur - fx.fadeOut)) / fx.fadeOut));
    if (fx.fadeTo !== undefined) fade = Math.max(fade, fx.fadeTo);
    G.get('uFade').value = fade;
    let flash = 0;
    for (const f of fx.flashes || []) {
      const d = lt - f.at;
      if (d >= -0.03) flash += (f.amp ?? 4) * Math.exp(-Math.max(d, 0) * (f.decay ?? 6)) * clamp((d + 0.03) / 0.03);
    }
    const fc = fx.flashColor || [1, 0.9, 0.8];
    G.get('uFlash').value.set(fc[0] * flash, fc[1] * flash, fc[2] * flash);

    this.bloom.intensity = fx.bloom ?? 0.75;
    this.bloom.luminanceMaterial.threshold = fx.bloomThreshold ?? 0.9;
    this.mb.uniforms.get('uStrength').value = fx.motionBlur ?? 0.5;

    // lens
    const L = this.lens.uniforms;
    let zb = fx.zoomBlur ?? 0;
    for (const s of fx.shakes || []) {
      const d = lt - s.at;
      if (d >= 0) zb += (s.zoom ?? 0) * Math.exp(-d * 5);
    }
    if (fx.tin === 'push' && lt < 0.35) zb += 0.12 * Math.pow(1 - lt / 0.35, 2);
    L.get('uZoomBlur').value = zb;
    L.get('uCA').value = (fx.ca ?? 0.0018) + zb * 0.02;
    L.get('uDistort').value = fx.distort ?? 0.03;
    L.get('uShake').value.set(0, 0);

    if (fx.dof) {
      this.dofPass.enabled = true;
      const d = fx.dof;
      const focus = Array.isArray(d.focus) ? lerp(d.focus[0], d.focus[1], clamp(lt / dur)) : d.focus;
      this.dof.cocMaterial.focusDistance = focus;
      this.dof.cocMaterial.focusRange = d.range ?? focus * 0.35;
      this.dof.bokehScale = d.bokeh ?? 2.5;
    } else {
      this.dofPass.enabled = false;
    }
  }

  render() {
    this.composer.render(1 / FPS);
  }
}
