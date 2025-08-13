// /functions/api/reviews.ts
export const onRequest: PagesFunction<{ GITHUB_TOKEN?: string }> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request as RequestInit);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const gh = 'https://api.github.com/repos/bless25min/taipei-lawyer-recommendation/issues?state=open&per_page=100';
  const headers: Record<string, string> = { 'Accept': 'application/vnd.github+json' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

  const res = await fetch(gh, { headers });
  if (!res.ok) {
    return new Response(JSON.stringify({ error:true, status:res.status }), {
      status: 502,
      headers: {'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'}
    });
  }

  const strip = (md='') => md
    .replace(/```[\s\S]*?```/g,' ').replace(/`[^`]*`/g,' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g,' ').replace(/\[[^\]]*\]\([^)]+\)/g,' ')
    .replace(/[#>*_~-]/g,' ').replace(/\s{2,}/g,' ').trim();

  const raw = await res.json() as any[];
  const items = (Array.isArray(raw)?raw:[]).filter(x=>!x.pull_request).map(x=>{
    const labels = (x.labels||[]).map((l:any)=>l.name);
    const isGoogle = labels.some(n=>/google|來源:google/i.test(n));
    const isCustomer = labels.some(n=>/client-feedback|用戶自主上傳評價|原創/i.test(n));
    const source = isGoogle ? 'google' : (isCustomer ? 'customer' : 'unspecified');
    const safe_excerpt = source==='customer' ? strip(x.body||'').slice(0,280) : '';
    return { number:x.number, title:x.title||'(無標題)', labels, created_at:x.created_at, html_url:x.html_url, source, safe_excerpt };
  });

  const out = new Response(JSON.stringify({ count: items.length, items }), {
    headers: {
      'content-type':'application/json; charset=utf-8',
      'cache-control':'public, max-age=900',
      'access-control-allow-origin':'*'
    }
  });
  ctx.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
};
