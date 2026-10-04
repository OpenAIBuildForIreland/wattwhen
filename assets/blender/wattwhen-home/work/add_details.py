"""Second modelling pass; uses helpers retained by build_home.py in Blender console."""
M.update({
'pv':mat('Solar_Photovoltaic_Blue','263e50',.36,.35),
'pvline':mat('Solar_Cell_Divisions','617985',.47,.35),
'aluminium':mat('Equipment_Aluminium','b3bcb7',.48,.45),
'enamel':mat('Equipment_Enamel','e5e8df',.61,.08),
'car':mat('EV_Pearl_Ivory','e3e3d6',.39,.25),
'carglass':mat('EV_Smoked_Glass','354f55',.24,.35),
'rubber':mat('Rubber_Charcoal','25332f',.89),
'steel':mat('Appliance_Brushed_Steel','9eaaa5',.48,.5),
'lamp':mat('EV_Lamp_Pearl','e8dfb8',.35,0,'ffe1a6',0),
'red':mat('EV_Rear_Lamps','a4735b',.48),
'statusSolar':mat('Status_Solar','c3eb9c',.4,0,'c3eb9c',.25),
'statusBattery':mat('Status_Battery','c3eb9c',.4,0,'c3eb9c',.25),
'statusEV':mat('Status_EV','c3eb9c',.4,0,'c3eb9c',.25),
'statusAppliance':mat('Status_Appliance','e8c982',.4,0,'e8c982',.15),
'copper':mat('Cylinder_Copper_Detail','b7966f',.52,.4),
})
for obj in [front,right]:
    mod=obj.modifiers.new('Soft render corners','BEVEL');mod.width=.018;mod.segments=2
    mod=obj.modifiers.new('Weighted render normals','WEIGHTED_NORMAL');mod.keep_sharp=True

# Eight framed panels; cells are restrained lines rather than high-poly grids.
PV=group('Solar_RoofFront',G['System_Solar'],hideWith='Shell_Roof_Front')
def PP(x,t,h=0):
    return (x,-2.11+t*cos(slope)-h*sin(slope),5.41+t*sin(slope)+h*cos(slope))
for col in range(4):
    for row in range(2):
        x=-1.77+col*1.19;t=.98+row*1.48
        panel=group('Solar_Panel_%02d'%(col*2+row+1),PV)
        box('Panel_Aluminium_Frame',PP(x,t,.20),(1.10,1.38,.067),'aluminium',panel,.021,(slope,0,0))
        box('Panel_PV_Surface',PP(x,t,.241),(1.023,1.303,.025),'pv',panel,.014,(slope,0,0))
        for dx in [-.34,-.17,0,.17,.34]:
            box('Panel_Cell_Seam',PP(x+dx,t,.257),(.009,1.27,.006),'pvline',panel,.001,(slope,0,0))
        for dt in [-.48,-.24,0,.24,.48]:
            box('Panel_Cell_Seam',PP(x,t+dt,.257),(1.0,.009,.006),'pvline',panel,.001,(slope,0,0))
        for dx in [-.39,.39]:
            for dt in [-.51,.51]:box('Panel_Mount',PP(x+dx,t+dt,.128),(.10,.17,.16),'metal',panel,.014,(slope,0,0))
INV=group('Solar_Inverter',G['System_Solar'],hideWith='Shell_Right')
box('Inverter_Mount',(2.758,1.19,1.73),(.10,.49,.79),'metal',INV,.018)
box('Inverter_Case',(2.927,1.19,1.73),(.27,.44,.72),'enamel',INV,.055)
box('Inverter_Status',(3.071,1.19,1.91),(.018,.17,.025),'statusSolar',INV,.006)
line('Solar_Conduit',[PP(2.25,2.9,.17),(2.83,.4,6.97),(2.84,1.15,5.35),(2.82,1.16,2.15)],.025,'metal',INV)

