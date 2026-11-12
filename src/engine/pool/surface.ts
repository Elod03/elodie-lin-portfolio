export const surfaceVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`
import { waterField } from '../sim/waterField'
import { LIGHT_MAX_TINT } from '../../world/parisLight'
const LIGHT_TINT = LIGHT_MAX_TINT.toFixed(2)
/** How far (in refraction units) a message crossing the water is bent: tune here. */
export const MESSAGE_RIPPLE = 1.8
export const surfaceFragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uViewport;
uniform vec4 uFrame;
uniform vec4 uPool;
uniform float uPoolR;
uniform vec2 uPan;
uniform vec4 uRadii;
uniform float uTime;
uniform float uNight;
uniform float uVisible;
uniform sampler2D uWater;
uniform sampler2D uCaustics;
uniform sampler2D uObjectShadows;
uniform sampler2D uHero;
uniform sampler2D uHeroBars;
uniform float uHeroLines;
uniform vec4 uHeroLine[6];
uniform float uHeroP[6];
uniform vec4 uHeroTail;
uniform float uHeroMorph;
uniform vec3 uHeroCloud;
uniform sampler2D uMessages;
uniform sampler2D uBeachMessages;
uniform float uBeachMsg;
uniform vec4 uShadows[8];
// Arrival: uFill = water level (0 dry basin .. 1 full), uCausticOn = caustics strength.
uniform float uFill;
uniform float uCausticOn;
// Water tint (hovered project colour): rgb + strength (<= .25).
uniform vec3 uTint;
uniform float uTintAmt;
// Language change: 0 = crisp dots .. 1 = scattered grains, on a dot grid of uHeroPitch CSS px.
uniform float uHeroReform;
uniform float uHeroPitch;
// Hour in Paris: x = gold of the late afternoon (0..1), y = clear light of the morning (0..1). Each tints at most 15 %.
uniform vec2 uLight;
// Light of the water on the page: strength (0 on the home page), reach in px (160 desktop, 96 phone), steady = 1 freezes the filaments.
uniform float uGlow;
uniform float uGlowReach;
uniform float uGlowSteady;
vec2 hash2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float roundedRect(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
${waterField}
// Crisp caustic lines: one tap plus a 1 px cross (anti-aliasing only), a low threshold keeps thin, bright filaments.
float causticTap(vec2 pixel){return max(0.,texture2D(uCaustics,pixel/uViewport).r-.08);}
float causticAt(vec2 pixel){
 vec2 uv=pixel/uViewport;
 vec2 px=vec2(1.)/uViewport;
 float energy=texture2D(uCaustics,uv).r*.5;
 energy+=(texture2D(uCaustics,uv+vec2(px.x,0.)).r+texture2D(uCaustics,uv-vec2(px.x,0.)).r+texture2D(uCaustics,uv+vec2(0.,px.y)).r+texture2D(uCaustics,uv-vec2(0.,px.y)).r)*.125;
 return max(0.,energy-.08);
}
// Lamp k (0..5) lights up in order while uNight rises 0 -> 1 (and goes out in reverse order): one night value drives everything.
float lampOn(float k){float s=k/6.*.5;return smoothstep(s,s+.5,uNight);}
float sparkle(vec2 pixel,vec2 uv){
 vec2 cell=floor(pixel/31.),f=fract(pixel/31.);vec2 seed=hash2(cell);
 vec2 d=(f-(.2+seed*.6))*31.;float pulse=pow(max(0.,sin(uTime*1.5+seed.x*25.)),14.);
 float star=exp(-dot(d,d)/1.1)+.18*exp(-abs(d.x)*8.-abs(d.y)*.7)+.18*exp(-abs(d.y)*8.-abs(d.x)*.7);
 return star*pulse*smoothstep(.62,.9,uv.x)*(1.-smoothstep(.08,.48,uv.y))*step(.45,seed.y);
}
// Hero dots read at a point. While the language changes, each dot cell (hash of its cell) is read from a small
// random offset and the read is averaged over 3 taps along the water slope: scattered, refracted grains.
float heroAt(vec2 p,vec2 bend){
 if(uHeroReform<.002)return texture2D(uHero,vec2(p.x/uViewport.x,1.-p.y/uViewport.y)).a;
 float a=0.;
 for(int k=0;k<3;k++){
  vec2 q=p+bend*(float(k)-1.)*uHeroReform*1.6;
  vec2 cell=floor(q/uHeroPitch);
  vec2 h=hash2(cell+float(k)*7.3)-.5;
  q+=h*uHeroReform*36.+vec2(0.,uHeroReform*-10.);
  a+=texture2D(uHero,vec2(q.x/uViewport.x,1.-q.y/uViewport.y)).a;
 }
 return a/3.*(1.-uHeroReform*.35);
}
void main(){
 // The pool is ONE fixed scene (the home pool, in world pixels). uFrame is only the animated window that
 // crops it; uPan says which part of the world the window looks at (world = screen - pan).
 vec2 pixel=vec2(vUv.x,1.-vUv.y)*uViewport;
 vec2 local=pixel-uFrame.xy,halfSize=uFrame.zw*.5;
 float radius=local.x<halfSize.x?(local.y<halfSize.y?uRadii.x:uRadii.w):(local.y<halfSize.y?uRadii.y:uRadii.z);
 float sdf=roundedRect(local-halfSize,halfSize,radius);
 if(uVisible<.5)discard;
 // Soft drop shadow of the coping on the tiles around the pool (offset 6 px down), cut by the window like the pool.
 float shadowSdf=roundedRect(local-halfSize-vec2(0.,6.),halfSize,radius);
 float outerShadow=pow(1.-smoothstep(0.,42.,shadowSdf),2.)*.36;
 if(sdf>1.){
  // Second message plane: large, very blurred words drifting on the beach (the tiles around the pool), home only.
  vec2 beachUV=vec2((pixel.x-uPan.x)/uViewport.x,1.-(pixel.y-uPan.y)/uViewport.y);
  float beachA=texture2D(uBeachMessages,beachUV).a*uBeachMsg;
  // The water lights the page: a caustic glow leaves the edge of the window over the tiles, and dies out within uGlowReach px.
  float glowA=0.;
  vec3 glowColor=vec3(0.);
  if(uGlow>.001){
   float away=clamp((sdf-1.)/uGlowReach,0.,1.);
   float fall=(1.-away)*(1.-away)*(1.-away);
   float filaments=causticAt(pixel-uPan);
   float pattern=mix(.35+1.45*(1.-exp(-filaments*4.)),.6,uGlowSteady);
   glowA=fall*clamp(pattern,0.,1.)*mix(.10,.16,uNight)*uGlow;
   glowColor=mix(vec3(.50,.82,1.),vec3(.62,.91,1.),uNight);
   glowColor=mix(glowColor,vec3(1.,.80,.46),uLight.x*${LIGHT_TINT}*(1.-uNight));
  }
  if(outerShadow<.004&&beachA<.004&&glowA<.002)discard;
  vec3 beachInk=mix(vec3(.043,.208,.329),vec3(.894,.965,1.),uNight);
  float shadowA=outerShadow;
  float outA=shadowA+beachA*(1.-shadowA);
  vec3 outRgb=(vec3(.04,.16,.31)*shadowA+beachInk*beachA*(1.-shadowA))/max(outA,.001);
  float finalA=glowA+outA*(1.-glowA);
  gl_FragColor=vec4((glowColor*glowA+outRgb*outA*(1.-glowA))/max(finalA,.001),finalA);return;
 }
 vec2 wp=pixel-uPan;
 vec2 worldUv=vec2(wp.x/uViewport.x,1.-wp.y/uViewport.y);
 vec2 texel=vec2(1./256.);
 vec2 wave=vec2(texture2D(uWater,worldUv+vec2(texel.x,0.)).r-texture2D(uWater,worldUv-vec2(texel.x,0.)).r,texture2D(uWater,worldUv+vec2(0.,texel.y)).r-texture2D(uWater,worldUv-vec2(0.,texel.y)).r);
 vec2 slope=surfaceSlope(wp);
 vec3 normal=normalize(vec3(-slope,1.));
 vec3 eye=normalize(vec3((wp-uViewport*.5)/uViewport.y*.24,1.));
 vec3 viewRay=refract(-eye,normal,1./1.333);
 vec2 refraction=viewRay.xy/max(.35,-viewRay.z)*refractScale()*.44;
 vec2 refracted=wp+refraction;
 vec2 screenRefracted=pixel+refraction;
 vec2 plocal=wp-uPool.xy;
 float poolSdf=roundedRect(plocal-uPool.zw*.5,uPool.zw*.5,uPoolR);
 vec2 uv=plocal/uPool.zw;
 float depth=min(76.,min(uPool.z,uPool.w)*.118);
 vec2 floorOrigin=vec2(depth,depth*1.02);
 vec2 floorSize=uPool.zw-vec2(depth*2.,depth*1.78);
 vec2 floorPoint=refracted-uPool.xy-floorOrigin;
 float floorSdf=roundedRect(floorPoint-floorSize*.5,floorSize*.5,min(22.,depth*.45));
 float floorMask=1.-smoothstep(-1.,1.5,floorSdf);
 // Directional wall illumination and shade from the upper rim establish depth.
 vec3 left=mix(vec3(.082,.47,.82),vec3(.035,.29,.40),uNight);
 left*=1.+(.10-uv.y*.20)*(1.-uNight);
 vec3 right=mix(vec3(.035,.27,.53),vec3(.025,.20,.31),uNight);
 vec3 top=mix(vec3(.055,.34,.61),vec3(.035,.24,.33),uNight);
 vec3 bottom=mix(vec3(.08,.54,.78),vec3(.045,.31,.42),uNight);
 float leftWeight=1.-smoothstep(0.,depth,plocal.x);
 float rightWeight=1.-smoothstep(0.,depth,uPool.z-plocal.x);
 vec3 wall=mix(top,bottom,smoothstep(.1,.9,uv.y));
 wall=mix(wall,left,leftWeight);wall=mix(wall,right,rightWeight*.8);
 wall+=vec3(.02,.05,.07)*sin(clamp(-floorSdf/depth+1.,0.,1.)*3.14159);
 vec3 floorColor=mix(vec3(.12,.57,.86),vec3(.07,.40,.60),uNight);
 float sunlight=exp(-length((uv-vec2(.63,.36))*vec2(.7,1.3))*1.7);
 floorColor+=mix(vec3(.025,.055,.055),vec3(.015,.025,.025),uNight)*sunlight;
 float wallShadow=exp(-max(0.,floorPoint.y)/max(12.,depth*.7))*.22;
 wallShadow+=exp(-max(0.,floorSize.x-floorPoint.x)/max(9.,depth*.4))*.10;
 floorColor*=1.-wallShadow;
 // The upper coping casts a broad submerged shadow, making the far wall
 // read as a deep vertical face rather than an evenly inset graphic panel.
 float upperOcclusion=1.-smoothstep(depth*1.18,depth*1.48,floorPoint.y);
 floorColor=mix(floorColor,mix(vec3(.065,.35,.65),vec3(.045,.28,.39),uNight),upperOcclusion*.94);
 vec3 color=mix(wall,floorColor,floorMask);
 // Wall illumination is a stretched projection of the same refracted rays.
 vec2 wallProjection=refracted;
 wallProjection.x+=((1.-smoothstep(0.,depth,plocal.x))-(1.-smoothstep(0.,depth,uPool.z-plocal.x)))*depth*1.4;
 wallProjection.y+=((1.-smoothstep(0.,depth,plocal.y))-(1.-smoothstep(0.,depth,uPool.w-plocal.y)))*depth*1.4;
 vec2 causticPos=mix(wallProjection,refracted,floorMask);
 // Very light chromatic dispersion of the filaments (R and B are 1.5 px apart at most, gone at night).
 // Smooth near a zero refraction (no flip), off at night and on phones; R and B use a single tap each.
 vec2 disperse=refraction/max(length(refraction),1.)*.75*(1.-uNight);
 float centerFocus=causticAt(causticPos);
 vec3 focus=vec3(centerFocus);
 if(uViewport.x>=768.&&uNight<.99){focus.r=causticTap(causticPos-disperse);focus.b=causticTap(causticPos+disperse);}
 vec3 glow=(1.-exp(-focus*4.))*mix(1.,.72,uNight)*mix(.22,1.,floorMask)*uCausticOn;
 glow*=1.-upperOcclusion*floorMask*.94;
 // The light of the water leans toward the hovered project colour (at most 25 %), lightened so it never gets saturated.
 vec3 lightColor=mix(vec3(.50,.82,1.),mix(uTint,vec3(1.),.45),uTintAmt);
 // Hour in Paris (daylight only): gold glints and a warmer water at the end of the afternoon, a clearer, fresher pool in the morning.
 float day=1.-uNight;
 lightColor=mix(lightColor,vec3(1.,.80,.46),uLight.x*${LIGHT_TINT}*day*2.);
 glow*=1.+uLight.y*.25*day;
 color=1.-(1.-color)*(1.-lightColor*glow);
 color=mix(color,vec3(.98,.78,.45),uLight.x*${LIGHT_TINT}*day*floorMask*.9+uLight.x*${LIGHT_TINT}*day*(1.-floorMask)*.6);
 color=mix(color,vec3(.80,.93,1.),uLight.y*${LIGHT_TINT}*day*.8);
 // A faint wash of the same colour on the water itself (mean-preserving, so the blue stays blue).
 color*=mix(vec3(1.),uTint/max(dot(uTint,vec3(.3333)),.2),uTintAmt*.6);
 color*=1.-exp(-abs(floorSdf)/7.)*.10;
 vec2 shadowUV=vec2(screenRefracted.x/uViewport.x,1.-screenRefracted.y/uViewport.y);
 vec2 shadowBlur=vec2(4.)/uViewport;
 float shadow=texture2D(uObjectShadows,shadowUV).a*.28;
 shadow+=texture2D(uObjectShadows,shadowUV+vec2(shadowBlur.x,shadowBlur.y)).a*.18;
 shadow+=texture2D(uObjectShadows,shadowUV+vec2(-shadowBlur.x,shadowBlur.y)).a*.18;
 shadow+=texture2D(uObjectShadows,shadowUV+vec2(shadowBlur.x,-shadowBlur.y)).a*.18;
 shadow+=texture2D(uObjectShadows,shadowUV-shadowBlur).a*.18;
 // Object shadows are tinted toward #0A5BB0 (about 45 %), not just darkened.
 color=mix(color,color*vec3(.039,.357,.69)*1.05,clamp(shadow*mix(.8,.65,uNight)*mix(.5,1.,floorMask),0.,.6));
 // Six submerged fixtures, all cyan. They light up one after the other as the night comes in;
 // the more a lamp is on, the farther its light spreads into the water. Composed before the text.
 for(int j=0;j<6;j++){
  float col=floor(float(j)*.5)+1.;
  float bottom=mod(float(j),2.);
  vec2 lampPos=vec2(uPool.x+uPool.z*col*.25,mix(uPool.y+depth*.32,uPool.y+uPool.w-depth*.32,bottom));
  vec2 d=abs(wp-lampPos);
  float on=lampOn(float(j));
  float spread=mix(.55,1.,on);
  vec2 body=d/vec2(22.,3.);
  float fixture=exp(-dot(body,body));
  float halo=exp(-length(d/(vec2(60.,22.)*spread)))*.25;
  float cone=exp(-length(d/(vec2(90.,90.)*spread)))*.10;
  float wash=exp(-length(d/vec2(170.,125.)))*.17*on;
  color+=vec3(.62,.91,1.)*(fixture*.92+halo+cone+wash)*mix(.10,1.,on);
 }
 // Arrival: the basin starts dry (pale tiles on the floor and walls) and a waterline sweeps it from bottom to top.
 float waterWet=1.;
 if(uFill<.999){
  float front=mix(uPool.y+uPool.w+30.,uPool.y-30.,uFill)+sin(wp.x*.021+uFill*5.)*7.;
  float wet=smoothstep(front-3.,front+3.,wp.y);
  waterWet=wet;
  vec2 tile=abs(fract(wp/46.)-.5);
  float line=smoothstep(.482,.5,max(tile.x,tile.y));
  vec3 dryFloor=vec3(.90,.92,.91)*(1.-line*.06);
  vec3 dryWall=vec3(.80,.83,.84)*mix(.97,1.03,uv.y)*(1.-line*.05);
  vec3 dry=mix(dryWall,dryFloor,floorMask)*mix(1.,.62,uNight);
  float foam=exp(-pow((wp.y-front)/5.,2.))*step(.001,uFill);
  // Just under the front the water is still pale (it has not settled yet) and takes its depth as the level comes up.
  float settle=smoothstep(0.,1.,(wp.y-front)/220.)*.7+uFill*.3;
  vec3 watered=mix(dry,color,clamp(settle,0.,1.));
  color=mix(dry,watered,wet);
  color=mix(color,vec3(1.),foam*.55*(1.-uNight*.5));
 }
 // Keep messages legible: a small surface drift remains, without the strong
 // floor refraction or caustics washing through individual letter strokes.
 // Read at the refracted coordinate: a message crossing the water ripples like a real shadow on it.
 vec2 messageAt=wp+refraction*${MESSAGE_RIPPLE.toFixed(2)};
 vec2 messageUV=vec2((messageAt.x+wave.x*10.)/uViewport.x,1.-(messageAt.y-wave.y*10.)/uViewport.y);
 vec4 message=texture2D(uMessages,messageUV);
 color=mix(color,message.rgb,message.a*waterWet);
 // The hero text only feels about half of the floor refraction: bent, but readable at a glance.
 vec2 heroPos=wp+refraction*.45;
 vec2 heroUV=vec2(heroPos.x/uViewport.x,1.-heroPos.y/uViewport.y);
 // Hero text in world pixels (it appears through the strips as fragments). Dots are read through the refraction,
 // so the water still bends them, but they stay big, navy and legible.
 float text=heroAt(heroPos,refraction);
 vec4 tail=uHeroTail;
 float inTail=step(tail.x,heroPos.x)*step(heroPos.x,tail.z)*step(tail.y,heroPos.y)*step(heroPos.y,tail.w);
 text=mix(text,texture2D(uHeroBars,heroUV).a,inTail*uHeroMorph);
 // Writing: each line is revealed from left to right with a soft edge.
 float written=1.;
 for(int i=0;i<6;i++){
  if(float(i)<uHeroLines){
   vec4 b=uHeroLine[i];
   if(heroPos.y>=b.x&&heroPos.y<=b.y){
    float edge=mix(b.z-34.,b.w+34.,uHeroP[i]);
    written=1.-smoothstep(edge-34.,edge,heroPos.x);
   }
  }
 }
 text*=written;
 // Small soft cloud shadow hanging to the right of the title.
 if(uHeroCloud.z>0.){
  vec2 cd=(wp-uHeroCloud.xy)/uHeroCloud.z;
  float blob=max(max(1.-length(cd/vec2(.78,.34)),1.-length((cd-vec2(-.55,.16))/vec2(.5,.26))),1.-length((cd-vec2(.48,.1))/vec2(.46,.24)));
  color=mix(color,vec3(.039,.357,.69),smoothstep(0.,.5,blob)*.40*mix(1.,.55,uNight)*uHeroP[0]);
 }
 vec3 ink=mix(vec3(.043,.247,.549),vec3(.015,.11,.26),uNight);
 color=mix(color,ink,text*mix(.97,.95,smoothstep(500.,1000.,uViewport.x)));
 // Waterline, reflected sky and tiny glints remain independent of the floor.
 // Rim and bevel belong to the real pool edge only; the window's own edge is a clean rounded cut.
 float edgeDistance=-poolSdf;
 float rimDistance=(edgeDistance-1.)/1.2;
 float waterline=exp(-rimDistance*rimDistance);
 // Subtle 2 px light edge on the top of the coping.
 float lip=exp(-pow((edgeDistance-2.5)/1.1,2.))*(1.-smoothstep(.04,.16,uv.y))*mix(.30,.10,uNight);
 float bevelShade=exp(-max(0.,edgeDistance)/4.);
 color*=1.-bevelShade*.27;
 vec3 ceramic=mix(vec3(.85,.84,.80),vec3(.29,.32,.33),uNight);
 color=mix(color,ceramic,waterline*.58*(.8+uv.y*.2));
 color=mix(color,ceramic,smoothstep(1.,3.,poolSdf));
 color=mix(color,vec3(1.),lip);
 float fresnel=.025+.975*pow(1.-max(0.,dot(normal,eye)),5.);
 float reflected=pow(max(0.,dot(reflect(-normalize(vec3(-.3,.45,1.)),normal),eye)),65.);
 color=mix(color,vec3(.62,.82,.93),fresnel*.24);
 color+=vec3(.35,.60,.72)*reflected*mix(.08,.035,uNight);
 color+=vec3(.72,.90,1.)*sparkle(wp,uv)*mix(.9,.2,uNight);
 float cover=1.-smoothstep(-1.,1.,sdf);
 float behind=(1.-cover)*outerShadow;
 float outAlpha=cover+behind;
 gl_FragColor=vec4((color*cover+vec3(.04,.16,.31)*behind)/max(outAlpha,.001),outAlpha);
}`
