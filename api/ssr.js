// Server-side rendering: the server builds the final HTML on EVERY request.
// View source (Ctrl+U): the content is already in the HTML.
module.exports = (req, res) => {
  const now = new Date().toISOString();
  const region = process.env.VERCEL_REGION || "local";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SSR page</title>
<link rel="stylesheet" href="/assets/style.css"></head>
<body><main>
<p class="tag">Server-side rendered</p>
<h1>Built on the server</h1>
<p>This HTML was generated at <code>${now}</code> in region <code>${region}</code>.</p>
<p>Reload: the timestamp changes every time. Press Ctrl+U: the text is in the source.</p>
<p><a href="/">← Back</a> · <a href="/csr">Compare with the client-rendered page</a></p>
</main></body></html>`);
};
