/* Generate idempotent seed SQL; run through the authorized database connection. */
const fs=require('node:fs');const path=require('node:path');
const content=require('../dist/content.js');const rows=content.seed();rows.forEach(content.validate);
const output=process.argv[2]||'/tmp/warplanner-catalog-seed';fs.mkdirSync(output,{recursive:true});
for(let i=0;i<rows.length;i+=30){
 const batch=rows.slice(i,i+30).map(({revision,...row})=>row);
 const json=JSON.stringify(batch).replace(/'/g,"''");
 const query=`insert into public.rules_catalog(key,kind,faction,name,data,enabled) select key,kind,faction,name,data,enabled from jsonb_to_recordset('${json}'::jsonb) as x(key text,kind text,faction text,name text,data jsonb,enabled boolean) on conflict(key) do nothing;`;
 fs.writeFileSync(path.join(output,String(i/30).padStart(2,'0')+'.sql'),query);
}
console.log(JSON.stringify({rows:rows.length,batches:Math.ceil(rows.length/30),output}));
