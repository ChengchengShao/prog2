/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/ellipsoids.json"; // ellipsoids file loc

var eyeAt = new vec3.fromValues(0.5, 0.5, -0.5); // default eye position in world space
var viewUp = new vec3.fromValues(0, 1, 0); // default eye viewup vector in world space
var lookAt = new vec3.fromValues(0.5, 0.5, 0); // default target position in world space
var lightAt = new vec3.fromValues(-1, 3, -0.5);// default light location in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var triBufferSize = 0; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader
var vm = mat4.create();
var pm = mat4.create();

var triangleVertexBuffer; // this contains vertex coordinates in triangles
var triangleVertexNormalBuffer;
var triangleAmbiColorBuffer;
var triangleDiffColorBuffer;
var triangleSpecColorBuffer;
var triangleBuffer; // this contains indices into triangleVertexBuffer in triangles

var ellipsoidVertexBuffer; // this contains vertex coordinates in ellipsoids
var ellipsoidVertexNormalBuffer;
var ellipsoidAmbiColorBuffer;
var ellipsoidDiffColorBuffer;
var ellipsoidSpecColorBuffer;
var ellipsoidBuffer; // this contains indices into triangleVertexBuffer in ellipsoids

var vertexNormalAttrib;
var ambiColorAttrib;
var diffColorAttrib;
var specColorAttrib;

var currentKey = {}; // press the key pressed

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response);
        } // end if good params
    } // end try
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get json file

// set up the webGL environment
function setupWebGL() {
    
    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
        }
    } // end try
    
    catch(e) {
        console.log(e);
    } // end catch
    
} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles(){
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
    
    if (inputTriangles != String.null) {
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        var indexArray = []; // 1D array of vertex indices for WebGL
        var vtxBufferSize = 0; // the number of vertices in the vertex buffer
        var vtxToAdd = []; // vtx coords to add to the coord array
        var normalToAdd = [];
        var indexOffset = vec3.create(); // the index start for the current set
        var triToAdd = vec3.create(); // tri indices to add to the index array
        
        var vertexNormalArray = [];
        var triAmbiColorArray = [];
        var triDiffColorArray = [];
        var triSpecColorArray = [];
        
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex start
            
            //get the parameter of ambient, diffuse, and specular
            var ambiColor = inputTriangles[whichSet].material.ambient;
            var diffColor = inputTriangles[whichSet].material.diffuse;
            var specColor = inputTriangles[whichSet].material.specular;
            
            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
                normalToAdd = inputTriangles[whichSet].normals[whichSetVert];
                vertexNormalArray.push(normalToAdd[0], normalToAdd[1], normalToAdd[2]);
                triAmbiColorArray.push(ambiColor[0], ambiColor[1], ambiColor[2]);
                triDiffColorArray.push(diffColor[0], diffColor[1], diffColor[2]);
                triSpecColorArray.push(specColor[0], specColor[1], specColor[2]);
                
            } // end for vertices in set
            
            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set
            
            vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            triBufferSize += inputTriangles[whichSet].triangles.length; // total number of tris
            //} // end for each triangle set
        }
        //triBufferSize *= 3; // now total number of indices
        
        // console.log("coordinates: "+coordArray.toString());
        // console.log("numverts: "+vtxBufferSize);
        // console.log("indices: "+indexArray.toString());
        // console.log("numindices: "+triBufferSize);
        
        // send the vertex coords to webGL
        triangleVertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,triangleVertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
        
        triangleVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,triangleVertexNormalBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertexNormalArray),gl.STATIC_DRAW);
        
        //send the ambient colors to WebGL
        triangleAmbiColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,triangleAmbiColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(triAmbiColorArray),gl.STATIC_DRAW);
        
        //send the diffuse colors to WebGL
        triangleDiffColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,triangleDiffColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(triDiffColorArray),gl.STATIC_DRAW);
        
        //send the spec color to WebGL
        triangleSpecColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,triangleSpecColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(triSpecColorArray),gl.STATIC_DRAW);
        
        // send the triangle indices to webGL
        triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer
        triangleBuffer.numItems = indexArray.length;
        
    } // end if triangles found
} // end load triangles

