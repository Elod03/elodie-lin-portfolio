// Reuse the installed local 3D toolchain without changing its project or
// installing dependencies. Override AVATAR_TOOLCHAIN_ROOT on another machine.
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const toolchainRoot = process.env.AVATAR_TOOLCHAIN_ROOT ?? resolve(projectRoot, '../chambre-noel-3d')
const require = createRequire(resolve(toolchainRoot, 'package.json'))
const { NodeIO } = require('@gltf-transform/core')
const { ALL_EXTENSIONS, EXTTextureWebP } = require('@gltf-transform/extensions')
const { dedup, prune, weld, meshopt } = require('@gltf-transform/functions')
const { MeshoptEncoder, MeshoptDecoder } = require('meshoptimizer')
await MeshoptEncoder.ready
await MeshoptDecoder.ready

const input = resolve(projectRoot, process.argv[2] ?? 'assets-src/avatar-v2/baked.glb')
const output = resolve(projectRoot, process.argv[3] ?? 'assets-src/avatar-v2/candidate.glb')
const textureSize = Number(process.argv[4] ?? 2048)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
})
const document = await io.read(input)
// Pillow avoids a libvips DLL mismatch in the existing Windows toolchain.
// Only the newly baked 3D atlas is compressed; supplied source images remain intact.
for (const texture of document.getRoot().listTextures()) {
  const python = process.env.AVATAR_PYTHON ?? 'python'
  const encoded = spawnSync(python, ['-c', 'import io,sys; from PIL import Image; im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB"); im.thumbnail((int(sys.argv[1]),int(sys.argv[1])),Image.Resampling.LANCZOS); im.save(sys.stdout.buffer,format="WEBP",quality=92,method=6)', String(textureSize)], { input: Buffer.from(texture.getImage()), maxBuffer: 32 * 1024 * 1024, windowsHide: true })
  if (encoded.error || encoded.status !== 0) throw new Error(encoded.error?.message ?? encoded.stderr.toString())
  texture.setImage(new Uint8Array(encoded.stdout)).setMimeType('image/webp')
}
document.createExtension(EXTTextureWebP).setRequired(true)
await document.transform(
  dedup(), weld(), prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 14, quantizeTexcoord: 14 }),
)
await mkdir(dirname(output), { recursive: true })
await io.write(output, document)
const bytes = (await stat(output)).size
console.log(JSON.stringify({ output, bytes, megabytes: (bytes / 1e6).toFixed(3), textures: document.getRoot().listTextures().map(texture => ({ size: texture.getSize(), format: texture.getMimeType() })), extensions: document.getRoot().listExtensionsUsed().map(extension => extension.extensionName) }))
if (bytes > 1500000) console.warn('Avatar exceeds the 1.5 MB target; inspect visual quality before reducing texture size.')
