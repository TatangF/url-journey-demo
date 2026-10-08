// Dynamic JSON endpoint. Cached at the Vercel edge for 30 s (see vercel.json),
// so repeated calls show x-vercel-cache: MISS, then HIT, then STALE.
module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    generatedAt: new Date().toISOString(),
    region: process.env.VERCEL_REGION || "local",
  });
};
