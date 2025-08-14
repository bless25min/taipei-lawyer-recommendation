export const onRequestGet: PagesFunction<{ GITHUB_TOKEN?: string }> = async (ctx) => {
  const { env, request } = ctx;
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.toString());

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const ghURL = 'https://api.github.com/repos/bless25min/taipei-lawyer-recommendation/issues?state=open&per_page=100';
  const headers: Record<string,string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'lawyer-review-site/1.0'
  };
  if (env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;

  let status = 200;
  let payload: any = { count: 0, items: [] };

  try {
    const resp = await fetch(ghURL, { headers });
    status = resp.status;

    if (!resp.ok) {
      payload = { count: 0, items: [], error: `GitHub ${resp.status}` };
    } else {
      const raw = await resp.json();
      const items = (Array.isArray(raw) ? raw : [])
        .filter((x:any) => !x.pull_request)
        .map((x:any) => {
          const labels = (x.labels||[]).map((l:any)=>l.name||'');
          const isGoogle     = labels.some((n:string)=>/google|google-review|來源:google/i.test(n));
          const isCustomer   = labels.some((n:string)=>/client-feedback|用戶自主上傳評價|原創/i.test(n));
          const isEnterprise = labels.some((n:string)=>/企業主|business[-\s]?owner|enterprise/i.test(n));
          const source = isGoogle ? 'google' : (isCustomer ? 'customer' : 'unspecified');
          const strip = (s:string) => s.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
          const safe_excerpt = source === 'customer' ? strip(x.body||'').slice(0,280) : '';
          return {
            number: x.number,
            title: x.title || '(無標題)',
            labels, created_at: x.created_at,
            html_url: x.html_url,
            source, safe_excerpt,
            isEnterprise,
            company: (x.title || '').replace(/^\s*\[[^\]]*\]\s*/,'')
          };
        });

      payload = { count: items.length, items };
    }
  } catch (e:any) {
    status = 200;
    payload = { count: 0, items: [], error: String(e?.message || e) };
  }

  const out = new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=900',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS'
    }
  });

  ctx.waitUntil((async () => { try { await cache.put(cacheKey, out.clone()); } catch {} })());
  return out;
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'authorization,content-type'
    }
  });
