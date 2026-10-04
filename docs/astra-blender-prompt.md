# Astra 6 handoff: the WattWhen home

Start a **GPT-6 Astra session with computer use and access to Blender**, in
`/Users/kene/code/wattwhen-codex`. Paste the prompt below. It commissions the
editable model and integration-ready assets; incorporating them into the React
component is the next step.

---

You are the 3D artist for **WattWhen**, an Irish home-energy app. Use Blender
through computer use to create a beautiful, interactive-web-ready model of the
home, and deliver the editable `.blend` and a working `.glb` export.

Build the actual asset. Make the visual decisions yourself and continue through
modelling, materials, inspection, export and handoff. I want a considered piece
of art that makes the app feel exceptional when it opens.

## Context and your working area

The code worktree is `/Users/kene/code/wattwhen-codex`, branch `codex/build`.
Read its `AGENTS.md`, `docs/product.md`, and the current
`src/components/House3D.tsx` once to understand the scene. Inspect the app at
http://localhost:3101; http://localhost:3100 is its development preview. If neither
is running, use the README's local run instructions and an available port.

The current house is a procedural placeholder. Improve its modelling and art
direction substantially while keeping the warm, restrained character of the
interface. The app has a forest-green background, sage and lime highlights,
warm cream text, an isometric home on the left, and energy-planning cards on the
right. It uses Next.js, Three.js, react-three-fiber and drei.

Your output area is `assets/blender/wattwhen-home/`, plus the final runtime file
at `public/models/wattwhen-home.glb`. Create these directories as needed. Keep
work in this worktree. Preserve existing work and use a versioned filename if
an asset already exists. Leave the current working React house in place for the
integration step; do not merge branches, push or deploy.

Operate Blender using the computer-use tools available in your session. You may
use Blender's own Python console or Text Editor for precise or repetitive work,
if those tools are available, but inspect and refine the model visually in
Blender. Use the actual UI state to guide actions; do not guess a long sequence
of coordinates or menu positions. Save checkpoints at meaningful stages. If an
unrelated unsaved Blender project is open, preserve it before starting yours.

## Art direction

Create a **premium miniature Irish home**, with the appeal of a carefully made
architectural model. Think tactile materials, believable proportions, beautifully
soft edges, quiet detail and an inviting domestic setting. The house should be
recognisably Irish, with a two-storey semi-detached form, pitched slate roof,
chimney, cream rendered walls, white window frames and a muted green front door.
Suggest the adjoining neighbour with a restrained attached section so the main
house remains the focus.

Give it a small garden and driveway on a clean, bevelled landscape plinth.
Include modest hedging, a path to the door, a low boundary wall or timber fence,
and a few carefully shaped plants. Add gutters, downpipes, roof thickness,
window reveals, sills and subtle brick or stone around the base. The detail
should reward a closer look while the silhouette stays clear at dashboard size.

Use slate blue-grey for the roof, warm ivory for the render, sage greens for
planting, subdued paving, and a soft ivory or silver EV. The existing palette
includes `#111816`, `#233028`, `#c3eb9c`, `#e3decf`, `#52666a`, and `#e8c982`;
use it as a visual reference, not a requirement to colour every object exactly.

Keep the scene elegant and slightly stylised. Avoid a glossy plastic toy finish,
heavy outlines, oversized suburban garages, dense grass geometry, excessive
clutter or exaggerated neon. Use original geometry and simple materials. No
external asset downloads are necessary.

The primary view looks down from the front-right. Compose the house so its
front door, roof panels, driveway car, exterior heat pump and battery can read
from that view. Leave room for small HTML labels around it. Do not bake labels,
prices, arrows, particle trails or other UI into the geometry.

## The home must support these app interactions

One home can have any combination of solar, EV and battery. A setup toggle must
be able to reveal or hide the relevant group without gaps in the underlying
house or driveway.

- **Solar:** a coherent array of six to eight recognisable photovoltaic panels
  mounted on the visible roof slope, with restrained cell divisions, frames and
  a plausible inverter connection. Keep the roof complete underneath.
- **EV:** a small contemporary unbranded hatchback on the driveway, wheels,
  windows and lamps; a wall charger and a neat cable. Keep the whole optional
  EV setup together, with the vehicle itself individually selectable.
- **Battery:** a wall-mounted or wall-adjacent home battery, a subtle status
  strip, and its own selectable group. Keep it distinct from the heat pump.
- **Appliances:** recognisable washing machine, dishwasher, tumble dryer,
  immersion cylinder and exterior heat pump. They need enough detail to be
  distinguishable when selected, rather than elaborate interiors.
- **Cutaway:** provide a removable front/side shell and roof section that can
  expose the appliance area. The default exterior view should look complete.
  The cutaway view should look deliberately composed, with simple floors and
  walls behind the appliances. If a roof section carries solar panels, record
  which solar group must also hide when that roof section is removed.
- **Night:** separate the warm window-light material and small equipment status
  materials so the app can change their emissive intensity. Do not bake a
  permanent nighttime or daytime lighting condition into the asset.

Use parent Empty objects for the following exported hierarchy. Blender
collections can help organise the source, but collections alone are not the
runtime hierarchy. Preserve these names exactly; child geometry can have
additional descriptive names.

```text
WattWhenHome
  environment
  house_structure
  cutaway_shell
  option_solar
  option_ev
    appliance_ev
    charger
    charging_cable
  option_battery
  appliances
    appliance_washer
    appliance_dishwasher
    appliance_immersion
    appliance_dryer
    appliance_heatpump
  anchors
    label_washer
    label_dishwasher
    label_immersion
    label_dryer
    label_heatpump
    label_ev
    flow_grid
    flow_house
    flow_solar
    flow_ev
    flow_battery
```

