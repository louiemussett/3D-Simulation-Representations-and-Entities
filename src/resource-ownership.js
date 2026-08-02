export const RESOURCE_OWNERSHIP = Object.freeze({ shared: "shared", entity: "entity-owned", chunk: "chunk-owned", temporary: "temporary" });

export function markResource(resource, ownership) { if (resource) resource.__resourceOwnership = ownership; return resource; }
export function disposeOwnedResource(resource) { if (!resource || ![RESOURCE_OWNERSHIP.entity, RESOURCE_OWNERSHIP.chunk, RESOURCE_OWNERSHIP.temporary].includes(resource.__resourceOwnership)) return false; resource.dispose?.(); return true; }
export function disposeOwnedTree(root) {
  const disposed = new Set();
  root?.traverse?.((node) => {
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const materialResources = materials.flatMap((material) => material ? [material.map, material.alphaMap, material] : []);
    for (const resource of [node.geometry, ...materialResources]) {
      if (!resource || disposed.has(resource)) continue;
      if (disposeOwnedResource(resource)) disposed.add(resource);
    }
  });
  return disposed.size;
}
