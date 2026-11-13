const test=require('node:test');const assert=require('node:assert/strict');
const L=require('../dist/lessons.js'),C=L.catalog,A=require('../dist/activations.js');
const model=(name,details=[],extra={})=>({id:name,name,details,role:'',group:'',...extra});
const state=(names,detachment='Warhost',phase=2,turn='you')=>({army:{name:'Practice',faction:'Aeldari',detachment,units:names.map(n=>typeof n==='string'?model(n):n)},phase,turn,round:1,firstPlayer:'you'});
const cards=s=>A.steps(s).flatMap(step=>{const d=A.flashcards(s,step);return d.shared.concat(d.unitCards.flatMap(c=>c.items));});
test('full Aeldari index has unique rules and resolves every detachment reference',()=>{
 assert.equal(C.units.length,80);assert.equal(C.detachments.length,16);assert.equal(C.rules.length,300);
 const ids=new Set(C.rules.map(a=>a.id));assert.equal(ids.size,300);
 for(const d of C.detachments)for(const id of [...d.rules,...d.enhancements,...d.stratagems].filter(Boolean))assert.ok(ids.has(id),d.name+': '+id);
 for(const a of C.rules){assert.ok(a.summary);assert.ok(a.conditions.length);assert.ok(a.phase.every(p=>Number.isInteger(p)&&p>=0&&p<5));if(a.provisional)assert.equal(a.referenceOnly,true);}
});
test('Farseer Guide is an own-turn end-of-Movement reminder and never an opponent trigger',()=>{
 const own=state(['Farseer'],'Warhost',1);const end=A.steps(own).find(s=>s.window==='end');
 assert.ok(L.forStep(own,end).some(a=>a.sourceRuleId==='guide-aeldari'));
 assert.ok(!cards({...own,turn:'opponent'}).some(a=>a.sourceRuleId==='guide-aeldari'));
 assert.ok(!cards(state(['Windriders'],'Warhost',1)).some(a=>a.sourceRuleId==='guide-aeldari'));
});
test('Wraith and Spiritseer rules carry the corrected target and destruction restrictions',()=>{
 const command=cards(state(['Spiritseer'],'Spirit Conclave',0));const heal=command.find(a=>a.sourceRuleId==='tears-of-isha-aeldari');
 assert.ok(heal);assert.match(heal.summary,/one model regains/);assert.doesNotMatch(heal.summary,/each model/);
 const wraith=cards(state(['Wraithguard'],'Spirit Conclave'));assert.ok(wraith.some(a=>a.sourceRuleId==='psychic-guidance-aeldari'));assert.ok(wraith.some(a=>a.sourceRuleId==='war-construct-aeldari'));
 assert.ok(!wraith.some(a=>['swift','fade','flitting'].includes(a.id)));
 const death=cards(state(['Wraithblades'],'Spirit Conclave',4)).find(a=>a.sourceRuleId==='malevolent-souls-aeldari');assert.match(death.summary,/melee attack/);
});
test('new Aspect units inherit Aspect Host choices and only equipped shrine tokens',()=>{
 const equipped=state([model('Striking Scorpions',['1x Aspect Shrine Token'])],'Aspect Host',4);
 const all=cards(equipped);assert.ok(all.some(a=>a.id==='path-warrior'));assert.ok(all.some(a=>a.id==='token'));assert.ok(all.some(a=>a.sourceRuleId==='mandiblasters-aeldari'));
 assert.ok(!cards(state(['Striking Scorpions'],'Aspect Host',4)).some(a=>a.id==='token'));
 assert.ok(!cards(state(['Striking Scorpions'],'Warhost',4)).some(a=>a.id==='path-warrior'));
});
test('different detachments never leak their stratagems or enhancements into each other',()=>{
 for(const det of ['Spirit Conclave','Warhost','Armoured Warhost','Windrider Host'])for(const card of cards(state(['Fire Prism','Windriders','Spiritseer','Wraithguard'],det)))if(card.detachment)assert.equal(card.detachment,det);
 const source=C.rules.find(a=>a.category==='enhancement'&&a.detachment==='Armoured Warhost'&&a.phase.length);
 assert.ok(source);
 const no=state(['Autarch','Fire Prism'],'Armoured Warhost',source.phase[0]);assert.ok(!cards(no).some(a=>a.sourceRuleId===source.id));
 const bearer=model('Autarch',['Enhancement: '+source.enhancement]);const yes=state([bearer,'Fire Prism'],'Armoured Warhost',source.phase[0],source.turn==='opponent'?'opponent':'you');
 const deck=A.flashcards(yes,A.steps(yes)[0]);
 assert.ok(deck.unitCards.some(c=>c.unit.body.name==='Autarch'&&c.items.some(a=>a.sourceRuleId===source.id)));
 assert.ok(!deck.unitCards.some(c=>c.unit.body.name==='Fire Prism'&&c.items.some(a=>a.sourceRuleId===source.id)));
});
test('ranger reaction belongs to enemy Movement and Fire Prism rerolls to own Shooting',()=>{
 assert.ok(cards(state(['Rangers'],'Warhost',1,'opponent')).some(a=>a.sourceRuleId==='path-of-the-outcast-aeldari'));
 assert.ok(!cards(state(['Rangers'],'Warhost',1)).some(a=>a.sourceRuleId==='path-of-the-outcast-aeldari'));
 assert.ok(cards(state(['Fire Prism'],'Armoured Warhost')).some(a=>a.sourceRuleId==='crystal-matrix-aeldari'));
});
test('expanded core membership recognizes Solitaire Fights First and vehicle Star Engines',()=>{
 const solitaire=state(['Solitaire'],'Ghosts of the Webway',4);assert.ok(A.fightsFirst(solitaire,A.units(solitaire.army)[0]));
 const prism=state(['Fire Prism'],'Armoured Warhost',1);assert.ok(cards(prism).some(a=>a.id==='star-engines'));
});

test('Shroud Runners appear before later shooters to resolve their cover-removal setup',()=>{
 const s=state(['Fire Dragons','Shroud Runners','War Walkers']);
 assert.deepEqual(A.orderedUnits(s).map(u=>u.body.name),['War Walkers','Shroud Runners','Fire Dragons']);
 const card=cards(s).find(a=>a.sourceRuleId==='target-acquisition-aeldari');assert.match(card.summary,/long rifle/);assert.match(card.summary,/before later attackers/);
});

test('Visarch Fights First is limited to an actual led unit and Fuegan resurrection stays conditional',()=>{
 const members=[model('The Visarch',[],{role:'leader',group:'1'}),model('Troupe',[],{role:'bodyguard',group:'1'})];
 const attached=state(members,'Devoted of Ynnead',4);assert.ok(A.fightsFirst(attached,A.units(attached.army)[0]));
 const solo=state(['The Visarch'],'Devoted of Ynnead',4);assert.equal(A.fightsFirst(solo,A.units(solo.army)[0]),false);
 assert.ok(!cards(solo).some(a=>a.sourceRuleId==='way-of-the-blade-aeldari'));
 const fuegan=state(['Fuegan'],'Aspect Host',2);const end=cards(fuegan).find(a=>a.sourceRuleId==='unquenchable-resolve-aeldari');assert.match(end.summary,/first time this battle/);assert.match(end.summary,/On 2\+/);
});
