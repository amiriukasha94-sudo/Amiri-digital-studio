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
    // Geocoding providers can return HTML error pages during outages. Check content
    // type and try Photon if Nominatim is throttled or unavailable.
    const geocoders = [
      {
        name: "Nominatim",
        url: "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(location),
        headers: { "User-Agent": "AmiriDigitalStudioLeadFinder/1.0 (business directory search)", "Accept": "application/json" },
        parse: body => body
      },
      {
        name: "Photon",
        url: "https://photon.komoot.io/api/?limit=1&q=" + encodeURIComponent(location),
        headers: { "Accept": "application/geo+json, application/json" },
        parse: body => (body.features || []).map(feature => ({
          lat: feature.geometry?.coordinates?.[1],
          lon: feature.geometry?.coordinates?.[0],
          display_name: [feature.properties?.name, feature.properties?.city, feature.properties?.state, feature.properties?.country].filter(Boolean).join(", ")
        }))
      }
    ];
    let places = [];
    const geoFailures = [];
    for (const geocoder of geocoders) {
      try {
        const response = await fetch(geocoder.url, { headers: geocoder.headers, signal: AbortSignal.timeout(12000) });
        const contentType = response.headers.get("content-type") || "";
        const bodyText = await response.text();
        if (!response.ok) {
          geoFailures.push(geocoder.name + " HTTP " + response.status);
          continue;
        }
        if (!contentType.toLowerCase().includes("json")) {
          geoFailures.push(geocoder.name + " returned non-JSON (" + contentType + ")");
          continue;
        }
        const parsed = JSON.parse(bodyText);
        places = geocoder.parse(parsed);
        if (places.length && Number.isFinite(Number(places[0].lat)) && Number.isFinite(Number(places[0].lon))) break;
      } catch (error) {
        geoFailures.push(geocoder.name + " " + (error.name || "error"));
      }
    }
    if (!places.length) {
      console.error("All geocoders failed:", geoFailures);
      return json({ error: "Could not locate that city right now. Check the spelling or try a larger city. Location providers may be temporarily unavailable.", provider: "OpenStreetMap/Photon", diagnostics: geoFailures }, 503);
    }
    const place = places[0], lat = Number(place.lat), lon = Number(place.lon);
    // Photon indexes OpenStreetMap places and can search POIs directly.
    // This avoids dependence on public Overpass interpreter servers.
    const photonTerms = {
      all: ["business", "shop", "restaurant", "hotel", "office", "clinic", "salon"],
      restaurant: ["restaurant", "cafe"],
      retail: ["shop", "store"],
      beauty: ["beauty salon", "hairdresser", "cosmetics"],
      hotel: ["hotel", "guest house", "hostel"],
      professional: ["office", "professional service"],
      health: ["clinic", "doctor", "dentist", "pharmacy"]
    }[category];
    const found = new Map();
    const photonFailures = [];
    for (const term of photonTerms) {
      try {
        const endpoint = "https://photon.komoot.io/api/?q=" + encodeURIComponent(term) +
          "&lat=" + encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lon) + "&limit=50&lang=en";
        const response = await fetch(endpoint, {
          headers: { "Accept": "application/geo+json, application/json" },
          signal: AbortSignal.timeout(12000)
        });
        const contentType = response.headers.get("content-type") || "";
        const body = await response.text();
        if (!response.ok || !contentType.toLowerCase().includes("json")) {
          photonFailures.push(term + ": HTTP " + response.status);
          continue;
        }
        let payload;
        try { payload = JSON.parse(body); }
        catch { photonFailures.push(term + ": invalid JSON"); continue; }
        for (const feature of payload.features || []) {
          const p = feature.properties || {};
          const name = p.name || p.street || "";
          if (!p.name) continue;
          const coords = feature.geometry?.coordinates || [];
          const key = String(p.osm_type || p.osm_value || "") + "-" + String(p.osm_id || name.toLowerCase() + "-" + (p.city || ""));
          const website = p.website || p.url || "";
          const phone = p.phone || "";
          const address = [p.housenumber, p.street, p.city, p.state, p.country].filter(Boolean).join(", ");
          const type = p.type || p.osm_value || p.osm_key || category;
          const score = (!website ? 60 : 10) + (phone ? 15 : 0);
          const item = {
            id: "photon-" + key,
            name,
            category: String(type).replaceAll("_", " "),
            website,
            websiteStatus: website ? "Website listed — review manually" : "No website returned — verify manually",
            phone,
            email: "",
            score,
            address,
            lat: Number.isFinite(coords[1]) ? coords[1] : null,
            lon: Number.isFinite(coords[0]) ? coords[0] : null,
            source: "OpenStreetMap via Photon",
            sourceUrl: p.osm_id && p.osm_type
              ? "https://www.openstreetmap.org/" + (p.osm_type === "R" ? "relation" : p.osm_type === "W" ? "way" : "node") + "/" + p.osm_id
              : "https://www.openstreetmap.org/search?query=" + encodeURIComponent(name + " " + address)
          };
          if (!found.has(key)) found.set(key, item);
        }
      } catch (error) {
        photonFailures.push(term + ": " + (error.name || "request failed"));
      }
    }
    const leads = Array.from(found.values()).sort((a,b) => b.score-a.score).slice(0,80);
    if (!leads.length) {
      console.error("Photon POI search returned no leads:", photonFailures);
      return json({
        error: "The free OpenStreetMap place search did not return results for this location. Try a nearby larger city or retry later.",
        provider: "OpenStreetMap via Photon",
        diagnostics: photonFailures.slice(0, 7)
      }, 503);
    }
    return json({
      location: place.display_name,
      count: leads.length,
      provider: "OpenStreetMap via Photon",
      note: "Photon searches OpenStreetMap place records. Coverage varies by city. Missing contact details or websites are not proof that a business lacks them; verify each lead before outreach.",
      leads
    });
  } catch (e) {
    return json({ error: e.name === "TimeoutError" ? "Search timed out. Try again." : (e.message || "Lead search failed.") }, 502);
  }
};
