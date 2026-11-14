const test=require('node:test'),assert=require('node:assert/strict'),M=require('../dist/mechanics.js'),C=require('../dist/content.js'),L=require('../dist/lessons.js');
const placeholder=name=>'Imported structured mechanics for '+name+'. Review the imported source details before writing a study summary.';
const imported=record=>({id:'test-source',name:record.name||'Imported rule',category:'ability',faction:'Grey Knights',units:[],phase:[2],turn:'you',window:'act',summary:placeholder(record.name||'Imported rule'),conditions:[],sourceIds:['admin'],status:'source-reference',referenceOnly:true,expanded:true,importSource:{name:'40kdc-data',text:'',record}});
test('conditional rerolls retain attack type, target keywords and individual roll types',()=>{
 const record={effect:{type:'conditional',condition:{operator:'and',operands:[{type:'attack-is',parameters:{attack_type:'melee'}},{type:'matches',parameters:{subject:'defender',filter:{any_of:['MONSTER','VEHICLE']}}}]},effect:{type:'sequence',steps:['hit','wound','damage'].map(roll=>({type:'re-roll',target:'this-model',modifier:{roll,result_scope:'any-result'}}))}},optional:true,scope:{duration:'permanent'}};
 const text=M.describe(record).text;for(const term of ['Melee','MONSTER','VEHICLE','This model','Hit rolls','Wound rolls','Damage rolls','Any result','Optional: Yes'])assert.ok(text.includes(term));assert.doesNotMatch(text,/This unit: Re-roll/);
});
test('cost reductions include the triggering use, army-wide usage limit and unit context',()=>{
 const text=M.describe({effect:{type:'cost-modifier',target:'this-unit',modifier:{of:'stratagem',operation:'decrease',amount:1,applies_to:'the-triggering-use'}},trigger:{event:'used',filter:{kind:'stratagem'},object:'this-unit'},usage:{frequency:'once-per-battle-round',per:'army'}}).text;for(const term of ['1 CP','Stratagem','This unit','triggering use','Once per battle round','Per: Army'])assert.ok(text.includes(term));
 const nonCP=M.describe({effect:{type:'cost-modifier',modifier:{of:'tokens',operation:'decrease',amount:1}}}).text;assert.doesNotMatch(nonCP,/CP/);assert.match(nonCP,/Tokens/);
});
test('weapon grants, characteristics and Feel No Pain produce readable actual mechanics',()=>{
 const grant=M.describe({effect:{type:'weapon-ability-grant',target:'this-unit',modifier:{weapons:{type:'melee'},keywords:[{keyword_id:'precision'}]}}}).text;assert.match(grant,/Melee weapons gain Precision/);
 const stat=M.describe({effect:{type:'stat-modifier',target:'attacker',modifier:{stat:'D',operation:'subtract',value:1}}}).text;assert.match(stat,/Subtract 1 from Damage/);
 const fnp=M.describe({effect:{type:'feel-no-pain',target:'this-unit',modifier:{threshold:4,against:'mortal'}}}).text;assert.match(fnp,/4\+ against mortal wounds/);
});
test('complex and unknown mechanics keep ranges, roll thresholds, selectors and unfamiliar fields',()=>{
 const text=M.describe({effect:{type:'future-effect',selector:{filter:{owner:'enemy',within:{range:{inches:12},of:'this-model'}},count:{max:2}},modifier:{roll:{dice:'D6',threshold:4},future_limit:7},on_failure:{type:'mortal-wounds',target:'this-unit',modifier:{count:'D3'}}}}).text;for(const term of ['Future effect','12','This model','Max: 2','D6','Threshold: 4','Future limit: 7','On failure','D3 mortal wounds'])assert.ok(text.includes(term),term);
});
test('a top-level empty source effect is distinguished from a no-effect die-table outcome',()=>{
 const missing=M.describe({effect:{type:'no-effect'},stub:true});assert.equal(missing.missing,true);assert.match(missing.text,/no effect mechanics/);assert.doesNotMatch(missing.text,/ability does nothing/);
 const branch=M.describe({effect:{type:'dice-table',dice:'D6',outcomes:[{results:[1],effect:{type:'no-effect'}},{results:[6],effect:{type:'heal',target:'this-model',modifier:{amount:3}}}]}});assert.equal(branch.missing,false);assert.match(branch.text,/No effect/);assert.match(branch.text,/Restore 3 lost wounds/);
});
test('existing uploaded placeholders become useful without changing their saved records or verification status',()=>{
 const data=imported({name:'A Threat Ended',effect:{type:'weapon-ability-grant',target:'this-unit',modifier:{weapons:{type:'melee'},keywords:[{keyword_id:'precision'}]}}}),before=JSON.stringify(data),view=M.enrich(data);assert.match(view.summary,/Precision/);assert.equal(view.referenceOnly,true);assert.equal(view.status,'source-reference');assert.equal(JSON.stringify(data),before);
 C.apply([{key:'rule:'+data.id,kind:'rule',faction:'Grey Knights',name:data.name,data,enabled:true,revision:1}]);assert.match(L.abilities.find(a=>a.id===data.id).summary,/Precision/);assert.equal(JSON.stringify(data),before);C.reset();
});
test('manual summaries stay intact and imported prose is preferred over structured fallback',()=>{
 const raw=imported({effect:{type:'no-effect'}});raw.summary='My manually reviewed rule summary.';assert.equal(M.enrich(raw).summary,raw.summary);raw.summary=placeholder('Imported rule');raw.importSource.text='A complete imported source paragraph.';assert.equal(M.enrich(raw).summary,raw.importSource.text);assert.equal(M.enrich(raw).mechanicsPresentation,'source-text');
});
test('missing source data stays explicit and excessive nesting fails visibly rather than guessing',()=>{
 assert.equal(M.describe({}).missing,true);let nested={type:'future-effect',value:3};for(let i=0;i<30;i++)nested={type:'future-effect',effect:nested};assert.match(M.describe({effect:nested}).text,/Further nested details/);
});
