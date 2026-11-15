const test=require('node:test'),assert=require('node:assert/strict'),{isDeepStrictEqual:eq}=require('node:util');
const {audit,notes,digest}=require('../scripts/audit-thousand-sons.cjs'),before=require('./fixtures/thousand-sons-audit-before.json'),sources=require('./fixtures/thousand-sons-audit-sources.json');
const C=require('../dist/content.js'),M=require('../dist/mechanics.js'),P=require('../dist/unit-profiles.js'),Q=require('../dist/practice.js'),L=require('../dist/lessons.js'),A=require('../dist/activations.js'),T=require('../dist/timeline.js');
const result=audit(before),updated=new Map(result.changes.map(r=>[r.key,r])),after=before.map(r=>updated.get(r.key)||r),get=id=>after.find(r=>r.key==='rule:'+id+'-thousand-sons').data;
test.afterEach(()=>C.reset());
test('all 158 source rules, 38 datasheets and 10 detachments are covered without placeholder descriptions',()=>{
 assert.equal(result.changes.length,156);assert.deepEqual(result.counts,{structured:107,'needs-summary':47,missing:2,preserved:2});
 assert.deepEqual(new Set(notes.map(n=>n.id)),new Set(sources['enrichment-abilities.json'].map(r=>r.ability_id)));
 for(const row of after.filter(r=>r.kind==='rule')){C.validate(row);assert.ok(!M.isPlaceholder(row.data.summary));assert.ok(row.data.targetText);}
 for(const row of result.changes){assert.ok(row.data.mechanicsDetails);assert.equal(row.data.summaryAudit.sourceHash,digest(row.data.importSource.record));assert.equal(row.data.summaryAudit.summaryHash,digest(row.data.summary));}
});
test('both edited summaries, three edited units, all profiles and original provenance remain untouched',()=>{
 const snapshot=structuredClone(before);audit(before);assert.deepEqual(before,snapshot);assert.equal(before.filter(r=>r.revision>1).length,5);
 for(const row of after){const original=before.find(r=>r.key===row.key);if(original.revision>1||row.kind!=='rule'){assert.deepEqual(row,original);continue;}
 for(const key of ['key','kind','faction','name','enabled','revision'])assert.deepEqual(row[key],original[key]);
 for(const key of ['id','importSource','status','referenceOnly','units','detachment','enhancement','guide'])assert.deepEqual(row.data[key],original.data[key]);}
 const units=after.filter(r=>r.kind==='unit');assert.equal(units.length,38);assert.equal(units.reduce((n,r)=>n+P.read(r.data).length,0),44);for(const u of units)P.validate(P.read(u.data));
 assert.equal(get('psychic-dominion-grand-coven').status,'admin-reviewed');assert.equal(get('psychic-dominion-grand-coven').referenceOnly,false);
});
test('concurrent wording, source, timing, revision, additions and removals reject the repair',()=>{
 for(const edit of [r=>r[0].revision++,r=>r.find(x=>x.kind==='rule'&&x.revision===1).data.summary='Saved custom wording',r=>r.find(x=>x.kind==='rule').data.phase=[3],r=>r.find(x=>x.kind==='unit'&&x.revision>1).data.profiles=[],r=>r.find(x=>x.kind==='rule').data.importSource.record.effect={type:'changed'},r=>r.push({...r[0],key:'new'}),r=>r.pop()]){const snapshot=structuredClone(before);edit(snapshot);assert.throws(()=>audit(snapshot),/changed|Missing entry/i);}
});
test('Cabal includes every ritual charge, threshold, target restriction, usage and no-charge condition',()=>{
 for(const id of ['cabal-of-sorcerers','cabal-of-sorcerers-prism-of-zadophon']){const d=get(id);assert.deepEqual(d.phase,[2]);assert.equal(d.turn,'you');assert.equal(d.window,'start');for(const phrase of ['2D6','D3 mortal','Destiny','Temporal Surge','Doombolt','Twist of Fate','10+','11+','12+','24″','12″','Lone Operative'])assert.ok(d.summary.includes(phrase),phrase);assert.match(d.summary,/warp charge 5/);assert.match(d.summary,/Surge \(6\)/);assert.match(d.summary,/Doombolt \(7\)/);assert.match(d.summary,/Twist of Fate \(9\)/);assert.match(d.summary,/no charge|forbids charging/);assert.equal(M.summaryState(d),'needs-summary');}
});
test('Flow of Magic is snapshot-based and the qualified bonus replaces the default; weapon/model gates remain explicit',()=>{
 const flow=get('flow-of-magic');assert.equal(flow.window,'start');assert.match(flow.summary,/start of each phase.*snapshot/);assert.match(flow.summary,/at least half/);assert.match(flow.summary,/replaces the default/);
 assert.match(get('icon-of-flame-prism-of-zadophon-rubric-marines').summary,/non-CHARACTER.*not grant it to attached CHARACTER/);
 assert.match(get('infernal-fusillade-rubricae-phalanx').summary,/only.*inferno bolt pistols.*inferno boltguns.*inferno combi-bolters.*inferno combi-weapons/);
 assert.match(get('ensorcelled-infusion-warpforged-cabal').summary,/VEHICLE models.*within 6″.*PSYKER/);
 assert.match(get('malevolent-animus-warpforged-cabal').summary,/except saving throws/);
});
test('multi-target eligibility and alternative reserve modes keep their counts, bindings and proximity',()=>{
 const portal=get('glimmershift-portal-changehost-of-deceit').targetText;assert.match(portal,/Mode A: Up to 2.*excluding Monster.*not \(within 3″ of enemy\).* OR Mode B: One.*Monster.*not \(within 3″ of enemy\)/);
 const blessing=get('blessed-transmutations-warpmeld-pact');assert.match(blessing.targetText,/first target: One.*Psyker.* AND second target: One.*Tzaangors.*first target: below Starting Strength.*within 12″ of first target.*not \(same unit as first target\)/);assert.equal(M.summaryState(blessing),'needs-summary');
 assert.match(get('cyberspirit-machinations-warpforged-cabal').targetText,/first target.*triggering unit.*AND second target.*within 6″ of first target.*not \(same unit as first target\)/);
 assert.match(get('scouring-warpflame-hexwarp-thrallband').targetText,/not \(selected to shoot this phase\).*wholly within the Flow of Magic/);
 for(const row of result.changes.filter(r=>r.data.category==='stratagem')){const core=sources['core-stratagems.json'].find(r=>r.id===row.data.id);assert.ok(core);assert.deepEqual(row.data.phase,core.phases.map(p=>['command','movement','shooting','charge','fight'].indexOf(p)));assert.ok(row.data.conditions.some(c=>c.includes(core.cp_cost+'CP')));}
});
test('known source differences are retained and disclosed, never silently replaced by pinned mechanics',()=>{
 const differences=before.filter(r=>r.kind==='rule').filter(row=>{const pin=sources['enrichment-abilities.json'].find(r=>r.ability_id===row.data.id),raw=row.data.importSource.record;return ['effect','trigger','scope','usage','community_notes'].some(k=>!eq(pin[k],raw[k]));}).map(r=>r.data.id).sort();
 assert.deepEqual(differences,['devastating-sorcery-grand-coven','regenerating-monstrosities','split','split-pink-horrors','warpfire-infusion'].map(id=>id+'-thousand-sons').sort());
 for(const id of ['devastating-sorcery-grand-coven','split','split-pink-horrors','warpfire-infusion']){assert.equal(M.summaryState(get(id)),'needs-summary');assert.match(get(id).summary,/pinned/);}
 assert.match(get('split').summary,/one Brimstone Horror/);assert.match(get('split-pink-horrors').summary,/two Blue Horrors/);assert.match(get('devastating-sorcery-grand-coven').summary,/\+9″/);
});
test('unresolved rules are excluded from practice answers and distractors while both empty effects remain visible',()=>{
 C.apply(after);const bank=Q.buildBank({faction:'Thousand Sons',units:L.catalog.units,rules:L.abilities,detachments:L.catalog.detachments});assert.ok(bank.counts.rules>0);assert.ok(bank.counts.stats>0);
 const unavailable=new Set(notes.filter(n=>['needs-summary','missing'].includes(n.state)).map(n=>n.id));for(const q of bank.questions){assert.ok(!unavailable.has(q.review?.rule?.id));for(const option of q.options)assert.ok(!unavailable.has(option.id));}
 assert.equal(M.summaryState(get('committed-to-the-ritual')),'missing');assert.equal(M.summaryState(get('spirit-snare-zadophon-the-soul-eater')),'missing');
});
test('timeline and actual guide place rituals at Shooting start and preserve unit/phase eligibility',()=>{
 C.apply(after);const model=T.build(after,{faction:'Thousand Sons'});assert.equal(model.index.filter(r=>r.kind==='rule').length,158);
 const state={phase:2,turn:'you',round:1,firstPlayer:'you',army:{faction:'Thousand Sons',detachments:['Grand Coven'],units:[{id:'rubric',name:'Rubric Marines',models:5,details:[]}]}};
 const shared=A.flashcards(state,A.steps(state)[0]).shared.map(a=>a.id);assert.ok(shared.includes('cabal-of-sorcerers-thousand-sons'));assert.ok(shared.includes('arcane-focus-grand-coven-thousand-sons'));
 const unit=A.units(state.army)[0],cards=A.stages(state,unit,'shooting').flatMap(s=>s.cards);assert.ok(cards.some(a=>a.id==='bringers-of-change-thousand-sons'));assert.ok(!cards.some(a=>a.id==='cabal-of-sorcerers-thousand-sons'));
 assert.ok(!A.stages({...state,phase:4},unit,'fight').flatMap(s=>s.cards).some(a=>a.id==='bringers-of-change-thousand-sons'));assert.equal(get('ambushing-hunters').window,'turn-end');assert.equal(get('glimmershift-portal-changehost-of-deceit').window,'end');
});
