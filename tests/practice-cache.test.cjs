const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(require.resolve('../dist/practice-ui.js'),'utf8');
function harness(withGeneration=true){
 const handlers={},calls=[],content=withGeneration?{generation:1}:{},context={faction:'Aeldari',catalog:{factions:[{name:'Aeldari',aliases:['Asuryani'],group:'Xenos'}],units:[],detachments:[]},rules:[],savedLists:[],activeListId:''};
 class FormData{constructor(form){this.values=form.values;}get(key){const v=this.values[key];return Array.isArray(v)?v[0]:v??null;}getAll(key){const v=this.values[key];return Array.isArray(v)?v:v===undefined?[]:[v];}has(key){return key in this.values;}}
 const document={querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn)};
 const window={WarPlannerContent:content,refreshWarPlannerContent(){},WarPlannerPractice:{modes:{mixed:'Mixed',rules:'Rules',stats:'Stats',abilities:'Abilities',units:'Units'},categories:{ability:'Ability'},opponentModes:{mixed:'Mixed',effects:'Effects',timing:'Timing',units:'Units',abilities:'Abilities',stats:'Stats',rules:'Rules'},buildOpponentBank(args){calls.push(structuredClone({...args,perspective:'opponent'}));return {faction:args.faction,unmatchedUnits:[],counts:{effects:10,timing:10,rules:10,stats:10,abilities:10,units:10},questions:[]};},buildBank(args){calls.push(structuredClone(args));return {faction:args.faction,unmatchedUnits:[],counts:{rules:10,stats:10,abilities:10,units:10},questions:[]};},createSession(bank){return {faction:bank.faction,types:['rules'],mode:'rules',scope:'faction',index:0,answers:[],questions:[{id:'q',category:'ability',prompt:'Question',clue:'Clue',options:[{id:'a',label:'A'}]}]};}}};
 vm.runInNewContext(code,{window,document,FormData});const api=window.WarPlannerPracticePage;
 const form=values=>({id:'practice-setup',values:{practice_scope:'faction',practice_faction:'Aeldari',practice_modes:['rules'],practice_length:'10',...values}});
 return {context,calls,content,api,render:()=>api.render(context),change(values){const f=form(values);for(const fn of handlers.change)fn({target:{name:'practice_scope',value:values.practice_scope||'faction',closest:()=>f}});},start(values){const f=form(values);for(const fn of handlers.submit)fn({target:f,preventDefault(){}});},reset(){for(const fn of handlers.click)fn({target:{closest:()=>({dataset:{practiceAction:'reset'}})}});}};
}
test('setup reuses the bank for type and length changes but starting a quiz creates fresh material',()=>{
 const h=harness();h.render();h.change({practice_modes:['rules','stats'],practice_length:'20'});h.render();h.render();assert.equal(h.calls.length,1);h.start({practice_modes:['rules','stats']});assert.equal(h.calls.length,2);h.reset();h.render();assert.equal(h.calls.length,2);h.start({});assert.equal(h.calls.length,3);
});
test('content updates and replacement source arrays invalidate cached quiz material',()=>{
 const h=harness();h.render();h.content.generation++;h.render();h.context.rules=[];h.render();h.context.catalog.units=[];h.render();h.context.catalog.detachments=[];h.render();assert.equal(h.calls.length,5);
});
test('saved list changes invalidate the cache, including edits to units, detachments and enhancements',()=>{
 const h=harness();h.context.savedLists=[{id:'one',army:{name:'Study',faction:'Asuryani',detachments:['Warhost'],units:[{name:'Fire Dragons'}]}}];h.change({practice_scope:'list',practice_list:'one'});h.render();h.render();assert.equal(h.calls.length,1);const army=h.context.savedLists[0].army;army.units.push({name:'War Walkers'});h.render();army.detachments.push('Aspect Host');h.render();army.units[0].enhancementId='new';h.render();assert.equal(h.calls.length,4);assert.equal(h.calls.at(-1).army.units[0].enhancementId,'new');assert.equal(h.calls.at(-1).faction,'Aeldari');
});
test('account reset clears the cache, and environments without a catalog generation keep rebuilding',()=>{
 const h=harness();h.render();h.api.reset();h.render();assert.equal(h.calls.length,2);const legacy=harness(false);legacy.render();legacy.render();assert.equal(legacy.calls.length,2);
});

test('opponent setup uses faction and optional detachment and caches each selection separately',()=>{
 const h=harness();h.context.catalog.detachments=[{id:'aspect',name:'Aspect Host',faction:'Aeldari'}];h.render();
 h.change({practice_goal:'opponent'});let html=h.render();assert.match(html,/Know what you’re facing/);assert.match(html,/practice_detachment/);assert.doesNotMatch(html,/name="practice_list"/);assert.equal(h.calls.at(-1).perspective,'opponent');
 h.change({practice_goal:'opponent',practice_detachment:'Aspect Host',practice_modes:['effects','timing']});h.render();assert.equal(h.calls.at(-1).detachment,'Aspect Host');const count=h.calls.length;h.render();assert.equal(h.calls.length,count);
 h.change({practice_goal:'army'});html=h.render();assert.match(html,/Know it by heart/);assert.doesNotMatch(html,/name="practice_detachment"/);assert.equal(h.calls.at(-1).perspective,undefined);
});
