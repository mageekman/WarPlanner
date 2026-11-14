const test=require('node:test'),assert=require('node:assert/strict'),M=require('../dist/mechanics.js');
// Structured community mechanics fixture; CC BY 4.0, attribution/source digests retained.
const source=require('./fixtures/grey-knights-summary-records.json');
const record=name=>structuredClone(source.find(r=>r.name===name));
test('Hallowed Ground explains rerolls, visibility, whole-unit eligibility and each region without schema jargon',()=>{
 const result=M.describe(record('Hallowed Ground')),text=result.text;assert.equal(result.concise,true);
 for(const term of ['Hit rolls of 1','PURIFIER SQUAD','wholly within Hallowed Ground','any Hit rolls instead','melee attacks','targets the attacker can see','Your deployment zone','6″','No Man’s Land','enemy deployment zone','at least half','start of the phase','each territory separately','for that phase'])assert.ok(text.includes(term),term);
 assert.ok(text.split(/\s+/).length<110);assert.doesNotMatch(text,/consumer|producer|region_ref|Type:|Parameters:|Duration: Permanent/i);assert.ok(result.details.length>text.length);
});
test('a changed Hallowed Ground source never reuses a stale hard-coded interpretation',()=>{
 const r=record('Hallowed Ground');r.effect.modifier.producer.phase_extensions[0].condition.parameters.proportion.fraction=0.75;const result=M.describe(r);assert.equal(result.concise,false);assert.doesNotMatch(result.text,/at least half/);assert.match(result.details,/0.75/);
 const changed=record('Hallowed Ground');changed.effect.modifier.producer.additive_extensions[0].range.inches=9;assert.match(M.describe(changed).text,/9″/);assert.doesNotMatch(M.describe(changed).text,/6″/);
});
test('Crowe’s leading bonus becomes one short sentence that keeps the unit and weapon scope',()=>{
 const text=M.describe(record('Champion of the Order of Purifiers (Psychic)')).text;assert.equal(text,'While leading a unit, that unit’s ranged Purifying Flame weapons gain 1 Attack.');assert.doesNotMatch(text,/Attachment|Parameters|permanent/i);
});
test('Foesight preserves the CHARACTER restriction and model-only benefit',()=>{
 const r=record('Foesight (Psychic)');assert.equal(M.describe(r).text,'Against CHARACTER units, this model can re-roll any Hit rolls.');r.effect.effect.target='this-unit';assert.equal(M.describe(r).text,'Against CHARACTER units, this unit can re-roll any Hit rolls.');
});
test('Surge of Wrath combines rerolls without losing its attack or target restriction',()=>{
 const text=M.describe(record('Surge of Wrath (Psychic)')).text;assert.match(text,/melee attacks against MONSTER or VEHICLE units/);assert.match(text,/this model can re-roll any Hit, Wound and Damage rolls/);assert.doesNotMatch(text,/Optional:|Scope|Duration|result_scope/);
});
test('saved previous automatic readouts upgrade while custom summaries remain untouched',()=>{
 const r=record('Hallowed Ground'),legacy=M.describe(r).details,base={name:r.name,summary:legacy,referenceOnly:true,status:'source-reference',importSource:{record:r,text:''}};const current=M.enrich(base);assert.match(current.summary,/at least half/);assert.doesNotMatch(current.summary,/Branch precedence/);assert.equal(base.summary,legacy);assert.equal(current.referenceOnly,true);assert.equal(current.status,'source-reference');
 base.summary='My edited tournament notes.';assert.equal(M.enrich(base).summary,base.summary);
});
const greyKnights=require('./fixtures/grey-knights-abilities.json'),Notes=require('../dist/rule-notes.js');
const grey=id=>structuredClone(greyKnights.find(r=>r.ability_id===id));
test('Narthecium explains the phase, bearer condition and non-Character resurrection without inventing wound recovery',()=>{
 const r=grey('apothecarys-narthecium-grey-knights'),result=M.describe(r);
 assert.equal(result.concise,true);assert.equal(result.text,'During your Command phase, while this model is on the battlefield, you may return one destroyed non-CHARACTER model to its unit.');assert.doesNotMatch(result.text,/full wounds|maximum wounds|checked summary/);
 r.effect.effect.modifier.count=2;assert.equal(Notes.summarize(r),null);
});
test('Strike Squad and Combat Squad have direct instructions with their own timings',()=>{
 for(const id of ['sanctifying-ritual-grey-knights','sanctifying-ritual-crowes-sanctifiers-strike-squad-grey-knights']){
  const r=grey(id),text=M.describe(r).text;assert.match(text,/end of your Command phase/);assert.match(text,/objective you control/);assert.match(text,/within range/);assert.match(text,/keep control after moving away/);
  r.trigger.condition.operands[1].parameters.turn='opponent-turn';assert.equal(Notes.summarize(r),null);
 }
 assert.equal(M.describe(grey('combat-squad-grey-knights')).text,'When declaring battle formations, you may split this unit into two units of 5 models.');
});
test('Grey Knights coverage includes every source-backed entry except four identified ambiguities',()=>{
 const available=greyKnights.filter(r=>M.describe(r).concise),missing=greyKnights.filter(r=>M.describe(r).missing),unresolved=greyKnights.filter(r=>!M.describe(r).concise&&!M.describe(r).missing);
 assert.equal(available.length,119);assert.equal(missing.length,11);assert.deepEqual(unresolved.map(r=>r.name),['Haloed in Soulfire (Psychic)','Force Wave','Responsive Displacement','Vigilance of Titan']);
 for(const r of unresolved){const result=M.describe(r);assert.match(result.text,/imported source/i);assert.doesNotMatch(result.text,/This rule needs a checked summary/);assert.ok(result.details.length);}
});
test('all authored notes reject altered effects, timing, scope, restrictions and unknown mechanics even with an unchanged digest',()=>{
 const authored=greyKnights.filter(r=>Notes.summarize(r));assert.equal(authored.length,63);
 for(const original of authored)for(const patch of [{effect:{type:'no-effect'}},{scope:{duration:'changed-source-duration'}},{trigger:{event:'turn-started'}},{keyword_restrictions:['EXTRA']},{unknown_new_constraint:true}]){
  const changed={...structuredClone(original),...patch};assert.equal(Notes.summarize(changed),null,original.ability_id+' '+Object.keys(patch)[0]);
 }
});
test('saved automatic fallbacks refresh, and workshop summary coverage keeps authored text and source gaps distinct',()=>{
 const record=grey('apothecarys-narthecium-grey-knights'),data={summary:'This rule needs a checked summary. Its imported details are under Conditions & sources.',referenceOnly:true,importSource:{record}};
 const view=M.enrich(data);assert.match(view.summary,/non-CHARACTER/);assert.equal(M.summaryState(data),'available');assert.equal(data.summary,'This rule needs a checked summary. Its imported details are under Conditions & sources.');assert.equal(view.referenceOnly,true);
 const custom={...data,summary:'My checked Narthecium reminder.'};assert.equal(M.enrich(custom).summary,custom.summary);assert.equal(M.summaryState(custom),'available');
 assert.equal(M.summaryState({...data,importSource:{record:grey('force-wave-sanctic-spearhead-grey-knights')}}),'needs-summary');
 assert.equal(M.summaryState({...data,importSource:{record:greyKnights.find(r=>r.effect.type==='no-effect')}}),'missing');
});
