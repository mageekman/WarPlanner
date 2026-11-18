const test=require('node:test'),assert=require('node:assert/strict'),{refresh,validateSource}=require('../scripts/refresh-aeldari.cjs');
const before=require('./fixtures/aeldari-refresh-before.json'),M=require('../dist/mechanics.js'),C=require('../dist/content.js'),L=require('../dist/lessons.js'),Q=require('../dist/practice.js');
const result=refresh(before),after=result.after,row=id=>after.find(r=>r.key==='rule:'+id).data;
test.afterEach(()=>C.reset());
test('the current Aeldari catalog has no generic descriptions and stores the recovered audit explicitly',()=>{
 assert.equal(after.filter(r=>r.kind==='rule').length,312);assert.equal(result.changes.length,301);assert.deepEqual(result.counts,{available:258,missing:22,'needs-summary':32});
 for(const r of after.filter(r=>r.kind==='rule'))assert.ok(!M.isPlaceholder(M.enrich(r.data).summary),r.key);
 for(const r of result.changes){C.validate(r);assert.ok(r.data.summaryAudit);assert.ok(r.data.mechanicsPresentation);assert.equal(M.enrich(r.data).summary,r.data.summary);assert.equal(r.data.answer,r.data.summary);}
});
test('all 11 saved workshop edits are preserved byte-for-byte, including checked fixes for empty source records',()=>{
 assert.equal(result.preserved.length,11);for(const key of result.preserved)assert.deepEqual(after.find(r=>r.key===key),before.find(r=>r.key===key));
 assert.equal(row('expanded-adrenal-infusions-eldritch-raiders-aeldari').summary,'When you use a Battle Focus token on this unit, roll a D6, on a 3+ you gain a Battle Focus token.');assert.match(row('expanded-impeding-fire-eldritch-raiders-aeldari').summary,/36/);assert.match(row('expanded-veterans-of-the-void-eldritch-raiders-aeldari').summary,/Only 1 enhancement per unit/);
});
test('restored descriptions retain critical hit, single-roll, bearer and duration distinctions',()=>{
 assert.match(row('expanded-mandiblasters-aeldari').summary,/critical hits, not critical wounds/);assert.match(row('expanded-crystal-matrix-aeldari').summary,/one hit roll and one wound roll/);
 assert.match(row('expanded-tears-of-isha-aeldari').summary,/one model regains/);assert.match(row('expanded-word-of-the-phoenix-aeldari').summary,/Bodyguard/);
 for(const part of ['Once per turn','end of your Movement phase','visible enemy within 18″','until your next Command phase'])assert.ok(row('expanded-misfortune-aeldari').summary.includes(part),part);
 assert.match(row('expanded-protect-aeldari').summary,/led by a FARSEER/);
});
test('targets replace generic previews while imported bearer and turn restrictions remain inspectable',()=>{
 const targets=result.changes.filter(r=>['army','stratagem'].includes(r.data.category));for(const r of targets)assert.ok(r.data.targetText&&!/^Check/.test(r.data.targetText),r.key);
 assert.match(row('expanded-skyborne-sanctuary-warhost-aeldari').targetText,/eligible to fight/);assert.match(row('expanded-skyborne-sanctuary-warhost-aeldari').targetText,/wholly within 6″/);assert.match(row('flitting').targetText,/Battle Focus/);
 for(const r of result.changes){const s=r.data.importSource?.record;if(s?.keyword_restrictions?.length)for(const k of s.keyword_restrictions)assert.ok(r.data.conditions.some(c=>c.includes(k)));if(s?.player_turn)assert.ok(r.data.conditions.some(c=>c.includes(s.player_turn.replace(/-/g,' '))));}
});
test('mechanical source checks reject changed effects despite unchanged digests or extra unrecognized constraints',()=>{
 const source=before.find(r=>r.key==='rule:expanded-crystal-matrix-aeldari').data.importSource.record;validateSource(source);
 for(const patch of [{effect:{type:'changed'}},{scope:{duration:'turn'}},{new_mechanical_constraint:true},{keyword_restrictions:['Different bearer']}])assert.throws(()=>validateSource({...structuredClone(source),...patch}),/changed/i);
 const tears=before.find(r=>r.key==='rule:expanded-tears-of-isha-aeldari').data.importSource.record;validateSource(tears);const allModels=structuredClone(tears);allModels.effect.effect.effect.steps[1].effect.modifier.per='model';assert.throws(()=>validateSource(allModels),/mechanics changed/i);
});
test('source problems and absent effects remain excluded from practice; live stats and reviewed fixes are usable',()=>{
 assert.equal(M.summaryState(row('expanded-suppressing-storm-kygharils-protectors-aeldari')),'needs-summary');assert.match(row('expanded-suppressing-storm-kygharils-protectors-aeldari').summary,/shooting unit/);assert.equal(M.summaryState(row('doom-inescapable-stratagem')),'missing');
 C.apply(after);const bank=Q.buildBank({faction:'Aeldari',rules:L.abilities,units:L.catalog.units,detachments:L.catalog.detachments}),blocked=new Set(after.filter(r=>r.kind==='rule'&&M.summaryState(r.data)!=='available').map(r=>r.data.id));assert.ok(bank.studyRules.length>200);assert.equal(bank.counts.stats,530);for(const q of bank.questions){assert.ok(q.options.every(o=>o.faction==='Aeldari'));assert.ok(!blocked.has(q.review.rule?.id));}
});
test('unit profiles, timings, guide hints, detachments and uploaded source records are never overwritten',()=>{
 const original=JSON.stringify(before);refresh(before);assert.equal(JSON.stringify(before),original);
 for(const r of after){const b=before.find(b=>b.key===r.key);if(r.kind!=='rule'||result.preserved.includes(r.key))assert.deepEqual(r,b);else for(const field of ['importSource','phase','turn','window','guide','units','detachment','enhancement'])assert.deepEqual(r.data[field],b.data[field],r.key+' / '+field);}
});
test('an edit or a new source payload after the preview rejects the refresh rather than replacing it',()=>{
 for(const patch of [{summary:'My new summary'},{phase:[3]},{guide:{order:'early'}},{importSource:{record:{effect:{type:'changed'}}}}]){const records=structuredClone(before),r=records.find(r=>r.key==='rule:expanded-protect-aeldari');Object.assign(r.data,patch);assert.throws(()=>refresh(records),/Entry changed/);}
});
