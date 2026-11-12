// Both the refraction pass and the caustic projector see the same surface.
// Long waves provide a quiet ocean-like rest state; the simulation supplies
// the local, dissipating disturbances created by the pointer and floating toys.
export const waterField = `
// Wave cell size: ~100 px at 1440 wide (about 7 % of the width), so the caustics are thin lines in small cells.
float waterScale(){return clamp(uViewport.x*.034,28.,52.);}
// Reach of the view refraction (text and objects under the water): kept as before, independent of the cell size.
float refractScale(){return clamp(uViewport.x*.060,36.,84.);}
vec2 surfaceSlope(vec2 pixel){
 vec2 p=pixel/waterScale();
 float t=uTime;
 vec2 slope=vec2(0.);
 // Two crossed, gently wandering swells focus sunlight into broad, almost
 // rectangular cells. Analytic phase derivatives keep the normals coherent.
 float warpA=p.y*2.2+t*.34;
 float warpB=p.x*1.73-t*.28;
 float longA=p.y*.8-t*.22;
 float longB=p.x*.7+t*.19;
 float a=p.x*3.1+t*.88+sin(warpA)*.34+sin(longA)*.42;
 float b=p.y*3.27-t*.85+sin(warpB)*.38+cos(longB)*.28;
 vec2 gradientA=vec2(3.1,cos(warpA)*.748+cos(longA)*.336);
 vec2 gradientB=vec2(cos(warpB)*.6574-sin(longB)*.196,3.27);
 float envelopeA=dot(p,vec2(.6,1.3))+t*.34;
 float envelopeB=dot(p,vec2(1.1,-.5))-t*.30;
 slope-=gradientA*sin(a)*(.15+.045*sin(envelopeA));
 slope+=vec2(.6,1.3)*cos(a)*.045*cos(envelopeA);
 slope-=gradientB*sin(b)*(.145+.04*sin(envelopeB));
 slope+=vec2(1.1,-.5)*cos(b)*.04*cos(envelopeB);
 slope+=vec2(1.74,2.18)*cos(dot(p,vec2(1.74,2.18))-t*.66)*.012;
 slope+=vec2(-2.62,1.47)*cos(dot(p,vec2(-2.62,1.47))+t*.44)*.008;
 vec2 uv=vec2(pixel.x/uViewport.x,1.-pixel.y/uViewport.y);
 vec2 texel=vec2(1./256.);
 float dx=texture2D(uWater,uv+vec2(texel.x,0.)).r-texture2D(uWater,uv-vec2(texel.x,0.)).r;
 float dy=texture2D(uWater,uv+vec2(0.,texel.y)).r-texture2D(uWater,uv-vec2(0.,texel.y)).r;
 slope+=vec2(dx,-dy)*5.2;
 return slope;
}
`
