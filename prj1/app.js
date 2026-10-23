import { loadShadersFromURLS, buildProgramFromSources, setupWebGL } from "../../libs/utils.js";
import { vec2, vec3, flatten } from "../../libs/MV.js";

/** @type {HTMLCanvasElement} */
let canvas;
/** @type {WebGL2RenderingContext} */
let gl;

let menu;           // the HTML menu with the keys
let info;           // the HTML panel with the current state

let program;
let quad_vao;       // the quad covering the whole viewport

let points_program; // the program for drawing the points
let points_vao;     // the VAO for the points
let points_buffer;  // the buffer for the points

// Which rendering technique is shown
const SEARCH_MODE = 0;
const SURFACES_MODE = 1;
let mode = SEARCH_MODE;

// The camera: the world point shown at the centre of the canvas, and half
// the visible height in world units. The visible width follows from the
// aspect ratio, so one world unit covers the same pixels in x and y
let center = vec2(0, 0);
let half_height = 1;
let u_center, u_half_height, u_aspect;                  // quad program
let u_points_center, u_points_half_height, u_points_aspect;   // points program

// The Voronoi sites, as vec2s in world coordinates. MAX_SITES must match the size of
const MAX_SITES = 64;
let dragged_site = -1;
let mouse_down = false;     // botão carregado fora de um site
let moved = false;          // o rato já se afastou o suficiente para ser pan
const PAN_THRESHOLD = 5;    // pixels
let start_x, start_y;       // onde o clique começou
let last_x, last_y;
let sites = [];
let colors = [];
let u_sites;        // uniform locations
let u_n_sites;
let u_type_distance;
let u_colors;
let u_paint_border;
let paint_border = false;

let mouse_x;
let mouse_y;

// Must match the constants in quad.frag
const EUCLIDEAN_DISTANCE = 1;
const MANHATTAN_DISTANCE = 2;
const CHEBYSHEV_DISTANCE = 3;
let type_distance = EUCLIDEAN_DISTANCE;


// ---------------------------------------------------------------------------
// Input. The event listeners are already set up in setup_input(); fill in
// these functions. Mouse positions are in canvas pixels, with (0, 0) at the
// top-left corner and y growing downwards.
// ---------------------------------------------------------------------------

// Converts a position in canvas pixels to clip space [-1, 1] (y grows upwards)
function pixels_to_clip(x, y) {
    return vec2(2 * x / canvas.width - 1, 1 - 2 * y / canvas.height);
}

// Converts a position in canvas pixels to world coordinates
function pixels_to_world(x, y) {
    const clip = pixels_to_clip(x, y);
    const aspect = canvas.width / canvas.height;
    return vec2(center[0] + clip[0] * half_height * aspect,
        center[1] + clip[1] * half_height);
}

// Returns the index of the site closest to the pointer, if it is within
// PICK_RADIUS pixels of it, or -1 if no site is that close
const PICK_RADIUS = 12;
function site_close_8pc(x, y) {
    const world = pixels_to_world(x, y);
    // The radius is in pixels, so convert it to world units: one pixel
    // covers 2 * half_height / canvas.height world units
    let min_dist = PICK_RADIUS * 2 * half_height / canvas.height;
    let closest = -1;
    for (let i = 0; i < sites.length; i++) {
        const dx = sites[i][0] - world[0];
        const dy = sites[i][1] - world[1];
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= min_dist) {
            min_dist = d;
            closest = i;
        }
    }
    return closest;
}

function on_mouse_down(x, y) {
    dragged_site = site_close_8pc(x, y);
    if (dragged_site != -1) {
        return;
    }
    // we don't know if it as pan or a click
    mouse_down = true;
    moved = false;
    start_x = x;
    start_y = y;
    last_x = x;
    last_y = y;
}

function on_mouse_move(x, y) {
    mouse_x = x;
    mouse_y = y;
    if (dragged_site != -1) {
        sites[dragged_site] = pixels_to_world(x, y);
        update_points_buffer();
    }
    else if (mouse_down) {
        // it just becomes a pan if it moved more than  PAN_THRESHOLD
        if (!moved) {
            const ddx = x - start_x;
            const ddy = y - start_y;
            if (Math.sqrt(ddx * ddx + ddy * ddy) < PAN_THRESHOLD) return;
            moved = true;
        }

        const dx = x - last_x;
        const dy = y - last_y;

        const world_per_pixel = 2 * half_height / canvas.height;
        center[0] -= dx * world_per_pixel;
        center[1] += dy * world_per_pixel;

        last_x = x;
        last_y = y;
    }
}

function on_mouse_up(x, y) {
    //if the mouse never moved and it was a click, add a site to the array
    if (mouse_down && !moved && sites.length < MAX_SITES) {
        sites.push(pixels_to_world(start_x, start_y));
        colors.push(vec3(Math.random(), Math.random(), Math.random()));
        update_points_buffer();
    }
    dragged_site = -1;
    mouse_down = false;
    moved = false;
}

// dy > 0 when the wheel is scrolled down (towards the user)
function on_wheel(x, y, dy) {
    half_height *= Math.exp(dy * 0.001);
}

function remove_site() {
    const i = site_close_8pc(mouse_x, mouse_y);
    if (i == -1) //if there is no site on the canvas
    {
        return;
    }
    if(sites.length == 1)
    {
        return;
    }
    sites.splice(i, 1);
    colors.splice(i, 1);
    update_points_buffer();
}

