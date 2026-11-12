import * as THREE from 'three'
import { waterField } from './waterField'
import { causticsSettings, type CausticsLevel } from '../quality'

const vertex = `
uniform sampler2D uWater;
uniform vec2 uViewport;
uniform float uTime;
varying vec2 vSource;
varying vec2 vLanding;
${waterField}
void main(){
 vec2 pixel=uv*uViewport;
 vec3 normal=normalize(vec3(-surfaceSlope(pixel),1.));
 vec3 ray=refract(normalize(vec3(.12,.20,-1.)),normal,1./1.333);
 // A sheet of sunlight refracted through the height field onto the floor.
 vec2 landing=pixel+ray.xy/max(.25,-ray.z)*waterScale()*1.76;
 vSource=pixel;vLanding=landing;
 gl_Position=vec4(landing/uViewport*2.-1.,0.,1.);
}`
const fragment = `
precision highp float;
varying vec2 vSource;
varying vec2 vLanding;
void main(){
 float sourceArea=abs(dFdx(vSource.x)*dFdy(vSource.y)-dFdx(vSource.y)*dFdy(vSource.x));
 float focusedArea=abs(dFdx(vLanding.x)*dFdy(vLanding.y)-dFdx(vLanding.y)*dFdy(vLanding.x));
 float irradiance=sourceArea/max(.0001,focusedArea);
 // Soft cap (no hard clamp): thin bright lines saturate smoothly instead of popping between frames.
 irradiance=irradiance/(1.+irradiance*.11);
 gl_FragColor=vec4(vec3(pow(irradiance,1.3)*.17),1.);
}`

/** Forward light transport, with overlapping refracted triangles accumulated
 * additively. This is a real surface-derived caustic field, not a noise texture. */
export class Caustics {
  private scene = new THREE.Scene()
  private camera = new THREE.Camera()
  private level: CausticsLevel = 'full'
  private size: { w: number; h: number }
  private settings: ReturnType<typeof causticsSettings>
  private geometry: THREE.PlaneGeometry
  private mesh: THREE.Mesh
  private material = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment,
    uniforms: { uWater: { value: null }, uViewport: { value: new THREE.Vector2() }, uTime: { value: 0 } },
    depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  })
  private target = new THREE.WebGLRenderTarget(768, 512, {
    type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: false, stencilBuffer: false,
  })
  private clearColor = new THREE.Color()
  constructor(private renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.size = { w: width, h: height }
    // Built once with the right grid for the first viewport (no 448² build then rebuild on a phone).
    this.settings = causticsSettings(width, height)
    this.geometry = new THREE.PlaneGeometry(2, 2, this.settings.grid, this.settings.grid)
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)
    this.resize(width, height)
  }
  /** True on phones: the caller renders the caustics every other frame. */
  get everyOther() { return this.settings.everyOther }
  get texture() { return this.target.texture }
  /** Lowers (never raises) the quality level; used when the pixel-ratio governor has nothing left to give. */
  setLevel(level: CausticsLevel) {
    if (level === this.level) return
    this.level = level
    this.resize(this.size.w, this.size.h)
  }
  resize(width: number, height: number) {
    this.size = { w: width, h: height }
    const next = causticsSettings(width, height, this.level)
    if (next.grid !== this.settings.grid) {
      this.geometry.dispose()
      this.geometry = new THREE.PlaneGeometry(2, 2, next.grid, next.grid)
      this.mesh.geometry = this.geometry
    }
    this.settings = next
    const scale = Math.min(1, next.target / Math.max(width, height))
    this.target.setSize(Math.max(128, Math.round(width * scale)), Math.max(128, Math.round(height * scale)))
    this.material.uniforms.uViewport.value.set(width, height)
  }
  render(water: THREE.Texture, time: number) {
    const target = this.renderer.getRenderTarget()
    this.renderer.getClearColor(this.clearColor)
    const alpha = this.renderer.getClearAlpha()
    this.material.uniforms.uWater.value = water
    this.material.uniforms.uTime.value = time
    this.renderer.setRenderTarget(this.target)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)
    this.renderer.setClearColor(this.clearColor, alpha)
    this.renderer.setRenderTarget(target)
  }
  read(x: number, y: number) {
    const pixel = new Uint16Array(4)
    this.renderer.readRenderTargetPixels(this.target,
      Math.max(0, Math.min(this.target.width - 1, Math.floor(x * this.target.width))),
      Math.max(0, Math.min(this.target.height - 1, Math.floor(y * this.target.height))), 1, 1, pixel)
    return THREE.DataUtils.fromHalfFloat(pixel[0])
  }
  /** Test/export hook: the whole caustic field as 0..1 floats (red channel), row 0 = bottom. */
  readAll() {
    const { width, height } = this.target
    const raw = new Uint16Array(width * height * 4)
    this.renderer.readRenderTargetPixels(this.target, 0, 0, width, height, raw)
    const values = new Float32Array(width * height)
    for (let i = 0; i < values.length; i++) values[i] = THREE.DataUtils.fromHalfFloat(raw[i * 4])
    return { width, height, values }
  }
  dispose() { this.target.dispose(); this.geometry.dispose(); this.material.dispose() }
}
