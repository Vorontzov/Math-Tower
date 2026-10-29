"""Original institute android mesh on the MIT Rocketbox rig; requires explorer.glb.
Run: blender -b --python tools/build-android.py
Coordinates below are metres in Blender's Z-up basis, facing -Y.
"""

import bpy, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "assets/realism/explorer.glb"))
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
for o in list(bpy.data.objects):
    if o.type == "MESH":
        bpy.data.objects.remove(o, do_unlink=True)
rig.animation_data.action = None
for b in rig.pose.bones:
    b.matrix_basis.identity()
bpy.context.view_layer.update()


def material(name, color, metal, rough, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Metallic"].default_value = metal
    bs.inputs["Roughness"].default_value = rough
    if emission:
        bs.inputs["Emission Color"].default_value = (*color, 1)
        bs.inputs["Emission Strength"].default_value = emission
    return m


ceramic = material("Ivory ceramic shell", (0.55, 0.58, 0.55), 0.42, 0.32)
metal = material("Brushed titanium", (0.22, 0.26, 0.28), 0.85, 0.25)
seal = material("Graphite elastomer", (0.025, 0.031, 0.035), 0.12, 0.75)
black = material("Optical glass", (0.009, 0.025, 0.03), 0.68, 0.09)
copper = material("Copper actuator", (0.42, 0.25, 0.12), 0.82, 0.3)
light = material("Amber status diode", (0.85, 0.19, 0.025), 0.2, 0.2, 2)
parts = []


def finish(o, bone, mat):
    o.data.materials.clear()
    o.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    vg = o.vertex_groups.new(name=bone)
    vg.add(list(range(len(o.data.vertices))), 1, "REPLACE")
    parts.append(o)
    return o


def plate(name, p, size, bone, mat=ceramic, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = o.modifiers.new("Machined edge", "BEVEL")
    mod.width = bevel
    mod.segments = 3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = o.modifiers.new("Face normals", "WEIGHTED_NORMAL")
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o, bone, mat)


def orb(name, p, size, bone, mat=metal):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=20, ring_count=12, radius=1, location=p
    )
    o = bpy.context.object
    o.name = name
    o.scale = size
    for poly in o.data.polygons:
        poly.use_smooth = True
    return finish(o, bone, mat)


def tube(name, a, b, r, bone, mat=metal, r2=None):
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cone_add(
        vertices=16,
        radius1=r,
        radius2=r if r2 is None else r2,
        depth=d.length,
        location=(a + b) / 2,
    )
    o = bpy.context.object
    o.name = name
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = d.to_track_quat("Z", "Y")
    for poly in o.data.polygons:
        poly.use_smooth = True
    return finish(o, bone, mat)


def head(b):
    return rig.matrix_world @ rig.data.bones[b].head_local


def bolts(center, size, bone):
    for x in [-1, 1]:
        for z in [-1, 1]:
            p = Vector(center) + Vector(
                (x * size[0] * 0.37, -size[1] * 0.51, z * size[2] * 0.36)
            )
            tube("Recessed fastener", p, p + Vector((0, -0.006, 0)), 0.009, bone, metal)


for name, p, size, bone in [
    ("Pelvic frame", (0, 0, 1.03), (0.3, 0.2, 0.19), "Bip01 Pelvis"),
    ("Thorax", (0, 0.012, 1.49), (0.4, 0.22, 0.32), "Bip01 Spine2"),
    ("Sternum", (0, -0.12, 1.51), (0.2, 0.055, 0.23), "Bip01 Spine2"),
    ("Back power module", (0, 0.16, 1.48), (0.24, 0.11, 0.25), "Bip01 Spine2"),
    ("Cranium", (0, 0.0, 1.87), (0.22, 0.21, 0.25), "Bip01 Head"),
]:
    plate(name, p, size, bone)
    bolts(p, size, bone)
for i in range(4):
    tube(
        "Spinal flexure",
        (-0.08, 0.01, 1.16 + i * 0.055),
        (0.08, 0.01, 1.16 + i * 0.055),
        0.077,
        "Bip01 Spine1",
        seal,
    )
    for side in [-1, 1]:
        tube(
            "Torso actuator",
            (side * 0.13, -0.01, 1.15),
            (side * 0.16, -0.015, 1.33),
            0.025,
            "Bip01 Spine1",
            copper,
        )
