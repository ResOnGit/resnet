import * as THREE from "three";

export function attachVhs(material: THREE.MeshBasicMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uStatic = { value: 0 };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         uniform float uStatic;`,
      )
      .replace(
        "#include <map_fragment>",
        `vec2 vhsUv = vMapUv * 2.0 - 1.0;
         float curve = dot(vhsUv, vhsUv);
         vhsUv *= 1.0 + curve * 0.075;
         vhsUv = vhsUv * 0.5 + 0.5;
         vhsUv.x += sin(uTime * 1.3 + vhsUv.y * 18.0) * 0.0022;
         vec4 sampledDiffuseColor;
         sampledDiffuseColor.r = texture2D(map, vhsUv + vec2(0.0035, 0.0)).r;
         sampledDiffuseColor.g = texture2D(map, vhsUv).g;
         sampledDiffuseColor.b = texture2D(map, vhsUv - vec2(0.0035, 0.0)).b;
         sampledDiffuseColor.a = texture2D(map, vhsUv).a;
         float scan = 0.86 + 0.14 * sin(vhsUv.y * 640.0);
         sampledDiffuseColor.rgb *= scan;
         float band = smoothstep(0.012, 0.0, abs(fract(vhsUv.y + uTime * 0.045) - 0.2));
         sampledDiffuseColor.rgb += band * 0.16 * (1.0 - uStatic);
         float snowA = fract(sin(dot(floor(vhsUv * vec2(240.0, 180.0)) + floor(uTime * 42.0), vec2(127.1, 311.7))) * 43758.5453);
         float snowB = fract(sin(dot(floor(vhsUv * vec2(90.0, 70.0)) + floor(uTime * 42.0 + 3.0), vec2(269.5, 183.3))) * 43758.5453);
         float grain = snowA * 0.72 + snowB * 0.28;
         sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, vec3(grain), clamp(uStatic, 0.0, 1.0));
         diffuseColor *= sampledDiffuseColor;`,
      );
    material.userData.shader = shader;
  };
  material.customProgramCacheKey = () => "vhs-static";
}

/** Fast full-snow hit. Peaks almost immediately, gone in about a sixth of a second. */
export function staticMix(ageMs: number) {
  const span = 170;
  if (ageMs < 0 || ageMs > span) return 0;
  const t = ageMs / span;
  if (t < 0.08) return t / 0.08;
  if (t < 0.55) return 1;
  return (1 - t) / 0.45;
}

export function tickVhs(material: THREE.MeshBasicMaterial, time: number, snow = 0) {
  const shader = material.userData.shader as
    | { uniforms: { uTime: { value: number }; uStatic?: { value: number } } }
    | undefined;
  if (!shader) return;
  shader.uniforms.uTime.value = time;
  if (shader.uniforms.uStatic) shader.uniforms.uStatic.value = snow;
}