# EV body: lofted cross-sections, tapered cabin, individual unbranded vehicle.
EV=group('EV_Vehicle',G['System_EV'],selectableId='ev')
sections=[(-1.72,.57,.42,.72),(-1.48,.74,.35,.93),(-.87,.79,.34,1.01),(.78,.79,.34,1.01),(1.45,.72,.40,.95),(1.64,.59,.47,.77)]
v=[]
for y,w,b,t in sections:
    v.extend([(-w*.84,y,b),(-w,y,b+.16),(-w*.96,y,t-.10),(-w*.70,y,t),(w*.70,y,t),(w*.96,y,t-.10),(w,y,b+.16),(w*.84,y,b)])
faces=[tuple(range(7,-1,-1)),tuple(range((len(sections)-1)*8,len(sections)*8))]
for j in range(len(sections)-1):
    for i in range(8):faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
mesh('EV_Sculpted_Body',v,faces,'car',EV,.07)
cab=[(-.70,-.93,.96),(.70,-.93,.96),(.70,1.16,.97),(-.70,1.16,.97),(-.58,-.40,1.49),(.58,-.40,1.49),(.57,.72,1.48),(-.57,.72,1.48)]
mesh('EV_Glass_Cabin',cab,[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7),(0,3,2,1)],'carglass',EV,.045)
box('EV_Roof',(0,.15,1.501),(1.17,1.17,.07),'car',EV,.095)
for sign in [-1,1]:
    line('EV_Window_Surround',[(sign*.707,-.94,.981),(sign*.58,-.4,1.5),(sign*.579,.74,1.489),(sign*.712,1.17,.983)],.030,'car',EV)
    line('EV_B_Pillar',[(sign*.715,.27,.995),(sign*.589,.28,1.49)],.034,'rubber',EV)
    line('EV_Door_Shutline',[(sign*.798,-.66,.96),(sign*.81,-.65,.48),(sign*.806,.76,.46),(sign*.792,.94,.98)],.006,'metal',EV)
    box('EV_Flush_Handle',(sign*.797,.44,.90),(.017,.19,.035),'metal',EV,.01)
    box('EV_Wing_Mirror',(sign*.82,-.69,1.11),(.20,.19,.10),'car',EV,.047)
    box('EV_Mirror_Glass',(sign*.915,-.69,1.11),(.012,.13,.06),'carglass',EV,.015)
    box('EV_Sill',(sign*.768,.04,.35),(.09,2.35,.09),'dark',EV,.027)
    for y in [-1.08,1.08]:
        cyl('EV_Tyre',(sign*.753,y,.328),.32,.22,'rubber',EV,(0,pi/2,0),32,.035)
        cyl('EV_Alloy_Rim',(sign*.872,y,.328),.212,.021,'aluminium',EV,(0,pi/2,0),24,.018)
        cyl('EV_Rim_Well',(sign*.886,y,.328),.166,.016,'dark',EV,(0,pi/2,0),24,.007)
        for k in range(5):
            a=k*2*pi/5
            beam('EV_Alloy_Spoke',(sign*.9,y,.328),(sign*.9,y+.168*cos(a),.328+.168*sin(a)),.024,'aluminium',EV)
        cyl('EV_Wheel_Hub',(sign*.915,y,.328),.06,.014,'metal',EV,(0,pi/2,0),20,.006)
for x in [-.49,.49]:
    box('EV_Headlamp',(x,-1.695,.78),(.33,.055,.095),'lamp',EV,.04,(0,0,-x*.14))
    box('EV_Taillamp',(x,1.6,.83),(.24,.056,.11),'red',EV,.04)
