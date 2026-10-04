"""Create an optimized GLB without flattening the editable source or interaction roots.
Run after visual review of the completed .blend.
"""
import bpy, json, struct, hashlib, math
from pathlib import Path
from collections import defaultdict
from mathutils import Vector
OUT=Path('/Users/kene/code/wattwhen-home-assets/assets/blender/wattwhen-home')
PUBLIC=Path('/Users/kene/code/wattwhen-home-assets/public/models')
source_scene=bpy.context.scene
root=bpy.data.objects['WW_Home']
def descendants(o):
    return [o]+[d for c in o.children for d in descendants(c)]
originals=descendants(root)
for o in originals:
    o.hide_render=False;o.hide_set(False)
for name in ['Window_Warm_Light','EV_Lamp_Pearl']:
    bpy.data.materials[name].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=0
for name in ['Status_Solar','Status_Battery','Status_EV','Status_Appliance']:
    bpy.data.materials[name].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=.2
if 'EV_Charge_Port' in bpy.data.objects:
    o=bpy.data.objects['EV_Charge_Port'];world=o.matrix_world.copy();o.parent=bpy.data.objects['EV_Vehicle'];o.matrix_world=world

# Reusable, in-file viewport controls require no installed add-on.
controls='''import bpy
def wattwhen_view(cutaway=False, solar=True, ev=True, battery=True, night=False):
    def visible(name, show):
        root=bpy.data.objects[name]
        for obj in [root]+list(root.children_recursive):
            obj.hide_set(not show)
            obj.hide_render=not show
    for name in ['Shell_Front','Shell_Right','Shell_Roof_Front','Shell_Roof_Back','Shell_UpperFloor']:
        visible(name, not cutaway)
    visible('System_Solar',solar and not cutaway)
    visible('System_EV',ev)
    visible('System_Battery',battery)
    node=bpy.data.materials['Window_Warm_Light'].node_tree.nodes['Principled BSDF']
    node.inputs['Emission Strength'].default_value=1.8 if night else 0
    for name in ['Status_Solar','Status_EV','Status_Battery','Status_Appliance']:
        bpy.data.materials[name].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=.85 if night else .2
wattwhen_view()
'''
t=bpy.data.texts.get('WattWhen_View_Controls.py') or bpy.data.texts.new('WattWhen_View_Controls.py');t.clear();t.write(controls)
source_scene['Cutaway_Hide']='Shell_Front, Shell_Right, Shell_Roof_Front, Shell_Roof_Back, Shell_UpperFloor, System_Solar'
source_scene['Runtime_Contract']='See integration.json and HANDOFF.md beside this blend.'

def unused(path):
    if not path.exists():return path
    for i in range(2,1000):
        candidate=path.with_name(path.stem+'-v'+str(i)+path.suffix)
        if not candidate.exists():return candidate
    raise RuntimeError('Version space exhausted')
# Open the delivered blend on its composed camera view.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type in {'CONSOLE','VIEW_3D'}:
            area.type='VIEW_3D'
            for space in area.spaces:
                if space.type=='VIEW_3D':
                    space.region_3d.view_perspective='CAMERA'
                    space.overlay.show_overlays=False
                    space.shading.type='MATERIAL'
blend_path=OUT/'wattwhen-home.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

# Evaluate modifiers into temporary meshes. The editable scene remains untouched.
deps=bpy.context.evaluated_depsgraph_get()
runtime_scene=bpy.data.scenes.new('TEMP_Runtime_Export')
copies={}
for o in originals:
    if o.type=='EMPTY':
        dup=bpy.data.objects.new('RT__'+o.name,None)
        runtime_scene.collection.objects.link(dup)
        copies[o]=dup
        for key in o.keys():dup[key]=o[key]
for o in originals:
    if o.type in {'MESH','CURVE'}:
        evaluated=o.evaluated_get(deps)
        data=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps)
        dup=bpy.data.objects.new('RT__'+o.name,data);runtime_scene.collection.objects.link(dup);copies[o]=dup
        for key in o.keys():dup[key]=o[key]
for o,dup in copies.items():
    dup.parent=copies.get(o.parent);dup.matrix_world=o.matrix_world.copy()
bpy.context.window.scene=runtime_scene
bpy.context.view_layer.update()
batches=defaultdict(list)
for original,dup in copies.items():
    if dup.type=='MESH':
        materials=tuple(m.name if m else '' for m in dup.data.materials)
        batches[(dup.parent.name if dup.parent else '',materials)].append(dup)
for (parent,mats),objects in batches.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    obj=bpy.context.view_layer.objects.active
    obj.name=parent+'__'+(mats[0] if mats else 'Geometry')
    obj.data.name=obj.name+'_Mesh'

triangles=0;vertices=0;mesh_count=0;primitive_count=0
for o in runtime_scene.objects:
    if o.type=='MESH':
        o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles);vertices+=len(o.data.vertices);mesh_count+=1
        primitive_count+=len(set(p.material_index for p in o.data.polygons))
        assert all(math.isfinite(v) for vert in o.data.vertices for v in vert.co),o.name
        assert all(len(set(p.vertices))>=3 for p in o.data.polygons),o.name

runtime_path=OUT/'runtime/wattwhen-home.glb'
bpy.ops.export_scene.gltf(filepath=str(runtime_path),export_format='GLB',use_selection=False,use_active_scene=True,
    export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,
    export_animations=False,export_materials='EXPORT',export_texcoords=False,export_normals=True)

