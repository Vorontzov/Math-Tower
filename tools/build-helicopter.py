"""Convert Heiko Schulz's GPL-2.0 EC135 AC3D source to local glTF.
Usage: blender -b --python tools/build-helicopter.py -- /path/to/ec135
The matching source archive and GPL text are distributed with the asset.
"""

import bpy, shlex, sys, math
from pathlib import Path
from mathutils import Matrix, Vector

SOURCE = Path(sys.argv[sys.argv.index("--") + 1])
ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
cache = {}
created = []


class AC:
    def __init__(self, path):
        self.path = path
        self.lines = path.read_text(errors="replace").splitlines()
        self.i = 1
        self.materials = []
        while self.lines[self.i].startswith("MATERIAL"):
            self.materials.append(shlex.split(self.lines[self.i]))
            self.i += 1

    def line(self):
        s = self.lines[self.i]
        self.i += 1
        return s

    def object(self, parent=Matrix.Identity(4), prefix=""):
        typ = self.line().split()[1]
        name = typ
        loc = Vector((0, 0, 0))
        rot = Matrix.Identity(4)
        verts = []
        surfaces = []
        texture = None
        repeat = [1, 1]
        while self.i < len(self.lines):
            line = self.line()
            p = shlex.split(line)
            if not p:
                continue
            k = p[0]
            if k == "name":
                name = p[1]
            elif k == "data":
                self.line()
            elif k == "loc":
                loc = Vector([float(x) for x in p[1:4]])
            elif k == "rot":
                rot = Matrix(
                    [
                        [float(x) for x in p[1:4]],
                        [float(x) for x in p[4:7]],
                        [float(x) for x in p[7:10]],
                    ]
                ).to_4x4()
            elif k == "texture":
                texture = p[1]
            elif k == "texrep":
                repeat = [float(x) for x in p[1:3]]
            elif k == "numvert":
                verts = [
                    [float(v) for v in self.line().split()] for _ in range(int(p[1]))
                ]
            elif k == "numsurf":
                for _ in range(int(p[1])):
                    flag = int(self.line().split()[1], 0)
                    m = 0
                    v = self.line().split()
                    if v[0] == "mat":
                        m = int(v[1])
                        v = self.line().split()
                    refs = [self.line().split() for _ in range(int(v[1]))]
                    if flag & 15 == 0 and len(refs) > 2:
                        surfaces.append(
                            (
                                m,
                                [
                                    (
                                        int(r[0]),
                                        float(r[1]) * repeat[0],
                                        float(r[2]) * repeat[1],
                                    )
                                    for r in refs
                                ],
                            )
                        )
            elif k == "kids":
                matrix = parent @ Matrix.Translation(loc) @ rot
                if verts and surfaces:
                    self.mesh(name, verts, surfaces, texture, matrix, prefix)
                for _ in range(int(p[1])):
                    self.object(matrix, prefix)
                return

    def mesh(self, name, verts, surfaces, texture, matrix, prefix):
        skip = {
            "BigRadom",
            "DoubleCargoHook",
            "EmergFloats",
            "IBF",
            "Loudspeaker",
            "highskid",
            "longskid_floats",
            "midskid",
            "multifunctioncarrier",
            "nosefl",
            "reardoor_win.L",
            "reardoor_win.R",
            "roundstep",
            "sandfilter",
            "smallradom",
            "snowboard_highskid",
            "snowboard_lowskid",
            "snowboard_midskid",
            "triangle",
            "winch",
            "winchfix",
            "winchhook",
            "windscreen_tri",
            "wirecutter_highskid",
            "wirecutter_midskid",
            "FLIR",
            "Hellas",
            "Plane.001X0",
            "Plane.001X1",
            "Plane.003X",
            "rotor_disc_T",
            "searchlight_fronthold",
            "searchlight_lefthold",
            "Cube.001",
        }
        if name in skip or any(s in name for s in [".flare", ".glare", "blur"]):
            return
        if (
            prefix == "rotor"
            and not name.startswith("blade")
            and name
            not in [
                "blade1",
                "blade2",
                "blade3",
                "blade4",
                "pitchlink1",
                "pitchlink2",
                "pitchlink3",
                "pitchlink4",
                "mastandswashplate",
                "scissor",
            ]
        ):
            return
        points = []
        for v in verts:
            a = matrix @ Vector(v)
            points.append((-a.z, a.x, a.y))  # AC3D Y-up -> Blender Z-up
        me = bpy.data.meshes.new(name)
        me.from_pydata(points, [], [[r[0] for r in refs] for m, refs in surfaces])
        me.update()
        ob = bpy.data.objects.new(prefix + "_" + name, me)
        bpy.context.collection.objects.link(ob)
        created.append(ob)
        mats = {}
        for i, (mi, refs) in enumerate(surfaces):
            key = (mi, texture)
            if key not in mats:
                mats[key] = len(me.materials)
                me.materials.append(self.material(mi, texture, name))
            me.polygons[i].material_index = mats[key]
            me.polygons[i].use_smooth = True
        uv = me.uv_layers.new(name="UVMap")
        for poly, (_, refs) in zip(me.polygons, surfaces):
            for loop, r in zip(poly.loop_indices, refs):
                uv.data[loop].uv = (r[1], r[2])

    def material(self, i, tex, name):
        p = self.materials[i]
        isglass = any(s in name.lower() for s in ["glas", "windscreen", "rearwin"])
        key = (str(self.path), i, tex, isglass)
        if key in cache:
            return cache[key]
        rgb = [float(x) for x in p[p.index("rgb") + 1 : p.index("rgb") + 4]]
        trans = float(p[p.index("trans") + 1])
        m = bpy.data.materials.new(
            ("Cockpit glass" if isglass else p[1]) + " / " + (tex or "plain")
        )
        m.use_nodes = True
        n = m.node_tree.nodes
        bs = n.get("Principled BSDF")
        bs.inputs["Base Color"].default_value = (*rgb, 1 - trans)
        bs.inputs["Roughness"].default_value = 0.3
        bs.inputs["Metallic"].default_value = 0.25
        if isglass:
            bs.inputs["Base Color"].default_value = (0.35, 0.5, 0.55, 0.18)
            bs.inputs["Alpha"].default_value = 0.18
            bs.inputs["Roughness"].default_value = 0.09
            m.surface_render_method = "DITHERED"
            m.use_backface_culling = False
        elif tex and (self.path.parent / tex).exists():
            image = bpy.data.images.load(
                str(self.path.parent / tex), check_existing=True
            )
            if max(image.size) > 2048:
                image.scale(2048, 2048)
            t = n.new("ShaderNodeTexImage")
            t.image = image
            m.node_tree.links.new(t.outputs["Color"], bs.inputs["Base Color"])
        cache[key] = m
        return m


