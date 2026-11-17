const test=require('node:test'),assert=require('node:assert/strict'),P=require('../dist/guide-print.js'),C=require('../dist/core.js');
function state(extra={}){return {army:structuredClone(C.sample),firstPlayer:'you',turn:'you',phase:2,round:1,guideMode:'quick',guideRuleTypes:{},...extra};}
test('print guide covers every phase and turn and leaves the current guide unchanged',()=>{
 const s=state(),before=JSON.stringify(s),html=P.build(s);assert.equal((html.match(/class="phase"/g)||[]).length,10);assert.equal((html.match(/data-current="true"/g)||[]).length,1);assert.match(html,/Your turn · Shooting phase/);assert.match(html,/Opponent’s turn · Fight phase/);assert.match(html,/Print \/ Save PDF/);assert.match(html,/Save offline copy/);assert.equal(JSON.stringify(s),before);
});
test('print respects guide filters and provides learning steps for a core-only guide',()=>{
 const filtered=P.build(state({guideRuleTypes:{army:false,ability:false,stratagem:false,enhancement:false,core:false}}));assert.doesNotMatch(filtered,/<article class="rule">/);
 const learn=P.build(state({army:{name:'Core learning',faction:'',units:[]},guideMode:'learn'}));assert.match(learn,/Do this now/);assert.match(learn,/Why this matters/);assert.match(learn,/Battle round 1 snapshot/);
});
test('untrusted labels are escaped and private account and export data is not embedded',()=>{
 const s=state();s.army.name='</script><img src=x onerror=alert(1)>';s.army.originalExport='PRIVATE_EXPORT';s.accountToken='PRIVATE_TOKEN';s.renames={};const html=P.build(s);assert.match(html,/&lt;\/script&gt;&lt;img/);assert.ok(!html.includes('PRIVATE_EXPORT'));assert.ok(!html.includes('PRIVATE_TOKEN'));assert.ok(!html.includes('<img src=x'));
});
