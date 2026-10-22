#version 300 es
precision highp float;

in vec3 v_color;
out vec4 fragColor;

void main() {
    // A técnica das superfícies não precisa de efetuar nenhum cálculo
    // ou comparação de distância no fragment shader: o depth test da GPU
    // já determinou a superfície visível em cada pixel.
    fragColor = vec4(v_color, 1.0);
}