for file in ["ec135.ac", "interior.ac", "flightdeck.ac"]:
    AC(SOURCE / "Models" / file).object(prefix=file.split(".")[0])
# Main rotor is a separate FlightGear submodel with its published offset.
AC(SOURCE / "Models/rotors/mainrotor.ac").object(
    Matrix.Translation((3.023, 1.801, 0)), prefix="rotor"
)
pts = [o.matrix_world @ Vector(c) for o in created for c in o.bound_box]
print("BOUNDS", [(min(v[i] for v in pts), max(v[i] for v in pts)) for i in range(3)])
# Origin at mast, skids on ground. Preserve native scale (metres).
bottom = min(
    v.z
    for o in created
    if "lowskid" in o.name
    for v in [o.matrix_world @ Vector(c) for c in o.bound_box]
)
for o in created:
    o.location.y -= 3.023
    o.location.z -= bottom
print("GROUND OFFSET", -bottom)
bpy.context.view_layer.update()
# Rotate the rigid rotor assembly in runtime around this exact pivot.
pivot = bpy.data.objects.new("MainRotor", None)
bpy.context.collection.objects.link(pivot)
pivot.location = (0, 0, 1.801 - bottom)
bpy.context.view_layer.update()
for o in created:
    if o.name.startswith("rotor_"):
        matrix = o.matrix_world.copy()
        o.parent = pivot
        o.matrix_world = matrix
bpy.ops.export_scene.gltf(
    filepath=str(ROOT / "assets/realism/helicopter.glb"),
    export_format="GLB",
    export_animations=False,
    export_yup=True,
)
