const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../dist/content.js'),L=require('../dist/lessons.js'),B=require('../dist/list-builder.js'),A=require('../dist/activations.js'),Q=require('../dist/practice.js'),R=require('../dist/rule-reports.js'),P=require('../dist/unit-profiles.js');
const before=require('./fixtures/agents-audit-before.json'),hosts=require('./fixtures/agents-allies-hosts.json'),{audit}=require('../scripts/audit-agents.cjs'),changes=audit(before).changes,map=new Map(changes.map(r=>[r.key,r])),after=before.map(r=>map.get(r.key)||r);
const apply=rows=>C.apply([...hosts,...(rows||after)]),army=(faction='Adepta Sororitas',limit=2000)=>({name:'Allies QA',faction,limit,detachment:'',disposition:'',units:[]}),add=(a,query,allied=true)=>{const source=B.search(query,a.faction).find(u=>u.name===query&&!!u.allied===allied);assert.ok(source,query+' for '+a.faction);B.add(a,source.id,'unit-'+a.units.length);return a.units.at(-1);},state=(a,phase,turn='you')=>({army:a,phase,turn,round:2,firstPlayer:'you'}),cards=(s,step)=>{const d=A.flashcards(s,step);return [...d.shared,...d.unitCards.flatMap(c=>c.items)];};
test.afterEach(()=>C.reset());
test('Assigned Agents are available only to known Imperial factions and never expose named patrol or removed Aquila sheets',()=>{
 apply();for(const faction of ['Adepta Sororitas','Astra Militarum','Grey Knights','Space Marines','Deathwatch']){assert.ok(B.search('Callidus',faction).some(u=>u.allied));assert.equal(B.search('Aquila Kill Team',faction).filter(u=>u.allied).length,0);assert.ok(!B.search('Inquisitor\'s Hand',faction).some(u=>u.allied));assert.ok(!B.search('Preacher Teguen',faction).some(u=>u.allied));}
 for(const faction of ['Aeldari','Chaos Space Marines','Unknown faction'])assert.ok(!B.search('Callidus',faction).some(u=>u.allied));
 const f=structuredClone(after.find(r=>r.kind==='faction'));f.data.assignedAgents.enabled=false;apply(after.map(r=>r.key===f.key?f:r));assert.ok(!B.search('Callidus','Grey Knights').some(u=>u.allied));
});
test('Agents-specific requisitioned datasheets remain distinct from their native Grey Knights and Sisters equivalents',()=>{
 apply();const native=L.unitInfo('Brotherhood Terminator Squad','Grey Knights'),agent=L.unitInfo('Grey Knights Terminator Squad','Imperial Agents');assert.ok(native&&agent);assert.notEqual(native.id,agent.id);assert.equal(P.read(agent)[0].T,6);
 const allied=B.search('Grey Knights Terminator Squad','Adepta Sororitas').find(u=>u.allied);assert.deepEqual(P.read(allied),P.read(agent));assert.ok(!allied.keywords.includes('Adepta Sororitas'));assert.ok(!allied.abilities.some(a=>/teleport-assault|acts-of-faith/i.test(a.id)));
 assert.ok(!L.unitInfo('Sisters of Battle Squad','Imperial Agents').abilities.some(a=>/acts-of-faith/i.test(a.id)));
});
test('a source edit propagates to all allied views, while raw catalog records never become duplicate editable datasheets',()=>{
 const edited=structuredClone(after),row=edited.find(r=>r.key==='unit:grey-knights-terminator-squad');row.data.profiles=P.read(row.data);row.data.profiles[0].W=9;apply(edited);
 for(const f of ['Imperial Agents','Space Marines','Adepta Sororitas','Grey Knights'])assert.equal(P.read(L.catalog.units.find(u=>u.name==='Grey Knights Terminator Squad'&&u.faction===f))[0].W,9);assert.ok(!edited.some(r=>r.data.allied));
});
test('duplicate imported names require a source choice, and source selection persists on the roster',()=>{
 apply();assert.equal(B.info('Ministorum Priest','Adepta Sororitas'),undefined);assert.equal(L.unitInfo('Ministorum Priest','Adepta Sororitas'),undefined);
 const a=army(),u=add(a,'Ministorum Priest');assert.equal(u.catalogFaction,'Imperial Agents');assert.equal(B.info(u,a.faction).allied,true);u.catalogFaction='Agents of the Imperium';assert.equal(B.info(u,a.faction).allied,true);const native=B.sources(u,a.faction).find(s=>!s.allied);B.setSource(a,u,native.id);assert.equal(B.info(u,a.faction).id,native.id);assert.equal(u.catalogFaction,'Adepta Sororitas');const nativeEntry=add(a,'Ministorum Priest',false);assert.equal(B.info(nativeEntry,a.faction).id,native.id);assert.throws(()=>B.setSource(a,u,'foreign-source'));
});
test('allied Agents receive no host enhancements, no Agents detachments and no host faction keywords',()=>{
 apply();const a=army();a.detachment='Bringers of Flame';const u=add(a,'Inquisitor');assert.deepEqual(B.enhancements(a,u),[]);assert.ok(!B.detachments(a.faction).some(d=>d.name==='Imperialis Fleet'));const s=B.info(u,a.faction);assert.ok(s.keywords.includes('Agents of the Imperium'));assert.ok(!s.keywords.includes('Adepta Sororitas'));
 const rules=L.abilities.filter(r=>r.allied&&r.faction===a.faction);assert.ok(rules.length>50);assert.ok(rules.every(r=>!r.detachment&&!r.enhancement));assert.ok(!rules.some(r=>r.name==='At All Costs'||r.name==='Extremis Sanction'));
});
test('Incursion, Strike Force and Onslaught allowances count units rather than models and report excesses',()=>{
 apply();for(const [limit,character,retinue,requisitioned] of [[1000,1,1,1],[2000,2,2,1],[3000,3,3,2]]){const a=army('Adepta Sororitas',limit);add(a,'Inquisitor');add(a,'Navigator');const status=B.alliedStatus(a);assert.deepEqual(status.limits,{character,retinue,requisitioned});assert.equal(status.counts.character,2);assert.equal(status.notes.some(n=>n.includes('character allowance')),limit===1000);}
 const a=army();add(a,'Grey Knights Terminator Squad');add(a,'Sisters of Battle Squad');assert.equal(B.alliedStatus(a).counts.requisitioned,2);assert.ok(B.alliedStatus(a).notes.some(n=>n.includes('requisitioned allowance')));
});
test('Henchmen and Navy Bodyguard exemptions each use only their own matching provider allowance',()=>{
 apply();const a=army('Adepta Sororitas',1000);add(a,'Inquisitor');add(a,'Rogue Trader Entourage');add(a,'Inquisitorial Agents');add(a,'Inquisitorial Agents');add(a,'Voidsmen-at-Arms');add(a,'Voidsmen-at-Arms');let s=B.alliedStatus(a);assert.equal(s.exemptRetinue,2);assert.equal(s.counts.retinue,4);assert.equal(s.counts.chargedRetinue,2);assert.ok(s.notes.some(n=>n.includes('retinue allowance')));
 B.remove(a,a.units[0].id);s=B.alliedStatus(a);assert.equal(s.exemptRetinue,1);assert.equal(s.counts.chargedRetinue,3);
});
test('transport, all-model IMPERIUM, Assassin duplicates and Warlord checks remain separate',()=>{
 apply();const a=army();const assassin=add(a,'Callidus Assassin');assassin.warlord=true;add(a,'Callidus Assassin');add(a,'Imperial Rhino');a.units.push({id:'unknown',name:'Unknown model',details:[]});const s=B.alliedStatus(a);assert.equal(s.counts.transport,1);assert.equal(s.counts.retinue,0);assert.ok(s.notes.some(n=>n.includes('cannot be your Warlord')));assert.ok(s.notes.some(n=>n.includes('Only one Callidus')));assert.ok(s.notes.some(n=>n.includes('IMPERIUM eligibility')));
});
test('verified Inquisitors can attach to native Imperial Infantry Battleline, while other Agents cannot',()=>{
 apply();const a=army(),inquisitor=add(a,'Inquisitor'),sisters=add(a,'Battle Sisters Squad',false),navigator=add(a,'Navigator');assert.ok(B.eligibleBodies(a,inquisitor).some(u=>u.id===sisters.id));B.attach(a,inquisitor.id,sisters.id);assert.equal(inquisitor.role,'leader');assert.ok(!B.eligibleBodies(a,navigator).some(u=>u.id===sisters.id));assert.throws(()=>B.attach(a,navigator.id,sisters.id));
 inquisitor.details.push('Blessed Wardings');const s=state(a,4),deck=cards(s,{id:'fight',window:'act'});assert.ok(deck.some(r=>r.allied&&r.name==='Blessed Wardings'));assert.ok(!deck.some(r=>r.name==='At All Costs'));
});
test('the Guide resolves allied unit abilities and never grants native same-name Priest abilities',()=>{
 apply();const a=army(),priest=add(a,'Ministorum Priest'),body=add(a,'Inquisitorial Agents');B.attach(a,priest.id,body.id);assert.equal(priest.role,'support');const deck=cards(state(a,4),{id:'fight',window:'act'});assert.ok(deck.some(r=>r.name==='Holy Hatred'&&r.allied));assert.ok(deck.filter(r=>r.name==='Holy Hatred').every(r=>r.allied));
 const foreign=deck.filter(r=>r.units?.includes('Ministorum Priest')&&!r.allied&&r.faction!=='*');assert.equal(foreign.length,0);
});
test('Rites of Teleportation grants the attached Inquisitor Deep Strike, without granting it to another leader',()=>{
 apply();const a=army(),inq=add(a,'Inquisitor'),gk=add(a,'Grey Knights Terminator Squad');B.attach(a,inq.id,gk.id);assert.equal(L.unitHasRule(inq,'deep-strike',a.faction,a),true);inq.group='';assert.equal(L.unitHasRule(inq,'deep-strike',a.faction,a),false);
});
test('whole-faction practice stays native, while saved-list practice includes only its actual allied units',()=>{
 apply();const full=Q.buildBank({faction:'Adepta Sororitas',rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments});assert.ok(full.questions.every(q=>!q.review?.rule?.allied));
 const a=army();for(const name of ['Callidus Assassin','Culexus Assassin','Eversor Assassin','Vindicare Assassin','Inquisitor'])add(a,name);const bank=Q.buildBank({faction:a.faction,army:a,rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments});assert.ok(bank.questions.some(q=>q.review?.rule?.allied));assert.ok(bank.questions.every(q=>q.options.every(o=>o.faction===a.faction)));assert.ok(!bank.questions.some(q=>q.review?.units.some(u=>u.name==='Sisters of Battle Squad')));
 const q=bank.questions.find(q=>q.review?.rule?.allied),context=R.practiceContext(q,after);assert.ok(context.options.some(o=>o.key===q.review.rule.sourceCatalogKey));assert.equal(context.context.snapshotChanged,false);
});
test('allied correction reports point to the canonical Agents unit and rule',()=>{
 apply();const a=army(),inq=add(a,'Inquisitor Coteaz');const s=state(a,0),step={id:'command',title:'Command',window:'react'},deck=A.flashcards(s,step),page=R.pageContext(s,step,deck,after);assert.ok(page.options.some(o=>o.key==='rule:spy-network-agents-of-the-imperium'));assert.ok(page.options.some(o=>o.key==='unit:inquisitor-coteaz'));
});

test('host army rule cards do not list attached allied Agents as recipients',()=>{
 const host=structuredClone(before.find(r=>r.kind==='rule'));Object.assign(host,{key:'rule:host-only',name:'Host only',faction:'Adepta Sororitas'});Object.assign(host.data,{id:'host-only',name:'Host only',category:'army',detachment:'',units:[],phase:[4],turn:'either',window:'act',summary:'This rule is restricted to the host faction.',mechanicsPresentation:'structured',importSource:undefined});C.apply([...hosts,...after,host]);const a=army(),inq=add(a,'Inquisitor'),body=add(a,'Battle Sisters Squad',false);B.attach(a,inq.id,body.id);const d=A.flashcards(state(a,4),{id:'fight',window:'act'}),card=d.shared.find(r=>r.id==='host-only');assert.ok(card);assert.deepEqual(card.appliesTo.map(u=>u.body.name),['Battle Sisters Squad']);
});
