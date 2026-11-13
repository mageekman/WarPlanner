"""Build an original study/reference index from pinned 40kdc structured mechanics.
Usage: python scripts/import-aeldari.py /path/to/40kdc-data
No upstream descriptions, profiles, points, weapons or original rules prose are shipped.
Unknown structures fail closed to a source-reference prompt, never partial instructions.
"""
import json,sys,re,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);pin='6ea813f7706bc9a492026d8b4403af99a965162b'
manifest=json.loads((root/'docs/aeldari-source.json').read_text())
assert manifest['commit']==pin
for path,digest in manifest['files'].items():
 if hashlib.sha256((source/path).read_bytes()).hexdigest()!=digest:raise SystemExit('Source digest mismatch: '+path)
load=lambda path:json.loads((source/path).read_text())
U=load('data/core/aeldari/units.json');D=load('data/core/aeldari/detachments.json');E=load('data/core/aeldari/enhancements.json');S=load('data/core/aeldari/stratagems.json');A=load('data/enrichment/aeldari/abilities.json');P=load('data/enrichment/aeldari/phase-mappings.json')
units={u['id']:u for u in U};dets={d['id']:d for d in D};enh={e.get('ability_id',e['id']):e for e in E};strats={s.get('ability_id',s['id']):s for s in S};mapping={p['source_id']:p.get('phases',[]) for p in P};phases=['command','movement','shooting','charge','fight']
class Unsupported(Exception):pass
def word(v):
 if isinstance(v,(str,int,float)):return str(v).replace('-',' ')
 if isinstance(v,list):return ', '.join(word(x) for x in v)
 raise Unsupported()
def filt(f):
 if isinstance(f,str):return word(f)
 if not isinstance(f,dict):raise Unsupported()
 out=[]
 for k,v in f.items():
  if k=='owner':out.append({'friendly':'friendly','enemy':'enemy','any':'any side'}.get(v,word(v)))
  elif k in ['all_of','any_of','none_of']:out.append((' / ' if k=='any_of' else ' + ').join(map(word,v))+(' excluded' if k=='none_of' else ''))
  elif k=='within':
   rng=v.get('range');distance=str(rng.get('inches'))+' inches' if isinstance(rng,dict) and 'inches'in rng else word(rng)
   out.append('within '+distance+' of '+filt(v.get('of','this unit')))
  elif k=='visible':out.append('visible to '+filt(v.get('to','this model')))
  elif k=='level':out.append(word(v))
  elif k=='name':out.append(word(v))
  elif k=='state':out.append(word(v))
  else:raise Unsupported()
 return ' '.join(out) or 'the chosen unit'
def cond(c):
 if 'operator'in c:
  parts=[cond(x) for x in c['operands']];return ('not ('+parts[0]+')') if c['operator']=='not' else '('+(' or ' if c['operator']=='or' else ' and ').join(parts)+')'
 t=c.get('type');p=c.get('parameters',{})
 if t=='matches':return filt(p.get('subject','this unit'))+' is '+filt(p['filter'])
 if t=='phase-is':return word(p['phase'])+' phase'
 if t=='player-turn-is':return word(p['turn'])
 if t=='attachment':return 'this model is leading its attached unit'
 if t=='attack-is' and set(p)<= {'attack_type'}:return word(p['attack_type'])+' attack'
 if t=='closest':return 'the defender is the closest eligible target'
 if t=='strength' and set(p)<={'subject','below'}:return word(p.get('subject','this unit'))+' is below '+word(p['below'])+' strength'
 raise Unsupported()
def target_condition(c):
 if not isinstance(c,dict):return 'check the complete target restrictions'
 if 'operator'in c:
  parts=[target_condition(x) for x in c.get('operands',[])];op=c['operator']
  return 'not ('+parts[0]+')' if op=='not' and parts else '('+(' or ' if op=='or' else ' and ').join(parts)+')'
 t=c.get('type');p=c.get('parameters',{})
 if t=='matches':
  try:return filt(p.get('filter',{}))
  except Unsupported:return 'additional positioning or target restrictions in the full rule'
 if t=='happened' and p.get('event')=='selected':return 'already selected to '+word(p.get('filter',{}).get('to','act'))+' this phase'
 if t=='eligible':return 'eligible to '+word(p.get('to','perform the stated action'))
 return 'additional conditions in the full rule'
