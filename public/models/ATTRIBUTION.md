# Anatomical assets

The bundled `male.glb` and `female.glb` derive from MakeHuman's hm08 base mesh and adult morphology targets, released under **CC0 1.0 Universal**. Full license: LICENSE-CC0.md.

Upstream: https://github.com/makehumancommunity/makehuman
Pinned commit: a8bc2d54ff0ac92e78ff71431b1023eda42bf482

Sources under `makehuman/data/`:
- `3dobjs/base.obj` (body and eye helper groups only).
- `targets/macrodetails/{african,asian,caucasian}-{male,female}-young.target`, blended equally.
- `targets/macrodetails/universal-{male,female}-young-averagemuscle-{minweight,averageweight,maxweight}.target` (extreme weight deltas blended at 65%).

Each source explicitly declares its CC0 release in its header. Original asset contributors include Manuel Bastioni, Data Collection AB, Joel Palmius and Jonas Hauquier. No MakeHuman application code is included.

Conversion: scripts/build-body-models.py. Quad triangulation, normal generation, height normalization to 3 scene units; separate groups for three adult body builds and eye shells. Assets are bundled locally, without runtime requests to third-party model services. These are anatomical meshes rendered as clay, not photorealistic scanned skin.
