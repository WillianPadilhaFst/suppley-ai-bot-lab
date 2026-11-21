import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({storage:vi.fn(async()=>({url:'https://s3.example/file'})),user:vi.fn(),session:vi.fn()}));
vi.mock('../storage',()=>({storageGet:mocks.storage}));
vi.mock('../services/authService',()=>({getUserById:mocks.user}));
vi.mock('../security/abuse',()=>({audit:vi.fn(async()=>{})}));
vi.mock('../security/session',async original=>({...await original<typeof import('../security/session')>(),resolveSession:mocks.session}));
import {arquivoRouter,assinarTokenArquivo} from './arquivoRoute';
const owner={id:7,role:'user',approvalStatus:'approved',sessionVersion:0};
async function request(token:string){
 const layer=(arquivoRouter as any).stack.find((x:any)=>x.route?.path==='/api/arquivo/:token');
 const res:any={statusCode:200,status(n:number){this.statusCode=n;return this;},send(){return this;},redirect(n:number){this.statusCode=n;},setHeader(){}};
 await layer.route.stack[0].handle({params:{token},headers:{}},res);return res.statusCode;
}
beforeEach(()=>{vi.clearAllMocks();process.env.JWT_SECRET='a-test-secret-with-at-least-32-characters';mocks.user.mockResolvedValue(owner);mocks.session.mockResolvedValue(owner);});
afterEach(()=>vi.useRealTimers());
describe('authorized expiring downloads',()=>{
 it('requires an owner at issuance',async()=>{await expect(assinarTokenArquivo({k:'report'})).rejects.toThrow();});
 it('allows an authenticated internal owner',async()=>{expect(await request(await assinarTokenArquivo({k:'report',u:7}))).toBe(302);expect(mocks.storage).toHaveBeenCalledWith('report',60);});
 it('rejects anonymous, foreign and public users',async()=>{const token=await assinarTokenArquivo({k:'report',u:7});for(const user of [null,{...owner,id:8},{...owner,role:'public'}]){mocks.session.mockResolvedValue(user);expect(await request(token)).not.toBe(302);}expect(mocks.storage).not.toHaveBeenCalled();});
 it('expires and cannot survive revocation',async()=>{const token=await assinarTokenArquivo({k:'report',u:7});mocks.user.mockResolvedValue({...owner,sessionVersion:1});expect(await request(token)).toBe(404);mocks.user.mockResolvedValue(owner);vi.useFakeTimers();vi.setSystemTime(Date.now()+7200000);expect(await request(token)).toBe(404);expect(mocks.storage).not.toHaveBeenCalled();});
 it('rejects tampering and legacy unbounded links',async()=>{expect(await request('forged')).toBe(404);const {SignJWT}=await import('jose');const token=await new SignJWT({k:'report',u:7}).setProtectedHeader({alg:'HS256'}).sign(new TextEncoder().encode(process.env.JWT_SECRET));expect(await request(token)).toBe(404);});
});
