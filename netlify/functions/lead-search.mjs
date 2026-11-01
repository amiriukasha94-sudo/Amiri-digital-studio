const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store"
};
const json = (data, status = 200) => Response.json(data, { status, headers: cors });
const categories = {
  all: 'nwr(around:RADIUS,LAT,LON)["name"];',
  restaurant: 'nwr(around:RADIUS,LAT,LON)["amenity"~"restaurant|cafe|fast_food|bar"]["name"];',
  retail: 'nwr(around:RADIUS,LAT,LON)["shop"]["name"];',
  beauty: 'nwr(around:RADIUS,LAT,LON)["shop"~"beauty|hairdresser|cosmetics"]["name"];',
  hotel: 'nwr(around:RADIUS,LAT,LON)["tourism"~"hotel|guest_house|hostel"]["name"];',
  professional: 'nwr(around:RADIUS,LAT,LON)["office"]["name"];',
  health: 'nwr(around:RADIUS,LAT,LON)["amenity"~"clinic|doctors|dentist|pharmacy"]["name"];'
};
export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  try {
    const u = new URL(req.url);
    const location = (u.searchParams.get("location") || "").trim().slice(0,120);
    const category = (u.searchParams.get("category") || "all").toLowerCase();
    if (location.length < 2) return json({ error: "Enter a city, region or country." }, 400);
    if (!categories[category]) return json({ error: "Choose a supported business category." }, 400);
    const geoRes = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(location), {
      headers: { "User-Agent": "AmiriDigitalStudioLeadFinder/1.0 (public business directory search)" },
      signal: AbortSignal.timeout(10000)
    });
    if (!geoRes.ok) throw new Error("Location lookup is temporarily unavailable.");
    const places = await geoRes.json();
    if (!places.length) return json({ error: "Location not found. Try a larger city or country name." }, 404);
    const place = places[0], lat = Number(place.lat), lon = Number(place.lon);
    const radius = 12000;
    const selector = categories[category].replaceAll("RADIUS", String(radius)).replaceAll("LAT", String(lat)).replaceAll("LON", String(lon));
    const query = '[out:json][timeout:20];(' + selector + ');out center tags 80;';
    const overpass = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: "data=" + encodeURIComponent(query), signal: AbortSignal.timeout(25000)
    });
    if (!overpass.ok) throw new Error("The public business directory is busy. Please try again shortly.");
    const data = await overpass.json();
    const leads = (data.elements || []).map(el => {
      const t = el.tags || {};
      const lat2 = el.lat ?? el.center?.lat, lon2 = el.lon ?? el.center?.lon;
      const website = t.website || t["contact:website"] || "";
      const phone = t.phone || t["contact:phone"] || "";
      const email = t.email || t["contact:email"] || "";
      const type = Object.entries(t).find(([k]) => ["shop","amenity","office","tourism","craft"].includes(k));
      const missing = !website;
      const score = (missing ? 60 : 10) + (!phone ? 0 : 10) + (!email ? 0 : 5) + (website && !website.startsWith("https://") ? 5 : 0);
      return {
        id: "osm-" + el.type + "-" + el.id, name: t.name || "Unnamed business",
        category: type ? type[1].replaceAll("_"," ") : "business",
        website, websiteStatus: missing ? "No website listed" : "Website listed — review manually",
        phone, email, score, address: [t["addr:street"],t["addr:city"],t["addr:country"]].filter(Boolean).join(", "),
        lat: lat2 || null, lon: lon2 || null,
        source: "OpenStreetMap", sourceUrl: "https://www.openstreetmap.org/" + el.type + "/" + el.id
      };
    }).filter(x => x.name !== "Unnamed business")
      .sort((a,b) => b.score-a.score).slice(0,80);
    return json({ location: place.display_name, count: leads.length, radiusKm: 12, source: "OpenStreetMap", note: "Listings are community-maintained and may be incomplete. A missing website means none is listed in OpenStreetMap, not proof the business has no website.", leads });
  } catch (e) {
    return json({ error: e.name === "TimeoutError" ? "Search timed out. Try again." : (e.message || "Lead search failed.") }, 502);
  }
};
