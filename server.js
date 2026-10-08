const http = require("http"), fs = require("fs"), path = require("path");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

http.createServer((req, res) => {
  let p = new URL(req.url, "http://localhost").pathname;
  const fn = { "/ssr": "api/ssr.js", "/api/ssr": "api/ssr.js", "/api/data": "api/data.js" }[p];
  if (fn) {
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => res.end(JSON.stringify(o));
    res.send = (b) => res.end(b);
    return require("./" + fn)(req, res);
  }
  if (p === "/") p = "/index.html";
  if (p === "/csr") p = "/csr.html";
  const file = path.join(__dirname, path.normalize(p));
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    return res.end("Not found");
  }
  res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}).listen(3000, () => console.log("http://localhost:3000"));