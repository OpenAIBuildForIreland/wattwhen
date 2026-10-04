# Asset production notes

The user commissioned an original home asset, authorized visual decisions through handoff, and later explicitly permitted scripts. The work moved from the initial Codex checkout into a new worktree based on the winning Claude implementation. The project registration API returned no projects, and native Blender input/capture was unreliable across monitors. Saved Blender checkpoints and rendered output allowed the work to continue without replacing the user's working app.

The final source and runtime share the same geometry. The first runtime attempt also exported Blender's source scene; explicitly limiting the export to the active temporary runtime scene removed the duplicate geometry. An additional material check caught that zero daytime emission caused the exporter to omit the window's emission colour. The final GLB stores the colour independently from intensity and the browser night view confirms the correction.

The Blender room skill was used for physical support, actual openings, semantic organization, visual inspection and runtime evidence. Its generic room-package validator is not passed: this asset uses a custom home contract, and that validator rejects the different opening metadata structure. Room-specific floor-plan, circulation, ceiling and environment gates do not describe this dashboard miniature. No game-room approval or production-app integration approval is claimed. Asset-specific export assertions, a Three.js loader check, selection rays, configuration checks and captured browser views provide the validation for this delivery.

Proposed lessons (pending, not approved global doctrine):

1. A Blender optimization export must explicitly restrict itself to the intended scene; otherwise source and optimized geometry can both enter the GLB.
2. Test emissive colours as well as intensity values. A zero-daylight material needs a retained nonzero hue for later runtime illumination.
3. For desktop automation with changing monitor layouts, save durable checkpoints before long work, inspect output files, and distinguish successful capture from successful input.
