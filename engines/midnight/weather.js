import * as T from "../../vendor/three.module.js";
import { box, rod, mat } from "./actors.js";
export function createStorm(roof) {
  const count = 2800,
    data = new Float32Array(count * 6),
    seeds = [];
  for (let i = 0; i < count; i++) {
    const x = ((i * 17.173) % 44) - 22,
      y = (i * 1.337) % 26,
      z = ((i * 9.319) % 40) - 20;
    seeds.push([x, y, z]);
    data.set([x, y, z, x, y - 0.6, z], i * 6);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.BufferAttribute(data, 3));
  const rain = new T.LineSegments(
    geometry,
    new T.LineBasicMaterial({
      color: "#adbdc5",
      transparent: true,
      opacity: 0.31,
      depthWrite: false,
    }),
  );
  roof.add(rain);
  const water = new T.MeshPhysicalMaterial({
    color: "#53616a",
    metalness: 0.4,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.07,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const clock = { value: 0 };
  water.onBeforeCompile = (shader) => {
    shader.uniforms.stormTime = clock;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 wetPosition;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nwetPosition=position;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float stormTime;varying vec3 wetPosition;",
      )
      .replace(
        "#include <normal_fragment_maps>",
        "#include <normal_fragment_maps>\nnormal.xy += vec2(sin(wetPosition.x*37.0+stormTime*5.0),cos(wetPosition.y*43.0-stormTime*6.0))*.045;normal=normalize(normal);",
      );
  };
  for (let i = 0; i < 28; i++) {
    const shape = new T.Shape();
    for (let j = 0; j <= 48; j++) {
      const a = (j / 48) * Math.PI * 2,
        r = 0.9 + Math.sin(a * 3 + i) * 0.13 + Math.sin(a * 7) * 0.06;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      if (j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    const pool = new T.Mesh(new T.ShapeGeometry(shape), water);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-15 + ((i * 5.13) % 30), 0.006, -12 + ((i * 7.31) % 25));
    pool.scale.set(1.4 + (i % 3), 0.8 + (i % 2) * 0.6, 1);
    pool.receiveShadow = true;
    roof.add(pool);
  }
  const rings = new T.InstancedMesh(
      new T.TorusGeometry(1, 0.018, 4, 16),
      new T.MeshBasicMaterial({
        color: "#a8b7ba",
        transparent: true,
        opacity: 0.17,
        depthWrite: false,
      }),
      170,
    ),
    matrix = new T.Matrix4(),
    q = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, 0));
  roof.add(rings);
  const splash = new T.InstancedMesh(
    new T.ConeGeometry(0.04, 0.15, 4, 1, true),
    new T.MeshBasicMaterial({
      color: "#bdcbd0",
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    }),
    120,
  );
  roof.add(splash);
  // Windsock is a segmented tapered fabric sleeve, responding to the same gust.
  const pole = mat("#838c8a", 0.4, 0.7);
  rod(roof, pole, [14, 0, 11], [14, 4, 11], 0.045);
  const sock = new T.Group();
  sock.position.set(14, 3.9, 11);
  roof.add(sock);
  const segments = [];
  for (let i = 0; i < 7; i++) {
    const m = new T.Mesh(
      new T.CylinderGeometry(
        0.2 - i * 0.018,
        0.2 - (i + 1) * 0.018,
        0.26,
        12,
        1,
        true,
      ),
      mat(i % 2 ? "#c2beb0" : "#a25b3d", 0.93),
    );
    m.rotation.z = Math.PI / 2;
    m.position.x = i * 0.25;
    segments.push(m);
    sock.add(m);
  }
  const spray = new T.InstancedMesh(
    new T.PlaneGeometry(0.2, 0.07),
    new T.MeshBasicMaterial({
      color: "#a5bbc2",
      transparent: true,
      opacity: 0.12,
      side: T.DoubleSide,
      depthWrite: false,
    }),
    160,
  );
  roof.add(spray);
  return {
    rain,
    data,
    update(time, dt, helicopter) {
      clock.value = time;
      const gust =
        4.8 + Math.sin(time * 0.71) * 1.8 + Math.sin(time * 1.77) * 0.8;
      for (let i = 0; i < count; i++) {
        let k = i * 6;
        data[k] += dt * gust;
        data[k + 1] -= dt * 22;
        data[k + 2] += dt * 1.8;
        if (data[k + 1] < 0) {
          data[k + 1] = 24;
          data[k] = seeds[i][0];
          data[k + 2] = seeds[i][2];
        }
        data[k + 3] = data[k] - 0.027 * gust;
        data[k + 4] = data[k + 1] - 0.68;
        data[k + 5] = data[k + 2] - 0.06;
      }
      geometry.attributes.position.needsUpdate = true;
      for (let i = 0; i < 170; i++) {
        const f = (time * 1.7 + i * 0.137) % 1,
          r = 0.03 + f * 0.28;
        matrix.compose(
          new T.Vector3(
            -16 + ((i * 3.317) % 32),
            0.009,
            -13 + ((i * 7.177) % 27),
          ),
          q,
          new T.Vector3(r, r, r),
        );
        rings.setMatrixAt(i, matrix);
      }
      rings.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 120; i++) {
        const f = (time * 2.1 + i * 0.37) % 1;
        matrix.compose(
          new T.Vector3(
            -16 + ((i * 3.71) % 32),
            0.06 + Math.sin(f * Math.PI) * 0.05,
            -13 + ((i * 6.17) % 27),
          ),
          new T.Quaternion(),
          new T.Vector3(1, (1 - f) * 1.4, 1),
        );
        splash.setMatrixAt(i, matrix);
      }
      splash.instanceMatrix.needsUpdate = true;
      sock.rotation.y = 0.5 + Math.sin(time * 0.6) * 0.18;
      segments.forEach((s, i) => {
        s.position.y =
          (Math.sin(time * 7 - i * 0.7) * 0.045 * i) / 6 - i * 0.014;
        s.rotation.z = Math.PI / 2 + Math.cos(time * 7 - i * 0.7) * 0.09;
      });
      const power =
        Math.min(1, (helicopter.userData.rotorSpeed || 0) / 25) *
        Math.max(0, 1 - helicopter.position.y / 12);
      spray.visible = power > 0.08;
      for (let i = 0; i < 160; i++) {
        const a = i * 2.399,
          f = (time * 0.7 + i * 0.137) % 1,
          r = 2 + f * 6;
        matrix.compose(
          new T.Vector3(
            helicopter.position.x + Math.cos(a) * r,
            0.1 + Math.sin(f * Math.PI) * 0.5 * power,
            helicopter.position.z + Math.sin(a) * r,
          ),
          new T.Quaternion().setFromEuler(new T.Euler(0, -a, 0)),
          new T.Vector3(power * 2, 1 - f, 1),
        );
        spray.setMatrixAt(i, matrix);
      }
      spray.instanceMatrix.needsUpdate = true;
    },
  };
}

export function landingMotion(f, reduced = false) {
  const descent = Math.max(0, 1 - f / 0.74),
    impact = Math.max(0, Math.min(1, (f - 0.74) / 0.26));
  return {
    y:
      0.01 +
      descent * 6 +
      Math.abs(Math.sin(impact * Math.PI * 2)) * Math.exp(-impact * 4) * 0.28,
    roll: reduced
      ? 0
      : descent > 0
        ? Math.sin(f * 22) * 0.09
        : Math.sin(impact * 14) * 0.065 * Math.exp(-impact * 3) * (1 - impact),
    pitch: reduced
      ? 0
      : descent * 0.06 -
        Math.sin(impact * 12) * 0.045 * Math.exp(-impact * 3) * (1 - impact),
    contact: f >= 0.74,
  };
}
