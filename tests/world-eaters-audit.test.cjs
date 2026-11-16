const test=require('node:test'),assert=require('node:assert/strict');
const {audit,notes,digest}=require('../scripts/audit-world-eaters.cjs'),before=require('./fixtures/world-eaters-audit-before.json'),sources=require('./fixtures/world-eaters-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),B=require('../dist/list-builder.js'),Q=require('../dist/practice.js'),T=require('../dist/timeline.js');
const result=audit(before),byKey=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>byKey.get(r.key)||r),get=id=>byKey.get('rule:'+id+'-world-eaters').data;
const army=(names,detachment='')=>({name:'Audit roster',faction:'World Eaters',detachment,units:names.map((name,i)=>({id:'u'+i,name,modelCount:1,details:[]}))}),state=(army,phase=0,turn='you')=>({army,phase,turn,round:2,firstPlayer:'you'}),cards=(s,step)=>{const d=A.flashcards(s,step);return [...d.shared,...d.unitCards.flatMap(c=>c.items)];};
test.afterEach(()=>C.reset());
test('World Eaters audit covers every pinned rule, unit, detachment, profile and source link',()=>{
 assert.equal(result.changes.length,155);assert.equal(result.changes.filter(r=>r.kind==='rule').length,147);assert.equal(result.changes.filter(r=>r.kind==='unit').length,8);assert.deepEqual(result.counts,{structured:138,'needs-summary':7,missing:2});
 assert.equal(after.filter(r=>r.kind==='unit').reduce((n,r)=>n+P.read(r.data).length,0),34);assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(a=>a.ability_id)));
 for(const r of result.changes){C.validate(r);if(r.kind==='rule'){assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}}
});
test('the audit preserves sources, identities, enabled states, variant scopes and unrelated entries',()=>{
 const original=structuredClone(before),other={key:'rule:unrelated',kind:'rule',faction:'Other',name:'Other',enabled:true,revision:9,data:{id:'unrelated'}};audit([...before,other]);assert.deepEqual(before,original);assert.ok(!result.changes.some(r=>r.key===other.key));
 for(const old of before){const row=after.find(r=>r.key===old.key);for(const k of ['key','kind','name','faction','enabled','revision'])assert.deepEqual(row[k],old[k]);assert.deepEqual(row.data.importSource,old.data.importSource);if(old.kind==='rule')for(const k of ['units','memberships','detachment','enhancement','referenceOnly'])assert.deepEqual(row.data[k],old.data[k]);}
 assert.deepEqual(after.filter(r=>['faction','detachment'].includes(r.kind)),before.filter(r=>['faction','detachment'].includes(r.kind)));
});
test('saved edits, source drift, profile changes, revisions and catalog membership block stale repairs',()=>{
 for(const mutate of [r=>r.revision++,r=>r.data.summary='User edit',r=>r.data.importSource.record.effect={type:'changed'}]){const changed=structuredClone(before);mutate(changed.find(r=>r.kind==='rule'));assert.throws(()=>audit(changed),/Entry changed/);}
 const changed=structuredClone(before);changed.find(r=>r.kind==='unit').data.modelCounts=[99];assert.throws(()=>audit(changed),/Entry changed/);assert.throws(()=>audit(before.slice(1)),/catalog changed/);
});
test('official Toughness updates affect only four ordinary datasheets and preserve other stats and Combat Patrol',()=>{
 for(const [id,value] of Object.entries({'chaos-terminators':6,'kharn-the-betrayer':5,'khorne-berzerkers':5,'master-of-executions-world-eaters':5})){const row=byKey.get('unit:'+id),prior=before.find(r=>r.key===row.key);assert.equal(P.read(row.data)[0].T,value);for(const field of ['M','W','Sv','Ld','OC','invuln_sv'])assert.equal(P.read(row.data)[0][field],P.read(prior.data)[0][field]);assert.ok(row.data.unitAudit.officialSource.sha256);}
 for(const old of before.filter(r=>r.kind==='unit'&&r.data.id.startsWith('frenzied-')))assert.deepEqual(P.read(after.find(r=>r.key===old.key).data),P.read(old.data));
 const drake=after.find(r=>r.key==='unit:heldrake-world-eaters');assert.equal(P.read(drake.data)[0].M,12);assert.equal(P.read(drake.data)[0].OC,0);assert.ok(!drake.data.keywords.includes('Aircraft'));
});
test('composition ranges include intermediate squads without changing fixed patrol units',()=>{
 for(const id of ['bloodcrushers-world-eaters','eightbound','exalted-eightbound'])assert.deepEqual(byKey.get('unit:'+id).data.modelCounts,[3,4,5,6]);
 for(const id of ['chaos-terminators','flesh-hounds-world-eaters'])assert.deepEqual(byKey.get('unit:'+id).data.modelCounts,[5,6,7,8,9,10]);assert.deepEqual(byKey.get('unit:khorne-berzerkers').data.modelCounts,Array.from({length:11},(_,i)=>i+10));assert.deepEqual(after.find(r=>r.key==='unit:frenzied-reavers-khorne-berzerkers').data.modelCounts,[10]);
});
test('Blessings retains every dice threshold, exclusive allocation, melee death gate and round duration',()=>{
 const d=get('blessings-of-khorne');for(const text of ['8D6','up to two','any double','double 2+','double 3+','double 4+ or any triple','double 5+ or triple 2+','double 6+ or triple 3+','not fought','4+','INFANTRY','cannot also pay'])assert.ok(d.summary.includes(text),text);assert.equal(d.window,'round');assert.equal(d.phase[0],0);assert.equal(M.summaryState(get('blessings-of-khorne-frenzied-reavers')),'needs-summary');
});
test('Angron resurrection requires destruction, consumes round-start Blessings and defers arrival',()=>{
 const d=get('reborn-in-blood');assert.match(d.summary,/destroyed.*triple 6.*instead of activating any Blessings.*8 wounds.*next Movement phase/s);assert.equal(d.timings.length,2);assert.ok(L.timingsFor(d,state(army(['Angron']),1,'you')).some(t=>t.window==='arrivals'));assert.equal(L.timingsFor(d,state(army(['Angron']),1,'opponent')).length,0);
 const p=get('wrathful-presence');assert.match(p.summary,/up to six individual dice.*Leadership test.*Remain Stationary.*melee Hit and Wound rolls of 1/s);assert.ok(p.summaryAudit.officialSource.sha256);assert.ok(p.summaryAudit.referenceSource.url.endsWith('/Angron'));
});
test('defensive split timings never introduce own-turn Shooting, while Apoplectic Clarity does',()=>{
 for(const id of ['blessing-of-burning-blood-khorne-daemonkin','daemonic-resistance-possessed-slaughterband','in-the-shadow-of-brass-idols-cult-of-blood']){const d=get(id);assert.equal(d.timings.length,2);assert.ok(!L.ruleMatchesContext(d,{phase:2,turn:'you'}));assert.ok(L.ruleMatchesContext(d,{phase:2,turn:'opponent'}));assert.ok(L.ruleMatchesContext(d,{phase:4,turn:'you'}));assert.ok(L.ruleMatchesContext(d,{phase:4,turn:'opponent'}));}
 assert.ok(L.ruleMatchesContext(get('apoplectic-clarity-brazen-engines'),{phase:2,turn:'you'}));assert.ok(!L.ruleMatchesContext(get('apoplectic-clarity-brazen-engines'),{phase:2,turn:'opponent'}));assert.equal(get('daemonic-fury-khorne-daemonkin').turn,'you');
});
test('transports, relay rules, reactive moves and replacement distances retain their correct recipients',()=>{
 assert.match(get('fury-unleashed-goretrack-onslaught').summary,/RHINO.*hit.*BERZERKERS.*D6\+2.*passengers.*not the Rhino/s);assert.match(get('full-throttle-assault-goretrack-onslaught').summary,/not yet selected.*Normal move.*assault disembark.*passengers/s);assert.match(get('blessing-of-burning-blood-khorne-daemonkin').summary,/BLOOD LEGIONS.*6″.*WORLD EATERS.*relay, not the save recipient/s);assert.match(get('berzerkers-wrath-berzerker-warband').summary,/eligible.*Replace.*8″.*not add.*\+2/s);assert.match(get('unrelenting-advance-goretrack-onslaught').summary,/hit.*Normal move.*6″.*cannot also/s);
});
test('official Defiler, Character-only benefits, and once-per-round summon retain their exceptions',()=>{
 assert.match(get('unleash-wrath').summary,/end.*Movement.*set up.*12″.*Either shoot.*or declare.*no Charge bonus/s);assert.deepEqual(get('unleash-wrath').phase,[1]);assert.match(get('wrath-of-khorne').summary,/only its CHARACTER.*Bodyguards do not/s);assert.ok(get('wrath-of-khorne').summaryAudit.pinnedDifferences.effect);assert.match(get('summoned-by-slaughter-khorne-daemonkin').summary,/Once per battle round.*last model.*disembarkation first.*wholly within 9″.*more than 6″.*existing Reserves/s);assert.match(get('wrath-beyond-reason-butchers-of-khorne').summary,/until that enemy finishes.*not last the entire phase/s);
});
test('unit-wide benefits require their attached provider and ordinary/upgrade bearer eligibility is preserved',()=>{
 C.apply(after);assert.equal(get('aggressive-advance').leadingUnitRequired,true);assert.equal(get('legendary-killer').leadingUnitRequired,true);
 const attached=army(['Khârn the Betrayer','Khorne Berzerkers']);Object.assign(attached.units[0],{role:'leader',group:'g'});Object.assign(attached.units[1],{role:'bodyguard',group:'g'});assert.ok(cards(state(attached,4),{id:'fight',window:'act'}).some(c=>c.id===get('legendary-killer').id));assert.ok(!cards(state(army(['Khârn the Betrayer']),4),{id:'fight',window:'act'}).some(c=>c.id===get('legendary-killer').id));
 const a=army(['Lord on Juggernaut','Master of Executions'],'Khorne Daemonkin');assert.ok(B.enhancements(a,a.units[0]).some(e=>e.id===get('disciple-of-khorne-khorne-daemonkin').id));assert.ok(!B.enhancements(a,a.units[1]).some(e=>e.id===get('disciple-of-khorne-khorne-daemonkin').id));
});
test('Blood Tithe, Idols, equipment, alternative branches and usage caps remain explicit',()=>{
 for(const text of ['3+','2 —','3 —','4 —','5 —','until battle end','500/1000/1500','Warlord'])assert.ok(get('blood-tithe').summary.includes(text));assert.match(get('idols-of-khorne').summary,/once per battle.*6″.*9″.*Choose one Idol.*BATTLELINE/s);assert.match(get('the-scent-of-blood').summary,/add 1.*or add 2 instead.*not a cumulative/s);assert.ok(get('icon-of-khorne').conditions.some(c=>c.includes('Equipment gate')));assert.match(get('icon-of-khorne').summary,/one or more.*1 Bloodshed.*lose all.*do not multiply/s);
 for(const row of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===row.data.id);assert.ok(row.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
});
test('nine unresolved source issues stay out of all practice answers and distractors',()=>{
 C.apply(after);const bad=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(bad.size,9);const bank=Q.buildBank({faction:'World Eaters',rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>100);assert.ok(bank.counts.stats>0);for(const q of bank.questions){assert.ok(!bad.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!bad.has(o.id));}
});
test('the timeline and actual Guide show reviewed rules in the correct turn and source state',()=>{
 C.apply(after);const model=T.build(after,{faction:'World Eaters'});assert.ok(model.phases.length);const s=state(army(['Khorne Berzerkers'],'Berzerker Warband'),2,'opponent'),steps=A.steps(s);assert.ok(steps.length);assert.ok(steps.some(step=>cards(s,step).some(c=>c.id===get('blood-surge').id)));assert.deepEqual(get('punishing-suppression').guide.phases,[2]);
});
