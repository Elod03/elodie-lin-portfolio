# Decimate an untextured mesh, unwrap it (xatlas) and bake a texture from a front view and a back view
# (orthographic projection with depth test, blend by normal, unseen texels = nearest seen colour in 3D).
# Adapted locally from the existing chambre-noel-3d pipeline; source project stays untouched.
# Source front/back sizes are independent and dynamic. No source raster is rewritten.
# usage: python scripts/bake-avatar.py shape.glb front.png back.png baked.glb 30000 2048
import sys, numpy as np, trimesh, pymeshlab, xatlas, cv2
from numba import njit
from PIL import Image
from scipy.spatial import cKDTree
from scipy.ndimage import distance_transform_edt, binary_erosion

mesh_p, front_p, back_p, out_p = sys.argv[1:5]
target = int(sys.argv[5]) if len(sys.argv) > 5 else 30000
T = int(sys.argv[6]) if len(sys.argv) > 6 else 2048
HEAD = float(sys.argv[7]) if len(sys.argv) > 7 else 2.2
CHART_COST = float(sys.argv[8]) if len(sys.argv) > 8 else 12
SMOOTH_N = int(sys.argv[9]) if len(sys.argv) > 9 else 6
FACE_SMOOTH = int(sys.argv[10]) if len(sys.argv) > 10 else 4
SIDES = int(sys.argv[11]) if len(sys.argv) > 11 else 1
HAIRFIX = int(sys.argv[12]) if len(sys.argv) > 12 else 1

m = trimesh.load(mesh_p, force='mesh'); m.merge_vertices()
parts = m.split(only_watertight=False)
m = max(parts, key=lambda p: len(p.faces))
ms = pymeshlab.MeshSet(); ms.add_mesh(pymeshlab.Mesh(m.vertices, m.faces))
# the generator works in chunks and leaves near-duplicate vertices along their borders: weld them
ms.meshing_merge_close_vertices(threshold=pymeshlab.PercentageValue(0.05))
print('welded', ms.current_mesh().vertex_number())
ms.meshing_decimation_quadric_edge_collapse(targetfacenum=target, preservenormal=True, planarquadric=True, qualitythr=0.5)
ms.meshing_remove_unreferenced_vertices()
mm = ms.current_mesh(); V = mm.vertex_matrix().astype(np.float64); F = mm.face_matrix().astype(np.int64)
print('decimated', len(V), len(F))

def load(p):
    a = np.array(Image.open(p).convert('RGBA')); mask = a[..., 3] > 128
    ys, xs = np.where(mask)
    inner = binary_erosion(mask, iterations=4)
    _, (iy, ix) = distance_transform_edt(~inner, return_indices=True)
    rgb = a[..., :3].astype(np.float32)[iy, ix]          # colours pushed outward past the silhouette
    deep = binary_erosion(mask, iterations=10)           # well inside the figure, away from its outline
    return rgb, (xs.min(), xs.max(), ys.min(), ys.max()), deep
frgb, fb, fdeep = load(front_p); brgb, bb, bdeep = load(back_p)
FH, FW = frgb.shape[:2]; BH, BW = brgb.shape[:2]
print('source dimensions', FW, FH, BW, BH, flush=True)
mn, mx = V.min(0), V.max(0)
def to_img(P, b, mirror):
    u = (P[:, 0] - mn[0]) / (mx[0] - mn[0]); v = (P[:, 1] - mn[1]) / (mx[1] - mn[1])
    if mirror: u = 1 - u
    return np.stack([b[0] + u * (b[1] - b[0]), b[3] - v * (b[3] - b[2]), P[:, 2]], 1)

@njit(cache=True)
def zraster(P, F, W, H, sign):
    z = np.full((H, W), -1e9)
    for t in range(F.shape[0]):
        a, b, c = P[F[t, 0]], P[F[t, 1]], P[F[t, 2]]
        x0 = max(int(min(a[0], b[0], c[0])), 0); x1 = min(int(max(a[0], b[0], c[0])) + 1, W - 1)
        y0 = max(int(min(a[1], b[1], c[1])), 0); y1 = min(int(max(a[1], b[1], c[1])) + 1, H - 1)
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-12: continue
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                px, py = x + 0.5, y + 0.5
                w0 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d
                w1 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d
                w2 = 1 - w0 - w1
                if w0 < -1e-4 or w1 < -1e-4 or w2 < -1e-4: continue
                zz = sign * (w0 * a[2] + w1 * b[2] + w2 * c[2])
                if zz > z[y, x]: z[y, x] = zz
    return z

