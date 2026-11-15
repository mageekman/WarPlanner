const test=require('node:test'),assert=require('node:assert/strict'),{isDeepStrictEqual:eq}=require('node:util');
const {audit,notes,digest}=require('../scripts/audit-daemons.cjs'),before=require('./fixtures/daemons-audit-before.json'),sources=require('./fixtures/daemons-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r),get=id=>after.find(r=>r.key==='rule:'+id+'-chaos-daemons').data;
test.afterEach(()=>C.reset());
test('Daemons audit covers all 195 abilities, 53 units, 54 matching profiles and nine detachments',()=>{
 assert.equal(result.changes.length,195);assert.deepEqual(result.counts,{structured:94,'needs-summary':84,missing:17});assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const r of result.changes){C.validate(r);assert.ok(!M.isPlaceholder(r.data.summary));assert.ok(r.data.targetText);assert.ok(r.data.mechanicsDetails);assert.equal(r.data.summaryAudit.sourceHash,digest(r.data.importSource.record));assert.equal(r.data.summaryAudit.summaryHash,digest(r.data.summary));}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,53);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),54);for(const u of units){P.validate(P.read(u.data));const source=sources['core-units.json'].find(s=>s.id===u.data.importSource.sourceId);assert.deepEqual(P.read(u.data),P.read({profiles:source.profiles}));}assert.equal(after.filter(r=>r.kind==='detachment').length,9);
});
test('all imports, existing unit identities, nonrules, flags and memberships except the documented army-scope repair survive',()=>{
 const copy=structuredClone(before);audit(before);assert.deepEqual(before,copy);
 for(const original of before){const row=after.find(r=>r.key===original.key);if(row.kind!=='rule'){assert.deepEqual(row,original);continue;}
 for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],original[key]);for(const key of ['importSource','status','referenceOnly','detachment','enhancement','guide','id'])assert.deepEqual(row.data[key],original.data[key]);if(row.data.id!=='the-shadow-of-chaos-chaos-daemons')assert.deepEqual(row.data.units,original.data.units);}
 for(const id of ['blue-horrors','flamers','kairos-fateweaver','lord-of-change','pink-horrors','screamers']){const u=after.find(r=>r.key==='unit:'+id+'-chaos-daemons');assert.equal(u.data.id,id+'-chaos-daemons');assert.equal(u.data.importSource.sourceId,id);}
});
test('Shadow retains phase snapshots, separate territories and exclusive recovery branches',()=>{
 const d=get('the-shadow-of-chaos');for(const phrase of ['deployment zone is always','each phase start','snapshot','at least half in No Man’s Land','that territory separately','non-BATTLELINE heal D3 wounds to one model','BATTLELINE instead return D3 destroyed non-CHARACTER','subtract 1 and suffer D3 mortal wounds on failure'])assert.ok(d.summary.includes(phrase),phrase);
 assert.deepEqual(d.phase,[0,1,2,3,4]);assert.equal(d.window,'start');assert.equal(M.summaryState(d),'needs-summary');assert.match(d.summary,/pinned per-unit.*before-roll/);
 assert.deepEqual(d.units,[]);assert.match(d.targetText,/all eligible friendly LEGIONES DAEMONICA.*Poxbringer/);assert.ok(d.conditions.some(c=>c.includes('Army guide scope repaired')));
});
test('the Shadow scope repair restores the actual Poxbringer-only guide card without changing its unit record',()=>{
 const s={phase:0,turn:'you',round:1,firstPlayer:'you',army:{faction:'Chaos Daemons',detachments:['Daemonic Incursion'],units:[{id:'pox',name:'Poxbringer',models:1,details:[]}]}};
 C.apply(before);assert.ok(!A.flashcards(s,A.steps(s).find(s=>s.id==='command-start')).shared.some(c=>c.id==='the-shadow-of-chaos-chaos-daemons'));
 C.apply(after);assert.ok(A.flashcards(s,A.steps(s).find(s=>s.id==='command-start')).shared.some(c=>c.id==='the-shadow-of-chaos-chaos-daemons'));
});
test('all 17 no-effect records remain missing and Fates in Flux explains its wrong mechanic and omitted economy',()=>{
 const missing=before.filter(r=>r.kind==='rule'&&r.data.importSource.record.effect.type==='no-effect');assert.equal(missing.length,17);for(const r of missing){const d=updated.get(r.key).data;assert.equal(M.summaryState(d),'missing');assert.match(d.summary,/Missing source mechanics.*no-effect/);}
 assert.equal(M.summaryState(get('daemonic-allegiance')),'missing');assert.equal(M.summaryState(get('daemonic-allegiance-soul-grinder')),'needs-summary');
 assert.match(get('fates-in-flux').summary,/substitutes dice values.*re-rolls.*starting three tokens.*Command-phase regain/);assert.equal(M.summaryState(get('fates-in-flux')),'needs-summary');
});
test('five imported effect differences stay preserved and explicit',()=>{
 const differences=before.filter(r=>r.kind==='rule').filter(row=>{const pin=sources['enrichment-abilities.json'].find(r=>r.ability_id===row.data.id);return ['effect','trigger','scope','usage','community_notes'].some(k=>!eq(pin[k],row.data.importSource.record[k]));}).map(r=>r.data.id).sort();
 assert.deepEqual(differences,['death-denied-shadow-legion','foetid-resurgence-plague-legion','split','split-pink-horrors','the-shadow-of-chaos'].map(id=>id+'-chaos-daemons').sort());for(const id of ['death-denied-shadow-legion','foetid-resurgence-plague-legion','split','split-pink-horrors','the-shadow-of-chaos']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/pin/);}
 assert.match(get('split').summary,/BLUE.*4\+.*one Brimstone.*same unit/);assert.match(get('split-pink-horrors').summary,/two Blue Horror models.*one Brimstone Horror/);
});
test('core mode alternatives, counts, position gates, costs, phases and turns are preserved',()=>{
 assert.match(get('archagonists-legion-of-excess').targetText,/Mode A: One friendly.*Monster.* OR Mode B: Up to 2 friendly.*excluding Monster/);
 assert.match(get('the-realm-of-chaos-daemonic-incursion').targetText,/Mode A: Up to 2 friendly.*within your Shadow of Chaos.*not \(engaged\).* OR Mode B: One friendly/);
 assert.match(get('warp-surge-daemonic-incursion').targetText,/Shadow of Chaos active.*does not bind unit position/);assert.match(get('skulls-beget-blood-blood-legion').targetText,/INFANTRY or MOUNTED.*not \(Fell Back this turn\).*not \(engaged\)/);assert.match(get('inescapable-manifestations-cavalcade-of-chaos').targetText,/engaged with the triggering enemy/);
 for(const r of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(c=>c.ability_id===r.data.id||c.id===r.data.id);assert.ok(core);assert.deepEqual(r.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.equal(r.data.turn,core.player_turn==='your-turn'?'you':core.player_turn==='opponent-turn'?'opponent':'either');assert.ok(r.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
});
test('defensive limits, casualties and similarly named variants retain distinct mechanics',()=>{
 assert.match(get('altered-reality').summary,/Once per battle round per unit.*Hit, Wound or Save.*result to 6/);assert.match(get('unholy-vigour').summary,/Once per battle per unit.*3\+ invulnerable.*this phase/);assert.match(get('rider-of-the-immaterial-winds').summary,/Once per battle per unit/);assert.doesNotMatch(get('hunters-from-the-warp').summary,/Once per battle/);
 assert.match(get('brass-collar-of-bloody-vengeance').summary,/Psychic attacks and mortal/);assert.match(get('collar-of-khorne').summary,/Psychic attacks only/);assert.match(get('shining-aegis').summary,/Save characteristic to 3.*not an invulnerable/);assert.match(get('mischief-and-confusion').summary,/1 does nothing.*Unlike Horrible Fascination/);
 assert.match(get('wrath-undeniable-blood-legion').summary,/4\+ after the attacker finishes.*event-subject/);assert.match(get('flames-of-change').summary,/Advance\/Charge modifiers target this-unit rather than that enemy/);
});
test('saved text, source/stat drift, revision changes and added/deleted records reject a stale repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='faction').data.name='My saved faction',r=>r.find(x=>x.kind==='rule').data.summary='My saved wording',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='unit').data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('all 101 unresolved Daemons records stay out of practice answers and distractors',()=>{
 C.apply(after);const bank=Q.buildBank({faction:'Chaos Daemons',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);const unavailable=new Set(notes.filter(n=>n.state!=='structured').map(n=>n.id));assert.equal(unavailable.size,101);
 for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const o of q.options)assert.ok(!unavailable.has(o.id));}
});
test('Daemons timeline isolates detachments and real guide puts Infected Outbreak at Command end',()=>{
 C.apply(after);const all=T.build(after,{faction:'Chaos Daemons'});assert.equal(all.index.filter(r=>r.kind==='rule').length,195);assert.equal(all.index.filter(r=>r.kind==='unit').length,53);
 const filtered=T.build(after,{faction:'Chaos Daemons',detachment:'Blood Legion'});assert.ok(filtered.index.some(r=>r.key==='rule:sheathed-in-brass-blood-legion-chaos-daemons'));assert.ok(!filtered.index.some(r=>r.key==='rule:foetid-resurgence-plague-legion-chaos-daemons'));assert.ok(filtered.index.some(r=>r.key==='rule:the-shadow-of-chaos-chaos-daemons'));
 const s={phase:0,turn:'you',round:1,firstPlayer:'you',army:{faction:'Chaos Daemons',detachments:['Plague Legion'],units:[{id:'plague',name:'Plaguebearers',models:10,details:[]}]}};const cards=A.flashcards(s,A.steps(s).at(-1)).unitCards.flatMap(c=>c.items);assert.ok(cards.some(c=>c.id==='infected-outbreak-chaos-daemons'));
});
