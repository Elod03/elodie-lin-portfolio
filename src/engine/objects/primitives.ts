import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// All toy parts are baked into one vertex-coloured mesh, keeping the number of
// draw calls constant regardless of the number of limbs or cloud lobes.
function builder() {
  const parts: THREE.BufferGeometry[] = []
  // `kind` tags face parts the cloud can morph: 1 open eye, 2 happy arc, 3 cheek, 4 mouth.
  const add = (color: string, p: [number, number, number], s: [number, number, number], geometry: THREE.BufferGeometry = new THREE.SphereGeometry(1, 24, 16), kind = 0) => {
    geometry.scale(...s); geometry.translate(...p)
    const c = new THREE.Color(color), count = geometry.attributes.position.count, colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aCenter', new THREE.BufferAttribute(Float32Array.from({ length: count * 3 }, (_, i) => p[i % 3]), 3))
    geometry.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(count).fill(kind), 1)); parts.push(geometry)
  }
  const finish = () => {
    const geometry = mergeGeometries(parts)
    parts.forEach(part => part.dispose())
    return new THREE.Mesh(geometry!, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .3, metalness: 0, clearcoat: .9, clearcoatRoughness: .14 }))
  }
  return { add, finish }
}

export function cloud() {
  const b = builder()
  b.add('#fffdf8', [0, -.08, 0], [.58, .23, .23])
  b.add('#fffdf8', [-.3, .04, 0], [.25, .25, .23])
  b.add('#fffdf8', [.02, .16, 0], [.32, .32, .25])
  b.add('#fffdf8', [.32, .01, 0], [.23, .24, .22])
  for (const x of [-.16, .16]) {
    b.add('#28262e', [x, .02, .275], [.025, .035, .022], undefined, 1)
    b.add('#28262e', [x, .03, .275], [.042, .04, .018], new THREE.TorusGeometry(1, .26, 8, 18, Math.PI), 2)
    b.add('#ffb7ce', [x * 1.55, -.07, .245], [.058, .027, .015], undefined, 3)
  }
  b.add('#874f61', [0, -.06, .275], [.032, .013, .012], undefined, 4)
  const mesh = b.finish(), expression = { value: 0 }
  // Face morph in the vertex shader: calm dots at 0, happy ^ ^ eyes, rounder cheeks and a wider smile at 1.
  const material = mesh.material as THREE.MeshPhysicalMaterial
  material.userData.expression = expression
  material.onBeforeCompile = shader => {
    shader.uniforms.uExpr = expression
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 aCenter;
attribute float aKind;
uniform float uExpr;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 faceScale=vec3(1.);
      if(aKind>.5&&aKind<1.5)faceScale=vec3(1.,max(.001,1.-uExpr),1.);
      else if(aKind>1.5&&aKind<2.5)faceScale=vec3(max(.001,uExpr));
      else if(aKind>2.5&&aKind<3.5)faceScale=vec3(1.+.3*uExpr,1.+.3*uExpr,1.);
      else if(aKind>3.5)faceScale=vec3(1.+.7*uExpr,1.+1.6*uExpr,1.);
      transformed=aCenter+(transformed-aCenter)*faceScale;`)
  }
  material.customProgramCacheKey = () => 'cloud-face'
  return mesh
}

export function duck() {
  const b = builder()
  b.add('#ffcf15', [0, -.12, 0], [.51, .30, .33])
  b.add('#ffdf25', [-.21, .19, .03], [.29, .31, .28])
  b.add('#f4930a', [-.47, .12, .18], [.21, .075, .17])
  b.add('#ffdf25', [.43, -.04, -.03], [.15, .17, .2])
  b.add('#ffd01a', [.12, -.10, .30], [.26, .15, .09])
  b.add('#241b19', [-.29, .26, .27], [.035, .042, .021])
  b.add('#ffffff', [-.30, .276, .289], [.009, .011, .008])
  return b.finish()
}

export function avatar() {
  const b = builder()
  // Long copper hair behind a round face; collar and puffed sleeves.
  b.add('#984323', [0, .21, -.1], [.36, .56, .18])
  b.add('#ffd7bd', [0, .31, .08], [.30, .31, .24])
  b.add('#ad582f', [0, .31, -.045], [.34, .34, .27], new THREE.SphereGeometry(1, 32, 24, 0, Math.PI * 2, 0, Math.PI * .58))
  b.add('#b96538', [-.235, .405, .09], [.09, .18, .155])
  b.add('#c07440', [.235, .405, .09], [.09, .18, .155])
  b.add('#a8512b', [-.29, .12, .03], [.085, .38, .17])
  b.add('#a8512b', [.29, .12, .03], [.085, .38, .17])
  b.add('#fffdf6', [0, -.13, .04], [.22, .26, .15])
  b.add('#e5e7e7', [-.065, .035, .178], [.07, .043, .02])
  b.add('#f9faf7', [.065, .035, .178], [.07, .043, .02])
  b.add('#fffdf6', [-.27, -.09, .02], [.11, .18, .12]); b.add('#fffdf6', [.27, -.09, .02], [.11, .18, .12])
  b.add('#ffd7bd', [-.29, -.27, .04], [.065, .09, .065]); b.add('#ffd7bd', [.29, -.27, .04], [.065, .09, .065])
  b.add('#353044', [0, -.36, .04], [.24, .13, .16])
  for (const x of [-.1, .1]) {
    b.add('#ffd7bd', [x, -.49, .05], [.065, .14, .07]); b.add('#f6f5f1', [x, -.61, .09], [.09, .055, .13])
    b.add('#322520', [x, .32, .306], [.03, .043, .022]); b.add('#fff', [x - .008, .336, .327], [.008, .01, .006])
    b.add('#955035', [x, .39, .294], [.033, .007, .007])
    b.add('#f7a4a7', [x * 1.6, .23, .284], [.048, .024, .015])
  }
  b.add('#d99180', [0, .19, .314], [.026, .014, .01])
  b.add('#f2c7ae', [0, .255, .322], [.018, .025, .016])
  b.add('#d4a741', [0, -.07, .192], [.024, .025, .01])
  return b.finish()
}

/** Dark tiles, matching the background of their artwork; the others are cream. */
const tileBase: Record<string, string> = { streamflix: '#171522', carnival: '#000000' }

/** `iconFace`: the project's icon. A raster one (.webp/.png/.jpg) replaces the drawn face once it has loaded;
 * the drawn face stays when it cannot load (offline). */
export function projectIcon(slug: string, onReady: () => void = () => {}, iconFace?: string) {
  const group = new THREE.Group()
  const shape = new THREE.Shape(), r = .18, a = -.5, z = .5
  shape.moveTo(a + r, a); shape.lineTo(z - r, a); shape.quadraticCurveTo(z, a, z, a + r)
  shape.lineTo(z, z - r); shape.quadraticCurveTo(z, z, z - r, z)
  shape.lineTo(a + r, z); shape.quadraticCurveTo(a, z, a, z - r)
  shape.lineTo(a, a + r); shape.quadraticCurveTo(a, a, a + r, a)
  const base = tileBase[slug] ?? '#ece3d2'
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .12, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .035, bevelThickness: .04, curveSegments: 8 })
  group.add(new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color: base, roughness: .3, metalness: .08, clearcoat: 1, clearcoatRoughness: .15 })))
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  if (slug === 'streamflix') {
    ctx.fillStyle = '#e62b47'; ctx.beginPath(); ctx.moveTo(98, 65); ctx.lineTo(98, 190); ctx.lineTo(187, 128); ctx.closePath(); ctx.fill()
  } else if (slug === 'yoru') {
    ctx.strokeStyle = '#bd302e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(128, 116, 75, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#a9282b'; ctx.font = 'bold 69px serif'; ctx.fillText('夜', 128, 114)
    ctx.font = 'bold 24px serif'; ctx.fillText('YORU', 128, 204)
  } else {
    // Offline face: one big initial (red K on cream for Kanpai, gold C on black for Carnival 17).
    ctx.fillStyle = tileBase[slug] ? '#d9b45a' : '#e51f27'; ctx.font = 'bold 140px serif'; ctx.fillText(slug.slice(0, 1).toUpperCase(), 128, 133)
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  if (iconFace && /\.(webp|png|jpe?g)$/i.test(iconFace)) {
    const artwork = new Image()
    let released = false
    texture.addEventListener('dispose', () => { released = true; artwork.onload = null; artwork.onerror = null })
    artwork.onload = () => {
      if (released) return
      ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256)
      ctx.drawImage(artwork, 21, 21, 214, 214)
      texture.needsUpdate = true
      onReady()
    }
    artwork.onerror = () => { /* The initial letter remains readable offline. */ }
    artwork.src = iconFace
  }
  const face = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshPhysicalMaterial({ map: texture, roughness: .3, metalness: 0, clearcoat: 1, clearcoatRoughness: .15 }))
  // ShapeGeometry UVs are in local coordinates; remap to the artwork.
  const uv = face.geometry.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + .5, uv.getY(i) + .5)
  face.position.z = .165; group.add(face)
  return group
}

export interface ToyShared { uCaustics: { value: THREE.Texture | null }; uCausticRes: { value: THREE.Vector2 }; /** device-pixel offset screen→world (x, y up) so the lookup follows the frame's pan */ uCausticShift: { value: THREE.Vector2 }; uNight: { value: number }; /** 0..1: the caustics light up at the end of the arrival */ uCausticOn: { value: number } }
/** Per object: world y of its centre and its half height, so only the lower part is lit. */
export interface ToyLocal { uToyY: { value: number }; uToyHalf: { value: number } }

/** Sober underwater light on the toys: the pool's own caustic texture, read in
 * screen space, brightens the lower part of each object. One extra texture
 * tap per fragment, no extra draw call. Works on any standard/physical material. */
export function applyToyShading(root: THREE.Object3D, shared: ToyShared, local: ToyLocal) {
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof THREE.MeshStandardMaterial) || material.userData.toyShaded) continue
      material.userData.toyShaded = true
      const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey
      material.onBeforeCompile = (shader, renderer) => {
        previous.call(material, shader, renderer)
        Object.assign(shader.uniforms, shared, local)
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>
varying float vToyY;`)
          .replace('#include <project_vertex>', `#include <project_vertex>
vToyY=(modelMatrix*vec4(transformed,1.)).y;`)
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>
varying float vToyY;
uniform sampler2D uCaustics;uniform vec2 uCausticRes,uCausticShift;uniform float uNight,uToyY,uToyHalf,uCausticOn;`)
          .replace('#include <opaque_fragment>', `{
            vec2 cuv=(gl_FragCoord.xy+uCausticShift)/uCausticRes;
            float c=(cuv.x>0.&&cuv.x<1.&&cuv.y>0.&&cuv.y<1.)?max(0.,texture2D(uCaustics,cuv).r-.08)*uCausticOn:0.;
            float under=smoothstep(uToyY+uToyHalf*.05,uToyY-uToyHalf*.5,vToyY);
            outgoingLight+=vec3(.42,.74,1.)*(1.-exp(-c*3.))*under*mix(.30,.14,uNight)*(.45+diffuseColor.rgb*.55);
          }
          #include <opaque_fragment>`)
      }
      material.customProgramCacheKey = () => (previousKey.call(material) ?? '') + '|toy'
    }
  })
}
