

#if __VERSION__ == 300
  #define IN in
  out vec4 FragColor;
  #define texture2D(a,b) texture( a, b )
#else
  #define IN varying
  #define FragColor gl_FragColor
#endif

uniform sampler2D tInput;
IN vec2 vTexCoordVP;
IN vec2 vTexCoordFull;

#if NEED_DEPTH
  uniform sampler2D tDepth;
#endif


#if TEXTURE_DEPTH
  float FETCH_DEPTH( sampler2D t, vec2 uvs ){
    return texture2D(t,uvs).x;
  }
#else
  
  highp float decodeDepthRGB(highp vec3 rgb){
    return(rgb.x+rgb.y*(1.0/255.0))+rgb.z*(1.0/65025.0);
  }

  float FETCH_DEPTH( sampler2D t, vec2 uvs ){
    return decodeDepthRGB( texture2D(t,uvs).xyz );
  }
#endif



vec3 sRGB( vec3 c )
{
  return c * ( c * ( c*0.305306011 + vec3(0.682171111) ) + vec3(0.012522878) );
}

float luminance( vec3 c )
{
  return dot( c, vec3(0.3,0.59,0.11) );
}



{{@precode}}


void main(void){
  vec3 c;

  vec2 texCoordVP   = vTexCoordVP;
  vec2 texCoordFull = vTexCoordFull;


  #if NEED_DEPTH
    float sceneDepth = FETCH_DEPTH( tDepth, texCoordVP );
  #endif

  {{@code}}

  FragColor.xyz=c;
  FragColor.w=1.0;

}