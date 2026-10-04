"""WattWhen original geometry. Execute in Blender's Python console, then inspect.
Coordinate system: metres, Z up, facade toward -Y (glTF +Z).
"""
import bpy, math, random, json, os, bmesh
from pathlib import Path
from mathutils import Vector
from math import pi, sin, cos, atan2

OUT = Path('/Users/kene/code/wattwhen-home-assets/assets/blender/wattwhen-home')
random.seed(48)
if not (OUT/'checkpoints/preexisting-startup.blend').exists():
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'checkpoints/preexisting-startup.blend'), copy=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials):
    if not m.users: bpy.data.materials.remove(m)

def srgb(h):
    rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,)
def mat(name, color, rough=.7, metal=0, emit=None, strength=0):
    m=bpy.data.materials.new(name); m.diffuse_color=srgb(color); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=srgb(color)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    if emit:
        p.inputs['Emission Color'].default_value=srgb(emit)
        p.inputs['Emission Strength'].default_value=strength
    return m
M={
'render':mat('Render_Warm_Ivory','e3decf',.88),
'neighbour':mat('Render_Neighbour_Stone','c6c5b6',.92),
'trim':mat('Joinery_Chalk','f3f0e6',.63),
'stone':mat('Stone_Limestone','aaa594',.89),
'stone2':mat('Stone_Limestone_Light','bdb7a7',.91),
'roof':mat('Slate_BlueGrey','52666a',.85),
'roof2':mat('Slate_Quiet_Variation','4b5e62',.86),
'roof3':mat('Slate_Lighter_Variation','607175',.88),
'metal':mat('Metal_Zinc','657776',.53,.3),
'dark':mat('Detail_Deep_Green','293b36',.76),
'door':mat('Door_Sage_Green','597464',.72),
'brass':mat('Hardware_Brushed_Brass','c5af73',.43,.55),
'window':mat('Window_Glass_Smoke','69888b',.28,.2),
'windowlight':mat('Window_Warm_Light','d8c6a1',.5,0,'ffd69a',0),
'plinth':mat('Plinth_Forest_Stone','52665a',.94),
'grass':mat('Garden_Moss','819274',1),
'paving':mat('Paving_Warm_Grey','b9b9aa',.94),
'paving2':mat('Paving_Light_Edge','d0cbbc',.87),
'soil':mat('Garden_Soil','6e7560',1),
'leaf':mat('Leaves_Sage','6f896b',.95),
'leaf2':mat('Leaves_Light_Sage','91a782',.97),
'leaf3':mat('Leaves_Forest','4f6b55',.98),
'wood':mat('Timber_Weathered_Oak','9b9176',.95),
'bark':mat('Bark_Soft_Brown','776a52',1),
'pot':mat('Ceramic_Sand','bca184',.9),
'petal':mat('Flower_Soft_Cream','d9dcbe',.95),
'inside':mat('Interior_Plaster','ddd8c7',.9),
'tile':mat('Interior_Tile','b9c3b5',.9),
}
def group(name,parent=None,**extra):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o)
    o.empty_display_size=.3
    if parent:o.parent=parent
    for k,v in extra.items():o[k]=v
    return o
ROOT=group('WW_Home', asset='WattWhen Irish semi-detached home', version='1.0', units='metres', front='-Y in Blender; +Z in glTF')
G={}
for n in ['Landscape','House_Fixed','Shell_Front','Shell_Right','Shell_Roof_Front','Shell_Roof_Back','Shell_UpperFloor','Neighbour','Interior','System_Solar','System_EV','System_Battery','Appliance_HeatPump','Appliance_Washer','Appliance_Dryer','Appliance_Dishwasher','Appliance_Immersion','Anchors']:
    G[n]=group(n,ROOT)
for n in ['Shell_Front','Shell_Right','Shell_Roof_Front','Shell_Roof_Back','Shell_UpperFloor']:
    G[n]['cutawayHide']=True
for n in ['System_Solar','System_EV','System_Battery']:
    G[n]['optionalSetup']=n.replace('System_','').lower()