@njit(cache=True)
def texraster(UV, F, V, N, T):
    pos = np.zeros((T, T, 3)); nor = np.zeros((T, T, 3)); hit = np.zeros((T, T), np.bool_)
    best = np.full((T, T), -1e9)
    for t in range(F.shape[0]):
        a, b, c = UV[F[t, 0]] * T, UV[F[t, 1]] * T, UV[F[t, 2]] * T
        x0 = max(int(min(a[0], b[0], c[0])) - 1, 0); x1 = min(int(max(a[0], b[0], c[0])) + 1, T - 1)
        y0 = max(int(min(a[1], b[1], c[1])) - 1, 0); y1 = min(int(max(a[1], b[1], c[1])) + 1, T - 1)
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-14: continue
        tol = 2.0 / np.sqrt(abs(d))
        x0 = max(x0 - 2, 0); x1 = min(x1 + 2, T - 1); y0 = max(y0 - 2, 0); y1 = min(y1 + 2, T - 1)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                px, py = x + 0.5, y + 0.5
                w0 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d
                w1 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d
                w2 = 1 - w0 - w1
                mw = min(w0, w1, w2)
                if mw < -tol or mw <= best[y, x]: continue
                best[y, x] = mw
                for k in range(3):
                    pos[y, x, k] = w0 * V[F[t, 0], k] + w1 * V[F[t, 1], k] + w2 * V[F[t, 2], k]
                    nor[y, x, k] = w0 * N[F[t, 0], k] + w1 * N[F[t, 1], k] + w2 * N[F[t, 2], k]
                hit[y, x] = True
    return pos, nor, hit

# depth maps in image space (one per view)
Pf = to_img(V, fb, False); Pb = to_img(V, bb, True)
zf = zraster(Pf, F, FW, FH, 1.0)            # nearest to the front camera = max z
zb = -zraster(Pb, F, BW, BH, -1.0)          # nearest to the back camera = min z

# face and neck: the generator leaves grooves and stray locks in relief there; smooth the depth only
# (x and y stay put, so the projected texture still lands where it should)
fa = np.array(Image.open(front_p).convert('RGBA')).astype(np.int32)
r_, g_, b_ = fa[..., 0], fa[..., 1], fa[..., 2]
skin = (fa[..., 3] > 128) & (r_ > 185) & (g_ > 135) & (b_ > 115) & (r_ - g_ < 75)
hh = fb[3] - fb[2]; cxf = (fb[0] + fb[1]) / 2
band = np.zeros_like(skin); band[int(fb[2] + 0.07 * hh):int(fb[2] + 0.30 * hh), int(cxf - 0.075 * hh):int(cxf + 0.075 * hh)] = True
skin = __import__('scipy.ndimage', fromlist=['binary_closing']).binary_closing(skin & band, iterations=6)
skin = __import__('scipy.ndimage', fromlist=['binary_fill_holes']).binary_fill_holes(skin)
skin = __import__('scipy.ndimage', fromlist=['binary_dilation']).binary_dilation(skin, iterations=8)
ixs = np.clip(Pf[:, 0].astype(int), 0, FW - 1); iys = np.clip(Pf[:, 1].astype(int), 0, FH - 1)
sel = skin[iys, ixs] & (V[:, 2] >= zf[iys, ixs] - 0.06 * (mx[2] - mn[2]))
if FACE_SMOOTH and sel.any():
    tm0 = trimesh.Trimesh(V, F, process=False); ed0 = tm0.edges_unique
    deg0 = np.bincount(ed0.ravel(), minlength=len(V)).astype(np.float64)
    for _ in range(FACE_SMOOTH):
        sz = np.zeros(len(V)); np.add.at(sz, ed0[:, 0], V[ed0[:, 1], 2]); np.add.at(sz, ed0[:, 1], V[ed0[:, 0], 2])
        V[sel, 2] = 0.5 * V[sel, 2] + 0.5 * sz[sel] / np.maximum(deg0[sel], 1)
    zf = zraster(Pf * [1, 1, 0] + np.c_[np.zeros((len(V), 2)), V[:, 2]], F, FW, FH, 1.0)
    print('face smoothed', sel.sum())
