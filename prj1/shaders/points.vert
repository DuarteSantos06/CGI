#version 300 es

// Recebe a posição do site em coordenadas do mundo
in vec2 a_position;

uniform vec2 u_center;        // ponto do mundo no centro do canvas
uniform float u_half_height;  // metade da altura visível, em unidades do mundo
uniform float u_aspect;       // largura / altura do canvas

void main() {
    // Mundo -> clip space
    vec2 clip = (a_position - u_center) / vec2(u_half_height * u_aspect, u_half_height);
    gl_Position = vec4(clip, 0.0, 1.0);
    gl_PointSize = 12.0; // Tamanho do marcador em píxeis
}