def finish(o,n,m,g,bevel=0):
    o.name=n
    if m:o.data.materials.append(M[m] if isinstance(m,str) else m)
    if g:o.parent=G[g] if isinstance(g,str) else g
    if bevel:
        mod=o.modifiers.new('Soft crafted edges','BEVEL');mod.width=bevel;mod.segments=2
        mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=40
    return o
def box(n,loc,dim,m,g,bevel=.025,rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object
    o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if rot:o.rotation_euler=rot
    return finish(o,n,m,g,bevel)
def mesh(n,verts,faces,m,g,bevel=0):
    me=bpy.data.meshes.new(n);me.from_pydata(verts,[],faces);me.update()
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
    o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o)
    return finish(o,n,m,g,bevel)
def cyl(n,loc,r,depth,m,g,rot=None,vertices=24,bevel=.015,r2=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=depth,location=loc)
    o=bpy.context.object
    if rot:o.rotation_euler=rot
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    return finish(o,n,m,g,bevel)
def sphere(n,loc,scale,m,g,sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc);o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,n,m,g)
def line(n,points,r,m,g,cyclic=False):
    cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.resolution_u=8;cu.bevel_depth=r;cu.bevel_resolution=2
    s=cu.splines.new('POLY');s.points.add(len(points)-1)
    for p,co in zip(s.points,points):p.co=(*co,1)
    s.use_cyclic_u=cyclic
    o=bpy.data.objects.new(n,cu);bpy.context.collection.objects.link(o);return finish(o,n,m,g)
def beam(n,a,b,r,m,g):
    v=Vector(b)-Vector(a);o=cyl(n,(Vector(a)+Vector(b))/2,r,v.length,m,g,vertices=12,bevel=.008)
    o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