`environment` contains the plinth, garden, driveway, boundary and any grid pole.
`house_structure` contains the parts that remain visible in cutaway mode.
Keep all optional groups and all appliance groups present in the final GLB;
the application will control their visibility.

The application's exact appliance IDs are `washer`, `dishwasher`, `immersion`,
`dryer`, `heatpump`, and `ev`. A click on a mesh anywhere under
`appliance_washer`, for example, must map cleanly to `washer`. Add an
`applianceId` custom property to the corresponding parent if practical, and
export custom properties. Names remain the primary integration contract.

Place the `label_*` empties slightly above or in front of their appliances.
Place `flow_*` empties at plausible energy connection points. These provide
positions for the site's HTML labels and runtime particle curves. They should
export as nodes but have no visible geometry. Keep them in the root's coordinate
space, and include their **exported GLB coordinates** in the manifest.

Separate selectable groups even when they share materials. Keep named materials
for at least `mat_render`, `mat_roof`, `mat_frames`, `mat_glass`,
`mat_window_glow`, `mat_solar`, `mat_ev_body`, `mat_battery`, and
`mat_status_glow`. The application must be able to highlight an appliance without
changing unrelated objects that share its original material.

## Scale, camera and runtime budget

This is a compact display diorama. Use metres in Blender and a consistent model
scale, with the top of the plinth at Blender Z = 0 and the plot centred around
X = 0, Y = 0. Aim for a footprint close to **7.8 × 6 units** and a maximum house
height around **4.4 units**. Keep proportions coherent within that envelope.

The house front should face Blender **−Y**. Export using Blender's glTF Y-up
conversion so the front faces **+Z** in Three.js, with **Y** as up. Verify the
resulting orientation and bounds rather than relying on the setting alone.

The current Three.js camera is approximately `[9, 7.5, 11]`, looking at
`[0, 1.1, 0]`, with a 33° field of view. A corresponding Blender camera starting
point is `[9, -11, 7.5]`, looking at `[0, 0, 1.1]`. Use this to evaluate the
composition, then recommend a better camera if your model needs it. Document
any root translation needed to match the existing scene's ground position.

Aim for 40,000–80,000 triangles, under 100 draw calls in the all-features view,
and a self-contained GLB under 5 MB. Treat 120,000 triangles and 8 MB as upper
limits unless there is a clear visual reason. These are delivery targets, not
measurements you should claim without checking.

Use efficient bevels and smooth shading where they improve the silhouette.
Prefer glTF-compatible Principled BSDF materials. If you use procedural textures,
bake the appearance into exportable maps and pack them; avoid a dependency on
Blender-only nodes. Keep textures at 1K where possible, with 2K only when useful.
Use restrained glass that reads in the browser without a complex transmission
setup. Keep the asset usable with ordinary Three.js PBR lighting.

Deliver a normal uncompressed `.glb` first. Do not make the asset depend on a
Draco/KTX decoder or an external HDRI. Lighting rigs and render cameras belong in
the `.blend`, not in the runtime export. Keep the GLB's main root clean and
predictable, with sensible transforms and no accidental negative scales.

## Finish and verify

First get the complete silhouette and composition right. Then refine the
architectural details, optional equipment, appliances and materials. Check the
actual rendered result from the intended camera, not just an orthographic
modelling view. Make the visual decisions that best serve this brief.

Before delivery:

- Inspect the basic home with solar, EV and battery hidden, then the fully
  equipped home. Verify each optional group hides cleanly on its own.
- Inspect a deliberate cutaway, and confirm every selectable appliance exists.
- Inspect daylight and evening material appearance, plus a rear/side orbit.
- Check normals, visible intersections, roof-panel mounting, ground contact,
  material assignments and the appliance/anchor names.
- Export the GLB, then open it in a fresh Blender scene to check that geometry,
  materials, parent groups and anchors survived. If an available local glTF
  preview can verify Three.js rendering, use it as well. Do not upload the asset
  to a public viewer. State whether browser rendering was actually verified.
- Confirm real file sizes, triangle counts and material counts. Do not substitute
  estimated statistics for measurements.

Save these deliverables:

```text
assets/blender/wattwhen-home/wattwhen-home.blend
assets/blender/wattwhen-home/preview-day.png
assets/blender/wattwhen-home/preview-evening.png
assets/blender/wattwhen-home/preview-cutaway.png
assets/blender/wattwhen-home/preview-basic-home.png
assets/blender/wattwhen-home/manifest.json
assets/blender/wattwhen-home/handoff.md
public/models/wattwhen-home.glb
```

Use approximately 1600×1000 previews. Render against the site's dark green or
use a transparent background with a separate grounded shadow. Pack supporting
resources into the `.blend` so it remains editable on another machine.

The manifest should record measured bounds, unit scale, exported up/front axes,
root name, exact toggle groups, appliance-ID mappings, material names, anchor
positions, triangle/material counts, GLB size, and recommended Three.js camera
and target. The short handoff should explain how a developer can load the GLB
with drei's `useGLTF`, toggle groups, map raycast hits to appliance IDs, clone
materials for selection, control window glow, obtain anchor world positions,
and switch the cutaway. Note any export limitations honestly.

Finish with the deliverable paths, a viewable preview, measured runtime budget,
and any remaining integration work. Do not stop at a plan, a script or a render
without the editable scene and usable GLB.

---

Authoring references: [GPT-6 Astra prompting guidance](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra)
and [OpenAI computer-use guidance](https://developers.openai.com/api/docs/guides/tools-computer-use).
The dimensions, naming contract and visual brief above are specific to the
current WattWhen implementation.
