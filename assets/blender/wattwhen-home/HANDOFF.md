# WattWhen home · asset handoff

The editable Blender model and web GLB are complete. This is an original miniature Irish semi-detached home with a slate roof, cream render, green door, attached neighbour, garden, driveway, eight solar panels, compact EV, charger, battery, exterior heat pump and a composed utility cutaway.

## Files and project

- Editable source: `assets/blender/wattwhen-home/wattwhen-home.blend`
- Runtime asset: `public/models/wattwhen-home.glb`
- Identical local asset copy: `assets/blender/wattwhen-home/runtime/wattwhen-home.glb`
- Machine-readable integration contract: `integration.json`
- Measured runtime checks: `runtime/validation.json`
- Final Blender render: `renders/05-final-exterior.png`
- Cutaway, equipment-free and night reviews: `renders/02-cutaway-review.png`, `03-basic-home-review.png`, `04-night-review.png`
- Standalone Three.js interaction preview: `runtime/preview.html`

Worktree: `/Users/kene/code/wattwhen-home-assets`  
Branch: `codex/wattwhen-home-assets`  
Base: winning WattWhen implementation on `claude/build`, commit `54078732efa8b2e9686f1990f6a87dee2ee24f86`.

The React component and application source are unchanged. Nothing was merged, pushed or deployed. The app at port 3001 remains the reference for the next integration step.

## Runtime properties

| Property | Value |
|---|---|
| Size | 5,057,792 bytes / 4.82 MiB |
| Triangles | 107,562 |
| Meshes / material primitives | 144 / 144 |
| Materials | 43 |
| Exported vertices | 181,254 (split where normals differ) |
| Evaluated source vertices | 55,866 |
| Textures / external downloads | None |
| Source | Blender 5.2.2 LTS; original geometry |
| Web verification | Three.js r186 GLTFLoader and a live browser preview |
| SHA-256 | `aaf21e9d5767da9137bb4ae22de7e00ab729c80f8b80dde687b174887cdbb0f3` |

The GLB includes geometry, PBR materials, semantic groups and empty label anchors. It excludes the Blender studio ground, lights and cameras. Lighting belongs to the app. Geometry is batched by material within semantic groups; the Blender source retains individual editable parts and modifiers.

Blender uses metres, +Z up and -Y forward. glTF uses +Y up and +Z forward. Do not add a conversion rotation in Three.js. Bounds are approximately 12.61 × 9.25 × 11 metres, including the plinth; the lowest point is Y=-0.6. Start at scale 1 and fit the camera to the new model rather than keeping the procedural house's old framing.

A tested orthographic preview uses position `[13,14,19]`, target `[0,2.7,0.3]` and a vertical span of `max(18.8,18/aspect)` to leave space for the preview controls. The tighter Blender beauty view corresponds to a vertical span of 15.94. Re-check the camera in the actual dashboard panel during integration.

## Visibility and selection

Use exact group names from `scene.getObjectByName()`. Change a group's `visible` property to toggle all its children.

| App purpose | Group |
|---|---|
| Solar setup | `System_Solar` |
| Eight roof panels | `Solar_RoofFront` |
| Inverter and conduit | `Solar_Inverter` |
| Complete EV setup | `System_EV` |
| Selectable car only | `EV_Vehicle` |
| Charger and cable | `EV_Charger` |
| Selectable battery | `System_Battery` |
| Heat pump | `Appliance_HeatPump` |
| Washing machine | `Appliance_Washer` |
| Tumble dryer | `Appliance_Dryer` |
| Dishwasher | `Appliance_Dishwasher` |
| Immersion cylinder | `Appliance_Immersion` |

Each selectable root has `userData.selectableId`: `ev`, `battery`, `heatpump`, `washer`, `dryer`, `dishwasher`, or `immersion`. Walk upward from the clicked mesh until this property is found. The six appliance IDs already match the winning app's appliance kinds; battery has its own asset selection ID and will need a suitable UI action.