def cut(wall,n,loc,dim):
    cutter=box(n+'_CUT',loc,dim,None,None,0)
    bpy.context.view_layer.objects.active=wall
    mod=wall.modifiers.new(n+'_Aperture','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    return {'id':n,'type':'door' if 'Door' in n else 'window','wall':wall.name,'center':list(loc),'dimensions':list(dim),'booleanApplied':True}
OPEN=[]

# Landscape: clean continuous terrain underneath all optional systems.
box('Landscape_Bevelled_Plinth',(0,-.25,-.30),(12.5,11,.6),'plinth','Landscape',.25)
box('Landscape_Turf_Substrate',(0,-.25,.025),(12.25,10.75,.13),'grass','Landscape',.16)
box('Driveway_Substrate',(4.4,-2.18,.118),(2.55,5.95,.08),'paving','Landscape',.1)
for x in [3.1,5.69]:box('Driveway_Stone_Edge',(x,-2.17,.145),(.10,5.94,.12),'paving2','Landscape',.022)
for y in [-4.6,-3.4,-2.2,-1,.2]:line('Driveway_Joint',[(3.19,y,.161),(5.6,y,.161)],.008,'stone','Landscape')
for i in range(6):box('Front_Path_Slab',(1.28,-4.77+i*.49,.145),(1.23,.46,.10),'paving2','Landscape',.035)
box('Front_Door_Step',(1.28,-2.05,.235),(1.48,.5,.25),'stone2','Landscape',.035)
box('Garden_Front_Bed',(-2.85,-3.77,.13),(4.8,1.65,.14),'soil','Landscape',.28)
box('Garden_Front_Lawn',(-1.98,-2.87,.12),(3.62,.82,.1),'grass','Landscape',.12)
for y in [-4.78,-3.0,-1.2,.6,2.4,4.15]:
    box('Boundary_Left_Stone_Pier',(-5.87,y,.45),(.3,.32,.76),'stone','Landscape',.025)
    box('Boundary_Left_Pier_Cap',(-5.87,y,.86),(.36,.38,.1),'stone2','Landscape',.025)
for y in [-3.9,-2.1,-.3,1.5,3.3]:box('Boundary_Left_Low_Wall',(-5.87,y,.35),(.22,1.58,.55),'stone','Landscape',.025)
for x in [-4.35,-2.6,-.9]:box('Boundary_Front_Wall',(x,-5.08,.32),(1.6,.22,.46),'stone','Landscape',.028)
box('Boundary_Front_Coping',(-2.62,-5.08,.59),(5.18,.31,.12),'stone2','Landscape',.025)
for x in [-5.48,-4.53,-3.58,-2.63,-1.68,-.73,.22,1.17,2.12,3.07,4.02,4.97,5.78]:
    box('Fence_Rear_Post',(x,4.7,.68),(.12,.13,1.16),'wood','Landscape',.015)
for z in [.47,.91]:box('Fence_Rear_Rail',(.14,4.7,z),(11.45,.09,.09),'wood','Landscape',.013)

# Real wall substrates with Exact Boolean apertures and thick reveals.
front=box('Facade_Front_Render',(0.10,-1.72,2.83),(5.2,.26,5.38),'render','Shell_Front',0)
right=box('Facade_Right_Render',(2.58,1.02,2.83),(.26,5.72,5.38),'render','Shell_Right',0)
box('Wall_Back_Render',(.1,3.75,2.83),(5.2,.26,5.38),'render','House_Fixed',.02)
box('Wall_Party_Structural',(-2.39,1.02,2.83),(.24,5.72,5.38),'inside','House_Fixed',.02)
box('Ground_Floor_Slab',(.1,1.0,.205),(5.15,5.6,.15),'inside','Interior',.015)
box('Upper_Floor_Slab',(.1,1.0,2.91),(5.15,5.6,.18),'wood','Shell_UpperFloor',.02)
box('Front_Stone_Base',(.1,-1.875,.33),(5.3,.08,.37),'stone','Shell_Front',.018)
box('Side_Stone_Base',(2.735,1.01,.33),(.08,5.8,.37),'stone','Shell_Right',.018)
for x in [-2.05,-1.35,-.65,.05,.75,1.45,2.15]:
    line('Base_Stone_Joint',[(x,-1.923,.17),(x,-1.923,.5)],.005,'stone2','Shell_Front')

def window(n,x,z,w,h,side=False,yy=None):
    # Local facade coordinate u, outward v, vertical z; back panes fill apertures.
    wall=right if side else front;g='Shell_Right' if side else 'Shell_Front'
    def P(u,v,zz):return (2.6-v,x+u,zz) if side else (x+u,-1.72+v,zz)
    def D(a,b,c):return (b,a,c) if side else (a,b,c)
    loc=P(0,0,z);OPEN.append(cut(wall,n,loc,D(w,.8,h)))
    box(n+'_Pane',P(0,-.04,z),D(w-.1,.055,h-.1),'window',g,.016)
    # Warm backing is its own night-controllable material, visible in narrow upper panes.
    box(n+'_WarmBacking',P(0,-.087,z+.23*h),D(w-.19,.018,h*.34),'windowlight',g,.008)
    for u in [-w/2+.045,w/2-.045]:box(n+'_Frame',P(u,-.155,z),D(.09,.11,h),'trim',g,.014)
    for zz in [z-h/2+.045,z+h/2-.045]:box(n+'_Frame',P(0,-.155,zz),D(w,.11,.09),'trim',g,.013)
    box(n+'_Mullion',P(0,-.17,z),D(.045,.10,h-.1),'trim',g,.008)
    box(n+'_Transom',P(0,-.171,z+.1*h),D(w-.12,.1,.04),'trim',g,.008)
    box(n+'_Limestone_Sill',P(0,-.19,z-h/2-.075),D(w+.24,.43,.13),'stone2',g,.023)
    box(n+'_Lintel',P(0,-.147,z+h/2+.06),D(w+.2,.06,.12),'trim',g,.015)
window('Front_Living_Window',-1.14,1.59,1.85,1.43)
window('Front_Bedroom_Left',-1.15,4.10,1.44,1.47)
window('Front_Bedroom_Right',1.34,4.10,1.28,1.47)
window('Side_Landing_Window',.20,4.11,1.17,1.34,True)
window('Side_Bedroom_Window',2.52,4.11,1.17,1.34,True)
OPEN.append(cut(front,'Front_Door',(1.28,-1.72,1.30),(1.05,.8,2.22)))
box('Front_Door_Leaf',(1.28,-1.76,1.30),(.99,.10,2.16),'door','Shell_Front',.025)
for x in [.71,1.85]:box('Front_Door_Architrave',(x,-1.895,1.31),(.13,.14,2.35),'trim','Shell_Front',.018)
box('Front_Door_Lintel',(1.28,-1.895,2.49),(1.28,.14,.14),'trim','Shell_Front',.016)
for x in [1.035,1.525]:
    box('Door_Lower_Recess',(x,-1.819,.89),(.36,.016,.95),'dark','Shell_Front',.035)
    box('Door_Raised_Panel',(x,-1.838,.9),(.30,.035,.87),'door','Shell_Front',.02)
    box('Door_Upper_Glass',(x,-1.825,1.90),(.34,.028,.54),'windowlight','Shell_Front',.025)
box('Door_Letterbox',(1.28,-1.848,1.47),(.25,.03,.046),'brass','Shell_Front',.01)
cyl('Door_Handle',(1.65,-1.868,1.18),.031,.05,'brass','Shell_Front',(pi/2,0,0),16,.008)
box('Door_Rain_Canopy',(1.28,-2.04,2.70),(1.47,.71,.10),'metal','Shell_Front',.035)
for x in [.8,1.76]:beam('Canopy_Bracket',(x,-1.87,2.38),(x,-2.24,2.65),.021,'metal','Shell_Front')

# Gables are closed triangular prisms; separate right gable for cutaway.
for x,g in [(2.58,'Shell_Right'),(-2.39,'House_Fixed')]:
    v=[(xx,yy,zz) for xx in [x-.13,x+.13] for yy,zz in [(-1.85,5.5),(3.89,5.5),(1.02,7.22)]]
    mesh('Gable_Thick_Render',v,[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],'render',g,.018)

# Attached neighbour as a quiet, abbreviated continuation of the same terrace.
box('Neighbour_Render',(-3.47,1.02,2.80),(1.94,5.72,5.32),'neighbour','Neighbour',.04)
for z in [1.62,4.1]:
    box('Neighbour_Recess',(-3.46,-1.86,z),(1.15,.055,1.38),'stone','Neighbour',.018)
    box('Neighbour_Glass',(-3.46,-1.899,z),(1.00,.028,1.22),'window','Neighbour',.012)
    for x in [-3.98,-2.94]:box('Neighbour_Frame',(x,-1.94,z),(.07,.07,1.33),'trim','Neighbour',.01)
    for zz in [z-.65,z+.65]:box('Neighbour_Frame',(-3.46,-1.94,zz),(1.13,.07,.07),'trim','Neighbour',.01)
    box('Neighbour_Mullion',(-3.46,-1.95,z),(.045,.07,1.3),'trim','Neighbour',.008)
    box('Neighbour_Sill',(-3.46,-1.98,z-.75),(1.29,.34,.12),'stone','Neighbour',.025)
x=-4.44
mesh('Neighbour_End_Gable',[(xx,yy,zz) for xx in [x-.08,x+.08] for yy,zz in [(-1.86,5.46),(3.9,5.46),(1.02,7.22)]],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],'neighbour','Neighbour',.02)

