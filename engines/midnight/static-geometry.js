import * as T from "../../vendor/three.module.js";
import { mergeGeometries } from "../../vendor/addons/utils/BufferGeometryUtils.js";
// Batch architectural solids without changing doors, actors, glazing or lights.
export function batchArchitecture(root) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(),
    groups = new Map();
  root.traverse((o) => {
    if (
      !o.isMesh ||
      o.isInstancedMesh ||
      o.isSkinnedMesh ||
      Array.isArray(o.material) ||
      o.material.transparent
    )
      return;
    for (let p = o; p && p !== root; p = p.parent)
      if (p.userData.dynamic) return;
    if (!o.geometry.attributes.normal || !o.geometry.attributes.uv) return;
    const key = o.material.uuid;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  for (const meshes of groups.values()) {
    if (meshes.length < 3) continue;
    const parts = meshes.map((o) => {
      const g = o.geometry
        .clone()
        .applyMatrix4(inverse.clone().multiply(o.matrixWorld));
      return g.index ? g.toNonIndexed() : g;
    });
    const geometry = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!geometry) continue;
    const merged = new T.Mesh(geometry, meshes[0].material);
    merged.castShadow = true;
    merged.receiveShadow = true;
    root.add(merged);
    for (const o of meshes) {
      o.removeFromParent();
      o.geometry.dispose();
    }
  }
}
