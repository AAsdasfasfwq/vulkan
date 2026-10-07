import { Uniform, Matrix4, Vector2, Vector3 } from 'three';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';

// Camera motion blur: reprojects every pixel with the previous frame's
// view-projection matrix (the previous camera is evaluated analytically, so
// it is exact and deterministic).
const mbFrag = /* glsl */ `
uniform mat4 uPrevViewProj;
uniform mat4 uInvViewProj;
uniform float uStrength;
uniform float uMaxLen;
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (uStrength <= 0.0) { outputColor = inputColor; return; }
  vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 wp = uInvViewProj * ndc; wp /= wp.w;
  vec4 pc = uPrevViewProj * wp;
  vec2 puv = (pc.xy / max(pc.w, 1e-4)) * 0.5 + 0.5;
  vec2 vel = (uv - puv) * uStrength;
  float l = length(vel * resolution);
  float maxPx = uMaxLen * resolution.y;
  if (l > maxPx) vel *= maxPx / l;
  l = min(l, maxPx);
  if (l < 0.75) { outputColor = inputColor; return; }
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  const int N = 14;
  float jitter = fract(sin(dot(uv * resolution, vec2(12.9898, 78.233))) * 43758.5453);
  for (int i = 0; i < N; i++) {
    float f = (float(i) + jitter) / float(N) - 0.5;
    vec2 suv = clamp(uv + vel * f, vec2(0.001), vec2(0.999));
    acc += texture2D(inputBuffer, suv);
    wsum += 1.0;
  }
  outputColor = acc / wsum;
}`;

export class MotionBlurEffect extends Effect {
  constructor() {
    super('MotionBlurEffect', mbFrag, {
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uPrevViewProj', new Uniform(new Matrix4())],
        ['uInvViewProj', new Uniform(new Matrix4())],
        ['uStrength', new Uniform(0.5)],
        ['uMaxLen', new Uniform(0.06)],
      ]),
    });
  }
}

// Filmic grade: exposure -> ACES (Hill fit) -> look (contrast / saturation /
// lift-gamma-gain / split tone) -> vignette -> grain. Outputs linear so the
// pass's sRGB encode remains correct.
const gradeFrag = /* glsl */ `
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform vec3 uLift;
uniform vec3 uGamma;
uniform vec3 uGain;
uniform vec3 uShadowTint;
uniform vec3 uHighTint;
uniform float uVignette;
uniform float uGrain;
uniform float uSeed;
uniform float uFade;      // 0..1 to black
uniform vec3 uFlash;      // additive flash colour (linear)
uniform float uSepia;
uniform float uDesat;

vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 acesHill(vec3 c) {
  const mat3 IN = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 OUT = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  c = IN * c;
  c = RRTAndODTFit(c);
  c = OUT * c;
  return clamp(c, 0.0, 1.0);
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb * uExposure;
  c += uFlash;
  c = acesHill(c);
  vec3 s = toSRGB(c);
  // lift / gamma / gain
  s = uGain * (s + uLift * (1.0 - s));
  s = pow(max(s, 0.0), 1.0 / uGamma);
  // contrast around mid grey
  s = (s - 0.5) * uContrast + 0.5;
  float L = luma(s);
  // split toning
  s += uShadowTint * (1.0 - smoothstep(0.0, 0.55, L)) + uHighTint * smoothstep(0.45, 1.0, L);
  // saturation
  s = mix(vec3(L), s, uSaturation * (1.0 - uDesat));
  // sepia flashback look
  vec3 sep = vec3(L) * vec3(1.07, 0.92, 0.72) + vec3(0.04, 0.02, 0.0);
  s = mix(s, sep, uSepia);
  // vignette
  vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
  float v = smoothstep(0.35, 1.05, length(d) * 1.1);
  s *= 1.0 - uVignette * v;
  // film grain (luma weighted, stronger in mids)
  float g = h12(uv * resolution + uSeed * 97.0) + h12(uv * resolution * 1.37 - uSeed * 31.0) - 1.0;
  s += g * uGrain * (0.35 + 0.65 * (1.0 - abs(L - 0.5) * 2.0));
  s *= 1.0 - uFade;
  outputColor = vec4(toLin(clamp(s, 0.0, 1.0)), inputColor.a);
}`;

export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', gradeFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uExposure', new Uniform(1)],
        ['uContrast', new Uniform(1.05)],
        ['uSaturation', new Uniform(1.1)],
        ['uLift', new Uniform(new Vector3(0, 0, 0))],
        ['uGamma', new Uniform(new Vector3(1, 1, 1))],
        ['uGain', new Uniform(new Vector3(1, 1, 1))],
        ['uShadowTint', new Uniform(new Vector3(0, 0, 0))],
        ['uHighTint', new Uniform(new Vector3(0, 0, 0))],
        ['uVignette', new Uniform(0.35)],
        ['uGrain', new Uniform(0.035)],
        ['uSeed', new Uniform(0)],
        ['uFade', new Uniform(0)],
        ['uFlash', new Uniform(new Vector3(0, 0, 0))],
        ['uSepia', new Uniform(0)],
        ['uDesat', new Uniform(0)],
      ]),
    });
  }
}

// Lens: chromatic aberration + barrel distortion + radial (zoom) blur used by
// impact moments and whip transitions.
const lensFrag = /* glsl */ `
uniform float uCA;
uniform float uDistort;
uniform float uZoomBlur;
uniform vec2 uShake;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 c = uv - 0.5;
  float r2 = dot(c * vec2(aspect, 1.0), c * vec2(aspect, 1.0));
  vec2 duv = 0.5 + c * (1.0 + uDistort * r2) / (1.0 + uDistort * 0.25) + uShake;
  vec2 dir = c * (0.4 + r2);
  vec3 col;
  if (uZoomBlur > 0.0005) {
    vec3 acc = vec3(0.0);
    const int N = 12;
    for (int i = 0; i < N; i++) {
      float f = float(i) / float(N - 1);
      vec2 o = c * uZoomBlur * f;
      acc.r += texture2D(inputBuffer, duv - o + dir * uCA).r;
      acc.g += texture2D(inputBuffer, duv - o).g;
      acc.b += texture2D(inputBuffer, duv - o - dir * uCA).b;
    }
    col = acc / float(N);
  } else {
    col.r = texture2D(inputBuffer, duv + dir * uCA).r;
    col.g = texture2D(inputBuffer, duv).g;
    col.b = texture2D(inputBuffer, duv - dir * uCA).b;
  }
  outputColor = vec4(col, 1.0);
}`;

export class LensEffect extends Effect {
  constructor() {
    super('LensEffect', lensFrag, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uCA', new Uniform(0.0025)],
        ['uDistort', new Uniform(0.04)],
        ['uZoomBlur', new Uniform(0)],
        ['uShake', new Uniform(new Vector2())],
      ]),
    });
  }
}
