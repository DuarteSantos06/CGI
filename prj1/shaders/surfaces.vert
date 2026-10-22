#version 300 es

const int MAX_SITES = 64;
const int EUCLIDEAN_DISTANCE = 1;
const int MANHATTAN_DISTANCE = 2;
const int CHEBYSHEV_DISTANCE = 3;

uniform vec2 u_sites[MAX_SITES];
uniform vec3 u_colors[MAX_SITES];
uniform int u_type_distance;

// Variáveis da câmara (idênticas às do quad)
uniform vec2 u_center;
uniform float u_half_height;
uniform float u_aspect;

out vec4 v_color;

#define PI 3.14159265359

void main() {
    // para saber qual o site que estamos a desenhar
    int site_idx = gl_InstanceID;
    vec2 site = u_sites[site_idx];
    
    // Passar a cor deste site para o fragment shader
    v_color = vec4(u_colors[site_idx], 1.0);

    vec2 world_pos;
    float z_dist;

    // O raio da base tem de ser gigante para garantir que a superfície cobre todo o ecrã.
    // Usamos a altura visível multiplicada por um fator de segurança (10.0).
    float R = u_half_height * max(1.0, u_aspect) * 10.0;

    if (gl_VertexID == 0) {
        // A distância ao site é 0, é o topo
        world_pos = site;
        z_dist = 0.0;
    } else {
        // Vértices > 0: Formam a base do cone/pirâmide 
        int segments;
        float angle_offset = 0.0;
        float radius_multiplier = 1.0;

        if (u_type_distance == EUCLIDEAN_DISTANCE) {
            // Cone: base circular com 64 lados
            segments = 64;
        } else if (u_type_distance == MANHATTAN_DISTANCE) {
            // Manhattan: base em losango (4 lados)
            segments = 4;
        } else if (u_type_distance == CHEBYSHEV_DISTANCE) {
            // Chebyshev: base quadrada (4 lados, rodada 45 graus)
            segments = 4;
            angle_offset = PI / 4.0;
            radius_multiplier = sqrt(2.0); // Para o quadrado cobrir a distância exata nos cantos
        }

        // Calcula o ângulo em que este vértice da base está
        float angle = (float(gl_VertexID - 1) * 2.0 * PI) / float(segments) + angle_offset;

        // Calcula a posição do vértice no chão
        vec2 offset = vec2(cos(angle), sin(angle)) * R * radius_multiplier;
        world_pos = site + offset;
        
        // A distância aqui é máxima (R)
        z_dist = R;
    }

    // 3. Converter Mundo -> Clip Space 
    vec2 clip_xy = (world_pos - u_center) / vec2(u_half_height * u_aspect, u_half_height);

    // DEPTH BUFFER
    float clip_z = (z_dist / R) * 2.0 - 1.0;

    gl_Position = vec4(clip_xy, clip_z, 1.0);
}