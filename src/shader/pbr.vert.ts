export default `

precision highp float;

in vec3 in_position;
out vec3 out_position;
in vec3 in_normal;
#ifdef USE_UV
  in vec2 in_uv;
#endif // USE_UV

/**
 * Varyings.
 */

out vec3 vWsNormal;
#ifdef USE_UV
  out vec2 vUv;
#endif // USE_UV

/**
 * Uniforms List
 */

struct Camera
{
  mat4 WsToCs; // World-Space to Clip-Space (proj * view)
  vec3 position;
};
uniform Camera uCamera;

out vec3 viewDirection;

void main()
{
  out_position = in_position;
  vec4 positionLocal = vec4(in_position, 1.0);
  gl_Position = uCamera.WsToCs * positionLocal;
  vWsNormal = in_normal;
  viewDirection = normalize(uCamera.position - in_position);
}
`;
