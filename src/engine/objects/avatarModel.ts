import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

export const AVATAR_MODEL_URL = '/models/elodie-chibi.glb'

/** Release geometry, all PBR texture maps, skeletons and decoded image bitmaps. */
export function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const skeletons = new Set<THREE.Skeleton>()
  const images = new Set<ImageBitmap>()
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
  })
  for (const texture of textures) {
    if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) images.add(texture.image)
    texture.dispose()
  }
  geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose())
  skeletons.forEach(value => value.dispose()); images.forEach(value => value.close())
}

/** The generated GLB is Y-up, facing +Z. Keep its normalization inside an
 * unscaled placement group so the engine can apply CSS-pixel transforms. */
export function normalizeAvatarModel(scene: THREE.Object3D, yaw = 0): THREE.Group {
  scene.rotation.y += yaw
  scene.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(scene)
  const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3())
  if (!Number.isFinite(size.y) || size.y <= 0 || !Number.isFinite(center.x + center.y + center.z)) {
    throw new Error('Le modèle avatar ne contient pas de géométrie visible.')
  }
  const normalized = new THREE.Group(), scale = 1.3 / size.y
  normalized.name = 'Elodie — modèle normalisé'
  normalized.add(scene)
  normalized.scale.setScalar(scale)
  normalized.position.copy(center).multiplyScalar(-scale)
  const placement = new THREE.Group()
  placement.name = 'Elodie — chibi personnalisé'
  placement.userData.avatarSource = 'glb'
  placement.add(normalized)
  return placement
}

/** Missing/invalid models leave the already-rendered primitive in place. The
 * abort check after parsing also covers teardown during image decoding. */
export async function loadAvatarModel(options: { signal?: AbortSignal; yaw?: number; url?: string } = {}): Promise<THREE.Group | null> {
  let source: THREE.Object3D | undefined
  try {
    const url = new URL(options.url ?? AVATAR_MODEL_URL, document.baseURI)
    const response = await fetch(url, { signal: options.signal })
    if (!response.ok || options.signal?.aborted) return null
    const data = await response.arrayBuffer()
    if (options.signal?.aborted) return null
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    const gltf = await loader.parseAsync(data, new URL('.', url).href)
    source = gltf.scene
    // Static avatar: no animation mixer or skeleton updates are started.
    if (options.signal?.aborted) { disposeModel(source); return null }
    return normalizeAvatarModel(source, options.yaw)
  } catch {
    if (source) disposeModel(source)
    return null
  }
}
