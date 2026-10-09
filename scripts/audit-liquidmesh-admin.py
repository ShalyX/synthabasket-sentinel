"""Read-only BSC probe of common Diamond admin selectors, never an execution unlock."""
import json,urllib.request,hashlib
from concurrent.futures import ThreadPoolExecutor
from Crypto.Hash import keccak
ROUTER='0xb44446b0c8e56988c34f7ff73ae904982b5fdda5'
RPC='https://bsc-dataseed.bnbchain.org'
NAMESPACE='5e12654f390e4153c4f63b3dfcc122cf7876a5cdfb496dccf7284c10517a35c5'
FUNCS={'proxySwapV3-observed':'ad43f73d','owner()':'8da5cb5b','diamondCut(...)':'1f931c1c',
'facets()':'7a0ed627','facetAddress(bytes4)':'cdffacc6','facetFunctionSelectors(address)':'adfca15e',
'transferOwnership(address)':'f2fde38b'}
def rpc(method,params,id):
 payload=json.dumps({'jsonrpc':'2.0','id':id,'method':method,'params':params}).encode()
 r=urllib.request.Request(RPC,data=payload,headers={'content-type':'application/json'})
 with urllib.request.urlopen(r,timeout=9) as res:reply=json.load(res)
 if 'error' in reply:raise RuntimeError(str(reply['error'])[:150])
 return reply['result']
def selector_address(kv):
 name,sel=kv
 inp=bytes.fromhex(sel+'00'*28+NAMESPACE)
 hasher=keccak.new(digest_bits=256);hasher.update(inp)
 key='0x'+hasher.hexdigest()
 try:
  word=rpc('eth_getStorageAt',[ROUTER,key,'latest'],1)
  target='0x'+word[-40:]
  if int(word,16)>0:
   bytecode=rpc('eth_getCode',[target,'latest'],2)
   codeHash=hashlib.sha256(bytes.fromhex(bytecode[2:])).hexdigest()
   return {'selector':sel,'methodCandidate':name,'facet':target,'codeBytes':(len(bytecode)-2)//2,'codeSha256':codeHash}
  return {'selector':sel,'methodCandidate':name,'facet':'ZERO'}
 except Exception as e:return {'methodCandidate':name,'error':str(e)[:140]}
with ThreadPoolExecutor(max_workers=4) as pool:out=list(pool.map(selector_address,FUNCS.items()))
print(json.dumps({'kind':'liquidmesh.common-admin-selector-observation','chainId':56,'results':out,
 'governanceVerified':False,'sourceVerified':False,'executionAuthorized':False},indent=2))
