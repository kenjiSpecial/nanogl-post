module.exports = function( obj ){
var __t,__p='';
__p+='precision highp float;\n\nattribute vec2 aTexCoord0;\n\nvarying vec2 vTexCoord0;\n\nvoid main(void)\n{\n  vTexCoord0 = aTexCoord0;\n\n  gl_Position.xy = 2.0 * aTexCoord0-vec2(1.0,1.0);\n  gl_Position.zw = vec2(0.0,1.0);\n}\n';
return __p;
}