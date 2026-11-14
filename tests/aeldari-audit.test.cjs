const test=require('node:test'),assert=require('node:assert/strict'),M=require('../dist/mechanics.js'),Audit=require('../dist/aeldari-audit.js'),before=require('./fixtures/aeldari-catalog-before-audit.json');
const row=id=>structuredClone(before.find(r=>r.data.id===id).data),view=id=>M.enrich(row(id)),summary=id=>view(id).summary;
test('all 312 built-in Aeldari rules are audited without leaving generic reference prompts',()=>{
 assert.equal(before.length,312);const views=before.map(r=>M.enrich(r.data));assert.equal(views.filter(r=>r.summary.startsWith('Reference reminder')).length,0);
 const counts=before.reduce((c,r)=>{const k=M.summaryState(r.data);c[k]=(c[k]||0)+1;return c;},{});assert.deepEqual(counts,{available:255,missing:25,'needs-summary':32});assert.equal(views.filter((r,i)=>r.summary!==before[i].data.summary).length,255);
});
test('readable rewrites include phase, duration, selection and the correct beneficiary',()=>{
 assert.match(summary('expanded-protect-aeldari'),/led by a FARSEER/);assert.doesNotMatch(summary('expanded-protect-aeldari'),/this model is leading/i);
 const misfortune=summary('expanded-misfortune-aeldari');for(const term of ['Once per turn','end of your Movement phase','visible enemy within 18″','enemy’s Wound rolls','until your next Command phase'])assert.ok(misfortune.includes(term),term);
 const dance=summary('expanded-dance-of-death-aeldari');assert.match(dance,/start of the Fight phase/);assert.match(dance,/choose one/);assert.match(dance,/for that phase/);
});
test('critical hits, individual rerolls and resurrection retain previously reviewed Aeldari wording',()=>{
 assert.match(summary('expanded-mandiblasters-aeldari'),/critical hits, not critical wounds/i);assert.match(summary('expanded-crystal-matrix-aeldari'),/one hit roll and one wound roll/i);
 const old=row('expanded-word-of-the-phoenix-aeldari');assert.equal(M.enrich(old).summary,require('../scripts/aeldari-study-overrides.json')['word-of-the-phoenix-aeldari'].summary);assert.match(M.enrich(old).summary,/Bodyguard/);assert.equal(M.enrich(old).provisional,old.provisional);
});
test('source conflicts are explained, and incomplete rules are not presented as verified effects',()=>{
 assert.match(summary('expanded-aspect-training-aeldari'),/cannot both be met/);assert.match(summary('expanded-crewed-platform-storm-guardians-aeldari'),/remaining-crew/);assert.match(summary('expanded-suppressing-storm-kygharils-protectors-aeldari'),/shooting unit/);
 assert.equal(view('doom-inescapable-stratagem').mechanicsPresentation,'missing');assert.equal(view('preternatural-precision-stratagem').referenceOnly,true);assert.equal(view('doom-inescapable-stratagem').status,'source-reference');
 const warrior=summary('warrior-focus-stratagem');for(const term of ['one friendly ASPECT WARRIORS or AVATAR OF KHAINE','Before','Weapon Skill','Ballistic Skill','Strength','AP','Damage','Hit rolls','this phase'])assert.ok(warrior.includes(term),term);
});
test('Stratagem rewrites include important restrictions from the core index, not just effect data',()=>{
 const overflight=summary('expanded-overflight-windrider-host-aeldari');assert.match(overflight,/destroyed an enemy unit during that phase/);
 const isha=summary('expanded-ishas-fury-seer-council-aeldari');assert.match(isha,/ASURYANI PSYKER model within 9″/);assert.match(isha,/six D6/);
 const death=summary('expanded-death-answers-death-devoted-of-ynnead-aeldari');assert.match(death,/lost a model that phase/);assert.match(death,/WRAITH CONSTRUCT units are excluded/);
});
test('any saved text, guide setting, restriction or unknown added field overrides the legacy presentation rewrite',()=>{
 const ids=['expanded-piratical-hero-aeldari','expanded-whispering-web-aeldari','expanded-protect-aeldari','expanded-misfortune-aeldari'];
 for(const id of ids)for(const change of [{summary:'My checked tournament note.'},{guide:{order:'early',rank:1,phases:[2],turn:'you'}},{phase:[4]},{sourceDigest:'updated-source'},{new_restriction:'Keep this edit'}]){
  const data={...row(id),...change},original=structuredClone(data);assert.equal(Audit.enrich(data),data,id);assert.deepEqual(M.enrich(data),original,id);
 }
});
test('generated source details remain inspectable without changing stored data or reclassifying provisional records as verified',()=>{
 const data=row('expanded-misfortune-aeldari'),original=structuredClone(data),result=M.enrich(data);assert.deepEqual(data,original);assert.ok(result.mechanicsDetails.length);assert.equal(result.importSource.record.ability_id,'misfortune-aeldari');assert.equal(result.status,data.status);assert.equal(result.provisional,data.provisional);
 const reviewed=row('expanded-guide-aeldari');assert.deepEqual(M.enrich(reviewed),reviewed);
});
