# Render studio

Source for `/viewer/`. `npm run build` bundles Three.js and three-gpu-pathtracer into `dist/viewer/app.js`; serve `dist`, not the source directory, to preview. No CDN scripts or file uploads are used. Dependencies are locked in the root package-lock.json.

Run `npm run test:viewer` for ASCII/binary PLY, OBJ geometry/point-list, color, proxy geometry and invalid-coordinate coverage. This also writes small browser-test fixtures into ignored `tmp/viewer-tests/`.

The collection stores original File blobs in IndexedDB (`magic-fingers-render-studio`). The dropdown selects one creation at a time. Storage is origin/browser-specific and may be cleared or evicted; it is not a backup. There is no server storage. Failed writes leave a session-only file and display an error.

PLY faces are rendered as meshes, including the game's exported spheres, strands and rays. Vertex-only PLY/OBJ files are soft points by default. OBJ supports geometry and embedded vertex colors, not separate MTL/texture files. Source geometry is centered and uniformly normalized to a four-unit span. Automatic mesh mode retains the original topology and proportions. Other representation choices explicitly convert vertices to points or sphere proxies.

Live soft dots use a Gaussian point sprite. Path tracing uses merged smooth-normal icosahedron proxies for points; these are tiny luminous spheres, not the same additive raster shader. Real imported mesh geometry is retained. Depth of field is applied only by the path tracer, with an aperture diameter in mm and focus distance in normalized scene units. Camera movement and lighting changes restart accumulation. Appearance edits return to live preview before rebuilding geometry.

Limits: 100 MB per file, 2 million PLY elements / parsed vertices; sphere conversion and point-cloud tracing are limited to 80,000 source points. No silent downsampling. Large meshes can still be expensive; GPU resources vary. Path tracing needs WebGL 2 and EXT_color_buffer_float. Rendering and PNG export are local.

Color names and export help were checked against Magic Fingers' `LookSettings.cs`, `SugarPoints.shader`, `HandMenu.Shapes.cs`, and `ShapeExport.cs`. The game exports positions/mesh topology but not velocity or hand data, so its six dynamic color modes are spatial interpretations here. Imported vertex colors remain separately available.
