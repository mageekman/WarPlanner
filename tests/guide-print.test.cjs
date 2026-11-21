const test=require('node:test'),assert=require('node:assert/strict'),P=require('../dist/guide-print.js'),C=require('../dist/core.js');
function state(extra={}){return {army:structuredClone(C.sample),firstPlayer:'you',turn:'you',phase:2,round:1,guideMode:'quick',guideRuleTypes:{},...extra};}
test('print guide covers every phase and turn and leaves the current guide unchanged',()=>{
 const s=state(),before=JSON.stringify(s),html=P.build(s);assert.equal((html.match(/class="phase"/g)||[]).length,10);assert.equal((html.match(/data-current="true"/g)||[]).length,1);assert.match(html,/Your turn · Shooting phase/);assert.match(html,/Opponent’s turn · Fight phase/);assert.match(html,/Print \/ Save PDF/);assert.match(html,/Save offline copy/);assert.equal(JSON.stringify(s),before);
});
test('print respects guide filters and keeps phase headings for a core-only guide',()=>{
 const filtered=P.build(state({guideRuleTypes:{army:false,ability:false,stratagem:false,enhancement:false,core:false}}));assert.doesNotMatch(filtered,/<article class="rule rule-card">/);
 const learn=P.build(state({army:{name:'Core learning',faction:'',units:[]},guideMode:'learn'}));assert.match(learn,/Command phase/);assert.doesNotMatch(learn,/class="step"/);assert.doesNotMatch(learn,/Do this now|Why this matters|For example/);assert.match(learn,/Battle round 1/);
});
test('untrusted labels are escaped and private account and export data is not embedded',()=>{
 const s=state();s.army.name='</script><img src=x onerror=alert(1)>';s.army.originalExport='PRIVATE_EXPORT';s.accountToken='PRIVATE_TOKEN';s.renames={};const html=P.build(s);assert.match(html,/&lt;\/script&gt;&lt;img/);assert.ok(!html.includes('PRIVATE_EXPORT'));assert.ok(!html.includes('PRIVATE_TOKEN'));assert.ok(!html.includes('<img src=x'));
});

test('print output contains only unit and rule names, without categories, targets or mechanics',()=>{
 const html=P.build(state());assert.match(html,/class="unit rule-card"/);assert.match(html,/class="rule-names"/);assert.doesNotMatch(html,/class="rule-type"|Applies to|Available targets|Core sequence/);assert.doesNotMatch(html,/class="source"|Source:|Shared rules above:|<ol>|<dl>/);
 const L=require('../dist/lessons.js'),a=L.abilities.find(r=>r.id==='walker'),saved={summary:a.summary,conditions:a.conditions};
 try{a.summary='PRIVATE_RULE_MECHANICS_SENTINEL';a.conditions=['PRIVATE_CONDITION_SENTINEL'];const printed=P.build(state());assert.ok(!printed.includes('PRIVATE_RULE_MECHANICS_SENTINEL'));assert.ok(!printed.includes('PRIVATE_CONDITION_SENTINEL'));}finally{Object.assign(a,saved);}
});


test('empty timing sections are omitted from the PDF by default and can be included explicitly',()=>{
 const empty=state({army:{name:'Empty roster',faction:'Aeldari',units:[]}}),hidden=P.build(empty),shown=P.build({...empty,guideShowEmptyTimings:true});
 assert.doesNotMatch(hidden,/<section class="step">/);assert.match(shown,/<section class="step">/);assert.equal((hidden.match(/class="phase"/g)||[]).length,10);
});


test('shared rule cards contain only the rule name and never an available-unit list',()=>{
 const html=P.build(state()),cards=[...html.matchAll(/<article class="rule rule-card">([\s\S]*?)<\/article>/g)].map(m=>m[1]);
 assert.ok(cards.length>0);for(const card of cards)assert.match(card,/^<h4>[^<]+<\/h4>$/);
 assert.doesNotMatch(html,/class="meta"|class="rule-type"|Targets:|Target:|Conditions|Cost:/);
});
test('unit cards preserve custom labels and list the unit’s ability names',()=>{
 const s=state(),unit=s.army.units.find(u=>u.name==='Warp Spiders');s.renames={[unit.id]:'My <Spiders>'};const html=P.build(s);
 assert.match(html,/My &lt;Spiders&gt;/);assert.match(html,/<li>Flickerjump<\/li>/);assert.doesNotMatch(html,/<Spiders>/);
});