box('EV_Front_Lower_Intake',(0,-1.736,.56),(.83,.06,.12),'dark',EV,.04)
box('EV_Front_Plate',(0,-1.775,.70),(.32,.027,.08),'trim',EV,.012)
box('EV_Rear_Plate',(0,1.665,.67),(.33,.024,.085),'trim',EV,.012)
line('EV_Hood_Seam',[(-.58,-1.48,.954),(-.61,-.92,1.055),(.61,-.92,1.055),(.58,-1.48,.954)],.007,'metal',EV)
EV.location=(4.33,-2.86,.166)
CH=group('EV_Charger',G['System_EV'])
box('EV_Charger_Mount',(2.772,-.8,1.36),(.12,.33,.60),'metal',CH,.025)
box('EV_Charger_Case',(2.924,-.8,1.36),(.26,.30,.57),'enamel',CH,.07)
box('EV_Charger_Face',(3.064,-.8,1.37),(.024,.245,.39),'dark',CH,.048)
box('EV_Charger_Status',(3.081,-.8,1.48),(.011,.135,.02),'statusEV',CH,.007)
line('EV_Charging_Cable',[(3.00,-.87,1.17),(3.14,-1.04,.79),(3.27,-1.33,.38),(3.44,-1.62,.29),(3.59,-1.81,.54),(3.62,-1.78,1.05)],.025,'rubber',CH)
box('EV_Charge_Port',(3.595,-1.78,1.05),(.075,.17,.14),'dark',EV if False else G['System_EV'],.034)

# Wall-adjacent battery has its own permanent mounting pier, so cutaways stay coherent.
box('Equipment_Service_Pier',(2.76,.10,1.13),(.23,.94,2.00),'stone2','House_Fixed',.03)
BAT=G['System_Battery'];BAT['selectableId']='battery'
box('Battery_Mounting_Bracket',(2.912,.1,1.18),(.11,.63,1.06),'metal',BAT,.02)
box('Battery_Enclosure',(3.10,.1,1.24),(.30,.72,1.12),'enamel',BAT,.085)
box('Battery_Front_Facet',(3.262,.1,1.24),(.017,.59,.97),'trim',BAT,.07)
box('Battery_Status_Strip',(3.278,.1,1.59),(.015,.30,.029),'statusBattery',BAT,.007)
line('Battery_Conduit',[(3.03,.1,.68),(3.03,.1,.45),(2.87,.1,.45),(2.87,.57,.45)],.029,'metal',BAT)

# External heat pump, outward-facing fan, grille and mounting feet.
HP=G['Appliance_HeatPump'];HP['selectableId']='heatpump'
box('HeatPump_Concrete_Pad',(3.34,2.65,.19),(1.25,1.67,.18),'stone2','House_Fixed',.05)
for y in [2.18,3.12]:
    box('HeatPump_Foot',(3.36,y,.315),(.59,.15,.14),'metal',HP,.024)
box('HeatPump_Cabinet',(3.36,2.65,.87),(.66,1.27,.99),'enamel',HP,.065)
cyl('HeatPump_Fan_Recess',(3.708,2.58,.86),.386,.04,'dark',HP,(0,pi/2,0),40,.014)
for k in range(5):
    a=k*2*pi/5
    vv=[(3.737,2.58+.07*cos(a),.86+.07*sin(a)),(3.737,2.58+.34*cos(a+.3),.86+.34*sin(a+.3)),(3.737,2.58+.30*cos(a+.76),.86+.30*sin(a+.76)),(3.737,2.58+.13*cos(a+1),.86+.13*sin(a+1))]
    mesh('HeatPump_Fan_Blade',vv,[(0,1,2,3)],'metal',HP)
for rr in [.17,.29,.385]:line('HeatPump_Grille_Ring',[(3.76,2.58+rr*cos(a*2*pi/40),.86+rr*sin(a*2*pi/40)) for a in range(40)],.008,'aluminium',HP,True)
for k in range(12):
    a=k*pi/6;beam('HeatPump_Grille_Spoke',(3.767,2.58,.86),(3.767,2.58+.38*cos(a),.86+.38*sin(a)),.008,'aluminium',HP)
cyl('HeatPump_Fan_Hub',(3.775,2.58,.86),.074,.032,'aluminium',HP,(0,pi/2,0),24,.006)
for z in [1.06,1.15,1.24]:box('HeatPump_Control_Vent',(3.71,3.12,z),(.015,.14,.018),'metal',HP,.003)
line('HeatPump_Flow_Return',[(3.03,2.37,.64),(2.84,2.37,.64),(2.84,2.37,.32),(2.68,2.37,.32)],.043,'metal',HP)

