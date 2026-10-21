"""Convert MakeHuman CC0 mesh/targets to bundled GLB files (stdlib only).
Usage: python scripts/build-body-models.py /path/to/MakeHuman-assets-directory
See public/models/ATTRIBUTION.md for pinned upstream sources.
"""
import sys, json, struct, math
from pathlib import Path
source=Path(sys.argv[1]); destination=Path(__file__).resolve().parents[1]/'public/models'
vertices=[]; groups={}; group=None
for line in (source/'base.obj').read_text().splitlines():
 p=line.split()
 if not p: continue
 if p[0]=='v':vertices.append(list(map(float,p[1:4])))
 elif p[0]=='g':group=p[1]
 elif p[0]=='f':groups.setdefault(group,[]).append([int(x.split('/')[0])-1 for x in p[1:]])
def target(name):
 result={}
 text=(source/name).read_text()
 assert 'CC0' in text, 'Require explicitly licensed source assets'
 for l in text.splitlines():
  p=l.split()
  if p and not l.startswith('#'):result[int(p[0])]=list(map(float,p[1:4]))
 return result
for sex in ['male','female']:
 model={'asset':{'version':'2.0','generator':'INKFORMA / MakeHuman CC0 conversion'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[{'name':'Clay skin','pbrMetallicRoughness':{'baseColorFactor':[.65,.42,.29,1],'metallicFactor':0,'roughnessFactor':.62}}],'buffers':[],'bufferViews':[],'accessors':[]}
 binary=bytearray()
 def accessor(values, kind, component, count):
  while len(binary)%4:binary.append(0)
  offset=len(binary);fmt='f' if component==5126 else 'I';binary.extend(struct.pack('<'+str(len(values))+fmt,*values))
  view=len(model['bufferViews']);model['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(binary)-offset})
  item={'bufferView':view,'componentType':component,'count':count,'type':kind}
  if kind=='VEC3':item.update(min=[min(values[i::3]) for i in range(3)],max=[max(values[i::3]) for i in range(3)])
  model['accessors'].append(item);return len(model['accessors'])-1
 ethnic=[target(f'{e}-{sex}-young.target') for e in ['african','asian','caucasian']]
 for build,weight,amount in [('delgada','minweight',.65),('media','averageweight',1),('robusta','maxweight',.65)]:
  wt=target(f'universal-{sex}-young-averagemuscle-{weight}.target')
  shaped=[[v[j]+sum(t.get(i,[0,0,0])[j] for t in ethnic)/3+wt.get(i,[0,0,0])[j]*amount for j in range(3)] for i,v in enumerate(vertices)]
  used={i for face in groups['body'] for i in face};low=min(shaped[i][1] for i in used);scale=3/(max(shaped[i][1] for i in used)-low)
  parent=len(model['nodes']);model['nodes'].append({'name':build,'children':[]});model['scenes'][0]['nodes'].append(parent)
  for part in ['body','helper-l-eye','helper-r-eye']:
   faces=groups[part];ids=sorted({i for face in faces for i in face});mapping={v:i for i,v in enumerate(ids)}
   pos=[[shaped[i][0]*scale,(shaped[i][1]-low)*scale,shaped[i][2]*scale] for i in ids]
   indices=[]
   for face in faces:
    for j in range(1,len(face)-1):indices.extend(mapping[i] for i in [face[0],face[j],face[j+1]])
   normals=[[0.,0.,0.] for i in ids]
   for i in range(0,len(indices),3):
    a,b,c=[pos[indices[i+j]] for j in range(3)];u=[b[j]-a[j] for j in range(3)];v=[c[j]-a[j] for j in range(3)];n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
    for idx in indices[i:i+3]:
     for j in range(3):normals[idx][j]+=n[j]
   for n in normals:
    length=math.sqrt(sum(x*x for x in n)) or 1
    for j in range(3):n[j]/=length
   attrs={'POSITION':accessor([x for p in pos for x in p],'VEC3',5126,len(pos)),'NORMAL':accessor([x for n in normals for x in n],'VEC3',5126,len(pos))}
   index=accessor(indices,'SCALAR',5125,len(indices));mesh=len(model['meshes']);model['meshes'].append({'name':f'{build}-{part}','primitives':[{'attributes':attrs,'indices':index,'material':0}]})
   node=len(model['nodes']);model['nodes'].append({'name':f'{build}-{part}','mesh':mesh});model['nodes'][parent]['children'].append(node)
 model['buffers']=[{'byteLength':len(binary)}];data=json.dumps(model,separators=(',',':')).encode()
 data+=b' '*((-len(data))%4);binary+=b'\0'*((-len(binary))%4)
 glb=struct.pack('<III',0x46546C67,2,12+8+len(data)+8+len(binary))+struct.pack('<II',len(data),0x4E4F534A)+data+struct.pack('<II',len(binary),0x004E4942)+binary
 destination.mkdir(parents=True,exist_ok=True);path=destination/f'{sex}.glb';path.write_bytes(glb);print(path.name,len(glb),'bytes')
