const test=require('node:test'),assert=require('node:assert/strict');
const {audit,notes,digest,reviewedDifferences}=require('../scripts/audit-admech.cjs'),before=require('./fixtures/admech-audit-before.json'),sources=require('./fixtures/admech-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),B=require('../dist/list-builder.js'),Q=require('../dist/practice.js'),T=require('../dist/timeline.js');
const result=audit(before),byKey=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>byKey.get(r.key)||r),get=id=>byKey.get('rule:'+id+'-adeptus-mechanicus').data;
const army=(names,detachment='')=>({faction:'Adeptus Mechanicus',detachment,units:names.map((name,i)=>({id:'u'+i,name,modelCount:1,details:[]}))}),state=(army,phase=0,turn='you')=>({army,phase,turn,round:2,firstPlayer:'you'});
const cards=(s,step)=>{const d=A.flashcards(s,step);return [...d.shared,...d.unitCards.flatMap(c=>c.items)];};
test.afterEach(()=>C.reset());
test('Admech audit covers all 167 rules, 38 datasheets, 39 profiles and 11 detachments',()=>{
 assert.equal(result.changes.length,180);assert.equal(result.changes.filter(r=>r.kind==='rule').length,167);assert.equal(result.changes.filter(r=>r.kind==='unit').length,13);
 assert.deepEqual(result.counts,{structured:124,'needs-summary':29,missing:14});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(a=>a.ability_id)));
 assert.equal(after.filter(r=>r.kind==='unit').reduce((n,r)=>n+P.read(r.data).length,0),39);
 for(const r of result.changes){C.validate(r);if(r.kind==='rule'){assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}}
});
test('the audit preserves every original source, identity, enabled state and saved scope',()=>{
 const original=structuredClone(before);audit(before);assert.deepEqual(before,original);assert.equal(before.filter(r=>r.revision>1).length,0);
 for(const old of before){const row=after.find(r=>r.key===old.key);for(const key of ['key','kind','name','faction','enabled','revision'])assert.deepEqual(row[key],old[key]);assert.deepEqual(row.data.importSource,old.data.importSource);
  if(old.kind==='rule')for(const k of ['id','referenceOnly','units','memberships','detachment','enhancement'])assert.deepEqual(row.data[k],old.data[k]);
  if(!byKey.has(old.key))assert.deepEqual(row,old);
 }
 assert.equal(before.filter(r=>!byKey.has(r.key)).length,37);assert.deepEqual(after.filter(r=>r.kind==='detachment'||r.kind==='faction'),before.filter(r=>r.kind==='detachment'||r.kind==='faction'));
});
test('changed descriptions, profiles, revisions or catalog membership block a stale import',()=>{
 for(const mutate of [r=>r.data.summary='Saved wording',r=>r.revision++,r=>r.data.importSource.record.effect={type:'changed'}]){const rows=structuredClone(before);mutate(rows.find(r=>r.kind==='rule'));assert.throws(()=>audit(rows),/Entry changed/);}
 const edited=structuredClone(before);edited.find(r=>r.kind==='unit').data.modelCounts=[99];assert.throws(()=>audit(edited),/Entry changed/);
 assert.throws(()=>audit(before.slice(1)),/catalog changed/);
});
test('the stored Benediction variant is source-bound and not silently replaced by the pinned interpretation',()=>{
 const d=get('benedictions-of-the-omnissiah');assert.deepEqual(Object.keys(reviewedDifferences),['benedictions-of-the-omnissiah-adeptus-mechanicus']);
 assert.match(d.summary,/half weapon range.*snapshot conflict/s);assert.match(d.summary,/start of battle round 1/);assert.equal(M.summaryState(d),'needs-summary');
 assert.deepEqual(Object.keys(d.summaryAudit.pinnedDifferences).sort(),['effect','trigger']);assert.ok(d.summaryAudit.pinnedDifferences.trigger.pinned);
});
test('the official supplement recovers two empty Stratagems and complete Halo selection branches',()=>{
 for(const id of ['aggressive-impulse-haloscreed-battle-clade','neural-overload-haloscreed-battle-clade']){const d=get(id);assert.equal(d.importSource.record.effect.type,'no-effect');assert.equal(M.summaryState(d),'available');assert.ok(d.summaryAudit.officialSource.sha256);assert.match(d.mechanicsDetails,/Historical import/);}
 assert.match(get('aggressive-impulse-haloscreed-battle-clade').summary,/before.*SKORPIUS DUNERIDER.*selected to move.*Normal move.*charge/s);
 assert.match(get('neural-overload-haloscreed-battle-clade').summary,/D3 mortal.*adds.*Otherwise.*without gaining HALO OVERRIDE/s);
 assert.match(get('noospheric-transference').summary,/1\/2\/3.*including embarked.*all friendly HALO OVERRIDE.*\+2″ Move.*\+1 Toughness.*charge after Advancing.*Stealth/s);
 assert.match(get('noospheric-transference').summary,/excluded by Transoracular Dyad Wafers/);
});
test('official Cawl, Cognitive, Cyber-static and walker corrections retain precise beneficiaries',()=>{
 assert.match(get('canticles-of-the-omnissiah').summary,/friendly ADEPTUS MECHANICUS units within 6″ \+1 OC and \+1 to Battle-shock\/Leadership.*aura benefit, not just Cawl/s);
 assert.match(get('cognitive-reinforcement-haloscreed-battle-clade').summary,/both Protector and Conqueror.*excludes CYBERNETICA DATASMITH/s);
 assert.match(get('cyber-static-canticles').summary,/CORPUSCARII.*Lethal Hits.*After.*FULGURITE.*fights.*heals D3/s);
 assert.match(get('scuttling-walker').summary,/During.*Normal, Advance or Fall Back.*friendly MONSTER and VEHICLE.*4″.*not an effect applied after/s);
 assert.match(get('tl-4-9-lords-of-the-forge').summary,/24″, 3 attacks, BS 2\+, Strength 11, AP -2, Damage D3\+2.*Hazardous/);
});
test('the three Archaeopter profiles use the explicit official update and all other profile values remain intact',()=>{
 const changedUnits=result.changes.filter(r=>r.kind==='unit');
 for(const id of ['archaeopter-fusilave','archaeopter-stratoraptor','archaeopter-transvector']){const old=before.find(r=>r.key==='unit:'+id),row=byKey.get(old.key),profiles=P.read(row.data),prior=P.read(old.data);
  assert.equal(profiles[0].M,id==='archaeopter-transvector'?14:'-');assert.equal(profiles[0].OC,id==='archaeopter-transvector'?0:'-');
  for(const key of ['T','W','Sv','invuln_sv','Ld'])assert.equal(profiles[0][key],prior[0][key]);assert.ok(row.data.unitAudit.officialSource.sha256);assert.deepEqual(row.data.importSource,old.data.importSource);
 }
 for(const row of changedUnits.filter(r=>!r.data.id.startsWith('archaeopter-')))assert.deepEqual(P.read(row.data),P.read(before.find(r=>r.key===row.key).data));
});
test('model selectors include intermediate sizes supported by all ten composition ranges',()=>{
 for(const id of ['corpuscarii-electro-priests','fulgurite-electro-priests','pteraxii-skystalkers','pteraxii-sterylizors','sicarian-infiltrators','sicarian-ruststalkers'])assert.deepEqual(byKey.get('unit:'+id).data.modelCounts,[5,6,7,8,9,10]);
 for(const id of ['kataphron-breachers','kataphron-destroyers','serberys-raiders','serberys-sulphurhounds'])assert.deepEqual(byKey.get('unit:'+id).data.modelCounts,[3,4,5,6]);
 assert.deepEqual(after.find(r=>r.key==='unit:servitor-battleclade').data.modelCounts,[9]);
});
test('Battle Protocols require the attached native Support Datasmith and a Kastelan bodyguard',()=>{
 C.apply(after);const d=get('battle-protocols');assert.equal(d.leadingUnitRequired,true);assert.equal(d.leadingBodyguard,'Kastelan Robots');
 const attached=army(['Cybernetica Datasmith','Kastelan Robots']);Object.assign(attached.units[0],{group:'g',role:'support'});Object.assign(attached.units[1],{group:'g',role:'bodyguard'});
 assert.ok(cards(state(attached),{id:'command-abilities',window:'act'}).some(c=>c.id===d.id));
 assert.ok(!cards(state(army(['Cybernetica Datasmith'])),{id:'command-abilities',window:'act'}).some(c=>c.id===d.id));
 const wrong=structuredClone(attached);wrong.units[1].name='Skitarii Rangers';assert.ok(!cards(state(wrong),{id:'command-abilities',window:'act'}).some(c=>c.id===d.id));
 const marshal=army(['Skitarii Marshal','Skitarii Rangers']);Object.assign(marshal.units[0],{group:'g',role:'support'});Object.assign(marshal.units[1],{group:'g',role:'bodyguard'});
 assert.ok(cards(state(marshal,2),{id:'shooting',window:'act'}).some(c=>c.id===get('control-edict').id));
 const leaderOnly=structuredClone(after.find(r=>r.key==='unit:skitarii-marshal'));leaderOnly.data.abilities=leaderOnly.data.abilities.filter(a=>a.id!=='support').concat([{id:'leader'}]);C.apply(after.map(r=>r.key===leaderOnly.key?leaderOnly:r));
 assert.ok(!cards(state(marshal,2),{id:'shooting',window:'act'}).some(c=>c.id===get('control-edict').id));marshal.units[0].role='leader';assert.ok(cards(state(marshal,2),{id:'shooting',window:'act'}).some(c=>c.id===get('control-edict').id));
});
test('enhancement bearers exclude Datasmith for Cognitive while preserving native Support and upgrade options',()=>{
 C.apply(after);const a=army(['Cybernetica Datasmith','Tech-Priest Manipulus'],'Haloscreed Battle Clade'),id=get('cognitive-reinforcement-haloscreed-battle-clade').id;
 assert.ok(!B.enhancements(a,a.units[0]).some(e=>e.id===id));assert.ok(B.enhancements(a,a.units[1]).some(e=>e.id===id));
 assert.ok(B.enhancements(a,a.units[0]).some(e=>e.id===get('transoracular-dyad-wafers-haloscreed-battle-clade').id));
 const patrol=army(['Purge Corps Serberys Sulphurhounds','Skitarii Rangers'],'Purge Corps Deltic-9');assert.ok(B.enhancements(patrol,patrol.units[0]).some(e=>e.id===get('empowered-mechanisms-purge-corps-deltic-9').id));assert.ok(!B.enhancements(patrol,patrol.units[1]).some(e=>e.id===get('empowered-mechanisms-purge-corps-deltic-9').id));
});
test('core CP costs, optional secondary targets and exclusive reserve modes remain explicit',()=>{
 for(const row of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===row.data.id);assert.ok(row.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));if(row.data.mechanicsPresentation==='missing'){assert.deepEqual(row.data.phase,[]);assert.equal(row.data.window,'prebattle');}}
 const aggressor=get('aggressor-imperative-rad-zone-corps');assert.match(aggressor.targetText,/Up to 1.*excluding Battleline.*first target is BATTLELINE.*6″/s);
 const binharic=get('binharic-offence-skitarii-hunter-cohort');assert.match(binharic.targetText,/first target.*second target.*third target: One enemy/s);
 const reserve=get('programmed-withdrawal-skitarii-hunter-cohort');assert.match(reserve.targetText,/Mode A.*Up to 2.* OR Mode B.*INFANTRY or MOUNTED/s);assert.match(reserve.summary,/outside 3″.*never combine/s);assert.equal(M.summaryState(reserve),'needs-summary');
});
test('normal and Combat Patrol variants retain their scopes, equipment and distinct limits',()=>{
 assert.equal(get('doctrina-imperatives').units.length,34);assert.equal(get('doctrina-imperatives-purge-corps-deltic-9').units.length,4);
 assert.match(get('defend-the-divine-work').summary,/Once per battle/);assert.match(get('defend-the-divine-work-manipulus-skand').summary,/no usage limit.*Confirm its own limit/s);
 assert.ok(get('omnispex').conditions.some(c=>c.includes('Equipment gate:')));assert.match(get('broad-spectrum-data-tether-onager-dunecrawler').summary,/loses SMOKE.*Chaff Launcher.*grants SMOKE/s);
 assert.equal(M.summaryState(get('omnispex-purge-corps-skitarii-vanguard')),'needs-summary');
});
test('43 unresolved rules stay outside practice and official dash stats are not fabricated quiz answers',()=>{
 C.apply(after);const bad=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(bad.size,43);const bank=Q.buildBank({faction:'Adeptus Mechanicus',rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments});assert.ok(bank.studyRules.length>0);assert.ok(bank.counts.stats>0);
 for(const q of bank.questions){assert.ok(!bad.has(q.review?.rule?.id));for(const choice of q.options)assert.ok(!bad.has(choice.id));if(q.review?.kind==='stats')assert.ok(!q.options.some(o=>o.label==='-'));}
 const aircraft=new Set(['archaeopter-fusilave','archaeopter-stratoraptor']);assert.ok(!bank.questions.some(q=>q.review?.kind==='stats'&&aircraft.has(q.review.units[0]?.id)&&['M','OC'].includes(q.review.stat)));assert.ok(bank.questions.some(q=>q.review?.kind==='stats'&&aircraft.has(q.review.units[0]?.id)&&q.review.stat==='T'));
});
test('timeline and actual Guide use the reviewed timings and early-shooter hints',()=>{
 C.apply(after);const model=T.build(after,{faction:'Adeptus Mechanicus'});assert.equal(model.index.filter(r=>r.kind==='rule'&&r.faction==='Adeptus Mechanicus').length,167);
 const a=army(['Skitarii Vanguard'],'Rad-Zone Corps');assert.ok(cards(state(a),{id:'round-start',window:'round'}).some(c=>c.id===get('doctrina-imperatives').id));
 assert.deepEqual(get('rad-bombardment').timings,[{phase:[0],turn:'either',window:'round'},{phase:[0],turn:'you',window:'start'}]);
 for(const id of ['fire-support','electro-shock','pinning-fire','dread-snipers']){const d=get(id);assert.equal(d.window,'after');assert.equal(d.guide.order,'early');assert.equal(d.guide.turn,'you');}
 assert.equal(get('bomb-rack').window,'end');assert.equal(get('bomb-rack').turn,'opponent');assert.equal(get('objective-scouted').window,'end');assert.equal(get('aerial-deployment').window,'arrivals');
});
