
var Program       = require( 'nanogl/program' );
var Texture       = require( 'nanogl/texture' );
var Fbo           = require( 'nanogl/fbo' );
var GLArrayBuffer = require( 'nanogl/arraybuffer' );
var PixelFormats  = require( 'nanogl-pf' );

var main_frag = require( './glsl/templates/main.frag' );
var main_vert = require( './glsl/templates/main.vert' );

var Effect    = require( './effects/base-effect' );


function Post( gl, mipmap ){
  this.gl = gl;

  this._effects   = [];
  this._flags     = 0;
  this._shaderInvalid = true;

  this.renderWidth  = 1;
  this.renderHeight = 1;

  this.bufferWidth  = 1;
  this.bufferHeight = 1;

  this.enabled = true;
  this.mipmap  = (mipmap === undefined) ? false : mipmap;

  this.float_texture_ext   = gl.getExtension('OES_texture_float');
  this.halfFloat           = gl.getExtension("OES_texture_half_float");
  this.float_texture_ext_l = gl.getExtension("OES_texture_half_float_linear");
  this.halfFloat_l         = gl.getExtension("OES_texture_float_linear");
  this.color_buffer_float  = gl.getExtension('EXT_color_buffer_float');

  
  this.hasDepthTexture = PixelFormats.getInstance(gl).hasDepthTexture();



  this.mainFbo = this.genFbo();
  this.mainColor = this.mainFbo.getColor();


  // test fbo's mipmaping capability
  if( this.mipmap ){

    this.mainColor.bind()
    gl.generateMipmap( gl.TEXTURE_2D );

    var err = gl.getError();
    if( err ){
      this.mipmap = false;
      // this fbo is now fu*** up, need to create a fresh one
      this.mainFbo.dispose()
      this.mainFbo   = this.genFbo();
      this.mainColor = this.mainFbo.getColor();
    }
  }

  this.mainColor.setFilter( false, this.mipmap, false )


  this.prg = new Program( gl );


  var fsData = new Float32Array( [0, 0, 1, 0, 0, 1, 1, 1] );
  this.fsPlane = new GLArrayBuffer( gl, fsData );
  this.fsPlane.attrib( 'aTexCoord0', 2, gl.FLOAT );
}


