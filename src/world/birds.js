import * as THREE from 'three';
import { rng } from '../core/math.js';

// Flock of birds with flapping wings (vertex shader), positions from a flight path.
export class Birds {
  constructor(n = 60, color = 0x1a1a1a) {
    const g = new THREE.BufferGeometry();
    // body + two wings, wing tips flagged with aWing = +-1
    const P = [0, 0, 0.35, 0, 0, -0.3, 0.07, 0, 0,  0, 0, 0.12, -1.0, 0, -0.1, 0, 0, -0.18,  0, 0, 0.12, 1.0, 0, -0.1, 0, 0, -0.18];
    const Wg = [0, 0, 0, 0, -1, 0, 0, 1, 0];
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aWing', new THREE.Float32BufferAttribute(Wg, 1));
    g.computeVertexNormals();
    this.uTime = { value: 0 };
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWing; uniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.11;
          float flap = sin(uTime * 11.0 + ph);
          transformed.y += abs(aWing) * flap * 0.45;
          transformed.x *= 1.0 - abs(aWing) * (0.15 + 0.15 * flap);`);
    };
    this.mesh = new THREE.InstancedMesh(g, mat, n);
    this.mesh.frustumCulled = false;
    this.n = n;
    const r = rng(12);
    this.seeds = Array.from({ length: n }, () => [r(), r(), r(), r()]);
    this.mesh.visible = false;
  }
  // path(t) -> {pos:[x,y,z], dir:[x,y,z]}, spread in metres, scale per bird
  update(t, path, spread = 30, scale = 1.2) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const fwd = new THREE.Vector3(0, 0, 1);
    this.seeds.forEach(([a, b, c, d], i) => {
      const lag = a * 3;
      const P = path(t - lag * 0.6);
      const ox = Math.sin(t * 0.6 + i) * spread * 0.2 + (b - 0.5) * spread;
      const oy = Math.cos(t * 0.8 + i * 1.3) * spread * 0.1 + (c - 0.5) * spread * 0.4;
      const oz = (d - 0.5) * spread;
      p.set(P.pos[0] + ox, P.pos[1] + oy, P.pos[2] + oz);
      q.setFromUnitVectors(fwd, new THREE.Vector3(...P.dir).normalize());
      m.compose(p, q, s.setScalar(scale * (0.8 + d * 0.4)));
      this.mesh.setMatrixAt(i, m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.uTime.value = t;
  }
}
