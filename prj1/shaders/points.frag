#version 300 es
precision mediump float;

out vec4 fragColor;

void main() {
    // gl_PointCoord varia de (0,0) a (1,1) dentro de cada ponto
    vec2 coord = gl_PointCoord - vec2(0.5f);

    float d = length(coord);

    if (d > 0.5f) {
        discard;                                   // fora do círculo
    }

    if (d > 0.35f) {
        fragColor = vec4(0.0f, 0.0f, 0.0f, 1.0f);  // anel exterior: preto
    } else {
        fragColor = vec4(1.0f, 1.0f, 1.0f, 1.0f);  // interior: branco
    }

}