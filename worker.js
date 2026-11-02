export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('id');

    if (!videoId) {
      return new Response('Missing video ID', { status: 400 });
    }

    const targetUrl = `https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`;

    try {
      const nicoResponse = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'NicoMylistSorter/1.0 (Cloudflare Worker Proxy)',
        },
      });

      const xmlText = await nicoResponse.text();

      return new Response(xmlText, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/xml; charset=utf-8',
        },
      });
    } catch (e) {
      return new Response(`Proxy error: ${e.message}`, { status: 500 });
    }
  },
};