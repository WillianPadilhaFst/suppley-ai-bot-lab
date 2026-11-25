import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import {createServer, request} from 'node:http';
import type {AddressInfo} from 'node:net';
import {createExpressMiddleware} from '@trpc/server/adapters/express';
vi.mock('./abuse',()=>({audit:async()=>{},consumeLimit:async()=>{}}));
import {router,protectedProcedure} from '../_core/trpc';
describe('Public API error redaction',()=>{
 it('does not expose provider billing errors, SQL or stack traces',async()=>{
  const api=router({portal:router({get:protectedProcedure.query(()=>{throw Error('provider billing key=SECRET; SELECT internal_cost FROM secrets');})})});
  const app=express();app.use('/api/trpc',createExpressMiddleware({router:api,createContext:()=>({user:{id:1,role:'public',approvalStatus:'approved'},req:{ip:'test'},res:{}} as any)}));
  const server=createServer(app);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
   const result=await new Promise<string>((resolve,reject)=>{request({hostname:'127.0.0.1',port:(server.address() as AddressInfo).port,path:'/api/trpc/portal.get'},res=>{let body='';res.on('data',c=>{body+=c;});res.on('end',()=>resolve(body));}).on('error',reject).end();});
   expect(result).toContain('Serviço temporariamente indisponível');expect(result).not.toMatch(/SECRET|internal_cost|billing/);expect(JSON.parse(result).error.json.data.stack).toBeNull();
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
});
