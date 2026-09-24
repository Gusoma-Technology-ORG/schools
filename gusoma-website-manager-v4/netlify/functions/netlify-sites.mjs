export default async (req) => {
 const token=process.env.NETLIFY_ACCESS_TOKEN;
 if(!token) return Response.json({ok:false,error:'NETLIFY_ACCESS_TOKEN is not configured.'},{status:500});
 const r=await fetch('https://api.netlify.com/api/v1/sites?per_page=100',{headers:{Authorization:`Bearer ${token}`}});
 const data=await r.json();
 if(!r.ok) return Response.json({ok:false,error:data.message||'Netlify request failed'},{status:r.status});
 return Response.json({ok:true,sites:data.map(s=>({id:s.id,name:s.name,url:s.ssl_url||s.url,custom_domain:s.custom_domain,updated_at:s.updated_at}))});
};
