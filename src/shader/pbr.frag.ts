export default `
precision highp float;

#define PI 3.1415926535897932384626433832795

in vec3 vWsNormal;
in vec3 viewDirection;
in vec3 out_position;
out vec4 outFragColor;

struct Material
{
  vec3 albedo;
  float metallic;
  float roughness;
};
uniform Material uMaterial;

struct Light
{
  vec3 position;
  vec3 color;
  float intensity;
};
uniform Light uLight;

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

vec3 FresnelShlick(vec3 F0, vec3 h, vec3 w0)
{
  return F0 + (1.0 - F0) * pow(1.0 - dot(h, w0), 5.0);
}

float normal_distribution_ggx(vec3 n, vec3 h, float a)
{
  float a2 = a * a;
  float nDotH = max(dot(n, h), 0.0);
  float nDotH2 = nDotH * nDotH;

  float denom = nDotH2 * (a2 - 1.0) + 1.0;
  denom = PI * denom * denom;

  return a2 / denom;
}

float geometry_schlick(vec3 n, vec3 v, vec3 l, float k)
{
  k = ((k + 1.0) * (k + 1.0)) / 8.0;
  float nDotV = max(dot(n, v), 0.0);
  float nDotL = max(dot(n, l), 0.0);
  float nDotV2 = nDotV * nDotV;
  float nDotL2 = nDotL * nDotL;

  float ggx1 = nDotV / (nDotV * (1.0 - k) + k);
  float ggx2 = nDotL / (nDotL * (1.0 - k) + k);

  return ggx1 * ggx2;
}

void
main()
{
  // **DO NOT** forget to do all your computation in linear space.
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;

  // Lambertian diffuse
  vec3 lightDirection = normalize(uLight.position - out_position);


  // float NdotL = max(dot(vWsNormal, lightDirection), 0.0);
  // vec3 diffuse = albedo * uLight.color * uLight.intensity * NdotL;

  // // Phong specular
  // vec3 halfVector = normalize(lightDirection + viewDirection);
  // float NdotH = max(dot(vWsNormal, halfVector), 0.0);
  // float specular = pow(NdotH, 100.0);

  // albedo = diffuse + specular;
  vec3 normal = normalize(vWsNormal);
  vec3 irradiance = vec3(0.0);

  // gotta iterate over every light later
  vec3 kS = FresnelShlick(vec3(0.04), viewDirection, lightDirection);  // F

  vec3 halfVector = normalize(lightDirection + viewDirection);
  float G = geometry_schlick(normal, viewDirection, lightDirection, uMaterial.roughness);  // G

  float D = normal_distribution_ggx(normal, halfVector, uMaterial.roughness);  // D
  float denominator = 4.0 * max(dot(normal, viewDirection), 0.0) * max(dot(normal, lightDirection), 0.0);
  vec3 specularBDRFEval = (kS * G * D) / denominator; // GD
  
  vec3 diffuseBDRFEval = (vec3(1, 1, 1) - kS) * albedo / PI;
  diffuseBDRFEval *= (1.0 - uMaterial.metallic);

  irradiance += (diffuseBDRFEval + specularBDRFEval) * uLight.intensity * max(dot(normal, lightDirection), 0.0);  // * uLight.color 

  // visualize normal
  //albedo = normal * 0.5 + 0.5;

  // visualize view direction
  // albedo = viewDirection * 0.5 + 0.5;

  // **DO NOT** forget to apply gamma correction as last step.
  outFragColor.rgba = LinearTosRGB(vec4(irradiance, 1.0));
}
`;
