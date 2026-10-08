#version 300 es

precision highp float;

const int MAX_SITES = 256;    
const int EUCLIDEAN_DISTANCE=1;
const int MANHATTAN_DISTANCE=2;
const int CHEBYSHEV_DISTANCE=3;

uniform vec2 u_sites[MAX_SITES];
uniform vec3 u_colors[MAX_SITES];   
uniform int u_n_sites;   // quantos sites existem
uniform int u_type_distance;


in vec2 v_position;
out vec4 color;

float calculate_distance(vec2 p,vec2 u_site,int u_type_distance){
    if(u_type_distance==EUCLIDEAN_DISTANCE)
    {
        return distance(p,u_site);
    }
    else if(u_type_distance==MANHATTAN_DISTANCE)
    {
        return distance(p,u_site);
    }
    else if (u_type_distance==CHEBYSHEV_DISTANCE)
    {
        return distance(p,u_site);
    }
    return distance(p,u_site);
}

vec4 get_color(vec2 p) {
    float min_dist = 10000000000.0f;
    int closest = 0;
    for(int i = 0; i < u_n_sites; i++) {
        float d = calculate_distance(p, u_sites[i],u_type_distance); // mudar isto para vários tipos de distância
        if(d < min_dist) {
            min_dist = d;
            closest = i;
        }
    }
    return vec4(u_colors[closest], 1.0f);
}

void main() {
    color = get_color(v_position);
}
