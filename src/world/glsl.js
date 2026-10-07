// Shared GLSL snippets.
export const NOISE = /* glsl */ `
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float vnoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = hash13(i), b = hash13(i + vec3(1, 0, 0)), c = hash13(i + vec3(0, 1, 0)), d = hash13(i + vec3(1, 1, 0));
  float e = hash13(i + vec3(0, 0, 1)), f1 = hash13(i + vec3(1, 0, 1)), g = hash13(i + vec3(0, 1, 1)), h = hash13(i + vec3(1, 1, 1));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, f1, u.x), mix(g, h, u.x), u.y), u.z);
}
float fbm2(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float fbm3(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise3(p); p = p * 2.02 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
float fbm3l(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * vnoise3(p); p = p * 2.02 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
float ridge(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * (1.0 - abs(vnoise(p) * 2.0 - 1.0)); p *= 2.1; a *= 0.5; } return s; }
// Worley (cellular) distance, 2D
float worley(vec2 p) {
  vec2 i = floor(p), f = fract(p); float d = 1.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y); vec2 o = hash22(i + g);
    d = min(d, length(g + o - f));
  }
  return d;
}
`;

// Sky colour model shared by the sky dome, the ocean reflections and fog.
export const SKY = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunSize;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform float uHazePow;
uniform float uCloudCover;
uniform vec3 uCloudLit;
uniform vec3 uCloudDark;
uniform float uCloudScale;
uniform float uSkyTime;
uniform float uStars;
uniform vec3 uGlowDir;
uniform vec3 uGlowColor;
uniform float uGlowSize;
uniform float uSunVisible;

vec3 skyBase(vec3 d) {
  float h = d.y;
  vec3 c;
  if (h >= 0.0) c = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), uHazePow));
  else c = mix(uHorizon, uGround, clamp(-h * 6.0, 0.0, 1.0));
  float sd = max(dot(d, uSunDir), 0.0);
  // broad forward scattering around the sun
  c += uSunColor * (0.025 * pow(sd, 3.0) + 0.06 * pow(sd, 12.0) + 0.18 * pow(sd, 80.0)) * uSunVisible;
  // volcanic glow on the horizon
  float gd = max(dot(d, uGlowDir), 0.0);
  c += uGlowColor * pow(gd, uGlowSize) * smoothstep(-0.15, 0.25, h + 0.15);
  return c;
}

vec4 skyClouds(vec3 d) {
  if (uCloudCover <= 0.001 || d.y < 0.0) return vec4(0.0);
  vec2 p = d.xz / (d.y + 0.06) * uCloudScale + vec2(uSkyTime * 0.004, uSkyTime * 0.0015);
  float n = fbm2(p * 1.0) * 0.65 + fbm2(p * 3.1 + 4.0) * 0.35;
  float dens = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.35, n);
  dens *= smoothstep(0.0, 0.12, d.y);
  float sd = max(dot(d, uSunDir), 0.0);
  float edge = smoothstep(0.0, 0.6, dens);
  vec3 col = mix(uCloudLit, uCloudDark, edge * 0.85);
  col += uSunColor * pow(sd, 6.0) * (1.0 - edge) * 0.35 * uSunVisible;
  return vec4(col, dens * 0.95);
}

vec3 skyColor(vec3 d, bool withSun) {
  vec3 c = skyBase(d);
  if (withSun) {
    float sd = dot(d, uSunDir);
    float disk = smoothstep(cos(uSunSize), cos(uSunSize * 0.85), sd);
    c += uSunColor * disk * 6.0 * uSunVisible;
  }
  vec4 cl = skyClouds(d);
  c = mix(c, cl.rgb, cl.a);
  if (uStars > 0.0 && d.y > 0.0) {
    vec3 sp = d * 420.0;
    vec3 id = floor(sp);
    float h = hash13(id);
    float st = step(0.9975, h) * smoothstep(0.5, 0.0, length(fract(sp) - 0.5));
    c += vec3(0.9, 0.95, 1.0) * st * uStars * (0.5 + 0.5 * hash13(id + 7.0)) * (1.0 - cl.a);
  }
  return c;
}
`;
