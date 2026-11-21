import { rateLimit } from "express-rate-limit";
import { Router, type Request, type Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { storageGet } from '../storage';
import { ENV } from '../_core/env';
import { sessionSecret, resolveSession } from '../security/session';
import { getUserById } from '../services/authService';
import { requireApproved } from '../security/policy';
import { audit } from '../security/abuse';
const router=Router();
const arquivoRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em instantes." },
});
interface TokenArquivo { k:string; n?:string; u?:number }
export async function assinarTokenArquivo(dados:TokenArquivo) {
  if (!dados.u) throw new Error('Dono obrigatório');
  const owner=await getUserById(dados.u); requireApproved(owner);
  if(owner!.role==='public') throw new Error('Documento não autorizado');
  return new SignJWT({k:dados.k,n:dados.n,u:dados.u,sv:owner!.sessionVersion,purpose:'download'})
    .setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(sessionSecret());
}
export async function linkEstavelDeArquivo(dados:TokenArquivo) {
  return `${ENV.appUrl}/api/arquivo/${await assinarTokenArquivo(dados)}`;
}
router.get('/api/arquivo/:token',arquivoRateLimit,async(req:Request,res:Response)=>{
  try {
    const user=await resolveSession(req);
    if(!user) {res.status(401).send('Autenticação necessária.');return;}
    const {payload}=await jwtVerify(req.params.token,sessionSecret(),{algorithms:['HS256']});
    if (typeof payload.k !== 'string' || !Number.isSafeInteger(payload.u)) throw new Error('Invalid');
    const legacy = payload.purpose === undefined && payload.sv === undefined && payload.exp === undefined;
    if (!legacy && (payload.purpose !== 'download' || !payload.exp)) throw new Error('Invalid');
    const owner=await getUserById(payload.u as number);requireApproved(owner);
    if(user.role==='public'||owner!.role==='public'||(user.role!=='admin'&&user.id!==payload.u)||(payload.sv ?? 0)!==owner!.sessionVersion) throw new Error('Forbidden');
    await audit(user.id,'file.download','allowed');
    res.setHeader('Cache-Control','no-store');
    const {url}=await storageGet(payload.k,60);res.redirect(302,url);
  } catch { res.status(404).send('Arquivo não encontrado ou link inválido.'); }
});
export {router as arquivoRouter};