# Composed utility cutaway; each appliance is a separate selection root.
box('Utility_Backing',(-.42,.18,.94),(3.5,.13,1.34),'inside','Interior',.026)
box('Utility_Tile_Splashback',(-.46,.097,1.07),(3.43,.038,.99),'tile','Interior',.015)
for x in [-2.03,-1.43,-.83,-.23,.37,.97]:line('Tile_Grout',[(x,.070,.59),(x,.070,1.54)],.006,'inside','Interior')
for z in [.65,.96,1.26]:line('Tile_Grout',[(-2.12,.071,z),(1.22,.071,z)],.006,'inside','Interior')
for xi in range(8):
    for yi in range(4):box('Utility_Floor_Tile',(-2.07+xi*.6,-1.40+yi*.6,.296),(.588,.588,.027),'tile' if (xi+yi)%3 else 'inside','Interior',.008)

def laundry(kind,x,isDryer=False):
    g=G['Appliance_'+kind];g['selectableId']=kind.lower()
    box(kind+'_Body',(x,-.39,.771),(.78,.71,.91),'enamel',g,.045)
    box(kind+'_Control_Fascia',(x,-.758,1.082),(.707,.03,.16),'trim',g,.017)
    cyl(kind+'_Dial',(x-.17,-.791,1.079),.058,.034,'metal',g,(pi/2,0,0),20,.01)
    box(kind+'_Display',(x+.13,-.780,1.084),(.185,.015,.066),'dark',g,.007)
    box(kind+'_Status',(x+.13,-.790,1.084),(.10,.008,.012),'statusAppliance',g,.004)
    cyl(kind+'_Door_Ring',(x,-.775,.750),.255,.060,'aluminium' if isDryer else 'trim',g,(pi/2,0,0),36,.018)
    cyl(kind+'_Door_Glass',(x,-.815,.750),.207,.042,'window' if isDryer else 'carglass',g,(pi/2,0,0),36,.013)
    cyl(kind+'_Drum',(x,-.841,.750),.145,.010,'steel' if isDryer else 'window',g,(pi/2,0,0),28,.008)
    box(kind+'_Door_Handle',(x+.208,-.841,.75),(.042,.032,.13),'metal',g,.015)
    if isDryer:
        for z in [.37,.409,.448]:box('Dryer_Condenser_Vent',(x,-.762,z),(.58,.02,.013),'metal',g,.003)
    else:
        box('Washer_Detergent_Drawer',(x-.21,-.781,1.089),(.14,.02,.022),'stone',g,.004)
laundry('Washer',-1.66)
laundry('Dryer',-.77,True)
g=G['Appliance_Dishwasher'];g['selectableId']='dishwasher'
box('Dishwasher_Cabinet',(.12,-.39,.775),(.78,.71,.91),'enamel',g,.035)
box('Dishwasher_Steel_Front',(.12,-.759,.73),(.72,.028,.75),'steel',g,.026)
box('Dishwasher_Control_Panel',(.12,-.781,1.10),(.72,.023,.14),'dark',g,.013)
box('Dishwasher_Pull_Handle',(.12,-.82,1.016),(.48,.060,.039),'aluminium',g,.011)
box('Dishwasher_Display',(.30,-.798,1.10),(.11,.01,.020),'statusAppliance',g,.004)
for x in [-.10,0,.1]:cyl('Dishwasher_Button',(x,-.80,1.10),.012,.009,'aluminium',g,(pi/2,0,0),12,.002)
box('Utility_Worktop',(-.77,-.39,1.266),(2.65,.87,.082),'stone2','Interior',.025)
g=G['Appliance_Immersion'];g['selectableId']='immersion'
cyl('Immersion_Cylinder',(1.55,.85,1.19),.43,1.72,'enamel',g,vertices=36,bevel=.055)
for z in [.39,1.02,1.72,1.99]:cyl('Immersion_Band',(1.55,.85,z),.438,.045,'aluminium',g,vertices=36,bevel=.008)
box('Immersion_Thermostat',(1.55,.414,1.08),(.20,.052,.25),'metal',g,.03)
cyl('Immersion_Thermostat_Dial',(1.55,.377,1.10),.047,.023,'trim',g,(pi/2,0,0),20,.006)
line('Immersion_Hot_Pipe',[(1.38,.85,2.06),(1.38,.85,2.26),(1.38,1.41,2.26),(1.38,1.41,.44)],.032,'copper',g)
line('Immersion_Return_Pipe',[(1.80,.85,.56),(2.13,.85,.56),(2.13,1.42,.56),(2.13,1.42,2.15)],.032,'copper',g)
box('Immersion_Switch',(2.15,1.37,1.60),(.15,.07,.20),'trim',g,.022)
box('Immersion_Indicator',(2.15,1.325,1.64),(.052,.012,.026),'statusAppliance',g,.004)

