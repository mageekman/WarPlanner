(function(root){
  'use strict';
  const phases=['Command','Movement','Shooting','Charge','Fight'];
  const roster=[['Asurmen',135,'leader','1'],['Dire Avengers',70,'bodyguard','1'],['Jain Zar',105,'leader','2'],['Howling Banshees',85,'bodyguard','2'],['Autarch',85,'leader','3'],['Howling Banshees',85,'bodyguard','3'],['Avatar of Khaine',250],['Eldrad Ulthran',120],['Wave Serpent',115],['Dark Reapers',95],['Dark Reapers',95],['Falcon',130],['Fire Dragons',110],['Fire Dragons',110],['Swooping Hawks',95],['Swooping Hawks',95],['War Walkers',80],['Warp Spiders',105]];
  const sample={name:'Aspect Host',faction:'Aeldari',detachment:'Aspect Host',disposition:'Priority Assets',points:1965,limit:2000,version:'v2.8.1 (149) · Data v995',units:roster.map(([name,points,role,group],i)=>({id:'sample-'+i,name,points,role:role||'',group:group||'',details:name==='Autarch'?['Enhancement: Aspect of Murder']:name==='Eldrad Ulthran'?['Warlord']:[]}))};
  const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function resolveDetachmentNames(names,available=[],{knownOnly=false}={}){
    const canonical=name=>available.find(d=>normalize(d.name||d)===normalize(name)),display=d=>d.name||d;
    const resolved=[];
    for(const raw of names){
      const name=String(raw).replace(/^Detachments?\s*:\s*/i,'').replace(/\s*\([^)]*\bDetachment Points?\b[^)]*\)/gi,'').trim();if(!name||/^Detachments?$/i.test(name))continue;
      const exact=canonical(name);if(exact){resolved.push(display(exact));continue;}
      let parts=name.split(/\s*(?:[,;+\/|]|\s&\s)\s*/).filter(Boolean);
      if(parts.length===1){const and=name.split(/\s+and\s+/i);if(and.length>1&&and.every(canonical))parts=and;}
      if(knownOnly&&!parts.every(canonical))parts=[name];
      resolved.push(...parts.map(part=>canonical(part)?display(canonical(part)):part.trim()));
    }
    return [...new Map(resolved.filter(Boolean).map(name=>[normalize(name),name])).values()];
  }
  function parseArmy(text,options={}){
    const lines=text.replace(/\r/g,'').split('\n');const units=[];const warnings=[];let current=null,group='';let first=-1,firstUnit=-1;
    for(let i=0;i<lines.length;i++){
      const line=lines[i].trim();if(!line)continue;
      if(/^Attached Unit\s+\d+$/i.test(line)){group=line.match(/\d+/)[0];current=null;continue;}
      if(/^[A-Z][A-Z\s]+$/.test(line)&&line.length>3){group='';current=null;continue;}
      const m=line.match(/^(.+?)\s*\(([\d,]+)\s+points?\)$/i);
      if(m){
        if(first<0){first=i;continue;}
        if(/^(Strike Force|Incursion|Onslaught|Combat Patrol)$/i.test(m[1]))continue;
        if(firstUnit<0)firstUnit=i;
        current={id:'import-'+units.length,name:m[1],points:Number(m[2].replace(/,/g,'')),group,role:'',details:[]};units.push(current);continue;
      }
      if(current){const role=line.match(/Attached as:\s*(Leader|Bodyguard|Support)/i);if(role)current.role=role[1].toLowerCase();current.details.push(line.replace(/^[•\s]+/,''));}
    }
    if(first<0||!units.length)throw new Error('No units found. Paste the full text export, including the army title and unit point values.');
    const heading=lines[first].trim().match(/^(.+?)\s*\(([\d,]+)\s+points?\)$/i);
    const metadata=lines.slice(first+1,firstUnit).map(l=>l.trim()).filter(l=>l&&!/^(?:Attached Unit(?:s|\s+\d+)?|CHARACTERS|BATTLELINE|OTHER DATASHEETS|DEDICATED TRANSPORTS)$/i.test(l));
    const declared=Number(heading[2].replace(/,/g,''));const sum=units.reduce((s,u)=>s+u.points,0);if(sum!==declared)warnings.push('Listed units total '+sum+' points; the export header says '+declared+'. Check the import.');
    warnings.push('Import is not army legality validation. Rules, equipment, and attachments need review.');
    const faction=metadata[0]||'Imported army',same=options.factionMatches||((a,b)=>normalize(a)===normalize(b));
    const available=(options.detachments||[]).filter(d=>!d.faction||same(d.faction,faction));
    const marked=metadata.filter(l=>/Detachment Points?\b/i.test(l)||/^Detachments?\s*:/i.test(l));
    const known=metadata.slice(1).filter(l=>{const names=resolveDetachmentNames([l],available);return names.length&&names.every(n=>available.some(d=>normalize(d.name||d)===normalize(n)));});
    const detachmentLines=[...new Set([...marked,...known])];
    if(!detachmentLines.length)detachmentLines.push(metadata[1]||'Custom roster');
    const detachmentNames=resolveDetachmentNames(detachmentLines,available);if(!detachmentNames.length)detachmentNames.push('Custom roster');
    for(const name of detachmentNames)if(available.length&&!available.some(d=>normalize(d.name||d)===normalize(name)))warnings.push('Detachment “'+name+'” was not found in this faction’s catalog. Review its name in the list editor.');
    const limit=text.match(/(?:Strike Force|Incursion|Onslaught)\s*\(([\d,]+) points?\)/i);const version=text.match(/Exported with App Version:\s*(.+)/i);
    return {army:{name:heading[1],faction,detachment:detachmentNames[0],detachments:detachmentNames,disposition:(metadata.find(l=>l!==metadata[0]&&!detachmentLines.includes(l)&&!/^Detachments?$/i.test(l)&&!/Detachment Points?|Strike Force|Incursion|Onslaught|Combat Patrol/i.test(l))||'').replace(/^(?:Force )?Disposition\s*:\s*/i,''),points:declared,limit:limit?Number(limit[1].replace(/,/g,'')):null,version:version?version[1]:'Version not provided',units,originalExport:text},warnings};
  }
  function next(s){const t={...s};if(t.phase<4)t.phase++;else{t.phase=0;const first=t.firstPlayer||'you';if(t.turn===first)t.turn=first==='you'?'opponent':'you';else{t.turn=first;t.round++;}}return t;}
  const api={phases,sample,resolveDetachmentNames,parseArmy,next};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlan=api;
})(typeof window!=='undefined'?window:globalThis);
