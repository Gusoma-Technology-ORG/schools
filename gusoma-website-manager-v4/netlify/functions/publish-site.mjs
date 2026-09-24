export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', {status:405});
  const token=process.env.GITHUB_TOKEN, owner=process.env.GITHUB_OWNER, repo=process.env.GITHUB_REPO, branch=process.env.GITHUB_BRANCH||'main';
  if(!token||!owner||!repo) return Response.json({ok:false,error:'GitHub environment variables are not configured.'},{status:500});
  const {schoolId, files, message}=await req.json();
  if(!schoolId || !files) return Response.json({ok:false,error:'schoolId and files are required'},{status:400});
  const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
  const results=[];
  for(const [name,content] of Object.entries(files)){
    const path=`sites/${schoolId}/${name}`;
    const url=`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll('%2F','/')}`;
    let sha;
    const existing=await fetch(`${url}?ref=${encodeURIComponent(branch)}`,{headers});
    if(existing.ok) sha=(await existing.json()).sha;
    const body={message:message||`Publish ${schoolId} website`,content:Buffer.from(content).toString('base64'),branch};
    if(sha) body.sha=sha;
    const put=await fetch(url,{method:'PUT',headers,body:JSON.stringify(body)});
    const data=await put.json();
    if(!put.ok) return Response.json({ok:false,error:data.message||'GitHub publish failed',path},{status:put.status});
    results.push({path,commit:data.commit?.sha});
  }
  return Response.json({ok:true,schoolId,results,note:'Files committed to GitHub. A linked Netlify project will deploy automatically.'});
};
