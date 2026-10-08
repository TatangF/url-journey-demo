(async () => {
  const app = document.getElementById("app");
  try {
    const res = await fetch("/api/data");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    app.textContent = "";
    const p = document.createElement("p");
    p.append("This content was built by JavaScript from ");
    const c1 = document.createElement("code");
    c1.textContent = "/api/data";
    p.append(c1, ". API generated at ");
    const c2 = document.createElement("code");
    c2.textContent = data.generatedAt;
    p.append(c2, " (region ");
    const c3 = document.createElement("code");
    c3.textContent = data.region;
    p.append(c3, ").");
    app.append(p);
  } catch (e) {
    app.textContent = "Could not load data: " + e.message;
  }
})();
