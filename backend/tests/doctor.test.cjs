const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const directory = mkdtempSync(path.join(tmpdir(), 'medisync-test-'));
const port = 3198;
let processRef;
async function start() {
  processRef = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(port), MEDISYNC_DATA_FILE: path.join(directory,'data.json') }, stdio: ['ignore','pipe','pipe'] });
  await new Promise((resolve,reject) => { const timer=setTimeout(()=>reject(new Error('Backend timeout')),10000); processRef.stdout.once('data',()=>{clearTimeout(timer);resolve()}); processRef.once('exit',code=>{clearTimeout(timer);reject(new Error('Backend exit '+code))}); });
}
async function stop() { await new Promise(resolve=>{processRef.once('exit',resolve); processRef.kill();}); }
async function req(url,method='GET',body,role='DOCTOR') {
 const result=await fetch(`http://127.0.0.1:${port}/api${url}`, {method,headers:{'Content-Type':'application/json','X-Demo-Role':role},body:body ? JSON.stringify(body):undefined});
 return {status:result.status,data:await result.json()};
}
test('Ciclo médico: validação, agenda, registro e persistência após reiniciar', async()=>{
 try {
  await start();
  assert.equal((await req('/patients','GET',undefined,'PATIENT')).status,403);
  assert.equal((await req('/patients','POST',{name:'A'})).status,400);
  const patient=await req('/patients','POST',{name:'Paciente de Teste',birthDate:'1990-01-01'}); assert.equal(patient.status,201);
  const startsAt=new Date(Date.now()+40*86400000).toISOString();
  const data={patientId:patient.data.id,startsAt,service:'Retorno',durationMinutes:30};
  const visit=await req('/appointments','POST',data); assert.equal(visit.status,201); const id=visit.data.id;
  assert.equal((await req('/appointments','POST',{...data,startsAt:new Date(Date.parse(startsAt)+15*60000).toISOString()})).status,409);
  assert.equal((await req(`/appointments/${id}`,'PATCH',{status:'COMPLETED'})).status,409);
  assert.equal((await req(`/records/${id}`,'PUT',{summary:'Antes de iniciar'})).status,409);
  assert.equal((await req(`/appointments/${id}`,'PATCH',{...data,startsAt:new Date(Date.parse(startsAt)+86400000).toISOString()})).status,200);
  assert.equal((await req(`/appointments/${id}`,'PATCH',{status:'IN_PROGRESS'})).status,200);
  assert.equal((await req(`/appointments/${id}`,'PATCH',{status:'COMPLETED'})).status,400);
  assert.equal((await req(`/records/${id}`,'PUT',{summary:'Resumo fictício',plan:'Plano fictício'})).status,200);
  assert.equal((await req(`/appointments/${id}`,'PATCH',{status:'COMPLETED'})).status,200);
  assert.equal((await req(`/records/${id}`,'PUT',{summary:'Alteração indevida'})).status,409);
  assert.equal((await req('/telemedicine/rooms','POST',{creatorId:1,appointmentId:id,mode:'VIDEO'})).status,409);
  const other=await req('/appointments','POST',data); assert.equal(other.status,201);
  assert.equal((await req(`/appointments/${other.data.id}`,'PATCH',{status:'CANCELLED'})).status,400);
  assert.equal((await req(`/appointments/${other.data.id}`,'PATCH',{status:'CANCELLED',reason:'Solicitação do paciente'})).status,200);
  const profile=(await req('/doctor/profile')).data;
  assert.equal((await req('/doctor/profile','PATCH',{...profile,headline:'Perfil salvo no teste'})).status,200);
  assert.equal((await req('/settings/1','PATCH',{theme:'dark'})).status,200);
  await stop(); await start();
  assert.equal((await req('/doctor/profile')).data.headline,'Perfil salvo no teste');
  assert.equal((await req('/settings/1')).data.theme,'dark');
  assert.ok((await req('/patients')).data.some(p=>p.id===patient.data.id));
  assert.equal((await req('/records')).data.find(r=>r.appointmentId===id).summary,'Resumo fictício');
  assert.equal((await req('/appointments?role=DOCTOR&userId=1')).data.find(a=>a.id===id).status,'COMPLETED');
 } finally { if(processRef?.exitCode===null) await stop(); rmSync(directory,{recursive:true,force:true}); }
});
