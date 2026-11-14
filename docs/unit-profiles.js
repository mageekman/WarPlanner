/* Editable workshop profiles; player-facing views do not render these fields. */
(function(root){
 'use strict';
 const fields=[
  {key:'M',label:'Movement (M)',hint:'6″'},
  {key:'T',label:'Toughness (T)',hint:'4'},
  {key:'Sv',label:'Save (Sv)',hint:'3+'},
  {key:'W',label:'Wounds (W)',hint:'2'},
  {key:'Ld',label:'Leadership (Ld)',hint:'6+'},
  {key:'OC',label:'Objective Control (OC)',hint:'1'},
  {key:'invuln_sv',label:'Invulnerable save',hint:'4+'}
 ];
 const rolls=new Set(['Sv','Ld','invuln_sv']);
 function parse(value,key){
  if(value==null||String(value).trim()==='')return null;
  if(typeof value==='number')return value;
  const text=String(value).trim(),number=(key==='M'?text.replace(/[″"]$/,''):rolls.has(key)?text.replace(/\+$/,''):text).trim();
  if(/^\d+$/.test(number))return Number(number);
  if(/^\d*D\d+(?:[+-]\d+)?$/i.test(text))return text.toUpperCase();
  return text;
 }
 function read(data){
  const raw=Object.hasOwn(data||{},'profiles')?data.profiles:data?.importSource?.record?.profiles;
  if(!Array.isArray(raw))return [];
  return raw.filter(p=>p&&typeof p==='object'&&!Array.isArray(p)).map(profile=>{const p=structuredClone(profile);for(const f of fields)if(Object.hasOwn(p,f.key))p[f.key]=parse(p[f.key],f.key);return p;});
 }
 function validate(profiles){
  if(!Array.isArray(profiles)||profiles.length>20)throw Error('Add up to 20 unit stat profiles.');
  for(const p of profiles){
   if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.name!=='string'||!p.name.trim()||p.name.length>180)throw Error('Give each stat profile a name (up to 180 characters).');
   for(const f of fields){
    const value=p[f.key];if(value==null)continue;
    const valid=typeof value==='number'?Number.isInteger(value)&&value>=(rolls.has(f.key)?1:0)&&value<=999:typeof value==='string'&&(value==='-'||value==='*'||/^\d*D\d+(?:[+-]\d+)?$/.test(value));
    if(!valid)throw Error(f.label+' must be a whole number, a dice expression, “-”, “*”, or blank.');
   }
  }
  return profiles;
 }
 const api={fields,parse,read,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarPlannerUnitProfiles=api;
})(typeof window!=='undefined'?window:globalThis);
