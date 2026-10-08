(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const KEY = "ujd:loads:v1";
  const ms = (n) => (Number.isFinite(n) && n >= 0 ? Math.round(n) + " ms" : "–");
  const size = (n) => (n < 1024 ? n + " B" : (n / 1024).toFixed(1) + " kB");

  function el(tag, text, cls) {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  // Heuristic based on the Resource Timing API (same-origin only).
  function source(e) {
    if (e.transferSize === 0 && (e.decodedBodySize > 0 || e.encodedBodySize > 0)) return "cache";
    if (e.transferSize > 0 && e.encodedBodySize > 0 && e.transferSize < e.encodedBodySize) return "304";
    return "network";
  }

  function readHistory() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  }
  function writeHistory(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8))); } catch { /* storage blocked: ignore */ }
  }

  function renderStats(n) {
    const dns = n.domainLookupEnd - n.domainLookupStart;
    const connect = n.connectEnd - n.connectStart;
    const ttfb = n.responseStart - n.requestStart;
    const dl = n.responseEnd - n.responseStart;
    const total = n.loadEventEnd - n.startTime;
    const tiles = [
      ["DNS", ms(dns), dns === 0 ? "cached, or connection reused" : "name → IP"],
      ["Connect + TLS", ms(connect), connect === 0 ? "connection reused" : "TCP + encryption"],
      ["Time to first byte", ms(ttfb), "request sent → first byte back"],
      ["HTML download", ms(dl), "rest of the document"],
      ["Total load", ms(total), "start → load event"],
    ];
    const box = $("stats");
    box.textContent = "";
    tiles.forEach(([label, value, note]) => {
      const t = el("div", undefined, "card stat");
      t.append(el("span", label.toUpperCase()), el("b", value), el("span", note));
      box.append(t);
    });
    return { dns, connect, ttfb, total };
  }

  function renderResources(nav, list) {
    const rows = [{ name: "(document) " + location.pathname, type: "navigation", e: nav }]
      .concat(list.map((e) => ({ name: new URL(e.name).pathname + new URL(e.name).search, type: e.initiatorType, e })));
    const end = Math.max(1, ...rows.map((r) => r.e.responseEnd));
    const tbody = $("resources");
    tbody.textContent = "";
    const counts = { cache: 0, "304": 0, network: 0 };
    rows.forEach((r) => {
      const src = source(r.e);
      counts[src] += 1;
      const tr = el("tr");
      const track = el("div");
      track.style.cssText = "position:relative;height:8px";
      const bar = el("div", undefined, "bar");
      bar.style.cssText =
        "position:absolute;left:" + ((r.e.startTime / end) * 100).toFixed(2) + "%;width:" +
        Math.max(0.5, ((r.e.responseEnd - r.e.startTime) / end) * 100).toFixed(2) + "%";
      track.append(bar);
      const srcCell = el("td", src, src === "network" ? "" : "cache");
      const wf = el("td");
      wf.append(track);
      tr.append(el("td", r.name), el("td", r.type), el("td", size(r.e.transferSize || 0)), srcCell, wf);
      tbody.append(tr);
    });
    return counts;
  }

  async function renderApi() {
    const out = $("api");
    try {
      const res = await fetch("/api/data");
      const data = await res.json();
      out.textContent =
        "GET /api/data → " + res.status + "\n" +
        "generatedAt: " + data.generatedAt + "\n" +
        "region: " + data.region + "\n" +
        "x-vercel-cache: " + (res.headers.get("x-vercel-cache") || "(none: not on Vercel)") + "\n" +
        "age: " + (res.headers.get("age") || "(none)") + "\n" +
        "Reload within 30 s: same generatedAt = served from the edge cache.";
    } catch (e) {
      out.textContent = "API call failed: " + e.message;
    }
  }

  async function renderHeaders() {
    const out = $("headers");
    try {
      const res = await fetch(location.pathname, { method: "HEAD", cache: "no-store" });
      const keys = ["cache-control", "etag", "age", "content-type", "content-encoding", "x-vercel-cache", "x-vercel-id", "server", "date"];
      out.textContent =
        "HEAD " + location.pathname + " → " + res.status + "\n" +
        keys.map((k) => k + ": " + (res.headers.get(k) || "(none)")).join("\n");
    } catch (e) {
      out.textContent = "Could not read headers: " + e.message;
    }
  }

  function renderHistory(list) {
    const tbody = $("history");
    tbody.textContent = "";
    list.forEach((h, i) => {
      const tr = el("tr");
      [list.length - i, h.type, h.doc, ms(h.dns), ms(h.connect), ms(h.ttfb), ms(h.total),
        h.cache + " / " + h.rev + " / " + h.net].forEach((v) => tr.append(el("td", String(v))));
      if (i === 0) tr.style.fontWeight = "700";
      tbody.append(tr);
    });
  }

  async function run() {
    const nav = performance.getEntriesByType("navigation")[0];
    if (!nav) { $("hint").textContent = "Performance API not available in this browser."; return; }
    const s = renderStats(nav);
    await renderApi();
    const counts = renderResources(nav, performance.getEntriesByType("resource"));
    const record = {
      type: nav.type, doc: source(nav), dns: s.dns, connect: s.connect, ttfb: s.ttfb, total: s.total,
      cache: counts.cache, rev: counts["304"], net: counts.network,
    };
    const hist = [record].concat(readHistory());
    writeHistory(hist);
    renderHistory(hist.slice(0, 8));
    $("hint").textContent =
      "Tip: “Revisit” reuses cached files. Ctrl/Cmd + Shift + R forces a full re-download. Open DevTools → Network to see the same data.";
    await renderHeaders();
  }

  $("reload").addEventListener("click", () => location.reload());
  $("revisit").addEventListener("click", () => location.assign(location.pathname));
  $("clear").addEventListener("click", () => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    renderHistory([]);
  });

  // loadEventEnd is only set after the load event has finished.
  const start = () => setTimeout(run, 0);
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
