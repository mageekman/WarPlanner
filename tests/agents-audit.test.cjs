const test=require('node:test'),assert=require('node:assert/strict');
const {audit,notes,digest}=require('../scripts/audit-agents.cjs'),before=require('./fixtures/agents-audit-before.json'),sources=require('./fixtures/agents-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),L=require('../dist/lessons.js'),Q=require('../dist/practice.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),byKey=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>byKey.get(r.key)||r),get=id=>byKey.get('rule:'+id+'-agents-of-the-imperium').data;
test.afterEach(()=>C.reset());
test('Agents audit covers all 138 rules, 33 units, 40 named profiles, six detachments and all source links',()=>{
 assert.equal(result.changes.length,143);assert.equal(result.changes.filter(r=>r.kind==='rule').length,138);assert.equal(result.changes.filter(r=>r.kind==='unit').length,4);assert.equal(result.changes.filter(r=>r.kind==='faction').length,1);assert.deepEqual(result.counts,{structured:123,'needs-summary':12,missing:3});assert.equal(after.filter(r=>r.kind==='unit').reduce((n,r)=>n+P.read(r.data).length,0),40);assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of result.changes){C.validate(r);if(r.kind==='rule'){assert.ok(!M.isPlaceholder(r.data.summary));assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}}
});
test('original sources, identity, scopes, enabled state and named variants remain intact',()=>{
 const snapshot=structuredClone(before);audit(before);assert.deepEqual(before,snapshot);for(const old of before){const row=after.find(r=>r.key===old.key);for(const k of ['key','kind','name','faction','enabled','revision'])assert.deepEqual(row[k],old[k]);assert.deepEqual(row.data.importSource,old.data.importSource);if(old.kind==='rule')for(const k of ['units','detachment','enhancement','referenceOnly','memberships'])assert.deepEqual(row.data[k],old.data[k]);}assert.deepEqual(after.filter(r=>r.kind==='detachment'),before.filter(r=>r.kind==='detachment'));
});
test('source edits, user wording, revised profiles, revisions or catalog additions block a stale repair',()=>{
 for(const mutate of [r=>r.revision++,r=>r.data.summary='User edit',r=>r.data.importSource.record.effect={type:'changed'}]){const changed=structuredClone(before);mutate(changed.find(r=>r.kind==='rule'));assert.throws(()=>audit(changed),/Entry changed/);}assert.throws(()=>audit(before.slice(1)),/catalog changed/);
});
test('the official profile changes affect the Agents versions and retain import provenance',()=>{
 const gk=byKey.get('unit:grey-knights-terminator-squad').data,corvus=byKey.get('unit:corvus-blackstar-imperial-agents').data;assert.equal(P.read(gk)[0].T,6);assert.equal(P.read(corvus)[0].M,14);assert.ok(!corvus.keywords.some(k=>k.toLowerCase()==='aircraft'));assert.ok(gk.unitAudit.officialSource.sha256);for(const key of ['W','OC','Sv','Ld'])assert.equal(P.read(gk)[0][key],P.read(before.find(r=>r.key==='unit:grey-knights-terminator-squad').data)[0][key]);
 assert.deepEqual(byKey.get('unit:inquisitorial-agents').data.modelCounts,[6,7,8,9,10,11,12]);
});
test('the removed Aquila is retained with a source warning and excluded from alliance suggestions',()=>{
 const u=byKey.get('unit:aquila-kill-team');assert.equal(u.enabled,true);assert.match(u.data.sourceReview,/v1.3.*removes.*historical.*excluded/s);assert.ok(after.find(r=>r.kind==='faction').data.assignedAgents.excludedUnitIds.includes(u.data.id));
});
test('Assigned Agents has the checked limits, exclusions, aliases and four specific cross-faction Inquisitors',()=>{
 const f=after.find(r=>r.kind==='faction');assert.ok(f.data.aliases.includes('Agents of the Imperium'));assert.deepEqual(f.data.assignedAgents.limits,{'incursion':{character:1,retinue:1,requisitioned:1},'strike-force':{character:2,retinue:2,requisitioned:1},onslaught:{character:3,retinue:3,requisitioned:2}});assert.deepEqual(f.data.assignedAgents.battlelineLeaderIds,['inquisitor','inquisitor-coteaz','inquisitor-draxus','inquisitor-greyfax']);assert.match(get('assigned-agents').summary,/every model.*IMPERIUM.*2\/2\/1.*3\/3\/2.*transports.*embarked/s);
 const bad=structuredClone(f);bad.data.assignedAgents.limits.incursion.character=-1;assert.throws(()=>C.validate(bad),/allowances/);
});
test('defensive rules have opponent-only Shooting and either-player Fight timings',()=>{
 for(const id of ['armour-of-contempt-ordo-xenos-alien-hunters','hexagrammic-wards-ordo-malleus-daemon-hunters','hyperstimms-veiled-blade-elimination-force','inviolate-jurisdiction-ordo-hereticus-purgation-force','selfless-bodyguard-imperialis-fleet','truesilver-armour-ordo-malleus-daemon-hunters']){const d=get(id);assert.equal(d.timings.length,2);assert.ok(!L.ruleMatchesContext(d,{phase:2,turn:'you'}));assert.ok(L.ruleMatchesContext(d,{phase:2,turn:'opponent'}));assert.ok(L.ruleMatchesContext(d,{phase:4,turn:'you'}));}
 for(const id of ['armour-of-contempt-ordo-xenos-alien-hunters','truesilver-armour-ordo-malleus-daemon-hunters'])assert.match(get(id).summary,/until.*finishes attacking.*not last the entire phase/s);
});
test('Assassin datasheets retain specific usage and effects instead of imported broad approximations',()=>{
 assert.match(get('dead-shot').summary,/selected to shoot.*until it finishes.*15″.*not suppress.*rest of your army/s);assert.match(get('shieldbreaker').summary,/Once per battle.*Exitus Rifle.*Critical Wounds/s);assert.match(get('shadow-assignment').summary,/AGENTS OF THE IMPERIUM army only.*cannot have more than one of each.*not a blanket one-Assassin/s);assert.match(get('spy-network').summary,/opponent gains CP from an ability.*2\+.*not trigger.*ordinary Command/s);
});
test('recovered empty Stratagems and one-use effects preserve targeting and core CP costs',()=>{
 for(const id of ['adaptive-tactics-ordo-xenos-alien-hunters','digital-weapons-imperialis-fleet','displacer-field-imperialis-fleet','hellfire-rounds-ordo-xenos-alien-hunters','rapid-tactical-relocation-ordo-xenos-alien-hunters','ritual-of-warding-ordo-malleus-daemon-hunters']){assert.equal(get(id).importSource.record.effect.type,'no-effect');assert.equal(M.summaryState(get(id)),'available');}
 for(const r of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===r.data.id);assert.ok(r.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
});
test('Agents abilities that explicitly affect host units retain the precise beneficiary and random limits',()=>{
 assert.match(get('on-my-signal-fire').summary,/hit.*AGENTS models or IMPERIUM INFANTRY BATTLELINE.*not grant every host model/s);assert.match(get('warrant-of-trade').summary,/up to D3.*IMPERIUM BATTLELINE.*Strategic Reserves.*do not always select three/s);assert.match(get('rites-of-teleportation').summary,/INQUISITOR units attached.*Deep Strike.*not.*host army/s);assert.equal(get('rites-of-teleportation').leadingUnitRequired,false);
});
test('equipment, attached providers and bodyguard recipient gates remain explicit',()=>{
 assert.ok(get('ancients-banner').conditions.some(c=>c.includes('Equipment gate')));assert.ok(get('narthecium').conditions.some(c=>c.includes('Equipment gate')));assert.equal(get('holy-hatred').leadingUnitRequired,true);assert.deepEqual(get('loyal-henchmen').requiredLeaderKeywords,['Inquisitor']);assert.deepEqual(get('ministorum-sermon').requiredLeaderKeywords,['Ministorum Priest']);assert.match(get('authority-of-the-inquisition').summary,/Bodyguard.*not let arbitrary Agents/s);
});
test('all 15 unresolved records stay outside quiz answers and distractors',()=>{
 C.apply(after);const bad=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(bad.size,15);const bank=Q.buildBank({faction:'Imperial Agents',rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments});assert.ok(bank.studyRules.length>50);assert.ok(bank.counts.stats>0);for(const q of bank.questions){assert.ok(!bad.has(q.review?.rule?.id));q.options.forEach(o=>assert.ok(!bad.has(o.id)));}
});
test('the timeline preserves distinct pickup/phase-end triggers and source-review entries',()=>{
 C.apply(after);const model=T.build(after,{faction:'Imperial Agents'});assert.ok(model.phases.length);assert.equal(get('acrobatic-escape').timings.length,2);assert.deepEqual(get('rapid-tactical-relocation-ordo-xenos-alien-hunters').phase,[4]);assert.equal(get('rapid-tactical-relocation-ordo-xenos-alien-hunters').turn,'opponent');assert.equal(M.summaryState(get('intraneural-biotech-veiled-blade-elimination-force')),'needs-summary');
});