Solar, EV and battery are independent. Hiding them leaves a complete roof, driveway and wall. The battery and charger have a permanent mounting pier so they remain physically supported in a cutaway. The winner's heat-pump toggle can also hide `Appliance_HeatPump`; its concrete pad stays in the landscape.

Empty anchors `Anchor_washer`, `Anchor_dryer`, `Anchor_dishwasher`, `Anchor_immersion`, `Anchor_heatpump`, `Anchor_ev`, `Anchor_battery` and `Anchor_solar` support HTML labels. Get their world positions after the asset transform. Hide associated labels when equipment is absent. No labels, prices, arrows or energy trails are baked into geometry.

## Cutaway

For the full utility cutaway hide these groups together:

```text
Shell_Front
Shell_Right
Shell_Roof_Front
Shell_Roof_Back
Shell_UpperFloor
System_Solar
```

Keep `House_Fixed`, `Interior`, `Neighbour`, landscape and configured equipment visible. The utility worktop, tiled floor and splashback remain behind the appliances. The attached neighbour keeps its exterior silhouette.

For partial cutaways: hiding `Shell_Roof_Front` also requires hiding `Solar_RoofFront`; hiding `Shell_Right` also requires hiding `Solar_Inverter`. When leaving cutaway mode, restore solar according to the household's setup toggle, not unconditionally.

The Blender Text datablock `WattWhen_View_Controls.py` contains `wattwhen_view(cutaway=False, solar=True, ev=True, battery=True, night=False)`. Run the text once, then use the function from the Blender console to inspect variants. It changes model visibility and emission; studio lighting remains separately editable.

## Night materials

The GLB preserves each emissive colour through `KHR_materials_emissive_strength`, including colours with zero daytime intensity. The installed Three.js loader supports this extension.

| Material | Day intensity | Night intensity |
|---|---:|---:|
| `Window_Warm_Light` | 0 | 1.8 |
| `Status_Solar` | 0.2 | 0.85 |
| `Status_Battery` | 0.2 | 0.85 |
| `Status_EV` | 0.2 | 0.85 |
| `Status_Appliance` | 0.2 | 0.85 |
| `EV_Lamp_Pearl` | 0 | 0.6 |

Change `material.emissiveIntensity`; the colour is already present. Animate intensity alongside app lighting if desired. The GLB has no permanent day/night lights or baked shadows. Clone shared materials if multiple house instances need independent lighting or appliance highlighting.

## Verification and remaining integration

- Reopened the saved source in Blender and rendered the final exterior.
- Inspected Blender exterior, bare-house, cutaway and night renders.
- Loaded the actual GLB in the winning project's Three.js r186.
- Checked all eight combinations of solar, EV and battery, plus cutaway visibility and all six emissive materials.
- Verified front-right ray selection resolves to all seven intended selection groups; manually clicked EV and washer in the browser.
- Checked scene counts, finite geometry, semantic names, file size and triangle budget; no external textures, runtime lights or cameras.
- Captured browser exterior, cutaway and night views.

The preview uses 144 asset material primitives; its displayed 289 draw calls include the shadow pass and preview ground. Performance on target mobile hardware and final dashboard labels, framing, energy flows and schedule callbacks still require validation during React integration. No application build was needed because application source was not edited.

To view the standalone preview from this asset directory:

```sh
python3 runtime/serve_preview.py --three-root /Users/kene/code/wattwhen/node_modules/three
```

Open `http://localhost:3108/`. This serves only this asset folder and the supplied local Three.js library. It does not modify or run the WattWhen app.

The `work/` scripts document modelling, review, export and validation. `build_home.py` and `add_details.py` are sequential Blender-console passes; the detail pass shares helpers from the first. The exporter can be run against `checkpoints/03-reviewed-home.blend`. Adjust its output paths before rebuilding in a different checkout. Re-run `node work/validate_asset.mjs /path/to/node_modules/three` after any export change.
