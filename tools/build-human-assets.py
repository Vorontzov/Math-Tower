"""Convert selected MIT Rocketbox actors and native clips to local game GLBs."""

import math
import sys

import bpy
from pathlib import Path
from mathutils import Vector, Quaternion

if "--" not in sys.argv or len(sys.argv[sys.argv.index("--") + 1 :]) != 2:
    raise SystemExit("Usage: blender -b --python tools/build-human-assets.py -- ROCKETBOX_CHECKOUT OUTPUT_DIR")
args = sys.argv[sys.argv.index("--") + 1 :]
BASE = Path(args[0]) / "Assets"
OUT = Path(args[1])
OUT.mkdir(parents=True, exist_ok=True)
for ident, out in [("02", "explorer"), ("03", "researcher")]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src = BASE / f"Avatars/Adults/Male_Adult_{ident}"
    bpy.ops.import_scene.fbx(filepath=str(src / f"Export/Male_Adult_{ident}.fbx"))
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    actorObjects = set(bpy.data.objects)
    meshes = [o for o in actorObjects if o.type == "MESH"]
    rig.animation_data_clear()
    for o in actorObjects:
        if o.type == "EMPTY":
            bpy.data.objects.remove(o, do_unlink=True)
    for o in meshes:
        o.animation_data_clear()
    # Explicit PBR reconstruction: FBX's legacy diffuse multipliers blacken skin.
    for mat in bpy.data.materials:
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        nodes.clear()
        output = nodes.new("ShaderNodeOutputMaterial")
        bs = nodes.new("ShaderNodeBsdfPrincipled")
        mat.node_tree.links.new(bs.outputs["BSDF"], output.inputs["Surface"])
        bs.inputs["Roughness"].default_value = 0.77 if "head" in mat.name else 0.88
        color = src / "Textures" / (mat.name + "_color.tga")
        if color.exists():
            tex = nodes.new("ShaderNodeTexImage")
            tex.image = bpy.data.images.load(str(color), check_existing=True)
            mat.node_tree.links.new(tex.outputs["Color"], bs.inputs["Base Color"])
            if "opacity" in mat.name:
                mat.node_tree.links.new(tex.outputs["Alpha"], bs.inputs["Alpha"])
                mat.surface_render_method = "DITHERED"
        normal = src / "Textures" / (mat.name + "_normal.tga")
        if normal.exists():
            tex = nodes.new("ShaderNodeTexImage")
            tex.image = bpy.data.images.load(str(normal), check_existing=True)
            tex.image.colorspace_settings.name = "Non-Color"
            nm = nodes.new("ShaderNodeNormalMap")
            nm.inputs["Strength"].default_value = 0.65
            mat.node_tree.links.new(tex.outputs["Color"], nm.inputs["Color"])
            mat.node_tree.links.new(nm.outputs["Normal"], bs.inputs["Normal"])
        mat.name = (
            "FaceSkin"
            if "head" in mat.name
            else "Hair"
            if "opacity" in mat.name
            else "Clothing"
        )
    # Bound texture memory for browser/mobile GPUs; preserve the source artwork.
    for image in bpy.data.images:
        if image.size[0] > 1024 or image.size[1] > 1024:
            ratio = 1024 / max(image.size)
            image.scale(round(image.size[0] * ratio), round(image.size[1] * ratio))
    bpy.context.view_layer.update()
    restLocation = rig.location.copy()
    clips = []
    for name, folder, file in [
        ("Idle", "static", "m_idle_neutral_01"),
        ("Run", "xy", "m_run_neutral"),
        ("Walk", "xy", "m_walk_neutral"),
    ]:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.fbx(
            filepath=str(
                BASE / f"Animations/all_animations_max_motextr_{folder}/{file}.max.fbx"
            )
        )
        added = set(bpy.data.objects) - before
        animRig = next(o for o in added if o.type == "ARMATURE")
        sourceAction = animRig.animation_data.action
        start, end = map(round, sourceAction.frame_range)
        action = bpy.data.actions.new(name)
        rig.animation_data_create()
        rig.animation_data.action = action
        # Source animation skeletons have a different rest pose from the avatars.
        # Bake world-space bone orientations back into each avatar's local rest basis.
        # Copying their raw f-curves leaves the civilian standing in an A-pose.
        bpy.context.scene.frame_set(start)
        bpy.context.view_layer.update()
        sourceBase = animRig.matrix_world.translation.copy()
        alignment = (
            rig.matrix_world.to_quaternion().inverted()
            @ animRig.matrix_world.to_quaternion()
        )
        ordered = []

        def addBone(bone):
            ordered.append(bone)
            for child in bone.children:
                addBone(child)

        for bone in rig.data.bones:
            if not bone.parent:
                addBone(bone)
        rest = {
            bone.name: (
                (bone.parent.matrix_local.inverted() @ bone.matrix_local)
                if bone.parent
                else bone.matrix_local
            ).to_quaternion()
            for bone in ordered
        }
        for frame in range(start, end + 1):
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            posed = {}
            for bone in ordered:
                target = rig.pose.bones[bone.name]
                parent = posed[bone.parent.name] if bone.parent else Quaternion()
                if bone.name in animRig.pose.bones:
                    desired = (
                        alignment @ animRig.pose.bones[bone.name].matrix.to_quaternion()
                    )
                    basis = rest[bone.name].inverted() @ parent.inverted() @ desired
                else:
                    basis = Quaternion()
                    desired = parent @ rest[bone.name]
                posed[bone.name] = desired
                target.rotation_mode = "QUATERNION"
                target.rotation_quaternion = basis
                target.location = (0, 0, 0)
                target.scale = (1, 1, 1)
                target.keyframe_insert("rotation_quaternion", frame=frame)
            rig.location = restLocation.copy()
            rig.location.z += animRig.matrix_world.translation.z - sourceBase.z
            rig.keyframe_insert("location", index=2, frame=frame)
        clips.append(action)
        for o in added:
            bpy.data.objects.remove(o, do_unlink=True)
    rig.animation_data_create()
    rig.animation_data.action = clips[0]
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    # Normalize once in the exported asset: +Z is forward in the game.
    head = rig.matrix_world @ rig.pose.bones["Bip01 Head"].head
    eyes = (
        sum(
            (
                rig.matrix_world @ rig.pose.bones[n].head
                for n in ["Bip01 LEye", "Bip01 REye"]
            ),
            Vector(),
        )
        * 0.5
    )
    forward = eyes - head
    forward.z = 0
    forward.normalize()
    turn = -math.pi / 2 - math.atan2(forward.y, forward.x)
    root = bpy.data.objects.new("Human", None)
    bpy.context.collection.objects.link(root)
    for o in [rig] + meshes:
        if o.parent not in [rig] + meshes:
            world = o.matrix_world.copy()
            o.parent = root
            o.matrix_world = world
    root.rotation_euler.z = turn
    bpy.context.view_layer.update()
    points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
    height = max(p.z for p in points) - min(p.z for p in points)
    root.scale = (2.05 / height,) * 3
    bpy.context.view_layer.update()
    points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
    hips = rig.matrix_world @ rig.pose.bones["Bip01 Pelvis"].head
    root.location.x -= hips.x
    root.location.y -= hips.y
    root.location.z -= min(p.z for p in points)
    root["forward"] = "+Z"
    root["heightMetres"] = 2.05
    root["source"] = "Microsoft Rocketbox Male_Adult_" + ident
    rig.animation_data.action = clips[0]
    for clip in clips:
        clip.use_fake_user = True
    for action in list(bpy.data.actions):
        if action not in clips:
            bpy.data.actions.remove(action)
    print("CLIPS", [(a.name, len(a.fcurves)) for a in clips])
    bpy.ops.object.select_all(action="DESELECT")
    for o in [root, rig] + meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(OUT / (out + ".glb")),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_extras=True,
        export_image_format="AUTO",
        export_cameras=False,
        export_lights=False,
    )
    print(
        "EXPORTED",
        out,
        "turn",
        turn,
        "height",
        height,
        "bones",
        [b.name for b in rig.data.bones if "Arm" in b.name],
    )
