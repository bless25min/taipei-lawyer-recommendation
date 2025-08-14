// Cloudflare Pages Function: /indexnow
// 用法：POST /indexnow  { urlList: ["https://lawyer-review.25min.co/"] }
// 或   GET  /indexnow?url=https://lawyer-review.25min.co/
const INDEXNOW_KEY = "2c97de32bc3742d6862f0996f39a25bb";
const KEY_LOCATION = `https://lawyer-review.25min.co/${INDEXNOW_KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

async function submit(urlList: string[]) {
  if (!urlList?.length) throw new Error("urlList required");
  const host = new URL(urlList[0]).host;
  const payload = { host, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList };
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  return new Response(text, { status: r.status, headers: { "content-type": "text/plain; charset=utf-8" }});
}

export const onRequestPost: PagesFunction = async ({ request }) => {
  try {
    const { urlList } = await request.json();
    return await submit(urlList);
  } catch (e:any) {
    return new Response("Bad Request: " + (e?.message || ""), { status: 400 });
  }
};

export const onRequestGet: PagesFunction = async ({ request }) => {
  const u = new URL(request.url);
  const url = u.searchParams.get("url");
  if (!url) return new Response("Missing ?url=", { status: 400 });
  return submit([url]);
};
