const test=require('node:test'),assert=require('node:assert/strict'),M=require('../dist/mechanics.js'),N=require('../dist/rule-notes.js'),data=require('../dist/admech-notes.js'),records=require('./fixtures/adeptus-mechanicus-abilities.json');
const record=id=>structuredClone(records.find(r=>r.ability_id===id+'-adeptus-mechanicus')),text=id=>M.describe(record(id)).text;
test('every imported Admech rule is accounted for as a summary, an empty source or a specific source problem',()=>{
 assert.equal(records.length,167);assert.equal(records.filter(r=>M.describe(r).concise).length,140);assert.equal(records.filter(r=>M.describe(r).missing).length,16);
 const unclear=records.filter(r=>!M.describe(r).concise&&!M.describe(r).missing);assert.equal(unclear.length,11);for(const r of unclear){assert.match(M.describe(r).text,/imported source/i);assert.doesNotMatch(M.describe(r).text,/This rule needs a checked summary/);}
 assert.equal(data.entries.length,119);assert.equal(new Set(data.entries.map(n=>n.source.ability_id)).size,119);assert.equal(data.issues.length,11);
});
test('Doctrina preserves both choices, attack types, round duration and the Battleline alternatives',()=>{
 const t=text('doctrina-imperatives');for(const term of ['start of each battle round','choose one','Protector','Heavy','Ballistic Skill by 1','Conqueror','Assault','Weapon Skill by 1','BATTLELINE or within 6″','friendly ADEPTUS MECHANICUS BATTLELINE','enemy melee Hit rolls','AP by 1'])assert.ok(t.includes(term),term);
 assert.match(text('doctrina-imperatives-purge-corps-deltic-9'),/replaces standard Doctrina/);assert.ok(t.split(/\s+/).length<100);
});
test('Battle Protocols distinguish Robot models from their Datasmith and include the default and replacement choices',()=>{
 const t=text('battle-protocols');for(const term of ['leads KASTELAN ROBOTS','start with Aegis','your Command phase','one protocol','Robots in this unit','+2 ranged Attacks','+2 melee Attacks','+1 Toughness','until changed'])assert.ok(t.includes(term),term);
});
test('weapon and Battleline reminders retain their separate restrictions and roll types',()=>{
 const eye=text('achillan-eye');for(const term of ['Radium Jezzail against INFANTRY','Skatros Transuranic Arquebus against MONSTER or VEHICLE','Wound rolls'])assert.ok(eye.includes(term),term);
 const searing=text('searing-conflagration');for(const term of ['Phosphor Torches','targets within range of an objective','Wound rolls of 1','any Wound rolls instead','6″','friendly ADEPTUS MECHANICUS BATTLELINE'])assert.ok(searing.includes(term),term);
 assert.match(text('breaching-command'),/Hit rolls of 1/);assert.doesNotMatch(text('breaching-command'),/Wound rolls/);
});
test('movement choices keep end-position and charge restrictions and charge damage checks the starting position',()=>{
 const ride=text('ride-the-thermals');for(const term of ['not engaged','6″ Normal move','12″ Normal move','ends wholly within 6″','cannot charge this turn'])assert.ok(ride.includes(term),term);
 assert.match(text('line-breakers'),/started its charge within 6″/);assert.match(text('line-breakers'),/each 4\+/);assert.match(text('line-breakers'),/2\+ instead/);
});
test('Rad-bombardment keeps enemy choices, different thresholds and later-round timing',()=>{
 const t=text('rad-bombardment');for(const term of ['Battle round 1','opponent chooses','enemy deployment zone','D3 mortal wounds','3+','Battle-shocked','5+','Battle rounds 2–5','start of your Command phase','1 mortal wound','Battle-shock test'])assert.ok(t.includes(term),term);
});
test('healing, death and test abilities retain usage limits, passing versus failing and delayed removal',()=>{
 assert.match(text('defend-the-divine-work'),/Once per battle for this unit/);assert.doesNotMatch(text('defend-the-divine-work-manipulus-skand'),/Once per battle/);
 const lord=text('lord-of-machines-cohort-cybernetica');for(const term of ['Once per turn','your opponent’s Shooting phase','visible enemy VEHICLE within 12″','if it passes','subtract 1','if it fails','cannot shoot'])assert.ok(lord.includes(term),term);
 const verse=text('verse-of-vengeance-data-psalm-conclave');for(const term of ['CULT MECHANICUS','not been selected to fight','4+','after the attacking unit finishes','then is removed'])assert.ok(verse.includes(term),term);
});
test('specific source conflicts remain explicit without silently repairing the source',()=>{
 assert.match(text('electro-shock'),/penalties to the attacking unit/);assert.match(text('chant-of-electrotraction-luminen-auto-choir'),/expires that phase/);assert.match(text('scuttling-walker'),/after the move ends/);assert.match(text('noospheric-transference'),/does not specify target selection limits/);
 for(const issue of data.issues){assert.equal(M.describe(issue.source).concise,false);assert.ok(M.describe(issue.source).details.length);}
});
test('authored Admech notes and issue explanations invalidate on changed mechanics, restrictions or timing despite unchanged digests',()=>{
 for(const r of records.filter(r=>N.summarize(r)||N.reviewIssue(r)))for(const patch of [{effect:{type:'changed-effect'}},{trigger:{event:'changed-trigger'}},{scope:{duration:'changed-duration'}},{applies_to:{all_of:['CHANGED']}},{keyword_restrictions:['CHANGED']},{new_mechanical_constraint:true}]){
  const changed={...structuredClone(r),...patch};assert.equal(N.summarize(changed),null,r.ability_id);assert.equal(N.reviewIssue(changed),null,r.ability_id);
 }
});
test('existing imported placeholders gain summaries without rewriting saved notes, statuses or the source record',()=>{
 const r=record('breaching-command'),base={name:r.name,summary:'Imported structured mechanics for Breaching Command. Review the imported source details before writing a study summary.',referenceOnly:true,status:'source-reference',importSource:{record:r,text:''}},original=structuredClone(base),view=M.enrich(base);
 assert.match(view.summary,/any Hit rolls instead/);assert.equal(view.referenceOnly,true);assert.equal(view.status,'source-reference');assert.deepEqual(base,original);base.summary='My checked Breacher reminder.';assert.equal(M.enrich(base).summary,base.summary);
});
