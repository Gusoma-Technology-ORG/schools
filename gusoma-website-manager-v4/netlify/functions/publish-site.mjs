const GH_API='https://api.github.com';
const json=(body,status=200)=>Response.json(body,{status});
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function applyConfig(html,s){let out=html;const reps=[['Kigali School of Kinyarwanda',s.school_name],['Kinyarwanda',s.language],['Kigali',s.city],['Rwanda',s.country],['kigalischool.com',s.domain]];for(const [a,b] of reps)if(b)out=out.split(a).join(b);out=out.replace(/<meta name="amasomo-template-version"[^>]*>/i,'').replace('</head>',`<meta name="amasomo-template-version" content="${esc(s.template_version||'V36')}"><meta name="amasomo-school-id" content="${esc(s.id)}"><script>window.AMASOMO_SEASONAL_CONFIG=${JSON.stringify({mode:s.seasonal_offer_mode||'auto',offerId:s.seasonal_offer_id||'',code:s.seasonal_offer_code||''})}<\/script></head>`);return out;}
function seoFiles(s){const base=`https://${s.domain}/`;return {'robots.txt':`User-agent: *\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: ${base}sitemap.xml\n`,'sitemap.xml':`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}</loc></url></urlset>`,'llms.txt':`# ${s.school_name}\n\nOfficial website: ${base}\nLanguage taught: ${s.language}\nLocation: ${s.city}, ${s.country}\nDelivery: online and in-person at the learner's home or office.\nCanonical website template: ${s.template_version||'V36'}\n`,'school.json':JSON.stringify(s,null,2)};}
async function ghJson(url,options={}){const r=await fetch(url,options);const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={message:text||`HTTP ${r.status}`}}return {r,data};}
async function createBlob(content,headers,owner,repo){const {r,data}=await ghJson(`${GH_API}/repos/${owner}/${repo}/git/blobs`,{method:'POST',headers,body:JSON.stringify({content:Buffer.from(content,'utf8').toString('base64'),encoding:'base64'})});if(!r.ok)throw new Error(`GitHub blob creation failed: ${data.message||r.status}`);return data.sha;}
export default async (req)=>{try{
 if(req.method!=='POST')return json({ok:false,error:'Method not allowed'},405);
 const token=process.env.GITHUB_TOKEN,owner=process.env.GITHUB_OWNER,repo=process.env.GITHUB_REPO,branch=process.env.GITHUB_BRANCH||'main';
 if(!token||!owner||!repo)return json({ok:false,error:'GitHub environment variables are not configured.'},500);
 let payload;try{payload=await req.json()}catch{return json({ok:false,error:'Invalid JSON request.'},400)}
 const s=payload.school;if(!s?.id||!s?.school_name||!s?.language||!s?.domain)return json({ok:false,error:'school.id, school_name, language and domain are required.'},400);
 const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
 // Load the already-deployed canonical directly from this FANOS deployment. This avoids the GitHub Contents API large-file limitation.
 const canonicalUrl=new URL('/canonical/template-v36.html',req.url);
 const canonicalRes=await fetch(canonicalUrl,{headers:{Accept:'text/html'}});
 if(!canonicalRes.ok)return json({ok:false,error:`Could not load deployed Canonical V36 (HTTP ${canonicalRes.status}).`,canonicalUrl:String(canonicalUrl)},500);
 const canonical=await canonicalRes.text();
 if(!canonical||canonical.length<100000)return json({ok:false,error:`Canonical V36 loaded but was unexpectedly small (${canonical.length} bytes).`,canonicalUrl:String(canonicalUrl)},500);
 const files={'index.html':applyConfig(canonical,s),...seoFiles(s)};
 // Git Data API: create blobs -> tree -> commit -> update branch ref. Supports the large generated index without Contents API limits.
 const {r:refR,data:refD}=await ghJson(`${GH_API}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,{headers});
 if(!refR.ok)return json({ok:false,error:`Could not read GitHub branch ${branch}: ${refD.message||refR.status}`},refR.status);
 const parentSha=refD.object?.sha;if(!parentSha)return json({ok:false,error:'GitHub branch response did not contain a commit SHA.'},500);
 const {r:commitR,data:commitD}=await ghJson(`${GH_API}/repos/${owner}/${repo}/git/commits/${parentSha}`,{headers});
 if(!commitR.ok)return json({ok:false,error:`Could not read base GitHub commit: ${commitD.message||commitR.status}`},commitR.status);
 const baseTree=commitD.tree?.sha;if(!baseTree)return json({ok:false,error:'Base GitHub commit did not contain a tree SHA.'},500);
 const tree=[];const results=[];
 // Remove the legacy flattened file from older FANOS packages, if present.
 tree.push({path:`sites/${s.id}-index.html`,mode:'100644',type:'blob',sha:null});
 for(const [name,content] of Object.entries(files)){
   const path=`sites/${s.id}/${name}`;
   const sha=await createBlob(content,headers,owner,repo);
   tree.push({path,mode:'100644',type:'blob',sha});results.push({path,blob:sha,bytes:Buffer.byteLength(content,'utf8')});
 }
 const {r:treeR,data:treeD}=await ghJson(`${GH_API}/repos/${owner}/${repo}/git/trees`,{method:'POST',headers,body:JSON.stringify({base_tree:baseTree,tree})});
 if(!treeR.ok)return json({ok:false,error:`GitHub tree creation failed: ${treeD.message||treeR.status}`},treeR.status);
 const message=payload.message||`Publish ${s.school_name} from FANOS Publisher V6`;
 const {r:newCommitR,data:newCommitD}=await ghJson(`${GH_API}/repos/${owner}/${repo}/git/commits`,{method:'POST',headers,body:JSON.stringify({message,tree:treeD.sha,parents:[parentSha]})});
 if(!newCommitR.ok)return json({ok:false,error:`GitHub commit creation failed: ${newCommitD.message||newCommitR.status}`},newCommitR.status);
 const {r:updateR,data:updateD}=await ghJson(`${GH_API}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,{method:'PATCH',headers,body:JSON.stringify({sha:newCommitD.sha,force:false})});
 if(!updateR.ok)return json({ok:false,error:`GitHub branch update failed: ${updateD.message||updateR.status}`},updateR.status);
 return json({ok:true,schoolId:s.id,commit:newCommitD.sha,results,note:`Generated server-side from deployed Canonical V36 and committed in one GitHub commit (${results.length} files).`});
}catch(e){return json({ok:false,error:`FANOS Publisher V6 server error: ${e?.message||String(e)}`},500)}};