skin_wide = __import__('scipy.ndimage', fromlist=['binary_dilation']).binary_dilation(skin, iterations=14)
face_n = skin_wide[iys, ixs] & (V[:, 2] >= zf[iys, ixs] - 0.08 * (mx[2] - mn[2]))

# unwrap
# unwrap a copy whose head is blown up, so the face gets far more texels than its 3D area would give it
hy = (V[:, 1] - mn[1]) / (mx[1] - mn[1]); Vu = V.copy()
headc = np.array([(mn[0] + mx[0]) / 2, mn[1] + 0.88 * (mx[1] - mn[1]), 0.0])
wgt = np.clip((hy - 0.74) / 0.06, 0, 1)[:, None]          # upper body above the shoulders
Vu = Vu + wgt * (Vu - headc) * (HEAD - 1)
atl = xatlas.Atlas(); atl.add_mesh(Vu.astype(np.float32), F.astype(np.uint32))
co = xatlas.ChartOptions(); co.max_cost = CHART_COST; co.max_iterations = 4
po = xatlas.PackOptions(); po.padding = 6; po.resolution = T; po.bilinear = True
atl.generate(chart_options=co, pack_options=po); vmap, Fi, UV = atl[0]
V2 = V[vmap]; Fi = Fi.astype(np.int64)
# welded normals (no creases on UV seams), smoothed over the 1-ring so the generator's thin grooves stop catching light
tm = trimesh.Trimesh(V, F, process=False); Nw = tm.vertex_normals.copy()
ed = tm.edges_unique; deg = np.bincount(ed.ravel(), minlength=len(V)).astype(np.float64)
for _ in range(SMOOTH_N):
    acc = Nw.copy(); np.add.at(acc, ed[:, 0], Nw[ed[:, 1]]); np.add.at(acc, ed[:, 1], Nw[ed[:, 0]])
    Nw = acc / np.linalg.norm(acc, axis=1, keepdims=True)
for _ in range(40):                                   # the face reads as one soft surface, like the drawing
    acc = Nw.copy(); np.add.at(acc, ed[:, 0], Nw[ed[:, 1]]); np.add.at(acc, ed[:, 1], Nw[ed[:, 0]])
    acc /= np.linalg.norm(acc, axis=1, keepdims=True); Nw[face_n] = acc[face_n]
N2 = Nw[vmap].copy()
UVr = UV.astype(np.float64).copy(); UVr[:, 1] = 1 - UVr[:, 1]   # texel rows from the top
pos, nor, hit = texraster(UVr, Fi, V2, N2, T)
print('texels', hit.sum())

P = pos[hit]; Nn = nor[hit]; Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9
def sample(rgb, Q):
    x = np.clip(Q[:, 0] - 0.5, 0, rgb.shape[1] - 1.001); y = np.clip(Q[:, 1] - 0.5, 0, rgb.shape[0] - 1.001)
    x0 = x.astype(int); y0 = y.astype(int); fx = (x - x0)[:, None]; fy = (y - y0)[:, None]
    return (rgb[y0, x0] * (1 - fx) * (1 - fy) + rgb[y0, x0 + 1] * fx * (1 - fy)
            + rgb[y0 + 1, x0] * (1 - fx) * fy + rgb[y0 + 1, x0 + 1] * fx * fy)
