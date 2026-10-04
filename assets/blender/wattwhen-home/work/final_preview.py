import bpy,json
from pathlib import Path
out=Path(bpy.data.filepath).parent
root=bpy.data.objects['WW_Home']
assert len(root.children_recursive)>900
assert not bpy.data.images or all(i.source in {'GENERATED','VIEWER'} for i in bpy.data.images)
bpy.context.scene.camera=bpy.data.objects['Camera_Hero']
bpy.context.scene.render.filepath=str(out/'renders/05-final-exterior.png')
bpy.context.scene.cycles.samples=48
bpy.ops.render.render(write_still=True)
print('FINAL EDITABLE SOURCE REOPENED AND RENDERED',len(root.children_recursive))