function on_key(key) {
    switch (key) {
        case '1':       // Euclidean distance
            type_distance = EUCLIDEAN_DISTANCE;
            break;
        case '2':       // Manhattan distance
            type_distance = MANHATTAN_DISTANCE;
            break;
        case '3':       // Chebyshev distance
            type_distance = CHEBYSHEV_DISTANCE;
            break;
        case 'b':       // toggle cell borders
            paint_border = !paint_border;
            break;
        case 'x':       // remove the site under the pointer
            remove_site();
            break;
        case 'm':       // switch rendering technique / split view
            mode = (mode == SEARCH_MODE) ? SURFACES_MODE : SEARCH_MODE;
            break;
        case 'h':       // show / hide the menu
            menu.hidden = !menu.hidden;
            info.hidden = menu.hidden;
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
    menu = document.getElementById("menu");
    info = document.getElementById("info");

    program = buildProgramFromSources(gl, shaders["quad.vert"], shaders["quad.frag"]);
    u_sites = gl.getUniformLocation(program, "u_sites");
    u_n_sites = gl.getUniformLocation(program, "u_n_sites");
    u_type_distance = gl.getUniformLocation(program, "u_type_distance");
    u_colors = gl.getUniformLocation(program, "u_colors");
    u_center = gl.getUniformLocation(program, "u_center");
    u_half_height = gl.getUniformLocation(program, "u_half_height");
    u_aspect = gl.getUniformLocation(program, "u_aspect");
    u_paint_border = gl.getUniformLocation(program, "u_paint_border");

    // A quad covering the whole viewport, as two triangles: its corners are
    // the corners of clip space, from (-1, -1) to (1, 1)
    const corners = new Float32Array([
        -1, -1, 1, -1, 1, 1,       // first triangle
        -1, -1, 1, 1, -1, 1,       // second triangle
    ]);

    sites.push(vec2(Math.random() * 2 - 1, Math.random() * 2 - 1));
    colors.push(vec3(Math.random(), Math.random(), Math.random()));

    quad_vao = gl.createVertexArray();
    gl.bindVertexArray(quad_vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);

    let a_position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    points_program = buildProgramFromSources(gl, shaders["points.vert"], shaders["points.frag"]);
    u_points_center = gl.getUniformLocation(points_program, "u_center");
    u_points_half_height = gl.getUniformLocation(points_program, "u_half_height");
    u_points_aspect = gl.getUniformLocation(points_program, "u_aspect");

    points_buffer = gl.createBuffer();
    points_vao = gl.createVertexArray();
    gl.bindVertexArray(points_vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, points_buffer);
    a_position = gl.getAttribLocation(points_program, "a_position");
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    // Enviar os 2 sites iniciais para o buffer de pontos
    update_points_buffer();

    resize();
    window.addEventListener("resize", resize);
    setup_input();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    window.requestAnimationFrame(animate);
}



function draw_surfaces(aspect) {
    //TODO
}

function draw_search(aspect) {
    gl.useProgram(program);
    gl.uniform2fv(u_center, center);
    gl.uniform1f(u_half_height, half_height);
    gl.uniform1f(u_aspect, aspect);
    gl.uniform2fv(u_sites, flatten(sites));
    gl.uniform1i(u_n_sites, sites.length);
    gl.uniform1i(u_type_distance, type_distance);
    gl.uniform3fv(u_colors, flatten(colors));
    gl.uniform1i(u_paint_border, paint_border ? 1 : 0);

    gl.bindVertexArray(quad_vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
}

// Shows the current state in the info panel
const DISTANCE_NAMES = { [EUCLIDEAN_DISTANCE]: "Euclidiana", [MANHATTAN_DISTANCE]: "Manhattan", [CHEBYSHEV_DISTANCE]: "Chebyshev" };
function update_info() {
    info.innerHTML =
        "<b>Distância:</b> " + DISTANCE_NAMES[type_distance] + "<br>" +
        "<b>Modo:</b> " + (mode == SEARCH_MODE ? "Procura" : "Superfícies") + "<br>" +
        "<b>Bordas:</b> " + (paint_border ? "sim" : "não") + "<br>" +
        "<b>Sites:</b> " + sites.length + " / " + MAX_SITES + "<br>" +
        "<b>Zoom:</b> " + (1 / half_height).toFixed(2) + "x";
}

function animate(timestamp) {
    window.requestAnimationFrame(animate);

    update_info();

    gl.clear(gl.COLOR_BUFFER_BIT);

    const aspect = canvas.width / canvas.height;

    if (mode == SEARCH_MODE) {
        draw_search(aspect);
    } else {
        draw_surfaces(aspect);
    }

    gl.useProgram(points_program);
    gl.uniform2fv(u_points_center, center);
    gl.uniform1f(u_points_half_height, half_height);
    gl.uniform1f(u_points_aspect, aspect);
    gl.bindVertexArray(points_vao);
    gl.drawArrays(gl.POINTS, 0, sites.length);
    gl.bindVertexArray(null);

    gl.useProgram(null);
}

loadShadersFromURLS(["quad.vert", "quad.frag", "points.vert", "points.frag"]).then(shaders => setup(shaders));