Qf = to_img(P, fb, False); Qb = to_img(P, bb, True)
eps = 0.015 * (mx[2] - mn[2]) / 0.63
ixf = np.clip(Qf[:, 0].astype(int), 0, FW - 1); iyf = np.clip(Qf[:, 1].astype(int), 0, FH - 1)
ixb = np.clip(Qb[:, 0].astype(int), 0, BW - 1); iyb = np.clip(Qb[:, 1].astype(int), 0, BH - 1)
visf = P[:, 2] >= zf[iyf, ixf] - eps
visb = P[:, 2] <= zb[iyb, ixb] + eps
wf = np.where(visf, np.clip(Nn[:, 2], 0, 1) ** 2 + 1e-3, 0)
wb = np.where(visb, np.clip(-Nn[:, 2], 0, 1) ** 2 + 1e-3, 0)
# where both cameras see the texel, the one facing it wins clearly
s = wf + wb
col = (wf[:, None] * sample(frgb, Qf) + wb[:, None] * sample(brgb, Qb)) / np.maximum(s, 1e-9)[:, None]
# a surface the camera sees head-on is trusted; so is any surface lying right on the front depth well inside
# the outline (folds and self-intersections of the generated mesh, which would otherwise show as dark cracks)
onf = visf & fdeep[iyf, ixf] & (P[:, 2] >= zf[iyf, ixf] - eps / 3)
onb = visb & bdeep[iyb, ixb] & (P[:, 2] <= zb[iyb, ixb] + eps / 3)
wf = np.where(onf, np.maximum(wf, 0.3), wf); wb = np.where(onb, np.maximum(wb, 0.3), wb)
s = wf + wb
col = (wf[:, None] * sample(frgb, Qf) + wb[:, None] * sample(brgb, Qb)) / np.maximum(s, 1e-9)[:, None]
known = (np.where(visf, Nn[:, 2], 0) > 0.3) | (np.where(visb, -Nn[:, 2], 0) > 0.3) | onf | onb
# grazing but unobstructed (sides of the hair, of the legs): the view it leans towards, colours from inside the outline
side = ~known & (visf | visb)
if SIDES:
    usef = side & ((Nn[:, 2] >= 0) & visf | ~visb)
    col[usef] = sample(frgb, Qf[usef]); col[side & ~usef] = sample(brgb, Qb[side & ~usef])
    known = known | side
print('seen', known.mean())
tree = cKDTree(P[known]); d, j = tree.query(P[~known], k=6)
w = 1 / (d + 1e-4); col[~known] = (col[known][j] * w[..., None]).sum(1) / w.sum(1)[:, None]

# around the head, pale texels off the face are sleeve colour that leaked onto the sides of the hair
Hh = mx[1] - mn[1]; cxm = (mn[0] + mx[0]) / 2
hyP = (P[:, 1] - mn[1]) / Hh
rr, gg, bb_ = col[:, 0], col[:, 1], col[:, 2]
hairish = (rr > 1.5 * gg) & (rr > 60) & (rr < 235)
ixq = np.clip(Qf[:, 0].astype(int), 0, FW - 1); iyq = np.clip(Qf[:, 1].astype(int), 0, FH - 1)
facezone = skin_wide[iyq, ixq] & (Nn[:, 2] > 0.2)
pale = (hyP > 0.80) & (np.abs(P[:, 0] - cxm) < 0.13 * Hh) & ~hairish & ~facezone & (np.abs(Nn[:, 2]) < 0.75)
src = (hyP > 0.72) & hairish
if HAIRFIX and pale.any() and src.any():
    d, j = cKDTree(P[src]).query(P[pale], k=8); w = 1 / (d + 1e-4)
    col[pale] = (col[src][j] * w[..., None]).sum(1) / w.sum(1)[:, None]
    print('hair fix', pale.sum())
tex = np.zeros((T, T, 3), np.float32); tex[hit] = col
img = np.clip(tex, 0, 255).astype(np.uint8)
# pad islands so mip-maps and bilinear filtering never pull in black
pad = (~hit).astype(np.uint8) * 255
img = cv2.inpaint(img, pad, 3, cv2.INPAINT_TELEA) if T <= 2048 else img
Image.fromarray(img).save(out_p.replace('.glb', '_tex.png'))

mat = trimesh.visual.material.PBRMaterial(baseColorTexture=Image.fromarray(img), metallicFactor=0.0, roughnessFactor=0.85)
out = trimesh.Trimesh(V2, Fi, vertex_normals=N2, visual=trimesh.visual.TextureVisuals(uv=UV, material=mat), process=False)
out.export(out_p, include_normals=True); print('ok', out_p, len(V2), len(Fi), 'charts', atl.chart_count)