Post.prototype = {


  dispose : function(){
    this.mainFbo.dispose();
    this.fsPlane.dispose();
    this.prg.dispose();
  },


  _needDepth : function(){
    return (this._flags & Effect.NEED_DEPTH) !== 0;
  },

  _needLinear : function(){
    return (this._flags & Effect.NEED_LINEAR) !== 0;
  },


  genFbo : function(){
    var gl = this.gl;
    var pf = PixelFormats.getInstance(gl);

    var ctxAttribs        = gl.getContextAttributes();



    var configs = []

    configs = [ 
      pf.RGB16F ,
      pf.RGBA16F,
      pf.RGB32F ,
      pf.RGBA32F,
      pf.RGB8   
    ];


    if( gl.UNSIGNED_INT_2_10_10_10_REV === 0x8368){
      
      // webgl2
      // TODO Add option for 16f VS 10fixed

      // configs.push( pf.A2B10G10R10  );



    }    

    

    
    var cfg = pf.getRenderableFormat( configs );

    var fbo = new Fbo( gl );
    fbo.bind();
    fbo.attachColor( cfg.format, cfg.type, cfg.internal  );


    // depth/stencil

    // if ! ctxAttribs.depth no texture

    fbo.attachDepth( ctxAttribs.depth, ctxAttribs.stencil, this.hasDepthTexture );

    // force attachment allocation
    fbo.resize( 4, 4 );


    var color = fbo.getColor();
    color.bind();
    color.clamp()


    if( this.hasDepthTexture ){
      var depth = fbo.getDepth()
      depth.bind();
      depth.clamp();
      depth.setFilter( false, false, false );
    }

    return fbo;
  },


  // genDepthFbo : function(){
  //   // depth only FBO
  //   var fbo = Fbo.create( this.gl, {
  //     depth : true,
  //     format : this.gl.RGB
  //   });
  //   fbo.color.bind();
  //   fbo.color.setFilter( false, false, false );
  //   fbo.color.clamp()
  //    return fbo;
  // },


  add : function( effect ){
    if( this._effects.indexOf( effect ) === -1 ){
      this._effects.push( effect );
      effect._init( this );
      effect.resize( this.renderWidth, this.renderHeight );
      this._flags |= effect._flags;
      this._shaderInvalid = true;
    }
  },


  remove : function( effect ){
    var i = this._effects.indexOf( effect );
    if( i > -1 ){
      this._effects.splice( i, 1 );
      effect.release();
      effect.post = null;
      this._shaderInvalid = true;


      if( effect._flags !== 0 ){
        this._flags = 0;
        for (var i = 0; i < this._effects.length; i++) {
          this._flags |= effect._flags;
        }
      }

    }
  },



  resize : function( w, h ){

    this.bufferWidth  = w;
    this.bufferHeight = h;
    
    this.mainFbo.resize( this.bufferWidth, this.bufferHeight );

    for( var i=0; i< this._effects.length; i++ ){
      this._effects[i].resize(w, h)
    }

  },


  preRender : function( w, h ){


    var gl = this.gl;

    this.renderWidth  = w;
    this.renderHeight = h;

    
    if( this.enabled ){

      var bufferWidth  = this.mipmap ? nextPOT( w ) : w;
      var bufferHeight = this.mipmap ? nextPOT( h ) : h;

      if( this.bufferWidth !== bufferWidth || this.bufferHeight !== bufferHeight ){
        this.resize( bufferWidth, bufferHeight );
      }

    }

  },


  needDepthPass : function(){
    return this.enabled && this._needDepth() && !this.hasDepthTexture;
  },


  bindDepth : function(){
    if( ! this.needDepthPass() ){
      return false;
    }

    var gl = this.gl;
    this.depthFbo.bind();
    gl.viewport( 0, 0, this.renderWidth, this.renderHeight );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    return true;
  },



  bindColor : function( ){


    var gl = this.gl;

    if( this.enabled ){
      this.mainFbo.bind();
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.viewport( 0, 0, this.renderWidth, this.renderHeight );
    // gl.clearColor( .0, .0, .0, 1.0 );
    // just clear, main fbo or screen one
    this.mainFbo.clear();



  },


  render : function( toFbo ){


    if( ! this.enabled ){
      return;
    }


    var gl = this.gl;

    // mipmap mainFbo here
    this.mainColor.bind();
    if( this.mipmap ){
      gl.generateMipmap( gl.TEXTURE_2D );
    }



    for( var i = 0; i < this._effects.length; i++ ){
      this._effects[i].preRender()
    }


    if( toFbo !== undefined ){
      toFbo.resize( this.renderWidth, this.renderHeight );
      toFbo.bind();
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport( 0, 0, this.renderWidth, this.renderHeight );
    }

    gl.clearColor( .0, .0, .0, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );




    if( this._shaderInvalid ){
      this.buildProgram();
    }

    this.prg.use();

    for( var i = 0; i < this._effects.length; i++ ){
      this._effects[i].setupProgram( this.prg );
    }



    this.prg.tInput( this.mainColor );


    if( this._needDepth() ){
      if( this.hasDepthTexture )
        this.prg.tDepth( this.mainFbo.getDepth() );
      else
        this.prg.tDepth( this.depthFbo.color );
    }


    this.fillScreen( this.prg );

  },


  fillScreen : function( prg, fullframe ){
    if( fullframe === true ){
      prg.uViewportScale( 1, 1 );
    } else {
      prg.uViewportScale(
        this.renderWidth  / this.bufferWidth ,
        this.renderHeight / this.bufferHeight
      );
    }

    this.fsPlane.attribPointer( prg );
    this.fsPlane.drawTriangleStrip();
  },


  buildProgram : function(){


    var code    = [],
        precode = [];

    var effects = this._effects;
    for (var i = 0; i < effects.length; i++) {
      effects[i].genCode( precode, code );
    }

    code    = code.   join( '\n' );
    precode = precode.join( '\n' );

    var frag = main_frag({
      code : code,
      precode : precode
    });

    var vert = main_vert();


    var depthTex = this._needDepth() && this.hasDepthTexture;
    var defs = '';

    if( this.gl.SIGNALED ) {// webgl2
      defs += '#version 300 es\n';
    }
    
    defs += 'precision highp float;\n';
    defs += '#define NEED_DEPTH '    +(0|this._needDepth())+'\n';
    defs += '#define TEXTURE_DEPTH ' +(0|depthTex)       +'\n';

    this.prg.compile( vert, frag, defs );

    this._shaderInvalid = false;


    this.mainColor.bind()
    this.mainColor.setFilter( this._needLinear(), this.mipmap, false );

  }


}


// ----------------
// utilities
// ----------------

var MAX_POT = 4096;

function nextPOT( n ){
  var p = 1;

  while (p < n)
    p <<= 1;

  if (p > MAX_POT)
    p = MAX_POT;

  return p;
}



module.exports = Post;