// read ellipsoids in, load them into webgl buffers
function loadEllipsoids(){
    var inputEllipsoids = getJSONFile(INPUT_SPHERES_URL,"ellipsoids");
    
    if(inputEllipsoids != String.null){
        var vertexNormalArray = [];
        var ellipsoidCoordArray = [];
        var ellipsoidIndexArray = [];
        var ellipsoidAmbiColorArray = [];
        var ellipsoidDiffColorArray = [];
        var ellipsoidSpecColorArray = [];
        var ellipsoidOffsetArray = [];
        var start = 0;
        
        //deal the ellipsoid one by one
        for(var whichSet =0; whichSet<inputEllipsoids.length;whichSet++){
            var ambiColor = inputEllipsoids[whichSet].ambient;
            var diffColor = inputEllipsoids[whichSet].diffuse;
            var specColor = inputEllipsoids[whichSet].specular;
            var width = 100;
            var height = 100;
            var count = 0;
            
            //deal one ellipsoid by the horizontal axis and vertical axis
            for (var i = 0; i <= width; i++) {
                for (var j = 0; j <= height; j++) {
                    
                    var x = Math.cos(j * 2 * Math.PI / height) * Math.sin(i * Math.PI / width);
                    var y = Math.cos(i * Math.PI / width);
                    var z = Math.sin(j * 2 * Math.PI / height) * Math.sin(i * Math.PI / width);
                    
                    ellipsoidCoordArray.push(inputEllipsoids[whichSet].x+inputEllipsoids[whichSet].a * x);
                    ellipsoidCoordArray.push(inputEllipsoids[whichSet].y+inputEllipsoids[whichSet].b * y);
                    ellipsoidCoordArray.push(inputEllipsoids[whichSet].z+inputEllipsoids[whichSet].c * z);
                    
                    var normal = [inputEllipsoids[whichSet].a * x, inputEllipsoids[whichSet].b * y, inputEllipsoids[whichSet].c * z];
                    var normalise = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2]);
                    vertexNormalArray.push(normal[0]/normalise, normal[1]/normalise, normal[2]/normalise);
                    
                    ellipsoidAmbiColorArray.push(ambiColor[0], ambiColor[1], ambiColor[2]);
                    ellipsoidDiffColorArray.push(diffColor[0], diffColor[1], diffColor[2]);
                    ellipsoidSpecColorArray.push(specColor[0], specColor[1], specColor[2]);
                    
                    count = count + 1;
                }
            }
            for (var i = 0; i < width; i++) {
                for (var j = 0; j < height; j++) {
                    var k = (i * (height + 1)) + j;
                    ellipsoidIndexArray.push(start + k);
                    ellipsoidIndexArray.push(start + k + height + 1);
                    ellipsoidIndexArray.push(start + k + 1);
                    ellipsoidIndexArray.push(start + k + height + 1);
                    ellipsoidIndexArray.push(start + k + height + 2);
                    ellipsoidIndexArray.push(start + k + 1);
                }
            }
            ellipsoidOffsetArray.push(start);
            start = start + count;
        }
        //triBufferSize *= 3; // now total number of indices
        
        // console.log("coordinates: "+coordArray.toString());
        // console.log("numverts: "+vtxBufferSize);
        // console.log("indices: "+indexArray.toString());
        // console.log("numindices: "+triBufferSize);
        
        // send the vertex coords to webGL
        ellipsoidVertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidVertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ellipsoidCoordArray),gl.STATIC_DRAW); // coords to that buffer
        
        ellipsoidVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidVertexNormalBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormalArray),gl.STATIC_DRAW);
        
        //send the ambient color to WebGL
        ellipsoidAmbiColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidAmbiColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ellipsoidAmbiColorArray),gl.STATIC_DRAW);
        
        //send the diffuse color to WebGL
        ellipsoidDiffColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidDiffColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ellipsoidDiffColorArray),gl.STATIC_DRAW);
        
        //send the spec color to WebGL
        ellipsoidSpecColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidSpecColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ellipsoidSpecColorArray),gl.STATIC_DRAW);
        
        // send the ellipsoid indices to webGL
        ellipsoidBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ellipsoidBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ellipsoidIndexArray), gl.STATIC_DRAW); // indices to that buffer
        ellipsoidBuffer.numItems = ellipsoidIndexArray.length;
        
    } // end if ellipsoids found
} // end load ellipsoids

