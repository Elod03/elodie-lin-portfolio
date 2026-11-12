"""Generate real multiview geometry from the user's prepared character views."""
import json
from pathlib import Path
import shutil
from gradio_client import Client, handle_file

root = Path(__file__).resolve().parents[1]
out = root / 'assets-src/avatar-v2'
client = Client('tencent/Hunyuan3D-2mv', verbose=False)
result = client.predict(
    caption=None, image=None,
    mv_image_front=handle_file(str(out / 'front.png')),
    mv_image_back=handle_file(str(out / 'back.png')),
    mv_image_left=None, mv_image_right=None,
    steps=5, guidance_scale=5.0, seed=42,
    octree_resolution=256, check_box_rembg=False,
    num_chunks=8000, randomize_seed=False, api_name='/shape_generation',
)
value = result[0]
if isinstance(value, dict): value = value.get('path') or value.get('value') or value.get('url')
if isinstance(value, dict): value = value.get('path') or value.get('url')
destination = out / 'shape.glb'
if str(value).startswith('http'):
    from urllib.request import urlretrieve
    urlretrieve(value, destination)
else:
    shutil.copyfile(value, destination)
print(json.dumps({'shape': str(destination), 'bytes': destination.stat().st_size}))
