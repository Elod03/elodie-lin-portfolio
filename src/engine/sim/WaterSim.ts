import * as THREE from 'three'

const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`
// Height and velocity are stored independently. The fixed time step prevents
// instability when RAF resumes after the document has been hidden.
const fragment = `
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec4 uDrop;
uniform float uAspect;
varying vec2 vUv;
void main(){
  vec4 s=texture2D(uState,vUv);
  float average=(texture2D(uState,vUv+vec2(uTexel.x,0.)).r+texture2D(uState,vUv-vec2(uTexel.x,0.)).r+texture2D(uState,vUv+vec2(0.,uTexel.y)).r+texture2D(uState,vUv-vec2(0.,uTexel.y)).r)*.25;
  float velocity=(s.g+(average-s.r)*1.6)*.965;
  float height=(s.r+velocity)*.997;
  vec2 d=(vUv-uDrop.xy)*vec2(uAspect,1.);
  height+=exp(-dot(d,d)/max(.000001,uDrop.z*uDrop.z))*uDrop.w;
  float edge=smoothstep(0.,.02,min(min(vUv.x,vUv.y),min(1.-vUv.x,1.-vUv.y)));
  gl_FragColor=vec4(clamp(height,-1.,1.)*edge,clamp(velocity,-1.,1.)*edge,0.,1.);
}`

export class WaterSim {
  private targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget]
  private scene = new THREE.Scene()
  private camera = new THREE.Camera()
  private material: THREE.ShaderMaterial
  private geometry = new THREE.PlaneGeometry(2, 2)
  private index = 0
  private accumulated = 0
  private drops: [number, number, number, number][] = []
  constructor(private renderer: THREE.WebGLRenderer, resolution = 256) {
    const make = () => new THREE.WebGLRenderTarget(resolution, resolution, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false })
    this.targets = [make(), make()]
    this.material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: { uState: { value: this.targets[0].texture }, uTexel: { value: new THREE.Vector2(1 / resolution, 1 / resolution) }, uDrop: { value: new THREE.Vector4(0, 0, 1, 0) }, uAspect: { value: 1 } }, depthTest: false, depthWrite: false })
    this.scene.add(new THREE.Mesh(this.geometry, this.material))
    this.clear()
  }
  get heightTex() { return this.targets[this.index].texture }
  setAspect(value: number) { this.material.uniforms.uAspect.value = value }
  clear() {
    const previous = this.renderer.getRenderTarget()
    for (const target of this.targets) { this.renderer.setRenderTarget(target); this.renderer.clear() }
    this.renderer.setRenderTarget(previous)
  }
  addDrop(x: number, y: number, radius: number, strength: number) {
    if (this.drops.length < 16) this.drops.push([x, y, radius, strength])
  }
  step(dt: number) {
    this.accumulated += Math.min(Math.max(dt, 0), 1 / 30)
    const previous = this.renderer.getRenderTarget()
    while (this.accumulated >= 1 / 120) {
      this.material.uniforms.uState.value = this.heightTex
      this.material.uniforms.uDrop.value.set(...(this.drops.shift() ?? [0, 0, 1, 0]))
      this.index = 1 - this.index
      this.renderer.setRenderTarget(this.targets[this.index])
      this.renderer.render(this.scene, this.camera)
      this.accumulated -= 1 / 120
    }
    this.renderer.setRenderTarget(previous)
  }
  readHeight(x: number, y: number) {
    const target = this.targets[this.index], buffer = new Uint16Array(4)
    this.renderer.readRenderTargetPixels(target, Math.max(0, Math.min(target.width - 1, Math.floor(x * target.width))), Math.max(0, Math.min(target.height - 1, Math.floor(y * target.height))), 1, 1, buffer)
    return THREE.DataUtils.fromHalfFloat(buffer[0])
  }
  dispose() { this.targets.forEach(target => target.dispose()); this.geometry.dispose(); this.material.dispose() }
}