# Restrained rounded planting with carefully varied crowns.
def shrub(n,x,y,r=.48,z=.56):
    for j,(dx,dy,dz,s) in enumerate([(-.30,0,-.02,.72),(.26,.02,.02,.76),(0,.16,.22,.77),(0,-.18,.09,.68)]):
        sphere(n,(x+dx*r,y+dy*r,z+dz*r),(r*s,r*s,r*s*.76),['leaf','leaf3','leaf2','leaf'][j],'Landscape',2)
for x in [-4.87,-4.13,-3.38,-2.63,-1.88,-1.14]:shrub('Hedge_Front',x,-4.57,.48,.62)
for y in [.70,1.42,2.14,2.86,3.58]:shrub('Hedge_Right',5.76,y,.45,.57)
for x,y,r in [(-4.43,-3.67,.59),(-2.83,-3.82,.55),(-1.28,-3.5,.44)]:
    shrub('Garden_Ornamental',x,y,r,.61)
    for j in range(5):
        a=j*2*pi/5;sphere('Cream_Flower_Cluster',(x+.25*cos(a),y+.22*sin(a),.94+random.uniform(-.06,.06)),(.105,.095,.085),'petal','Landscape',1)
for x,y in [(.18,-2.08),(2.19,-2.13)]:
    cyl('Door_Terracotta_Planter',(x,y,.41),.22,.53,'pot','Landscape',vertices=24,bevel=.018,r2=.29)
    cyl('Planter_Rim',(x,y,.684),.303,.07,'pot','Landscape',vertices=24,bevel=.01)
    cyl('Planter_Soil',(x,y,.703),.27,.012,'soil','Landscape',vertices=24,bevel=0)
    shrub('Door_Plant',x,y,.30,.85)
beam('Garden_Rowen_Trunk',(-4.98,3.57,.09),(-4.91,3.60,2.76),.073,'bark','Landscape')
for i,(dx,dy,dz) in enumerate([(-.4,.05,2.4),(.40,.13,2.62),(-.09,-.36,2.81),(.08,.21,3.12)]):
    beam('Garden_Rowen_Branch',(-4.94,3.60,1.69),(-4.94+dx,3.6+dy,dz),.04,'bark','Landscape')
    sphere('Garden_Rowen_Crown',(-4.94+dx,3.60+dy,dz),(.65,.58,.65),'leaf2' if i%2 else 'leaf','Landscape',2)
for x,y in [(-5.20,-2.73),(-3.35,-2.58),(-.80,-3.16)]:
    for j in range(6):
        a=j*pi/3;beam('Garden_Sedge',(x,y,.15),(x+.16*cos(a),y+.16*sin(a),.58+random.uniform(-.09,.09)),.022,'leaf2','Landscape')

# Label anchors are empty nodes; no UI graphics enter the model.
anchors={'washer':(-1.66,-.87,1.05),'dryer':(-.77,-.87,1.05),'dishwasher':(.12,-.87,1.05),'immersion':(1.55,.85,2.25),'heatpump':(3.8,2.65,1.4),'ev':(4.33,-2.86,1.9),'battery':(3.35,.1,1.9),'solar':(.1,-.40,6.9)}
for n,loc in anchors.items():
    o=group('Anchor_'+n,G['Anchors'],applianceId=n);o.location=loc
for o in bpy.context.selected_objects:o.select_set(False)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'checkpoints/02-detailed-home.blend'))
scene.render.filepath=str(OUT/'renders/01-hero-review.png')
bpy.ops.render.render(write_still=True)
print('WATTWHEN DETAILS READY',len(bpy.data.objects))
