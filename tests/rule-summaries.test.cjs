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
