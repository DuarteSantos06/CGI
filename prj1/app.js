import { loadShadersFromURLS, buildProgramFromSources, setupWebGL } from "../../libs/utils.js";
import { vec2, vec3, flatten } from "../../libs/MV.js";

/** @type {HTMLCanvasElement} */
let canvas;
/** @type {WebGL2RenderingContext} */
let gl;

let program;
let quad_vao;       // the quad covering the whole viewport

let points_program;
let points_vao;     // the VAO for the points
let points_buffer;  // the buffer for the points

// The Voronoi sites, as vec2s in clip space. MAX_SITES must match the size of
// the uniform array in quad.frag
const MAX_SITES = 256;
let sites = [];
let colors = [];
let u_sites;        // uniform locations
let u_n_sites;
let u_type_distance;
let u_colors;


// ---------------------------------------------------------------------------
// Input. The event listeners are already set up in setup_input(); fill in
// these functions. Mouse positions are in canvas pixels, with (0, 0) at the
// top-left corner and y growing downwards.
// ---------------------------------------------------------------------------

function on_mouse_down(x, y) {
}

function on_mouse_move(x, y) {
}

function on_mouse_up(x, y) {
}

// dy > 0 when the wheel is scrolled down (towards the user)
function on_wheel(x, y, dy) {
}

function on_key(key) {
    switch (key) {
        case '1':       // Euclidean distance
            break;
        case '2':       // Manhattan distance
            break;
        case '3':       // Chebyshev distance
            break;
        case 'b':       // toggle cell borders
            break;
        case 'x':       // remove the site under the pointer
            break;
        case 'm':       // switch rendering technique / split view
            break;
    }
}


// ---------------------------------------------------------------------------

function resize() {
    // Match the canvas's drawing buffer to the size it is shown at, and
    // draw over all of it
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

function setup_input() {
    canvas.addEventListener("mousedown", (event) => on_mouse_down(event.offsetX, event.offsetY));
    canvas.addEventListener("mousemove", (event) => on_mouse_move(event.offsetX, event.offsetY));
    window.addEventListener("mouseup", (event) => on_mouse_up(event.offsetX, event.offsetY));
    canvas.addEventListener("wheel", (event) => {
        on_wheel(event.offsetX, event.offsetY, event.deltaY);
        event.preventDefault();     // don't let the page scroll as well
    });
    window.addEventListener("keydown", (event) => on_key(event.key));
}

function update_points_buffer() {
    gl.bindBuffer(gl.ARRAY_BUFFER, points_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sites), gl.STATIC_DRAW);
}

function setup(shaders) {
    canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas);

    program = buildProgramFromSources(gl, shaders["quad.vert"], shaders["quad.frag"]);
    u_sites = gl.getUniformLocation(program, "u_sites");
    u_n_sites = gl.getUniformLocation(program, "u_n_sites");
    u_type_distance = gl.getUniformLocation(program, "u_type_distance");
    u_colors = gl.getUniformLocation(program, "u_colors");

    // A quad covering the whole viewport, as two triangles: its corners are
    // the corners of clip space, from (-1, -1) to (1, 1)
    const corners = new Float32Array([
        -1, -1, 1, -1, 1, 1,       // first triangle
        -1, -1, 1, 1, -1, 1,       // second triangle
    ]);

    sites.push(vec2(0, 0.3));
    sites.push(vec2(0.5, 0.5));
    colors.push(vec3(0.7, 0, 0));
    colors.push(vec3(0, 0.5, 0));

    quad_vao = gl.createVertexArray();
    gl.bindVertexArray(quad_vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);

    const a_position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    points_program = buildProgramFromSources(gl, shaders["points.vert"], shaders["points.frag"]);

    points_buffer = gl.createBuffer();
    points_vao = gl.createVertexArray();
    gl.bindVertexArray(points_vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, points_buffer);
    const a_point_position = gl.getAttribLocation(points_program, "a_position");
    gl.enableVertexAttribArray(a_point_position);
    gl.vertexAttribPointer(a_point_position, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    // Enviar os 2 sites iniciais para o buffer de pontos
    update_points_buffer();

    resize();
    window.addEventListener("resize", resize);
    setup_input();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    window.requestAnimationFrame(animate);
}

function animate(timestamp) {
    window.requestAnimationFrame(animate);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform2fv(u_sites, flatten(sites));
    gl.uniform1i(u_n_sites, sites.length);
    gl.uniform3fv(u_colors, flatten(colors));

    gl.bindVertexArray(quad_vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);


    gl.useProgram(points_program);
    gl.bindVertexArray(points_vao);
    gl.drawArrays(gl.POINTS, 0, sites.length);
    gl.bindVertexArray(null);

    gl.useProgram(null);
}

loadShadersFromURLS(["quad.vert", "quad.frag", "points.vert", "points.frag"]).then(shaders => setup(shaders));