def effect(x):
 if not isinstance(x,dict):raise Unsupported()
 t=x.get('type');m=x.get('modifier',{});target=filt(x.get('target','this unit'))
 if t=='sequence':return '; '.join(effect(y) for y in x['steps'])
 if t=='conditional':return 'if '+cond(x['condition'])+': '+effect(x['effect'])
 if t=='choice':return 'choose one: '+ ' OR '.join(effect(y) for y in x['options'])
 if t=='ability-part':raise Unsupported() # Trigger nesting must not be discarded.
 if t in ['select-units','for-each-unit']:
  selector=x['selector'];text=filt(selector.get('filter',{}))
  if selector.get('eligibility'):text+=' satisfying '+cond(selector['eligibility'])
  count=selector.get('count',{});n=count.get('max',count.get('min','eligible'))
  return ('select '+str(n)+' '+text+' unit(s): ' if t=='select-units' else 'for each '+text+' unit: ')+effect(x['effect'])
 if t=='stat-modifier' and set(m)<={'stat','operation','value'}:return target+': '+word(m['operation'])+' '+word(m['stat'])+' '+str(m['value'])
 if t=='roll-modifier' and set(m)<={'roll','operation','value'}:return target+': '+word(m['operation'])+' '+str(m['value'])+' to '+word(m['roll'])+' rolls'
 if t=='re-roll' and set(m)<={'roll','subset','result_scope','count','weapons'}:
  scope='results of 1' if m.get('subset')=='ones' else 'failed results' if m.get('subset')=='all-failures' else 'any result'
  return target+': reroll '+('one ' if m.get('count')==1 else '')+word(m['roll'])+' roll(s), '+scope+(' with '+filt(m['weapons']) if m.get('weapons') else '')
 if t=='weapon-ability-grant' and set(m)<={'keywords','weapons'}:
  keys=[]
  for k in m['keywords']:
   parameters=k.get('parameters',{});
   if set(parameters)-{'value'}:raise Unsupported()
   keys.append(word(k['keyword_id'])+(' '+str(parameters['value']) if 'value'in parameters else ''))
  weapons=m.get('weapons',{});kind=weapons.get('type','specified')
  if set(weapons)-{'type','name'}:raise Unsupported()
  return target+': '+word(kind)+' weapons gain '+', '.join(keys)+((': '+weapons['name']) if 'name'in weapons else '')
 if t=='permission' and set(m)<={'activity','allow','after','despite'}:return target+': '+('may ' if m['allow'] else 'cannot ')+word(m['activity'])+(' after '+word(m['after']) if 'after'in m else '')+(' despite '+word(m['despite']) if 'despite'in m else '')
 if t=='invulnerable-save' and set(m)=={'invuln_sv'}:return target+': '+str(m['invuln_sv'])+'+ invulnerable save'
 if t=='feel-no-pain' and set(m)<={'value','threshold','against'}:raise Unsupported()
 if t=='mortal-wounds' and set(m)=={'count'}:return target+': '+str(m['count'])+' mortal wounds'
 if t=='heal' and set(m)<={'amount','per'}:return target+': restore '+str(m['amount'])+' lost wounds'+(' per '+word(m['per']) if 'per'in m else '')
 if t=='return-models' and set(m)=={'count'}:return target+': return '+str(m['count'])+' destroyed model(s)'
 if t=='damage-reduction' and set(m)<={'operation','value'}:return target+': '+word(m['operation'])+' '+str(m['value'])+' damage (check rounding and minimums)'
 raise Unsupported()
