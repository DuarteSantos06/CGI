#version 300 es

// Recebe a posição do site em coordenadas do ecrã [-1, 1]
in vec2 a_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    gl_PointSize = 12.0; // Tamanho do marcador em píxeis
}