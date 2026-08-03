import { GoogleGenAI, Type, Schema } from "@google/genai";
import axios from "axios";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key" });

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

// Helper function to handle transient Gemini 503 errors
const callGeminiWithRetry = async (params: any, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      if (error?.status === 503 && i < retries - 1) {
        console.log(`[Gemini API] 503 Overloaded. Retrying in ${Math.pow(2, i)} seconds...`);
        await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
};

export const aiService = {
  /**
   * Generates a travel plan using Gemini based on trip preferences.
   * Returns a list of generic stops (e.g., "Cafe", "Museum") with scheduled times.
   */
  async generateTripPlanStructure(data: {
    destination: string;
    startDate: Date;
    endDate: Date;
    numPeople: number;
    budget: number;
    travelStyle: string;
    preferences: string; // e.g., ["food", "nature"]
    radiusKm?: number;
  }) {
    const days = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const prompt = `
      You are an expert travel planner. Create an itinerary for a trip to ${data.destination} for ${data.numPeople} people.
      Duration: ${days} days.
      Budget per person: ${data.budget} VND.
      Travel Style/Vehicle: ${data.travelStyle}.
      Preferences: ${data.preferences}.
      Radius limitation: All places MUST be within ${data.radiusKm || 20} km from ${data.destination}.

      CRITICAL RULE: DO NOT suggest residential areas, real estate listings (like "Bán nhà..."), general street names, or vague regions. You MUST only suggest specific Points of Interest (POIs): Restaurants, Cafes, Tourist Attractions, Museums, Malls, or Landmarks by their EXACT proper names.

      Please output a JSON array of daily schedules.
      Each element should have:
      Generate a realistic, well-paced itinerary. For each stop, provide the time of day, a generic description of the place in Vietnamese (e.g., "quán cà phê địa phương", "bảo tàng lịch sử"), and a specific search keyword we can use in Google Places API (e.g., "coffee shop in Dalat", "best seafood restaurant in Nha Trang").
      Avoid overly packed schedules. Provide about 3-5 stops per day.
      CRITICAL: Ensure the schedule is reasonable and relaxed. Strongly consider including a time to return to the hotel/homestay to rest in the early afternoon (e.g., 13:00 or 14:00) before continuing activities later. For this rest stop, use the exact search_keyword "${data.destination}" so we can map it back to their accommodation.
    `;

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER, description: "Day number (1, 2, ...)" },
          scheduled_time: { type: Type.STRING, description: "Time of day (e.g., '09:00')" },
          type: { type: Type.STRING, description: "Type of place (e.g., 'Cafe', 'Restaurant', 'Nature')" },
          search_keyword: { type: Type.STRING, description: "Specific keyword to search on Google Maps" },
          description: { type: Type.STRING, description: "Brief description of the activity" },
          estimated_rating: { type: Type.NUMBER, description: "Estimated real-world rating of the place from 1.0 to 5.0" }
        },
        required: ["day", "scheduled_time", "type", "search_keyword", "description", "estimated_rating"]
      }
    };

    const response = await callGeminiWithRetry({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    if (!response?.text) {
      throw new Error("Failed to generate plan structure from Gemini");
    }

    return JSON.parse(response.text) as Array<{
      day: number;
      scheduled_time: string;
      type: string;
      search_keyword: string;
      description: string;
      estimated_rating: number;
    }>;
  },

  /**
   * Generates additional stops to fill gaps in an existing itinerary.
   */
  async generateSupplementStops(data: {
    destination: string;
    existingStops: Array<{ time: string, type: string, name: string }>;
    preferences: string;
    travelStyle: string;
  }) {
    const prompt = `
      You are an expert travel planner. We are building an itinerary for ${data.destination}.
      Here is the current schedule:
      ${JSON.stringify(data.existingStops)}

      Identify time gaps in this schedule (e.g., afternoon or evening) and suggest 1-3 new activities to fill the gaps based on these preferences: ${data.preferences} and travel style: ${data.travelStyle}.
      Ensure the new suggestions don't overlap with existing times, and try to avoid repeating the same place types too much. 
      IMPORTANT: The 'description' MUST be written in Vietnamese language.
    `;

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          scheduled_time: { type: Type.STRING, description: "Time of day (e.g., '14:00')" },
          type: { type: Type.STRING, description: "Type of place (e.g., 'Shopping', 'Restaurant')" },
          search_keyword: { type: Type.STRING, description: "Specific keyword to search on Google Maps" },
          description: { type: Type.STRING, description: "Brief description of the activity" },
          estimated_rating: { type: Type.NUMBER, description: "Estimated real-world rating of the place from 1.0 to 5.0" }
        },
        required: ["scheduled_time", "type", "search_keyword", "description", "estimated_rating"]
      }
    };

    const response = await callGeminiWithRetry({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    if (!response?.text) {
      throw new Error("Failed to generate supplement stops from Gemini");
    }

    return JSON.parse(response.text) as Array<{
      scheduled_time: string;
      type: string;
      search_keyword: string;
      description: string;
    }>;
  },

  /**
   * Search for places using Mapbox (for cities/destinations) or Foursquare (for POIs)
   */
  async searchPlaces(keyword: string, lat?: number, lng?: number, radiusKm: number = 5, aiRating?: number) {
    const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
    const FOURSQUARE_KEY = process.env.FOURSQUARE_API_KEY;

    // Use Mapbox + Foursquare if lat/lng are missing (usually searching for a destination/city/hotel)
    if (!lat || !lng) {
      const results: any[] = [];
      
      // 1. Fetch from Mapbox (Good for cities, addresses)
      if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('YOUR_MAPBOX')) {
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(keyword)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=3&country=vn`;
          const response = await axios.get(url);
          const features = response.data.features || [];
          features.forEach((f: any) => {
            results.push({
              name: f.text || f.place_name,
              address: f.place_name,
              lat: f.center[1],
              lng: f.center[0],
              rating: aiRating || (4.0 + Math.random()),
              google_place_id: f.id,
              photo_url: this.getPhotoFallback(keyword)
            });
          });
        } catch (e) {
          console.error("Mapbox search failed:", e);
        }
      }

      // 2. Fetch from Foursquare (Good for hotels, homestays, POIs)
      if (FOURSQUARE_KEY && !FOURSQUARE_KEY.includes('YOUR_FOURSQUARE')) {
        try {
          const url = `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(keyword)}&near=Vietnam&limit=4`;
          const response = await axios.get(url, {
            headers: {
              "Authorization": `Bearer ${FOURSQUARE_KEY}`,
              "Accept": "application/json",
              "X-Places-Api-Version": "2025-06-17"
            }
          });
          const fsqResults = response.data.results || [];
          fsqResults.forEach((place: any) => {
            // Avoid duplicates if Mapbox already found a very similar name
            if (!results.some(r => r.name.toLowerCase() === (place.name || "").toLowerCase())) {
              results.push({
                name: place.name || "Unknown Place",
                address: place.location?.formatted_address || place.location?.address || "",
                lat: place.geocodes?.main?.latitude || lat,
                lng: place.geocodes?.main?.longitude || lng,
                rating: place.rating ? (place.rating / 2) : (aiRating || (4.0 + Math.random())),
                google_place_id: place.fsq_id,
                photo_url: this.getPhotoFallback(keyword, place.fsq_id)
              });
            }
          });
        } catch (e) {
          console.error("Foursquare search failed:", e);
        }
      }

      if (results.length === 0) {
        return [this.getMockPlace(keyword, lat, lng)];
      }
      return results;
    } 
    
    // Use Foursquare if lat/lng are provided (searching for POIs around a location)
    else {
      if (!FOURSQUARE_KEY || FOURSQUARE_KEY.includes('YOUR_FOURSQUARE')) {
        console.warn("FOURSQUARE_API_KEY is not set. Returning mock data.");
        return [this.getMockPlace(keyword, lat, lng)];
      }

      try {
        const url = `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(keyword)}&ll=${lat},${lng}&radius=${radiusKm * 1000}&limit=5`;
        const response = await axios.get(url, {
          headers: {
            "Authorization": `Bearer ${FOURSQUARE_KEY}`,
            "Accept": "application/json",
            "X-Places-Api-Version": "2025-06-17"
          }
        });

        const results = response.data.results || [];

        // Mapbox Fallback if Foursquare finds absolutely nothing
        if (results.length === 0) {
          const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
          if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('YOUR_MAPBOX')) {
            try {
              const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(keyword)}.json?access_token=${MAPBOX_TOKEN}&proximity=${lng},${lat}&types=poi&limit=3`;
              const mbResponse = await axios.get(mapboxUrl);
              const features = mbResponse.data.features || [];
              if (features.length > 0) {
                return features.map((f: any) => ({
                  name: f.text || f.place_name,
                  address: f.place_name,
                  lat: f.center[1],
                  lng: f.center[0],
                  rating: aiRating || (4.0 + Math.random()),
                  google_place_id: f.id,
                  photo_url: this.getPhotoFallback(keyword, f.id)
                }));
              }
            } catch (mbErr) {
              console.error("Mapbox fallback failed", mbErr);
            }
          }
        }
        
        // Map Foursquare results
        return results.map((place: any) => {
          return {
            name: place.name || "Unknown Place",
            address: place.location?.formatted_address || place.location?.address || "",
            lat: place.geocodes?.main?.latitude || lat,
            lng: place.geocodes?.main?.longitude || lng,
            rating: place.rating ? (place.rating / 2) : (aiRating || (4.0 + Math.random())), // Foursquare rating is out of 10, normalize to 5
            google_place_id: place.fsq_id,
            photo_url: this.getPhotoFallback(keyword, place.fsq_id)
          };
        });

      } catch (error: any) {
        console.error("Foursquare API error:", error.response?.data || error.message);
        return [this.getMockPlace(keyword, lat, lng)];
      }
    }
  },

  getMockPlace(keyword: string, lat?: number, lng?: number) {
    return {
      name: `Mock Place for ${keyword}`,
      address: "Địa chỉ giả định (API Key chưa cấu hình)",
      lat: lat || 10.762622,
      lng: lng || 106.660172,
      rating: 4.5,
      google_place_id: `mock_id_${Math.random()}`,
      photo_url: this.getPhotoFallback(keyword)
    };
  },

  getPhotoFallback(keyword: string, idStr?: string) {
    const k = keyword.toLowerCase();
    let pool = [];
    
    // Hash the ID to get a consistent random index for the same place
    const hash = idStr ? idStr.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : Math.floor(Math.random() * 100);

    if (k.includes('cafe') || k.includes('cà phê') || k.includes('trà') || k.includes('coffee')) {
      pool = [
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&q=80",
        "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=500&q=80",
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80",
        "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=500&q=80"
      ];
    } else if (k.includes('ăn') || k.includes('nhà hàng') || k.includes('food') || k.includes('nướng') || k.includes('lẩu') || k.includes('restaurant')) {
      pool = [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80",
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80",
        "https://images.unsplash.com/photo-1414235077428-338988692309?w=500&q=80",
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=500&q=80",
        "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=500&q=80"
      ];
    } else if (k.includes('khách sạn') || k.includes('hotel') || k.includes('resort') || k.includes('homestay') || k.includes('villa')) {
      pool = [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80",
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&q=80",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&q=80",
        "https://images.unsplash.com/photo-1542314831-c6a4d14cd44b?w=500&q=80"
      ];
    } else {
      pool = [
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&q=80",
        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&q=80",
        "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=500&q=80",
        "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=500&q=80",
        "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=500&q=80"
      ];
    }
    
    return pool[hash % pool.length];
  }
};
