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

    // Primary provider: Google Places. Keep the API key in Netlify environment variables.
    const googleKey = process.env.GOOGLE_PLACES_API_KEY;
    if (googleKey) {
      const categoryTerms = {
        all: "businesses",
        restaurant: "restaurants and cafes",
        retail: "retail shops and stores",
        beauty: "beauty salons hairdressers and cosmetics shops",
        hotel: "hotels and accommodation",
        professional: "professional services and offices",
        health: "clinics dentists pharmacies and healthcare businesses"
      };
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.primaryTypeDisplayName,places.googleMapsUri"
        },
        body: JSON.stringify({
          textQuery: categoryTerms[category] + " in " + location,
          maxResultCount: 20,
          languageCode: "en"
        }),
        signal: AbortSignal.timeout(20000)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Google Places error:", response.status, payload);
        const message = response.status === 403
          ? "Google Places access is not enabled or billing/API-key restrictions need attention in Google Cloud."
          : response.status === 429
            ? "Google Places request limit reached. Try again later."
            : "Google Places search failed. Check the API key and Places API configuration.";
        return json({ error: message, provider: "Google Places" }, response.status === 429 ? 429 : 502);
      }
      const leads = (payload.places || []).map(place => {
        const website = place.websiteUri || "";
        const phone = place.nationalPhoneNumber || "";
        const name = place.displayName?.text || "Unnamed business";
        return {
          id: "google-" + place.id,
          name,
          category: place.primaryTypeDisplayName?.text || categoryTerms[category],
          website,
          websiteStatus: website ? "Website listed — review manually" : "No website returned — verify manually",
          phone,
          email: "",
          score: (website ? 10 : 55) + (phone ? 15 : 0),
          address: place.formattedAddress || "",
          source: "Google Places",
          sourceUrl: place.googleMapsUri || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + " " + (place.formattedAddress || location))
        };
      });
      return json({
        location,
        count: leads.length,
        provider: "Google Places",
        note: "Business details are provided by Google Places. A missing website means Google did not return one; verify independently before outreach.",
        leads
      });
    }
    // No Google key configured: continue with the free OpenStreetMap fallback below.
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
    const query = '[out:json][timeout:15];(' + selector + ');out center tags 80;';
    // Public community instances are best-effort. Rotate hosts and retry with a smaller
    // radius before reporting a real outage. No API key or paid service is required.
    const mirrors = [
      "https://overpass.private.coffee/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
      "https://overpass-api.de/api/interpreter"
    ];
    let data = null;
    const failures = [];
    const radii = [12000, 5000];
    for (const searchRadius of radii) {
      const radiusQuery = query.replaceAll(String(radius), String(searchRadius));
      for (const endpoint of mirrors) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
              "Accept": "application/json"
            },
            body: "data=" + encodeURIComponent(radiusQuery),
            signal: AbortSignal.timeout(18000)
          });
          if (!response.ok) {
            const detail = (await response.text().catch(() => "")).slice(0, 180);
            failures.push(endpoint + " HTTP " + response.status + (detail ? ": " + detail : ""));
            continue;
          }
          const payload = await response.json();
          if (!Array.isArray(payload.elements)) {
            failures.push(endpoint + " returned invalid JSON data");
            continue;
          }
          data = payload;
          break;
        } catch (error) {
          failures.push(endpoint + " " + (error.name || "error"));
        }
      }
      if (data) break;
    }
    if (!data) {
      console.error("All free OSM search endpoints failed:", failures);
      return json({
        error: "The free OpenStreetMap search servers are temporarily overloaded or unreachable. Please retry later; no paid API is being used.",
        provider: "OpenStreetMap",
        diagnostics: failures.slice(0, 6)
      }, 503);
    }
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
