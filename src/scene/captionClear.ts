import * as THREE from "three";

/**
 * Keeps the tower's pillars and rings out from behind the captions.
 *
 * While a TV is framed it fills the screen, so the pillars and floor rings unavoidably
 * pass behind the caption column. Instead of fighting that, the tower's concrete fades
 * out, in screen space, inside a soft-edged box around the captions. FrameRig writes the
 * box every frame from the caption's real on-screen rectangle; one set of uniforms is
 * shared by every material that opts in, so they all clear together.
 *
 * All rect values are 0..1 with the origin bottom-left, like gl_FragCoord / resolution.
 */
export const clearUniforms = {
  uClear: { value: new THREE.Vector4(0, 0, 0, 0) },
  uSoft: { value: new THREE.Vector2(0.05, 0.05) },
  uRes: { value: new THREE.Vector2(1, 1) },
  uClearAmt: { value: 0 },
};

export function attachCaptionClear(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, clearUniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform vec4 uClear;
         uniform vec2 uSoft;
         uniform vec2 uRes;
         uniform float uClearAmt;`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
         {
           vec2 sp = gl_FragCoord.xy / uRes;
           float cx = smoothstep(uClear.x - uSoft.x, uClear.x + uSoft.x, sp.x)
                    * (1.0 - smoothstep(uClear.z - uSoft.x, uClear.z + uSoft.x, sp.x));
           float cy = smoothstep(uClear.y - uSoft.y, uClear.y + uSoft.y, sp.y)
                    * (1.0 - smoothstep(uClear.w - uSoft.y, uClear.w + uSoft.y, sp.y));
           gl_FragColor.a *= 1.0 - cx * cy * uClearAmt;
           if (gl_FragColor.a < 0.02) discard;
         }`,
      );
  };
  material.customProgramCacheKey = () => "caption-clear";
}