tube("Neck bearing", (0, 0.01, 1.68), (0, 0.01, 1.8), 0.06, "Bip01 Neck")
plate(
    "Sensor bezel", (0, -0.115, 1.895), (0.198, 0.035, 0.085), "Bip01 Head", seal, 0.014
)
for x, r in [(-0.043, 0.027), (0.045, 0.021)]:
    tube(
        "Lens steel rim",
        (x, -0.125, 1.895),
        (x, -0.148, 1.895),
        r + 0.008,
        "Bip01 Head",
    )
    orb("Lens", (x, -0.152, 1.895), (r, 0.008, r), "Bip01 Head", black)
orb(
    "Acquisition diode",
    (0.077, -0.135, 1.85),
    (0.01, 0.008, 0.009),
    "Bip01 Head",
    light,
)
for i in range(4):
    plate(
        "Audio vent",
        (-0.046 + i * 0.03, -0.113, 1.79),
        (0.016, 0.008, 0.025),
        "Bip01 Head",
        seal,
        0.002,
    )
for side in ["L", "R"]:
    sign = 1 if side == "L" else -1
    for segment, nextseg, r in [
        ("UpperArm", "Forearm", 0.075),
        ("Forearm", "Hand", 0.065),
        ("Thigh", "Calf", 0.085),
        ("Calf", "Foot", 0.073),
    ]:
        b = "Bip01 " + side + " " + segment
        a = head(b)
        end = head("Bip01 " + side + " " + nextseg)
        d = end - a
        orb(segment + " joint", a, (r, r, r), b, seal)
        tube(
            segment + " bearing",
            a + Vector((-r, 0, 0)),
            a + Vector((r, 0, 0)),
            r * 0.65,
            b,
        )
        tube(segment + " load core", a + d * 0.13, a + d * 0.9, r * 0.58, b, metal)
        tube(
            segment + " shell",
            a + d * 0.24,
            a + d * 0.77,
            r * 1.12,
            b,
            ceramic,
            r2=r * 0.85,
        )
        offset = Vector((sign * r * 0.77, 0.025, 0))
        tube(
            segment + " piston",
            a + d * 0.15 + offset,
            a + d * 0.62 + offset,
            0.019,
            b,
            copper,
        )
        tube(
            segment + " piston sleeve",
            a + d * 0.52 + offset,
            a + d * 0.92 + offset,
            0.024,
            b,
            metal,
        )
        for f in [0.27, 0.72]:
            orb(
                "Shell rivet",
                a + d * f + Vector((0, -r, 0)),
                (0.012, 0.009, 0.012),
                b,
                metal,
            )
    b = "Bip01 " + side + " Foot"
    p = head(b)
    plate("Heel", p + Vector((0, 0.025, -0.04)), (0.14, 0.17, 0.12), b, seal)
    plate("Foot shell", p + Vector((0, -0.09, -0.035)), (0.16, 0.26, 0.11), b)
    plate("Tread", p + Vector((0, -0.07, -0.092)), (0.17, 0.3, 0.024), b, seal, 0.006)
    b = "Bip01 " + side + " Hand"
    p = head(b)
    plate("Palm", p + Vector((0, -0.015, -0.035)), (0.09, 0.065, 0.1), b, metal, 0.012)
    for i in range(4):
        a = p + Vector((-0.032 + i * 0.021, -0.02, -0.07))
        tube("Finger proximal", a, a + Vector((0, -0.03, -0.045)), 0.009, b)
        tube(
            "Finger distal",
            a + Vector((0, -0.03, -0.045)),
            a + Vector((0, -0.055, -0.046)),
            0.008,
            b,
            seal,
        )
    tube(
        "Thumb",
        p + Vector((sign * 0.045, -0.01, -0.02)),
        p + Vector((sign * 0.06, -0.05, -0.07)),
        0.013,
        b,
    )
# One skinned draw mesh with rigid weights, preserving the imported native clips.
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
o = bpy.context.object
o.name = "Institute android / rigid articulated shell"
mod = o.modifiers.new("Rocketbox skeleton", "ARMATURE")
mod.object = rig
o.parent = rig
o.matrix_parent_inverse = rig.matrix_world.inverted()
# Import creates NLA tracks named Idle, Run, Walk; export those same clips.
bpy.ops.export_scene.gltf(
    filepath=str(ROOT / "assets/realism/android.glb"),
    export_format="GLB",
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_skins=True,
    export_yup=True,
)
print("ANDROID", len(o.data.vertices), "vertices")
