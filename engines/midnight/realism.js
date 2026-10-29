import * as T from "../../vendor/three.module.js";
import { RGBELoader } from "../../vendor/addons/loaders/RGBELoader.js";
import { EffectComposer } from "../../vendor/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "../../vendor/addons/postprocessing/RenderPass.js";
import { OutputPass } from "../../vendor/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "../../vendor/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "../../vendor/addons/shaders/FXAAShader.js";

const textures = new Map();
function surface(kind) {
  if (textures.has(kind)) return textures.get(kind);
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  // The geometry tests use a minimal canvas stub, not a browser renderer.
  if (!ctx.createImageData) return null;
  let seed = kind === "metal" ? 419 : 83;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pixels = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4,
        grain = (random() - 0.5) * (kind === "metal" ? 18 : 35),
        cloud = Math.sin(x * 0.031) * Math.cos(y * 0.027) * 8,
        v = 218 + grain + cloud;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v;
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  ctx.lineWidth = kind === "metal" ? 0.4 : 0.65;
  for (let i = 0; i < (kind === "metal" ? 220 : 45); i++) {
    ctx.strokeStyle = `rgba(25,28,30,${random() * 0.12})`;
    const x = random() * 512,
      y = random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + random() * (kind === "metal" ? 160 : 35), y + random() * 12);
    ctx.stroke();
  }
  if (kind === "concrete") {
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = `rgba(25,28,30,${random() * 0.06})`;
      ctx.beginPath();
      ctx.ellipse(
        random() * 512,
        random() * 512,
        random() * 48 + 10,
        random() * 20 + 6,
        random() * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(kind === "metal" ? 2 : 3, kind === "metal" ? 2 : 3);
  map.anisotropy = 4;
  const bump = map.clone();
  bump.colorSpace = T.NoColorSpace;
  bump.needsUpdate = true;
  const value = { map, bump };
  textures.set(kind, value);
  return value;
}

export function groundedMaterial(color, roughness = 0.65, metalness = 0) {
  const c = new T.Color(color),
    hsl = {};
  c.getHSL(hsl);
  // Desaturated stone, oxidized metal and paint instead of toy-like primary colors.
  if (hsl.s > 0.22) c.setHSL(hsl.h, hsl.s * 0.48, hsl.l * 0.92);
  const material = new T.MeshStandardMaterial({
    color: c,
    roughness: Math.max(0.38, roughness),
    metalness,
  });
  const maps = surface(metalness > 0.45 ? "metal" : "concrete");
  if (maps) {
    material.map = maps.map;
    material.bumpMap = maps.bump;
    material.bumpScale = metalness > 0.45 ? 0.012 : 0.028;
  }
  material.userData.sharedMaps = true;
  return material;
}

export async function groundLighting(world) {
  const { renderer, scene, camera } = world;
  renderer.toneMappingExposure = 1.08;
  scene.background.set("#10171c");
  scene.fog.color.set("#17232b");
  scene.fog.density = 0.015;
  scene.traverse((o) => {
    if (o.isHemisphereLight) {
      o.intensity = 0.65;
      o.color.set("#b6c6d0");
      o.groundColor.set("#242b2d");
    } else if (o.isDirectionalLight) {
      o.intensity = o.castShadow ? 2.6 : 0.65;
      o.color.set(o.castShadow ? "#d4d9d5" : "#8ca9bc");
    }
  });
  try {
    const hdr = await new RGBELoader().loadAsync(
      new URL("../../assets/realism/institute-light.hdr", import.meta.url).href,
    );
    const pmrem = new T.PMREMGenerator(renderer);
    const target = pmrem.fromEquirectangular(hdr);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.42;
    hdr.dispose();
    pmrem.dispose();
  } catch {
    /* Textured direct lighting remains usable if the optional light probe fails. */
  }
  const sky = await new T.TextureLoader().loadAsync(
    new URL("../../assets/realism/campus-night.png", import.meta.url).href,
  );
  sky.colorSpace = T.SRGBColorSpace;
  sky.mapping = T.EquirectangularReflectionMapping;
  world.nightSky = sky;
  const originalEnter = world.enter.bind(world),
    backgroundColor = new T.Color("#142028");
  world.enter = (room) => {
    scene.background = backgroundColor;
    originalEnter(room);
    scene.traverse((o) => {
      if (o.isDirectionalLight)
        o.intensity = o.castShadow ? (room === "roof" ? 2.6 : 1.8) : 0.65;
    });
    if (room === "roof") {
      world.city.visible = false;
      scene.background = sky;
      scene.backgroundIntensity = 0.75;
      scene.backgroundRotation.y = 0.5;
    }
  };
  // Fade the near wall as in third-person games, retaining a readable actor silhouette.
  for (const group of [world.museum])
    group.traverse((o) => {
      if (o.isMesh && o.position.x > 14 && o.scale.y > 5) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.18;
        o.material.depthWrite = false;
      }
    });
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Keep a single tone-map / antialias chain on every viewport. The optional
  // HDR bloom chain produced black render tiles on some WebGL implementations.
  composer.addPass(new OutputPass());
  const antialias = new ShaderPass(FXAAShader);
  composer.addPass(antialias);
  const originalResize = world.resize;
  world.resize = () => {
    originalResize();
    const w = renderer.domElement.clientWidth,
      h = renderer.domElement.clientHeight;
    composer.setSize(w, h);
    antialias.material.uniforms.resolution.value.set(
      1 / (w * renderer.getPixelRatio()),
      1 / (h * renderer.getPixelRatio()),
    );
  };
  world.resize();
  world.render = () => composer.render();
}