# Roof: solid decking remains beneath panels; shallow staggered slate courses.
slope=atan2(1.85,3.13);length=(3.13**2+1.85**2)**.5
for isfront in [True,False]:
    s=1 if isfront else -1;g='Shell_Roof_Front' if isfront else 'Shell_Roof_Back'
    cy=1.02-s*1.565
    box('Roof_Continuous_Deck',(.1,cy,6.335),(5.70,length,.13),'roof',g,.024,(s*slope,0,0))
    box('Neighbour_Roof_Deck',(-3.57,cy,6.335),(1.74,length,.13),'roof2','Neighbour',.021,(s*slope,0,0))
    for r in range(9):
        yy=-length/2+(r+.5)*length/9
        widths=[(-2.74,2.94,g),(-4.66,-2.76,'Neighbour')]
        for xa,xb,gg in widths:
            for c in range(12):
                a=xa+c*.53+(.26 if r%2 else 0);b=min(a+.515,xb)
                if a>=xb:continue
                if r%2 and c==0:
                    box('Slate_Course_Edge',(xa+.12,cy+yy*cos(slope),6.335+s*yy*sin(slope)+.092),(.235,length/9+.025,.035),'roof2',gg,.008,(s*slope,0,0))
                box('Slate_Course',((a+b)/2,cy+yy*cos(slope),6.335+s*yy*sin(slope)+.092),(b-a,length/9+.025,.035),random.choice(['roof','roof','roof2','roof3']),gg,.008,(s*slope,0,0))
    eaveY=1.02-s*3.16
    box('Eaves_Fascia',(-.86,eaveY,5.46),(7.68,.11,.19),'trim',g,.016)
    line('Zinc_Gutter',[(-4.75,eaveY-s*.09,5.42),(3.02,eaveY-s*.09,5.42)],.074,'metal',g)
