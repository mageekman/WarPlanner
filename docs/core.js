(function(root){
  'use strict';
  const phases=['Command','Movement','Shooting','Charge','Fight'];
  const roster=[['Asurmen',135,'leader','1'],['Dire Avengers',70,'bodyguard','1'],['Jain Zar',105,'leader','2'],['Howling Banshees',85,'bodyguard','2'],['Autarch',85,'leader','3'],['Howling Banshees',85,'bodyguard','3'],['Avatar of Khaine',250],['Eldrad Ulthran',120],['Wave Serpent',115],['Dark Reapers',95],['Dark Reapers',95],['Falcon',130],['Fire Dragons',110],['Fire Dragons',110],['Swooping Hawks',95],['Swooping Hawks',95],['War Walkers',80],['Warp Spiders',105]];
  const sample={name:'Aspect Host',faction:'Aeldari',detachment:'Aspect Host',disposition:'Priority Assets',points:1965,limit:2000,version:'v2.8.1 (149) · Data v995',units:roster.map(([name,points,role,group],i)=>({id:'sample-'+i,name,points,role:role||'',group:group||'',details:name==='Autarch'?['Enhancement: Aspect of Murder']:name==='Eldrad Ulthran'?['Warlord']:[]}))};
  function parseArmy(text){
    const lines=text.replace(/\r/g,'').split('\n');const units=[];const warnings=[];let current=null,group='';let first=-1;
    for(let i=0;i<lines.length;i++){
      const line=lines[i].trim();if(!line)continue;
      if(/^Attached Unit\s+\d+$/i.test(line)){group=line.match(/\d+/)[0];current=null;continue;}
      if(/^[A-Z][A-Z\s]+$/.test(line)&&line.length>3){group='';current=null;continue;}
      const m=line.match(/^(.+?)\s*\(([\d,]+)\s+points?\)$/i);
      if(m){
        if(first<0){first=i;continue;}
        if(/^(Strike Force|Incursion|Onslaught|Combat Patrol)$/i.test(m[1]))continue;
        current={id:'import-'+units.length,name:m[1],points:Number(m[2].replace(/,/g,'')),group,role:'',details:[]};units.push(current);continue;
      }
      if(current){const role=line.match(/Attached as:\s*(Leader|Bodyguard|Support)/i);if(role)current.role=role[1].toLowerCase();current.details.push(line.replace(/^[•\s]+/,''));}
    }
    if(first<0||!units.length)throw new Error('No units found. Paste the full text export, including the army title and unit point values.');
    const heading=lines[first].trim().match(/^(.+?)\s*\(([\d,]+)\s+points?\)$/i);
    const metadata=lines.slice(first+1,lines.findIndex((l,i)=>i>first&&/Attached Units|CHARACTERS|BATTLELINE|OTHER DATASHEETS|DEDICATED TRANSPORTS/.test(l))>first?lines.findIndex((l,i)=>i>first&&/Attached Units|CHARACTERS|BATTLELINE|OTHER DATASHEETS|DEDICATED TRANSPORTS/.test(l)):first+6).map(l=>l.trim()).filter(Boolean);
    const declared=Number(heading[2].replace(/,/g,''));const sum=units.reduce((s,u)=>s+u.points,0);if(sum!==declared)warnings.push('Listed units total '+sum+' points; the export header says '+declared+'. Check the import.');
    warnings.push('Import is not army legality validation. Rules, equipment, and attachments need review.');
    const limit=text.match(/(?:Strike Force|Incursion|Onslaught)\s*\(([\d,]+) points?\)/i);const version=text.match(/Exported with App Version:\s*(.+)/i);
    return {army:{name:heading[1],faction:metadata[0]||'Imported army',detachment:(metadata.find(l=>/Detachment Points/.test(l))||metadata[1]||'Custom roster').replace(/\s*\(.*\)/,''),disposition:metadata.find(l=>l!==metadata[0]&&!/Detachment Points|Strike Force|Incursion|Onslaught/.test(l)&&l!==metadata[1])||'',points:declared,limit:limit?Number(limit[1].replace(/,/g,'')):null,version:version?version[1]:'Version not provided',units,originalExport:text},warnings};
  }
  function next(s){const t={...s};if(t.phase<4)t.phase++;else{t.phase=0;const first=t.firstPlayer||'you';if(t.turn===first)t.turn=first==='you'?'opponent':'you';else{t.turn=first;t.round++;}}return t;}
  const api={phases,sample,parseArmy,next};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlan=api;
})(typeof window!=='undefined'?window:globalThis);