function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
    
    precision mediump float;
    varying vec3 vColor;
    
    void main(void) {
        
        //gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // all fragments are white
        gl_FragColor = vec4(vColor,1.0); // all fragments are white
    }
    `;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
    
    attribute vec3 vertexPosition;
    attribute vec3 vertexNormal;
    attribute vec3 ambiColor;
    attribute vec3 diffColor;
    attribute vec3 specColor;
    attribute vec3 vertexColor;
    
    uniform mat4 uvm;
    uniform mat4 upm;
    
    uniform vec3 lightAt;
    uniform vec3 eyeAt;
    varying vec3 vColor;
    
    void main(void) {
        
        vec3 L = normalize(lightAt - vertexPosition);
        vec3 V = normalize(eyeAt - vertexPosition);
        vec3 H = normalize(L+V);
        
        vColor = ambiColor + diffColor * max(dot(vertexNormal, L), 0.0) + specColor * pow(max(dot(vertexNormal, H), 0.0),5.0);
        //gl_Position = vec4(vertexPosition, 1.0); // use the untransformed position
        gl_Position = upm * uvm * vec4(vertexPosition, 1.0); // use the untransformed position
    }
    `;
    
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution
        
        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
        
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context
            
            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)

                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition"); // get pointer to vertex shader input
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
                
                vertexNormalAttrib =gl.getAttribLocation(shaderProgram, "vertexNormal");
                gl.enableVertexAttribArray(vertexNormalAttrib);
                
                ambiColorAttrib = gl.getAttribLocation(shaderProgram, "ambiColor");
                gl.enableVertexAttribArray(ambiColorAttrib);

                diffColorAttrib = gl.getAttribLocation(shaderProgram, "diffColor");
                gl.enableVertexAttribArray(diffColorAttrib);

                specColorAttrib = gl.getAttribLocation(shaderProgram, "specColor");
                gl.enableVertexAttribArray(specColorAttrib);
                
                shaderProgram.eyeAtUniform = gl.getUniformLocation(shaderProgram, "eyeAt");
                gl.uniform3fv(shaderProgram.eyeAtUniform, eyeAt);
                
                shaderProgram.lightAtUniform = gl.getUniformLocation(shaderProgram, "lightAt");
                gl.uniform3fv(shaderProgram.lightAtUniform, lightAt);
                
                mat4.perspective(pm, Math.PI/2, 1, 0.5, 1.5);
                shaderProgram.pmUniform = gl.getUniformLocation(shaderProgram, "upm");
                
                mat4.lookAt(vm, eyeAt, lookAt, viewUp);
                shaderProgram.vmUniform = gl.getUniformLocation(shaderProgram, "uvm");
                
                var translation = vec3.create();//**+**
                vec3.set(translation, 0.25, 0, 0);
                
                gl.uniformMatrix4fv(shaderProgram.pmUniform, false, pm);
                gl.uniformMatrix4fv(shaderProgram.vmUniform, false, vm);
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderTrianglesEllipsoids(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,triangleVertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed
    
    gl.bindBuffer(gl.ARRAY_BUFFER,triangleVertexNormalBuffer);
    gl.vertexAttribPointer(vertexNormalAttrib,3,gl.FLOAT,false,0,0);
    
    // ambient color buffer: active and feed into ambient color shader
    gl.bindBuffer(gl.ARRAY_BUFFER,triangleAmbiColorBuffer);
    gl.vertexAttribPointer(ambiColorAttrib,3,gl.FLOAT,false,0,0);
    
    // diffuse color buffer: active and feed into diffuse color shader
    gl.bindBuffer(gl.ARRAY_BUFFER,triangleDiffColorBuffer);
    gl.vertexAttribPointer(diffColorAttrib,3,gl.FLOAT,false,0,0);
    
    // spec color buffer: active and feed into spec color shader
    gl.bindBuffer(gl.ARRAY_BUFFER,triangleSpecColorBuffer);
    gl.vertexAttribPointer(specColorAttrib,3,gl.FLOAT,false,0,0);
    
    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer); // activate
    gl.drawElements(gl.TRIANGLES,triangleBuffer.numItems,gl.UNSIGNED_SHORT,0); // render
    
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidVertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed
    
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidVertexNormalBuffer);
    gl.vertexAttribPointer(vertexNormalAttrib,3,gl.FLOAT,false,0,0);
    
    // ambient color buffer: active and feed into ambient color shader
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidAmbiColorBuffer);
    gl.vertexAttribPointer(ambiColorAttrib, 3, gl.FLOAT,false,0,0);
    
    // diffuse color buffer: active and feed into diffuse color shader
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidDiffColorBuffer);
    gl.vertexAttribPointer(diffColorAttrib, 3, gl.FLOAT,false,0,0);
    
    // spec color buffer: active and feed into spec color shader
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidSpecColorBuffer);
    gl.vertexAttribPointer(specColorAttrib, 3, gl.FLOAT,false,0,0);
    
    // ellipsoid buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ellipsoidBuffer); // activate
    gl.drawElements(gl.TRIANGLES,ellipsoidBuffer.numItems,gl.UNSIGNED_SHORT,0); // render
} // end render triangles and ellipsoids

