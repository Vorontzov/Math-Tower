import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "../vendor/three.module.js";
import { GLTFLoader } from "../vendor/addons/loaders/GLTFLoader.js";
import {
  faceMovement,
  skitter,
  animateSkitter,
} from "../engines/midnight/actors.js";

async function geometryAsset(name) {
  const data = await readFile(
    new URL(`../assets/realism/${name}.glb`, import.meta.url),
  );
  const size = data.readUInt32LE(12),
    json = JSON.parse(data.subarray(20, 20 + size).toString());
  assert.ok(json.materials.some((m) => m.name === "FaceSkin"));
  // Keep the shipped meshes, skins and animations; GPU textures are irrelevant
  // to the orientation/pose regression and unavailable in the Node test runner.
  delete json.materials;
  delete json.images;
  delete json.textures;
  for (const mesh of json.meshes)
    for (const primitive of mesh.primitives) delete primitive.material;
  const encoded = Buffer.from(JSON.stringify(json)),
    padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
  encoded.copy(padded);
  const binary = data.subarray(20 + size),
    out = Buffer.alloc(20 + padded.length + binary.length);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(padded.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(out, 20);
  binary.copy(out, 20 + padded.length);
  return new GLTFLoader().parseAsync(
    out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength),
    "",
  );
}
const position = (root, name) =>
  root.getObjectByName(name).getWorldPosition(new T.Vector3());
function visibleBounds(root) {
  const box = new T.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.isSkinnedMesh) {
      o.skeleton.update();
      o.computeBoundingBox();
      box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));
    }
  });
  return box;
}
test("shipped human faces point along movement in all eight directions, in idle and run", async () => {
  for (const name of ["explorer", "researcher", "mara"]) {
    const { scene, animations } = await geometryAsset(name),
      mixer = new T.AnimationMixer(scene);
    for (const animation of ["Idle", "Run", "Walk"]) {
      mixer.stopAllAction();
      const clip = animations.find((a) => a.name === animation);
      assert.ok(clip);
      mixer.clipAction(clip).play();
      for (const fraction of [0.15, 0.45, 0.75]) {
        mixer.setTime(clip.duration * fraction);
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4,
            dx = Math.sin(angle),
            dz = Math.cos(angle);
          faceMovement(scene, dx, dz);
          scene.updateMatrixWorld(true);
          const face = position(scene, "Bip01_LEye")
            .add(position(scene, "Bip01_REye"))
            .multiplyScalar(0.5)
            .sub(position(scene, "Bip01_Head"))
            .setY(0)
            .normalize();
          assert.ok(
            face.dot(new T.Vector3(dx, 0, dz)) > 0.85,
            `${name} ${animation} faces its travel direction`,
          );
        }
      }
    }
    scene.rotation.y = 0;
    mixer.stopAllAction();
    mixer.clipAction(animations.find((a) => a.name === "Idle")).play();
    mixer.setTime(0.5);
    const bounds = visibleBounds(scene),
      height = bounds.getSize(new T.Vector3()).y;
    assert.ok(
      height > (name === "mara" ? 1.8 : 1.9) && height < 2.2,
      `${name} has human physical scale (${height})`,
    );
    assert.ok(Math.abs(bounds.min.y) < 0.15, `${name} stands on the floor`);
    const head = position(scene, "Bip01_Head"),
      hand = position(scene, "Bip01_L_Hand");
    assert.ok(
      hand.y < head.y - 0.5,
      `${name} idle arms hang naturally, without an A-pose`,
    );
    const knee = scene.getObjectByName("Bip01_L_Calf");
    assert.ok(knee);
    mixer.stopAllAction();
    const run = animations.find((a) => a.name === "Run");
    mixer.clipAction(run).play();
    mixer.setTime(run.duration * 0.2);
    const first = knee.quaternion.clone();
    let motion = 0;
    // Sample the whole stride: symmetric phases can happen to have the same
    // knee angle in a different actor's native run cycle.
    for (let i = 0; i < 10; i++) {
      mixer.setTime((run.duration * i) / 10);
      motion = Math.max(motion, first.angleTo(knee.quaternion));
    }
    assert.ok(motion > 0.3, `${name} run actually articulates the legs`);
  }
});
test("large spiders have eight independently articulated legs and grounded feet", () => {
  const spider = skitter();
  assert.equal(spider.userData.legs.length, 8);
  spider.updateMatrixWorld(true);
  const size = new T.Box3().setFromObject(spider).getSize(new T.Vector3());
  assert.ok(size.x > 3.4 && size.x < 4);
  assert.ok(size.z > 3);
  const first = spider.userData.legs[0].segments[2].quaternion.clone();
  for (let i = 1; i < 12; i++) animateSkitter(spider, i * 0.05, 1);
  assert.ok(
    first.angleTo(spider.userData.legs[0].segments[2].quaternion) > 0.01,
  );
  for (const leg of spider.userData.legs) {
    assert.equal(leg.segments.length, 3);
    assert.ok(
      leg.segments.every((m) => Number.isFinite(m.scale.y) && m.scale.y > 0),
    );
  }
  animateSkitter(spider, 1, 0, true);
  assert.equal(spider.scale.x, 1);
  assert.ok(spider.userData.body.position.y < 0);
  animateSkitter(spider, 2, 0, false, true);
  assert.equal(spider.scale.x, 1);
});
