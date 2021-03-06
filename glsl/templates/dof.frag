// uniform sampler2D tDofMedBlur;
// uniform sampler2D tDofBlur;
// uniform vec2      uDofInvTargetSize;

{
  mediump vec3 small;
  mediump vec4 med;
  mediump vec3 large;
  mediump float nearCoc;
  mediump float farCoc;
  mediump float coc;

  small   = GetSmallBlurSample( texCoordVP ) + c*(1.0/17.0);

  
  med     = texture2D( tDofMedBlur, texCoordVP );
  large   = texture2D( tDofBlur   , texCoordVP ).rgb;
  nearCoc = med.a;// * 0.000001;

  // if ( sceneDepth > .999999 )
  // {
  //   coc = nearCoc; // We don't want to blur the sky.
  // }
  // else
  // {


    // dofEqFar.x and dofEqFar.y specify the linear ramp to convert
   // to depth for the distant out-of-focus region.
   // dofEqFar.z is the ratio of the far to the near blur radius.
  farCoc = clamp( uDofEqFar.x * sceneDepth + uDofEqFar.y, 0.0, 1.0 );
  coc = max( nearCoc, farCoc * uDofEqFar.z );
  // coc = nearCoc * step( 0.1, farCoc );

  sceneDepth = GetSmallBlurDepth( texCoordVP ) + sceneDepth*(1.0/17.0);
  if ( sceneDepth > .999999 )
  {
     coc = nearCoc; // We don't want to blur the sky.
  }


  // }
  // vec3 bak = c;
  InterpolateDof( c, small, med.rgb, large, coc );
  // c.rgb = c.rgb * 0.00000001 + coc;
  // c *= 0.000001;
  // c += large.rgb;

}