function reRenderByKey(){
    
    requestAnimationFrame(reRenderByKey);
    
    if(currentKey[65]){//a
        vec3.add(eyeAt, eyeAt, vec3.fromValues(0.01,0,0));
        vec3.add(lookAt, lookAt, vec3.fromValues(0.01,0,0));
        mat4.lookAt(vm, eyeAt, lookAt, viewUp);
    }
    if(currentKey[68]){//d
        vec3.add(eyeAt, eyeAt, vec3.fromValues(-0.01,0,0));
        vec3.add(lookAt, lookAt, vec3.fromValues(-0.01,0,0));
        mat4.lookAt(vm, eyeAt, lookAt, viewUp);
    }
    if(currentKey[87]){//w
        var translation = vec3.create();
        vec3.set(translation, 0.0, 0.0, 0.01);
        mat4.translate(vm, vm, translation);
    }
    if(currentKey[83]){//s
        var translation = vec3.create();
        vec3.set(translation, 0.0, 0.0, -0.01);
        mat4.translate(vm, vm, translation);
    }
    if(currentKey[81]){//q
        vec3.add(eyeAt, eyeAt, vec3.fromValues(0.0,0.01,0));
        vec3.add(lookAt, lookAt, vec3.fromValues(0.0,0.01,0));
        mat4.lookAt(vm, eyeAt, lookAt, viewUp);
    }
    if(currentKey[69]){//e
        vec3.add(eyeAt, eyeAt, vec3.fromValues(0.0,-0.01,0));
        vec3.add(lookAt, lookAt, vec3.fromValues(0.0,-0.01,0));
        mat4.lookAt(vm, eyeAt, lookAt, viewUp);
    }
    
    if(currentKey[16] && currentKey[65]){//A
        vec3.rotateY(lookAt, lookAt, eyeAt, 0.01);
        mat4.lookAt(vm, eyeAt, lookAt, viewUp);
    }
    if(currentKey[16] && currentKey[68]){//D
        vec3.rotateY(lookAt, lookAt, eyeAt, -0.01);
        mat4.lookAt(vm, eyeAt, lookAt, viewUp);
    }
    if(currentKey[16] && currentKey[87]){//W
        vec3.rotateX(lookAt, lookAt, eyeAt, -0.01);
        mat4.lookAt(vm, eyeAt, lookAt, viewUp);
    }
    if(currentKey[16] && currentKey[83]){//S
        vec3.rotateX(lookAt, lookAt, eyeAt, 0.01);
        mat4.lookAt(vm, eyeAt, lookAt, viewUp);
    }
    if(currentKey[16] && currentKey[81]){//Q
        vec3.rotateZ(viewUp, viewUp, eyeAt, -0.01);
        mat4.lookAt(vm, eyeAt, lookAt, viewUp);
    }
    if(currentKey[16] && currentKey[69]){//E
        vec3.rotateZ(viewUp, viewUp, eyeAt, 0.01);
        mat4.lookAt(vm, eyeAt, lookAt, viewUp);
    }

    gl.uniformMatrix4fv(shaderProgram.pmUniform, false, pm);
    gl.uniformMatrix4fv(shaderProgram.vmUniform, false, vm);
    renderTrianglesEllipsoids();
}

function handleKeyDown(){
    currentKey[event.keyCode] = true;
}

function handleKeyUp() {
    currentKey[event.keyCode] = false;
}

/* MAIN -- HERE is where execution begins after window load */

function main() {
    
    setupWebGL(); // set up the webGL environment
    loadTriangles(); // load in the triangles from tri file
    loadEllipsoids(); // load in the ellipsoids from ellip file
    setupShaders(); // setup the webGL shaders
    
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    reRenderByKey();
} // end main
