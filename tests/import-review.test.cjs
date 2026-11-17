const test=require('node:test'),assert=require('node:assert/strict'),R=require('../dist/import-review.js'),L=require('../dist/lessons.js');
function source(){
 const catalog={factions:[{name:'Aeldari',aliases:['Asuryani']}],detachments:[{name:'Warhost',faction:'Aeldari'}],units:[{name:'Runners',id:'runners',faction:'Aeldari',abilities:[{id:'raw-move'},{id:'missing'}]},{name:'Complete',id:'complete',faction:'Aeldari',abilities:[{id:'raw-move'}]},{name:'Empty',id:'empty',faction:'Aeldari',abilities:[]},{name:'Duplicate',id:'a',faction:'Aeldari'},{name:'Duplicate',id:'b',faction:'Aeldari'}]};
 const library={catalog,aliases:{'raw-move':'move'},abilities:[{id:'move',name:'Move again',summary:'Move after shooting.'}],armyDetachments:a=>a.detachments||[],factionMatches:(a,b)=>a===b||a==='Aeldari'&&b==='Asuryani',unitInfo:(u)=>{const found=catalog.units.filter(v=>v.name===u.name);return found.length===1?found[0]:undefined;}};
 const army={faction:'Asuryani',detachments:['Warhost'],units:[{name:'Runners'},{name:'Complete'},{name:'Empty'},{name:'Duplicate'},{name:'Unknown'}]};return {army,library,mechanics:{summaryState:r=>r.summary?'available':'missing'}};
}
test('review separates unrecognised units, ambiguous sources and incomplete referenced rules without changing the import',()=>{
 const s=source(),before=JSON.stringify(s.army),r=R.assess(s.army,s);assert.ok(r.factionMatched);assert.equal(r.matched,3);assert.equal(r.incomplete,2);assert.equal(r.units[0].available,1);assert.deepEqual(r.units[0].gaps,['An ability on this datasheet']);assert.equal(r.units[3].ambiguous,true);assert.equal(r.units[4].ambiguous,false);assert.equal(JSON.stringify(s.army),before);
});
test('unknown faction and detachment are distinct from a missing detachment',()=>{
 const s=source();s.army.faction='Unknown';s.army.detachments=['Unknown host'];let r=R.assess(s.army,s);assert.equal(r.factionMatched,false);assert.deepEqual(r.unmatchedDetachments,['Unknown host']);s.army.detachments=['Custom roster'];r=R.assess(s.army,s);assert.equal(r.detachmentMissing,true);assert.deepEqual(r.unmatchedDetachments,[]);
});
test('reference-only and review-needed rules do not count as usable summaries',()=>{
 const s=source();for(const extra of [{referenceOnly:true},{sourceReview:'Check source'},{enabled:false}]){Object.assign(s.library.abilities[0],extra);assert.equal(R.assess(s.army,s).units[1].available,0);delete s.library.abilities[0].referenceOnly;delete s.library.abilities[0].sourceReview;delete s.library.abilities[0].enabled;}
});
test('uses the live catalog resolver and canonical source IDs for real imported units',()=>{
 const r=R.assess({faction:'Aeldari',detachment:'Warhost',units:[{name:'Shroud Runners'}]});assert.ok(r.factionMatched);assert.equal(r.matched,1);assert.ok(r.units[0].available>0);assert.equal(L.unitInfo('Shroud Runners','Aeldari').name,'Shroud Runners');
});
test('review escapes untrusted export names and warnings and offers an edit path',()=>{
 const html=R.render({army:{faction:'<img>',detachment:'<script>',units:[{name:'<svg onload=alert(1)>'}]},warnings:['<script>alert(1)</script>']});assert.ok(html.includes('&lt;svg'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.match(html,/data-action="revise-import"/);assert.match(html,/save this list with unresolved items/);
});
