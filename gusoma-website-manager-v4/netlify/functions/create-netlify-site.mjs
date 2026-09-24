export default async (req) => {
 if(req.method!=='POST') return new Response('Method not allowed',{status:405});
 const token=process.env.NETLIFY_ACCESS_TOKEN, account=process.env.NETLIFY_ACCOUNT_SLUG;
 if(!token) return Response.json({ok:false,error:'NETLIFY_ACCESS_TOKEN is not configured.'},{status:500});
 const {name,domain}=await req.json();
 const endpoint=account?`https://api.netlify.com/api/v1/${encodeURIComponent(account)}/sites`:'https://api.netlify.com/api/v1/sites';
 const r=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({name,custom_domain:domain||undefined,force_ssl:true})});
 const data=await r.json();
 if(!r.ok) return Response.json({ok:false,error:data.message||'Could not create Netlify project'},{status:r.status});
 return Response.json({ok:true,site:{id:data.id,name:data.name,url:data.ssl_url||data.url,custom_domain:data.custom_domain},next:'Link this project to the GitHub monorepo once. After that, Manager GitHub publishes trigger Netlify continuous deployment.'});
};
