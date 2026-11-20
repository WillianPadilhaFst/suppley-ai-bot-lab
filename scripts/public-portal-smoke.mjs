// Runs against the built frontend with synthetic API fixtures, never production.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
const { chromium } = await import(pathToFileURL(path.join(process.env.SUPPLEY_PLAYWRIGHT_DIR, 'index.mjs')).href);
const app=express();const root=path.resolve('dist/public');
app.use(express.static(root));app.get('*',(_req,res)=>res.sendFile(path.join(root,'index.html')));
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const user={id:1,name:'Cliente de homologação',email:'cliente@example.test',role:'public',loginMethod:'email',createdAt:'2026-11-20T00:00:00Z'};
const operation={id:1,codigo:'OP-TEST-1',titulo:'Cotação de embalagens',status:'ativa',estagioAtual:'demand',prazoDesejado:null,trackingEta:null,criadaEm:null,atualizadaEm:null,milestones:[],history:[]};
const allowed=new Set(['auth.me','conversas.list','portal.list','portal.get','quoteRequests.mine']);
const calls=new Set();let browser;
try {
 browser=await chromium.launch({headless:true});
 await mkdir('artifacts/public-portal',{recursive:true});
 for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport});const page=await context.newPage();
  await page.route('**/api/trpc/**',async route=>{
   const req=route.request();const url=new URL(req.url());const names=decodeURIComponent(url.pathname.split('/api/trpc/')[1]).split(',');
   const input=JSON.parse(url.searchParams.get('input')??'{}');
   const output=names.map((method,index)=>{
    calls.add(method);
    if(method==='portal.get'&&input[index]?.json?.id!==1)return {error:{json:{message:'Operação não encontrada.',code:-32004,data:{code:'NOT_FOUND',httpStatus:404,path:method}}}};
    const data=method==='auth.me'?user:method==='conversas.list'?{operacoes:[],avulsas:[]}:method==='quoteRequests.mine'?[{id:3,produto:'Embalagens',especificacoes:'500 ml',quantidade:'1500',unidade:'UN',destinoCidade:'Navegantes',destinoUf:'SC',prazoDesejado:'A definir',status:'recebida',operacaoId:null}]:method==='portal.list'?[operation]:method==='portal.get'?operation:null;
    return {result:{data:{json:data}}};
   });
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(output)});
  });
  await page.goto(`${base}/`);
  await page.getByRole('heading',{name:'O que você quer importar?'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Proformas',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Fornecedores',exact:true}).count(),0);
  await page.screenshot({path:`artifacts/public-portal/${name}-chat.png`,fullPage:true});
  await page.goto(`${base}/operacoes`);
  await page.getByRole('link',{name:'OP-TEST-1 — Cotação de embalagens'}).waitFor();
  await page.getByText('Solicitação #3 — Embalagens',{exact:true}).waitFor();
  await page.goto(`${base}/operacao/1`);
  await page.getByRole('heading',{name:'OP-TEST-1 — Cotação de embalagens'}).waitFor();
  await page.screenshot({path:`artifacts/public-portal/${name}-operation.png`,fullPage:true});
  await page.goto(`${base}/operacao/2`);
  await page.getByRole('alert').filter({hasText:'Operação não encontrada.'}).waitFor();
  await page.goto(`${base}/minha-conta`);
  await page.getByLabel('Nome',{exact:true}).waitFor();
  assert.equal(await page.getByText(/Consumo de tokens|Chave da API|Modelo de IA/).count(),0);
  await page.screenshot({path:`artifacts/public-portal/${name}-account.png`,fullPage:true});
  for(const route of ['/settings','/suppliers','/proformas','/rfq','/solicitacoes']){
   await page.goto(`${base}${route}`);
   await page.getByText(/Página não encontrada|Page Not Found|404/).first().waitFor();
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Horizontal overflow');
  await context.close();
 }
 assert.deepEqual([...calls].filter(p=>!allowed.has(p)),[],'Public UI requested internal API');
 const adminContext=await browser.newContext({viewport:{width:1440,height:1000}});
 const adminPage=await adminContext.newPage();let reviewed=false;let started=false;
 await adminPage.route('**/api/trpc/**',async route=>{
  const url=new URL(route.request().url());const names=decodeURIComponent(url.pathname.split('/api/trpc/')[1]).split(',');
  const output=names.map(method=>{
   let data;
   if(method==='auth.me')data={...user,id:10,role:'admin',name:'Administrador de homologação'};
   else if(method==='quoteRequests.inbox')data=[{id:3,userId:1,conversaId:4,clienteNome:user.name,clienteEmail:user.email,produto:'Embalagens',especificacoes:'500 ml',quantidade:'1500',unidade:'UN',destinoCidade:'Navegantes',destinoUf:'SC',prazoDesejado:'A definir',status:started?'vinculada':reviewed?'em_analise':'recebida',operacaoId:started?1:null}];
   else if(method==='quoteRequests.review'){reviewed=true;data={success:true};}
   else if(method==='quoteRequests.start'){started=true;data={operacaoId:1};}
   else throw Error(`Unexpected admin API: ${method}`);
   return {result:{data:{json:data}}};
  });
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(output)});
 });
 await adminPage.goto(`${base}/solicitacoes`);
 await adminPage.getByRole('heading',{name:'Solicitações de cotação',exact:true}).waitFor();
 await adminPage.getByRole('button',{name:'Iniciar análise',exact:true}).click();
 await adminPage.getByText(/Status: em analise/).waitFor();
 assert.equal(reviewed,true);
 await adminPage.getByRole('button',{name:'Criar operação para atendimento',exact:true}).click();
 await adminPage.getByText(/Status: vinculada/).waitFor();
 assert.equal(started,true);
 await adminPage.screenshot({path:'artifacts/public-portal/admin-intake.png',fullPage:true});
 await adminContext.close();
 console.log('Public portal smoke passed: desktop/mobile, own operation, foreign operation, personal account, direct internal URLs, administrative intake review.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
