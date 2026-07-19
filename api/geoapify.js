export default async function handler(req, res) {
  const { z, x, y } = req.query;
  const url = `https://maps.geoapify.com/v1/tile/osm-carto/${z}/${x}/${y}.png?apiKey=${process.env.GEOAPIFY_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    res.status(response.status).end();
    return;
  }

  const buffer = await response.arrayBuffer();
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(Buffer.from(buffer));
}