# Remove temporary object-name prefixes in the glTF metadata, preserving binary bytes.
raw=runtime_path.read_bytes();magic,version,total=struct.unpack_from('<III',raw,0)
assert magic==0x46546c67 and version==2 and total==len(raw)
jsonlen,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
doc=json.loads(raw[20:20+jsonlen]);tail=raw[20+jsonlen:]
for bucket in ['nodes','meshes']:
    for entry in doc.get(bucket,[]):
        if entry.get('name','').startswith('RT__'):entry['name']=entry['name'][4:]
doc['asset']['copyright']='Original geometry created for WattWhen; no external assets.'
# Preserve an emissive hue even when daytime intensity is zero. Otherwise the
# glTF exporter omits it and a runtime intensity change cannot light the window.
emissive_names=['Window_Warm_Light','EV_Lamp_Pearl','Status_Solar','Status_Battery','Status_EV','Status_Appliance']
for material in doc.get('materials',[]):
    if material['name'] in emissive_names:
        shader=bpy.data.materials[material['name']].node_tree.nodes['Principled BSDF']
        material['emissiveFactor']=list(shader.inputs['Emission Color'].default_value)[:3]
        material.setdefault('extensions',{})['KHR_materials_emissive_strength']={'emissiveStrength':shader.inputs['Emission Strength'].default_value}
doc.setdefault('extensionsUsed',[]).append('KHR_materials_emissive_strength')

encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
result=struct.pack('<III',magic,version,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),kind)+encoded+tail
runtime_path.write_bytes(result)
public_path=PUBLIC/'wattwhen-home.glb';public_path.write_bytes(result)
digest=hashlib.sha256(result).hexdigest()
assert triangles<=150000,('Triangle budget exceeded',triangles)
assert primitive_count<=220,('Draw-call budget exceeded',primitive_count)
assert len(result)<=6*1024*1024,('Size budget exceeded',len(result))
names={n['name'] for n in doc['nodes'] if 'name' in n}
required=['WW_Home','System_Solar','Solar_RoofFront','Solar_Inverter','System_EV','EV_Vehicle','EV_Charger','System_Battery',
'Appliance_HeatPump','Appliance_Washer','Appliance_Dryer','Appliance_Dishwasher','Appliance_Immersion',
'Shell_Front','Shell_Right','Shell_Roof_Front','Shell_Roof_Back','Shell_UpperFloor']
assert all(n in names for n in required),set(required)-names
assert not any(n.startswith('PREVIEW') for n in names)
assert len(doc['scenes'])==1
assert sum(len(m['primitives']) for m in doc['meshes'])==primitive_count
assert sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])==triangles
assert not doc.get('cameras') and not doc.get('images') and not doc.get('textures')
assert 'KHR_lights_punctual' not in doc.get('extensions',{})

contract={
'asset':'WattWhen Home','version':'1.0','blend':blend_path.name,
'runtimeFile':str(public_path),'runtimeCopy':str(runtime_path.relative_to(OUT)),
'sha256':digest,'bytes':len(result),'triangles':triangles,'vertices':sum(doc['accessors'][p['attributes']['POSITION']]['count'] for m in doc['meshes'] for p in m['primitives']),'sourceEvaluatedVertices':vertices,
'meshNodes':mesh_count,'materialPrimitives':primitive_count,
'sourceUnits':'metres','blenderAxes':{'up':'+Z','front':'-Y'},'gltfAxes':{'up':'+Y','front':'+Z'},
'root':'WW_Home','suggestedInitialScaleForExistingHouse3D':1.0,
'recommendedCamera':{'type':'orthographic','position':[13,14,19],'target':[0,2.7,.3],'verticalSpan':15.94},
'optionalGroups':{'solar':'System_Solar','ev':'System_EV','battery':'System_Battery'},
'extraConfigGroups':{'heatpump':'Appliance_HeatPump'},
'selectableGroups':{'ev':'EV_Vehicle','battery':'System_Battery','heatpump':'Appliance_HeatPump','washer':'Appliance_Washer','dryer':'Appliance_Dryer','dishwasher':'Appliance_Dishwasher','immersion':'Appliance_Immersion'},
'cutawayHide':['Shell_Front','Shell_Right','Shell_Roof_Front','Shell_Roof_Back','Shell_UpperFloor','System_Solar'],
'cutawayDependencies':{'Shell_Roof_Front':['Solar_RoofFront'],'Shell_Right':['Solar_Inverter']},
'nightMaterials':{'Window_Warm_Light':{'day':0,'night':1.8},'Status_Solar':{'day':.2,'night':.85},'Status_Battery':{'day':.2,'night':.85},'Status_EV':{'day':.2,'night':.85},'Status_Appliance':{'day':.2,'night':.85},'EV_Lamp_Pearl':{'day':0,'night':.6}},
'anchors':{k.replace('Anchor_',''):k for k in sorted(names) if k.startswith('Anchor_')},
'exportChecks':{'requiredNodes':True,'finiteGeometry':True,'sizeBudget':True,'triangleBudget':True,'drawCallBudget':True,'noLightsOrCameras':True,'noExternalTextures':True},
'integrationStatus':'Asset only. Existing React component unchanged; final app camera and interaction wiring need integration validation in a new worktree/branch.'
}
(OUT/'integration.json').write_text(json.dumps(contract,indent=2))
bpy.context.window.scene=source_scene
for o in list(runtime_scene.objects):bpy.data.objects.remove(o,do_unlink=True)
bpy.data.scenes.remove(runtime_scene)
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
(OUT/'runtime/export-result.json').write_text(json.dumps(contract,indent=2))
print('WATTWHEN EXPORT COMPLETE',json.dumps({'blend':str(blend_path),'glb':str(public_path),'triangles':triangles,'primitives':primitive_count,'bytes':len(result)}))
