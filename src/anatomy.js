import * as THREE from 'three';

const v=(x,y,z=0)=>new THREE.Vector3(x,y,z);
const arm=(side,part='arm')=>{
 const starts={arm:v(.35,2.37,.025),upperarm:v(.35,2.37,.025),forearm:v(.64,2.065,.02)};
 const ends={arm:v(.89,1.78,.015),upperarm:v(.64,2.065,.02),forearm:v(.89,1.78,.015)};
 const start=starts[part],end=ends[part];start.x*=side;end.x*=side;
 return {start,end,radius:part==='forearm'?.16:.24,side};
};
export const zones={
 full:{label:'Cuerpo completo'},
 'arm-left':{label:'Brazo izquierdo',...arm(1)},
 'arm-right':{label:'Brazo derecho',...arm(-1)},
 'forearm-left':{label:'Antebrazo izquierdo',...arm(1,'forearm')},
 'forearm-right':{label:'Antebrazo derecho',...arm(-1,'forearm')},
 'upperarm-left':{label:'Brazo superior izquierdo',...arm(1,'upperarm')},
 'upperarm-right':{label:'Brazo superior derecho',...arm(-1,'upperarm')},
 'calf-left':{label:'Pantorrilla izquierda',start:v(.175,.76,.01),end:v(.17,.12,.015),radius:.20,side:1},
 'calf-right':{label:'Pantorrilla derecha',start:v(-.175,.76,.01),end:v(-.17,.12,.015),radius:.20,side:-1},
 chest:{label:'Pecho',planes:[new THREE.Plane(v(0,1,0),-1.98),new THREE.Plane(v(0,-1,0),2.50),new THREE.Plane(v(1,0,0),.34),new THREE.Plane(v(-1,0,0),.34),new THREE.Plane(v(0,0,1),-.02)]},
 back:{label:'Espalda',planes:[new THREE.Plane(v(0,1,0),-1.4),new THREE.Plane(v(0,-1,0),2.5),new THREE.Plane(v(1,0,0),.34),new THREE.Plane(v(-1,0,0),.34),new THREE.Plane(v(0,0,-1),.025)]},
};

export function resolveZone(id,joints={}){
 const zone={...zones[id]};if(!zone.start)return zone;
 const suffix=id.endsWith('left')?'Left':'Right';
 const joint=name=>joints[name+suffix]?new THREE.Vector3(...joints[name+suffix]):null;
 const shoulder=joint('shoulder'),elbow=joint('elbow'),wrist=joint('wrist'),knee=joint('knee'),ankle=joint('ankle');
 if(id.startsWith('arm-')&&shoulder&&elbow&&wrist){zone.path=[shoulder,elbow,wrist];zone.radius=.32;}
 else if(id.startsWith('forearm-')&&elbow&&wrist){zone.path=[elbow,wrist];zone.radius=.24;}
 else if(id.startsWith('upperarm-')&&shoulder&&elbow){zone.path=[shoulder,elbow];zone.radius=.28;}
 else if(id.startsWith('calf-')&&knee&&ankle){zone.path=[knee.clone().lerp(ankle,.10),ankle];zone.radius=.3;}
 else zone.path=[zone.start,zone.end];
 zone.start=zone.path[0];zone.end=zone.path.at(-1);zone.side=Math.sign(zone.start.x);return zone;
}

function zonePlanes(zone){
 if(zone.planes)return zone.planes;
 const path=zone.path || [zone.start,zone.end],first=path[1].clone().sub(path[0]).normalize(),last=path.at(-1).clone().sub(path.at(-2)).normalize();
 return [new THREE.Plane().setFromNormalAndCoplanarPoint(first,zone.start),new THREE.Plane().setFromNormalAndCoplanarPoint(last.negate(),zone.end),new THREE.Plane(v(zone.side,0,0),zone.start.y>1?-.32:-.04)];
}
function closestOnPath(point,points){
 let best=null,total=0;
 for(let i=0;i<points.length-1;i++){
  const start=points[i],axis=points[i+1].clone().sub(start),length=axis.length();axis.divideScalar(length);
  const t=THREE.MathUtils.clamp(point.clone().sub(start).dot(axis),0,length),center=start.clone().addScaledVector(axis,t),distance=point.distanceToSquared(center);
  if(!best||distance<best.distance)best={distance,along:total+t,center,axis};total+=length;
 }
 return best;
}

