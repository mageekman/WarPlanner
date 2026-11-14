const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/content.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),{sample}=require('../dist/core.js');
const original=C.seed(),row=key=>structuredClone(original.find(r=>r.key===key));
const hint=(order='early',phases=[2],extra={})=>({order,rank:1,phases,turn:'you',label:'',note:'Set up the next activation.',flags:[],...extra});
const state=(phase=2,turn='you',army=sample)=>({army:structuredClone(army),phase,turn,firstPlayer:'you'});
const deck=s=>A.flashcards(s,A.steps(s).find(step=>step.activationMode&&!['pile','consolidate'].includes(step.activationMode)));
const unit=(d,name)=>d.unitCards.find(c=>c.unit.body.name===name);
test.afterEach(()=>C.reset());
test('legacy early shooters retain editable defaults that can be changed or cleared',()=>{
 for(const [id,rank] of [['war-walkers',10],['shroud-runners',15],['falcon',20]]){const r=row('unit:'+id);assert.equal(L.guideSettings(r.data,'unit').rank,rank);}
 const walker=row('unit:war-walkers');walker.data.guide=hint('normal');C.apply([walker]);const card=unit(deck(state()),'War Walkers');assert.equal(card.guideMeta.priority,100);assert.equal(card.guideMeta.label,'');
 walker.data.guide=hint('late');C.apply([walker]);const d=deck(state());assert.equal(d.unitCards.at(-1).unit.body.name,'War Walkers');assert.equal(unit(d,'War Walkers').guideMeta.label,'Shoot late');
});
test('unit movement hints create one unique card with a badge and explanation',()=>{
 const dragons=row('unit:fire-dragons');dragons.data.guide=hint('early',[1],{label:'Move early',flags:['Keep in aura']});C.apply([dragons]);
 const s=state(1),before=JSON.stringify(s.army),d=deck(s),card=unit(d,'Fire Dragons');assert.ok(card);assert.equal(card.guideMeta.label,'Move early');assert.deepEqual(card.guideMeta.flags,['Keep in aura']);assert.ok(card.guideMeta.notes.includes('Set up the next activation.'));assert.equal(d.unitCards.filter(c=>c.unit.body.name==='Fire Dragons').length,1);assert.equal(JSON.stringify(s.army),before);
 assert.equal(unit(deck(state(1,'opponent')),'Fire Dragons'),undefined);assert.equal(unit(deck(state(2)),'Fire Dragons').guideMeta.label,'');
 const start=A.flashcards(s,A.steps(s)[0]);assert.equal(unit(start,'Fire Dragons'),undefined);
});
test('an ability priority sorts its owning unit without moving its actual trigger',()=>{
 const dragons=row('rule:dragons');dragons.data.guide=hint('early',[2],{flags:['Target vehicles']});C.apply([dragons]);const s=state(),d=deck(s);
 assert.equal(d.unitCards[0].unit.body.name,'Fire Dragons');assert.equal(unit(d,'Fire Dragons').guideMeta.label,'Shoot early');assert.ok(unit(d,'Fire Dragons').guideMeta.flags.includes('Target vehicles'));assert.equal(L.abilities.find(a=>a.id==='dragons').window,'act');
 const start=A.flashcards(s,A.steps(s)[0]);assert.doesNotMatch(JSON.stringify(start),/Assured Destruction/);
});
test('shared rules get their own order, flags and notes without duplicate unit cards',()=>{
 const swift=row('rule:swift'),flitting=row('rule:flitting');swift.data.guide=hint('late',[1]);flitting.data.guide=hint('early',[1],{flags:['Plan terrain']});C.apply([swift,flitting]);const d=deck(state(1));
 assert.equal(d.shared[0].id,'flitting');assert.equal(d.shared.at(-1).id,'swift');assert.deepEqual(d.shared[0].guideMeta.flags,['Plan terrain']);assert.equal(d.shared.filter(a=>a.id==='flitting').length,1);
});
test('extra badges can retain an otherwise shared-only unit card and are phase/turn scoped',()=>{
 const dragons=row('unit:fire-dragons');dragons.data.guide=hint('normal',[1],{turn:'opponent',flags:['Watch enemy movement']});C.apply([dragons]);assert.ok(unit(deck(state(1,'opponent')),'Fire Dragons'));assert.equal(unit(deck(state(1,'you')),'Fire Dragons'),undefined);
});
test('Fights First overrides respect every model in an attached unit',()=>{
 const dragons=row('unit:fire-dragons'),autarch=row('unit:autarch');dragons.data.fightsFirst='yes';
 const army={...sample,units:[{id:'d',name:'Fire Dragons',details:[],group:'x',role:'bodyguard'},{id:'a',name:'Autarch',details:[],group:'x',role:'leader'}]};C.apply([dragons]);let s=state(4,'you',army);assert.equal(A.fightsFirst(s,A.units(army)[0]),false);assert.ok(unit(deck(s),'Fire Dragons').guideMeta.flags.includes('Fights First · check attachments'));
 autarch.data.fightsFirst='yes';C.apply([dragons,autarch]);s=state(4,'you',army);assert.ok(A.fightsFirst(s,A.units(army)[0]));assert.ok(unit(deck(s),'Fire Dragons').fightsFirst);assert.ok(unit(deck(s),'Autarch').fightsFirst);
 autarch.data.fightsFirst='no';C.apply([dragons,autarch]);assert.equal(A.fightsFirst(s,A.units(army)[0]),false);
});
test('Fights First can be removed explicitly and automatic restores source behavior',()=>{
 const banshees=row('unit:howling-banshees');banshees.data.fightsFirst='no';C.apply([banshees]);const s=state(4);assert.equal(A.fightsFirst(s,A.units(s.army).find(u=>A.has(u,'Jain Zar'))),false);
 banshees.data.fightsFirst='auto';C.apply([banshees]);assert.equal(A.fightsFirst(s,A.units(s.army).find(u=>A.has(u,'Jain Zar'))),true);assert.equal(A.fightsFirst(state(2),A.units(s.army)[0]),false);
});
test('faction and detachment hints are inherited by their rules, with rule settings taking precedence',()=>{
 const faction=row('faction:aeldari'),det=row('detachment:aspect-host'),rule=row('rule:path-warrior');faction.data.guide=hint('late');det.data.guide=hint('early');C.apply([faction,det]);assert.equal(L.ruleGuideMeta(L.abilities.find(a=>a.id==='path-warrior'),state()).priority,1);
 rule.data.guide=hint('normal');C.apply([faction,det,rule]);assert.equal(L.ruleGuideMeta(L.abilities.find(a=>a.id==='path-warrior'),state()).priority,100);
});
test('guide metadata validation rejects malformed priorities, scopes and flags',()=>{
 const r=row('unit:fire-dragons');r.data.guide=hint();r.data.guide.rank=0;assert.throws(()=>C.validate(r),/rank/);r.data.guide.rank=1;r.data.guide.phases=[6];assert.throws(()=>C.validate(r),/phases/);r.data.guide.phases=[1];r.data.guide.flags=['x'.repeat(51)];assert.throws(()=>C.validate(r),/badges/);r.data.guide.flags=[];r.data.fightsFirst='maybe';assert.throws(()=>C.validate(r),/Fights First/);
});
