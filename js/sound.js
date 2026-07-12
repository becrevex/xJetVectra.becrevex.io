// Lightweight ZZFX sound layer for xJetVectra.
// Loaded as a plain browser script. Functions are globals by design.

let zzfxV = 0.85;
let zzfxX = null;
let audioUnlocked = false;

function getAudioContext() {
  if (!zzfxX) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    zzfxX = new AudioCtor();
  }

  if (zzfxX.state === "suspended") {
    zzfxX.resume();
  }

  audioUnlocked = true;
  return zzfxX;
}

function unlockAudio() {
  getAudioContext();
}

function safeZzfx(...args) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    zzfx(...args);
  } catch (err) {
    // Sound should never break gameplay.
    console.warn("Sound playback failed:", err);
  }
}

let zzfx = (p=1,k=.05,b=220,e=0,r=0,t=.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0,N=0)=>{let
M=Math,d=2*M.PI,R=44100,G=u*=500*d/R/R,C=b*=(1-k+2*k*M.random(k=[]))*d/R,g=0,H=0,a=0,n=1,I=0,J=0,f=0,h=N<0?-1:1,x=d*h*N*2/R,L=M.cos(x),Z=M.sin,K=Z(x)/4,O=1+K,X=-2*L/O,Y=(1-K)/O,P=(1+h*L)/2/O,Q=-(h+L)/O,S=P,T=0,U=0,V=0,W=0;e=R*e+9;m*=R;r*=R;t*=R;c*=R;y*=500*d/R**3;A*=d/R;v*=d/R;z*=R;l=R*l|0;p*=zzfxV;for(h=e+m+r+t+c|0;a<h;k[a++]=f*p)++J%(100*F|0)||(f=q?1<q?2<q?3<q?4<q?(g/d%1<D/2)*2-1:Z(g**3):M.max(M.min(M.tan(g),1),-1):1-(2*g/d%2+2)%2:1-4*M.abs(M.round(g/d)-g/d):Z(g),f=(l?1-B+B*Z(d*a/l):1)*(4<q?f:(f<0?-1:1)*M.abs(f)**D)*(a<e?a/e:a<e+m?1-(a-e)/m*(1-w):a<h-c?(h-a-c)/t*w:0),f=c?f/2+(c>a?0:(a<h-c?1:(h-a)/c)*k[a-c|0]/2/p):f,N?f=W=S*T+Q*(T=U)+P*(U=f)-Y*V-X*(V=W):0),x=(b+=u+=y)*M.cos(A*H++),g+=x+x*E*Z(a**5),n&&++n>z&&(b+=v,C+=v,n=0),!l||++I%l||(b=C,u=G,n=n||1);X=zzfxX,p=X.createBuffer(1,h,R);p.getChannelData(0).set(k);b=X.createBufferSource();b.buffer=p;b.connect(X.destination);b.start()};

function playLaser_old() {
  // Subtle dual-layer futuristic laser: quick high chirp + soft shimmer tail.
  // Kept intentionally quieter so repeated primary fire does not fatigue the ear.
  safeZzfx(.22,.02,980,.005,.025,.045,1,1.15,0,34,0,0,0,.01,0,.06,0,.82,.01,0,0);
  //zzfx(...[.7,,122,,.06,.08,1,.1,-16,-6,,,.13,,43,,.17,.61,.06,,-1500]); // Shoot 19 - Mutation 2

  setTimeout(() => {
    safeZzfx(.12,.01,1550,.002,.015,.035,0,1.8,0,-12,0,0,0,0,0,0,0,.7,.005,0,0);
  }, 12);
}


function playLaser() {
  zzfx(...[.025,0,752,.03,.015,.15,1,4.8,-4.9,,,,,,,,,.72,.2]); // Loaded Sound 30
}


function playMissile() {
  // Slightly quieter missile launch so it sits under the primary fire/explosions.
  safeZzfx(0.95,.05,965,.36,0,.24,1,1.6,-76,-1,0,0,.02,0,49,0,.05,.96,.01,.16,0);
}

function playMissileExplosion() {
  safeZzfx(1.1,.05,208,.03,.09,.04,4,3.7,-1,0,0,0,0,1.9,0,.5,0,.85,.01,0,-2374);
}

function playBombExplosion() {
  safeZzfx(4.6,.05,75,.07,.17,.27,0,3.4,1,9,0,0,0,.2,17,.9,.38,.31,.14,0,-1853);
}

function playDamage() {
  safeZzfx(1,.05,15,.2,0,.01,3,1.9,0,0,0,0,0,0,0,0,0,.74,.16,0,0);
}

function playSmallEnemyDestroyed() {
  safeZzfx(1.1,.05,208,.03,.09,.04,4,3.7,-1,0,0,0,0,1.9,0,.5,0,.85,.01,0,-2374);
}

function playEnemyDestroyed() {
  safeZzfx(2.5,.05,355,.02,.05,.11,1,2,9,0,0,0,0,1.9,0,.3,.19,.61,.05,0,113);
}

function playBigEnemyDestroyed() {
  safeZzfx(2,.05,71,.1,.06,.34,5,1.1,-1,-4,0,0,.07,2,0,.8,.4,.45,.12,0,0);
}

function playPowerup() {
  safeZzfx(.5,.05,100,.21,.32,.21,5,.969288914337749,0,8,171,.26,0,0,4.8,0,0,.58,0,0,-1498);
}

function playWeaponFireSound(weapon) {
  if (weapon === "PRIMARY") playLaser();
  else if (weapon === "MISSILE") playMissile();
  else if (weapon === "BOMB") playPowerup();
}

function playEnemyDestroyedForType(type) {
  if (type === "SPHERE_SMALL") playSmallEnemyDestroyed();
  else if (type === "SPHERE_LARGE") playBigEnemyDestroyed();
  else playEnemyDestroyed();
}

["pointerdown", "touchstart", "keydown"].forEach(eventName => {
  window.addEventListener(eventName, unlockAudio, { once: true, passive: true });
});

function playStageStart() {
  // Short rising launch cue for stage start.
  safeZzfx(.45,.02,260,.02,.08,.22,1,1.65,0,16,170,.08,0,0,0,.05,0,.78,.04,0,0);
  setTimeout(() => {
    safeZzfx(.28,.01,620,.01,.06,.18,0,1.35,0,8,110,.04,0,0,0,.03,0,.75,.02,0,0);
  }, 140);
}