def walk(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from walk(v)
 elif isinstance(x,list):
  for v in x:yield from walk(v)
def timing(a,s=None):
 nodes=list(walk(a));phase=[phases.index(n['parameters']['phase']) for n in nodes if n.get('type')=='phase-is' and n.get('parameters',{}).get('phase')in phases]
 turns={n.get('parameters',{}).get('turn') for n in nodes if n.get('type')=='player-turn-is'}
 turn='you' if turns=={'your-turn'} else 'opponent' if turns=={'opponent-turn'} else 'either'
 trigger=a.get('trigger',{});triggers=trigger if isinstance(trigger,list) else [trigger];event=triggers[0].get('event') if triggers else None
 flt=triggers[0].get('filter',{}) if triggers else {};kind=flt.get('to',flt.get('kind'))
 if not phase and kind in ['shoot','fight','charge','move']:phase=[{'shoot':2,'fight':4,'charge':3,'move':1}[kind]]
 if not phase and event in ['move-started','move-ended','set-up','disembarked']:phase=[3] if flt.get('move_types')==['charge'] else [1]
 if not phase:phase=[phases.index(p) for p in (s.get('phases',[]) if s else mapping.get(a['ability_id'],[])) if p in phases]
 window={'phase-started':'start','phase-ended':'end','round-started':'round','round-ended':'round-end','turn-ended':'turn-end','battle-started':'prebattle','deployment-ended':'prebattle','attacks-resolved':'after','targets-selected':'select','selected':'select'}.get(event,'act')
 if event=='round-started':phase=[0]
 if event in ['round-ended','turn-ended']:phase=[4]
 if s:turn={'your-turn':'you','opponent-turn':'opponent','your':'you','opponent':'opponent','either':'either'}.get(s.get('player_turn'),turn)
 if not event and any(n.get('type')=='ability-part' for n in nodes):phase=[] # Mixed nested triggers stay in reference index.
 return sorted(set(phase)),turn,window
overrides=json.loads((root/'scripts/aeldari-study-overrides.json').read_text())
records=[]
for a in A:
 id=a['ability_id'];e=enh.get(id);s=strats.get(id);det=dets.get((e or s or a).get('detachment_id'))
 try:summary=effect(a.get('effect'));complete=True
 except (Unsupported,KeyError,TypeError):summary='';complete=False
 provisional=bool(a.get('stub')) or any(w in str(a.get('game_version',{})).lower()+' '+a.get('community_notes','').lower() for w in ['provisional','approx','partial','not model','not fully'])
 if provisional:summary='';complete=False
 if id in overrides and not provisional:summary=overrides[id]['summary'].rstrip('.');complete=True
 phase,turn,window=timing(a,s)
 if id in overrides and not provisional:phase,turn,window=[overrides[id][k] for k in ['phase','turn','window']]
 names=sorted({units[u]['name'] for u in a.get('unit_ids',[]) if u in units}|{u['name'] for u in U if id in [v.get('id') if isinstance(v,dict) else v for v in u.get('ability_ids',[])]})
 restrictions=(s or {}).get('target_restrictions') or {};target='Check the current rule for its eligible target and conditions.'
 if isinstance(restrictions,dict) and restrictions:
  side='friendly' if restrictions.get('side')=='your-army' else 'enemy' if restrictions.get('side')=='opponent-army' else 'eligible'
  target=word(restrictions.get('count','one'))+' '+side+' '+word(restrictions.get('selects','unit'))
  if restrictions.get('required_keywords'):target+=' with '+word(restrictions['required_keywords'])
  if restrictions.get('eligibility'):target+='; '+target_condition(restrictions['eligibility'])
  target+='.'

 tr=a.get('trigger') or {};tr=tr[0] if isinstance(tr,list) and tr else tr
 event=tr.get('event') if isinstance(tr,dict) else None
 triggerText={'phase-started':'At the start of the indicated phase','phase-ended':'At the end of the indicated phase','attacks-resolved':'After the specified shooting or fighting attacks finish','model-destroyed':'When the specified model is destroyed','destroyed':'At this rule’s destruction trigger; check which unit or model','move-started':'When the specified move begins','move-ended':'After the specified move ends','selected':'When selected for the specified action','targets-selected':'When the specified targets are selected','set-up':'When set up, subject to the rule’s arrival conditions','round-started':'At the start of the battle round','round-ended':'At the end of the battle round','turn-ended':'At the end of the indicated player’s turn','used':'When the specified rule or Stratagem is used'}.get(event,'Conditional or passive effect; check its full trigger')
 conditions=['Trigger: '+triggerText+'.','Confirm the complete current rule, including its target, range, restrictions and duration.']
 if a.get('scope',{}).get('duration') not in [None,'permanent']:conditions.append('Duration in the source: '+word(a['scope']['duration'])+'.')
 if a.get('usage'):conditions.append('Usage in the source: '+word(a['usage'].get('frequency','limited'))+'; check the full limit.')
 if s:conditions.append('Source CP cost: '+str(s.get('cp_cost','check reference'))+'. This is an optional Stratagem, not an automatic effect.')
 if e:conditions.append('Only the imported bearer of '+e['name']+' can provide this enhancement; confirm its bearer restrictions.')
 if provisional:conditions.append('Source flagged provisional, approximate or incomplete. No effect is taught from that record.')
 records.append(dict(id=id,name=a['name'],units=names,phase=phase,turn=turn,window=window,summary=(summary[0].upper()+summary[1:]+'.') if summary else 'Reference reminder: check '+a['name']+' in your current rules. The source does not support a complete study summary yet.',conditions=conditions,category='enhancement' if e else 'stratagem' if s else 'army' if a.get('ability_type')in ['detachment','faction'] else 'ability',detachment=det['name'] if det else None,enhancement=e['name'] if e else None,referenceOnly=not complete,provisional=provisional,expanded=True,sourceIds=['catalog','community'] if id in overrides else ['catalog'],status='community-checked' if id in overrides and not provisional else 'source-reference',sourceDigest=a.get('source_digest'),targetText=target,sourcePhases=phase,triggerText=triggerText,leadingUnitRequired=overrides.get(id,{}).get('leadingUnitRequired',False)))
# Entries lacking even an enrichment record must still be visible as references.
known={a['id'] for a in records}
for item,category in [(e,'enhancement') for e in E]+[(s,'stratagem') for s in S]:
 aid=item.get('ability_id',item['id'])
 if aid in known:continue
 det=dets.get(item.get('detachment_id'));records.append(dict(id=aid,name=item['name'],units=[],phase=[],turn='either',window='reference',summary='No complete mechanics record is available. Open the current rules reference.',conditions=['Source coverage is incomplete.'],category=category,detachment=det['name'] if det else None,enhancement=item['name'] if category=='enhancement' else None,referenceOnly=True,provisional=True,expanded=True,sourceIds=['catalog'],status='source-reference',targetText='Check the current rule for eligible targets.'))
unitRecords=[]
for u in U:
 refs=[]
 for value in u.get('ability_ids',[]):
  r=value if isinstance(value,dict) else {'id':value};refs.append(r)
 unitRecords.append(dict(id=u['id'],name=u['name'],keywords=u.get('keywords',[])+u.get('faction_keywords',[]),abilities=refs,legend=u.get('is_legend',False)))
pack=dict(pin=pin,units=unitRecords,detachments=[dict(id=d['id'],name=d['name'],rules=d.get('detachment_rule_ids',[d.get('detachment_rule_id')]),enhancements=d.get('enhancement_ids',[]),stratagems=d.get('stratagem_ids',[]),gameModes=d.get('game_modes',[])) for d in D],rules=records)
(root/'dist/aeldari-data.js').write_text('/* Derived study index; 40kdc community mechanics, CC BY 4.0. See CREDITS.md. */\n(function(root){const data='+json.dumps(pack,separators=(',',':'),ensure_ascii=False)+';if(typeof module!=="undefined"&&module.exports)module.exports=data;else root.WarPlannerAeldariData=data;})(typeof window!=="undefined"?window:globalThis);\n')
report=dict(source_commit=pin,units=len(U),detachments=len(D),enhancements=len(E),stratagems=len(S),indexed_rules=len(records),mechanical_summaries=sum(not a['referenceOnly'] for a in records),reference_only=sum(a['referenceOnly'] for a in records),provisional=sum(a['provisional'] for a in records),reference_only_rules=[dict(id=a['id'],name=a['name'],provisional=a['provisional']) for a in records if a['referenceOnly']])
(root/'docs/aeldari-coverage.json').write_text(json.dumps(report,indent=2)+'\n');print({k:v for k,v in report.items() if k!='reference_only_rules'})