// Clip each triangle at the anatomical section boundaries, interpolating normals.
export function isolateGeometry(source,zone){
 const planes=zonePlanes(zone),p=source.attributes.position,n=source.attributes.normal,index=source.index;
 const positions=[],normals=[];
 for(let i=0;i<(index?index.count:p.count);i+=3){
  let polygon=[0,1,2].map(j=>{const id=index?index.getX(i+j):i+j;return {p:new THREE.Vector3().fromBufferAttribute(p,id),n:new THREE.Vector3().fromBufferAttribute(n,id)};});
  if(zone.start){const mid=polygon.reduce((sum,x)=>sum.add(x.p),v(0,0)).multiplyScalar(1/3);if(closestOnPath(mid,zone.path || [zone.start,zone.end]).distance>zone.radius**2)continue;}
  for(const plane of planes){
   const next=[];
   for(let j=0;j<polygon.length;j++){
    const a=polygon[j],b=polygon[(j+1)%polygon.length],da=plane.distanceToPoint(a.p),db=plane.distanceToPoint(b.p);
    if(da>=0)next.push(a);
    if((da>=0)!==(db>=0)){const t=da/(da-db);next.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize()});}
   }
   polygon=next;if(polygon.length<3)break;
  }
  for(let j=1;j<polygon.length-1;j++)for(const x of [polygon[0],polygon[j],polygon[j+1]]){positions.push(...x.p);normals.push(...x.n);}
 }
 const surfaceVertexCount=positions.length/3;
 // Close the section cuts so the isolated limb remains solid when orbiting it.
 if(zone.start)for(const plane of planes.slice(0,2)){
  const unique=new Map();
  for(let i=0;i<positions.length;i+=3){const point=new THREE.Vector3(...positions.slice(i,i+3));if(Math.abs(plane.distanceToPoint(point))<1e-5)unique.set(point.toArray().map(x=>x.toFixed(6)).join(','),point);}
  const ring=[...unique.values()];if(ring.length<3)continue;
  const center=ring.reduce((sum,point)=>sum.add(point),v(0,0)).divideScalar(ring.length),normal=plane.normal.clone().negate();
  const right=new THREE.Vector3().crossVectors(normal,Math.abs(normal.y)<.9?v(0,1):v(1,0)).normalize(),up=new THREE.Vector3().crossVectors(normal,right);
  ring.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(up),a.clone().sub(center).dot(right))-Math.atan2(b.clone().sub(center).dot(up),b.clone().sub(center).dot(right)));
  for(let i=0;i<ring.length;i++)for(const point of [center,ring[i],ring[(i+1)%ring.length]]){positions.push(...point);normals.push(...normal);}
 }
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));result.computeBoundingBox();result.computeBoundingSphere();result.userData.surfaceVertexCount=surfaceVertexCount;return result;
}

export function limbFrame(geometry,zone){
 const curve=zone.path.length===2?new THREE.LineCurve3(...zone.path):new THREE.CatmullRomCurve3(zone.path),points=curve.getSpacedPoints(32);
 let length=0;for(let i=1;i<points.length;i++)length+=points[i].distanceTo(points[i-1]);
 const attribute=geometry.attributes.position,coordinates=[];
 for(let i=0;i<attribute.count;i++){
  const point=new THREE.Vector3().fromBufferAttribute(attribute,i),hit=closestOnPath(point,points),offset=point.sub(hit.center);
  const front=v(0,0,1).addScaledVector(hit.axis,-hit.axis.z).normalize(),right=new THREE.Vector3().crossVectors(hit.axis,front).normalize();
  coordinates.push({u:Math.atan2(offset.dot(right),offset.dot(front))/(Math.PI*2)+.5,along:hit.along});
 }
 return {length,coordinates,start:zone.start,front:v(0,0,1),pointAt:t=>curve.getPointAt(t),positionOf:point=>closestOnPath(point,points).along/length};
}

export function bandGeometry(source,frame,{position=.5,width=.12,rotation=0,repeats=1,flipped=false}){
 const geometry=source.index?source.toNonIndexed():source.clone(),uv=[];
 for(let i=0;i<frame.coordinates.length;i+=3){
  const coords=frame.coordinates.slice(i,i+3).map(x=>({u:x.u,v:(x.along-frame.length*position)/width+.5}));
  if(Math.max(...coords.map(x=>x.u))-Math.min(...coords.map(x=>x.u))>.5)coords.forEach(x=>{if(x.u<.5)x.u+=1;});
  for(const coord of coords)uv.push((flipped?-1:1)*(coord.u+rotation/360)*repeats,coord.v);
 }
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setDrawRange(0,source.userData.surfaceVertexCount ?? Infinity);return geometry;
}
