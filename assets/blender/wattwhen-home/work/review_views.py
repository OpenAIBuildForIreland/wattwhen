"""Refinements and verification views, executed through Blender's UI console."""
from pathlib import Path
import bpy, json
from mathutils import Vector
OUT=Path('/Users/kene/code/wattwhen-home-assets/assets/blender/wattwhen-home')
scene=bpy.context.scene
ROOT=bpy.data.objects['WW_Home']
def tree(o):
    return [o]+[desc for child in o.children for desc in tree(child)]
def show(name,visible):
    for o in tree(bpy.data.objects[name]):
        o.hide_render=not visible;o.hide_set(not visible)
def preset(cutaway=False,solar=True,ev=True,battery=True,night=False):
    for name in ['Shell_Front','Shell_Right','Shell_Roof_Front','Shell_Roof_Back','Shell_UpperFloor']:
        show(name,not cutaway)
    show('System_Solar',solar and not cutaway)
    show('System_EV',ev);show('System_Battery',battery)
    bpy.data.materials['Window_Warm_Light'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=1.8 if night else 0
    for name in ['Status_Solar','Status_Battery','Status_EV','Status_Appliance']:
        bpy.data.materials[name].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.85 if night else .2
    for name,f in [('Key',1),('Fill',1),('Rim',1)]:
        base={'Key':2100,'Fill':1550,'Rim':2200}[name]
        bpy.data.lights['PREVIEW_'+name].energy=base*(.18 if night else 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.12 if night else .35

# Keep charger and battery physically supported in the cutaway as well.
o=bpy.data.objects['Equipment_Service_Pier'];o.location.y=-.2;o.dimensions.y=1.8
bpy.context.view_layer.objects.active=o;o.select_set(True)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)

# Collection groups make the editable asset easy to browse.
asset_collection=bpy.data.collections.new('WATTWHEN • Editable Home');scene.collection.children.link(asset_collection)
for root in ROOT.children:
    coll=bpy.data.collections.new(root.name);asset_collection.children.link(coll)
    for o in tree(root):
        for prev in list(o.users_collection):prev.objects.unlink(o)
        coll.objects.link(o)
for prev in list(ROOT.users_collection):prev.objects.unlink(ROOT)
asset_collection.objects.link(ROOT)

scene.cycles.samples=32
scene.render.resolution_x=1400;scene.render.resolution_y=1200
scene.camera=bpy.data.objects['Camera_Hero']
def render(name):
    scene.render.filepath=str(OUT/'renders'/name);bpy.ops.render.render(write_still=True)
preset(cutaway=True)
render('02-cutaway-review.png')
preset(solar=False,ev=False,battery=False)
render('03-basic-home-review.png')
preset(night=True)
render('04-night-review.png')
preset()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'checkpoints/03-reviewed-home.blend'))
print('REVIEW VIEWS COMPLETE')