for i in range(19):
    cyl('Slate_Ridge_Cap',(-4.5+i*.404,1.02,7.30),.115,.39,'roof3','Shell_Roof_Back',(0,pi/2,0),12,.012)
for x,g in [(2.98,'Shell_Right'),(-4.76,'Neighbour')]:
    line('Verge_Trim',[(x,-2.15,5.52),(x,1.02,7.39),(x,4.2,5.52)],.049,'metal',g)
for x,g in [(2.74,'Shell_Right'),(-2.50,'Shell_Front'),(-4.51,'Neighbour')]:
    line('Rainwater_Downpipe',[(x,-2.20,5.44),(x,-2.2,5.18),(x,-1.92,4.97),(x,-1.92,.44),(x,-2.10,.3)],.047,'metal',g)
    for z in [.75,2.5,4.5]:box('Pipe_Strap',(x,-1.9,z),(.14,.09,.045),'metal',g,.01)

# Shared chimney: lime render, stone cap, clay pots and restrained brick courses.
box('Chimney_Stack',(-2.13,1.28,7.17),(.65,.78,2.02),'stone2','House_Fixed',.025)
for z in [6.75,7.08,7.41,7.74]:box('Chimney_Course',(-2.13,1.28,z),(.661,.792,.025),'stone','House_Fixed',.006)
box('Chimney_Cap',(-2.13,1.28,8.20),(.84,.97,.14),'stone','House_Fixed',.023)
for y in [1.05,1.52]:
    cyl('Chimney_Pot',(-2.13,y,8.43),.132,.35,'pot','House_Fixed',vertices=20,bevel=.015,r2=.113)
    cyl('Chimney_Pot_Lip',(-2.13,y,8.60),.146,.08,'pot','House_Fixed',vertices=20,bevel=.008)
    cyl('Chimney_Pot_Dark_Opening',(-2.13,y,8.645),.103,.008,'dark','House_Fixed',vertices=20,bevel=0)

# Preview studio is explicitly excluded from the runtime asset.
STUDIO=group('PREVIEW_Studio')
floor=box('PREVIEW_Ground',(0,0,-.63),(200,200,.06),'dark',STUDIO,0)
def camera(n,loc,target,ortho):
    d=bpy.data.cameras.new(n);o=bpy.data.objects.new(n,d);bpy.context.collection.objects.link(o);o.location=loc
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=ortho;o.parent=STUDIO;return o
CAM=camera('Camera_Hero',(13,-19,14),(0,-.3,2.7),18.6)
bpy.context.scene.camera=CAM
for n,loc,power,size,col in [('Key',(-6,-9,15),2100,8,(1,.91,.76)),('Fill',(10,-2,11),1550,7,(.78,.89,1)),('Rim',(0,8,13),2200,7,(.93,1,.85))]:
    d=bpy.data.lights.new('PREVIEW_'+n,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=col
    o=bpy.data.objects.new('PREVIEW_'+n,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,2))-o.location).to_track_quat('-Z','Y').to_euler();o.parent=STUDIO
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.25,.32,.28,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.35
scene.render.resolution_x=1400;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene['WattWhen_Notes']='Original handmade geometry; preview studio excluded from GLB. Front -Y, glTF +Z. Model uses metres.'
(OUT/'openings.json').write_text(json.dumps(OPEN,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'checkpoints/01-architecture.blend'))
print('WATTWHEN ARCHITECTURE READY',len(bpy.data.objects))
