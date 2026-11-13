const test=require('node:test');
const assert=require('node:assert/strict');
const {sample,parseArmy,next}=require('../dist/core.js');
const fixture=`aspect host (1965 points)

Aeldari
Aspect Host (3 Detachment Points)
Priority Assets
Strike Force (2000 points)

Attached Units
Attached Unit 1
Asurmen (135 points)
• Attached as: Leader (Character)
  • 1x Bloody Twins
    1x Sword of Asur
Dire Avengers (70 points)
• Attached as: Bodyguard
  • 1x Aspect Shrine Token
Attached Unit 2
Jain Zar (105 points)
• Attached as: Leader (Character)
Howling Banshees (85 points)
• Attached as: Bodyguard
Attached Unit 3
Autarch (85 points)
• Attached as: Leader (Character)
  • Enhancement: Aspect of Murder
Howling Banshees (85 points)
• Attached as: Bodyguard
CHARACTERS
Avatar of Khaine (250 points)
  • 1x The Wailing Doom
Eldrad Ulthran (120 points)
  • Warlord
DEDICATED TRANSPORTS
Wave Serpent (115 points)
  • 1x Twin bright lance
OTHER DATASHEETS
Dark Reapers (95 points)
Dark Reapers (95 points)
Falcon (130 points)
Fire Dragons (110 points)
Fire Dragons (110 points)
Swooping Hawks (95 points)
Swooping Hawks (95 points)
War Walkers (80 points)
Warp Spiders (105 points)
Exported with App Version: v2.8.1 (149), Data Version: v995`;
test('official export shape preserves identities, attachments and equipment',()=>{
 const {army,warnings}=parseArmy(fixture);
 assert.equal(army.units.length,18);assert.equal(army.points,1965);assert.equal(army.limit,2000);
 assert.equal(army.units.reduce((n,u)=>n+u.points,0),1965);
 assert.equal(army.faction,'Aeldari');assert.equal(army.detachment,'Aspect Host');
 assert.equal(army.units.filter(u=>u.group).length,6);
 assert.equal(new Set(army.units.map(u=>u.id)).size,18);
 assert.equal(army.units.filter(u=>u.name==='Fire Dragons').length,2);
 assert.equal(army.units[0].role,'leader');assert.equal(army.units[1].role,'bodyguard');
 assert.equal(army.units[6].group,'');
 assert.ok(army.units[4].details.includes('Enhancement: Aspect of Murder'));
 assert.ok(army.units[8].details.includes('1x Twin bright lance'));
 assert.equal(army.originalExport,fixture);assert.equal(warnings.length,1);
});
test('mismatched totals are visible and malformed exports rejected',()=>{
 assert.equal(parseArmy(fixture.replace('1965 points','2000 points')).warnings.length,2);
 assert.throws(()=>parseArmy('not an export'),/No units/);
 assert.throws(()=>parseArmy('Army (2000 points)'),/No units/);
});
test('CRLF exports and comma-separated totals are accepted',()=>{
 assert.equal(parseArmy(fixture.replace('1965 points','1,965 points').replace(/\n/g,'\r\n')).army.points,1965);
});
test('untrusted names remain data for the rendering escape boundary',()=>{
 assert.equal(parseArmy(fixture.replace('Asurmen (','<img src=x onerror=alert(1)> (')).army.units[0].name,'<img src=x onerror=alert(1)>');
});
test('turn transitions preserve player round and alternate after Fight',()=>{
 let s={round:1,turn:'you',phase:0};for(let i=0;i<5;i++)s=next(s);
 assert.deepEqual(s,{round:1,turn:'opponent',phase:0});
 for(let i=0;i<5;i++)s=next(s);
 assert.deepEqual(s,{round:2,turn:'you',phase:0});
});
test('sample totals match supplied roster',()=>{
 assert.equal(sample.units.length,18);assert.equal(sample.units.reduce((n,u)=>n+u.points,0),1965);
});

test('imports preserve the disposition separately from detachment and original text',()=>{
 const text='Practice (100 points)\nAeldari\nAspect Host (3 Detachment Points)\nPriority Assets\nStrike Force (2000 points)\nCHARACTERS\nAutarch (100 points)';
 const {army}=require('../dist/core.js').parseArmy(text);
 assert.equal(army.disposition,'Priority Assets');assert.equal(army.detachment,'Aspect Host');assert.equal(army.originalExport,text);
});
test('multiple imported detachment lines are retained without rewriting the export',()=>{
 const text='Multi (100 points)\nAeldari\nWindrider Host (2 Detachment Points)\nFateful Performance (1 Detachment Points)\nDisruption\nStrike Force (2000 points)\nCHARACTERS\nFarseer (100 points)';
 const {army}=require('../dist/core.js').parseArmy(text);assert.deepEqual(army.detachments,['Windrider Host','Fateful Performance']);assert.equal(army.detachment,'Windrider Host');assert.equal(army.disposition,'Disruption');assert.equal(army.originalExport,text);
});
