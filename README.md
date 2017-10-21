# prog2

I just finished the following parts, from Part1 to Part4, I'm sorry for I haven't finished the last three parts on time, I will do my best to finish them in the future, thank you!

Part 1: Render the input triangles, without lighting
Use rasterization to render unlit triangles, giving each triangle its unmodified diffuse color (e.g, if the diffuse color of the triangle is (1,0,0), every pixel in it should be red). You will have to use vertex shaders to perform viewing and perspective transforms, and fragment shaders to select the diffuse color. We recommend the use of the glMatrix library for creating these transforms.

Part 2: Render the input ellipsoids, without lighting
Use rasterization to render unlit ellipsoids, giving each ellipsoid its unmodified diffuse color. There are no ellipsoid primitives available in WebGL, so you will have to build an ellipsoid out of triangles, then transform it to the right location and size. You can do this statically with a hardcoded sphere model, or procedurally with a latitude/longitude parameterization. You then scale this sphere to match its ellipsoidal parameters. Again you will have to use vertex shaders to perform viewing and perspective transforms, fragment shaders to select color.

Part 3: Light the ellipsoids and triangles
Shade the ellipsoids and triangles using per-fragment shading and the Blinn-Phong illumination model, using the reflectivity coefficients you find in the input files. Use triangle normals during lighting (which will reveal faceting on your ellipsoids). Your fragment shaders will perform the lighting calculation.

Part 4: interactively change view
Use the following key to action table to enable the user to change the view:
• a and d — translate view left and right along view X
• w and s — translate view forward and backward along view Z
• q and e — translate view up and down along view Y
• A and D — rotate view left and right around view Y (yaw)
• W and S — rotate view forward and backward around view X (pitch)
To implement these changes you will need to change the eye, lookAt and lookUp vectors used to form your viewing transform.
