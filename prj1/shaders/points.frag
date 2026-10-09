#version 300 es
precision mediump float;

out vec4 fragColor;

void main() {
    // gl_PointCoord varia de (0,0) a (1,1) dentro de cada ponto
    vec2 coord = gl_PointCoord - vec2(0.5f);

    if (length(coord) > 0.5f) {
        discard;
    }

    fragColor = vec4(1.0f, 1.0f, 1.0f, 1.0f); // Apenas branco
}