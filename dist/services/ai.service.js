"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = void 0;
const genai_1 = require("@google/genai");
const axios_1 = __importDefault(require("axios"));
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key" });
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
exports.aiService = {
    /**
     * Generates a travel plan using Gemini based on trip preferences.
     * Returns a list of generic stops (e.g., "Cafe", "Museum") with scheduled times.
     */
    async generateTripPlanStructure(data) {
        const days = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const prompt = `
      You are an expert travel planner. Create an itinerary for a trip to ${data.destination} for ${data.numPeople} people.
      Duration: ${days} days.
      Budget per person: ${data.budget} VND.
      Travel Style: ${data.travelStyle}.
      Preferences: ${data.preferences}.
      
      Generate a realistic, well-paced itinerary. For each stop, provide the time of day, a generic description of the place (e.g., "local cafe", "historical museum"), and a specific search keyword we can use in Google Places API (e.g., "coffee shop in Dalat", "best seafood restaurant in Nha Trang").
      Avoid overly packed schedules. Provide about 3-5 stops per day.
    `;
        const responseSchema = {
            type: genai_1.Type.ARRAY,
            items: {
                type: genai_1.Type.OBJECT,
                properties: {
                    day: { type: genai_1.Type.INTEGER, description: "Day number (1, 2, ...)" },
                    scheduled_time: { type: genai_1.Type.STRING, description: "Time of day (e.g., '09:00')" },
                    type: { type: genai_1.Type.STRING, description: "Type of place (e.g., 'Cafe', 'Restaurant', 'Nature')" },
                    search_keyword: { type: genai_1.Type.STRING, description: "Specific keyword to search on Google Maps" },
                    description: { type: genai_1.Type.STRING, description: "Brief description of the activity" }
                },
                required: ["day", "scheduled_time", "type", "search_keyword", "description"]
            }
        };
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });
        if (!response.text) {
            throw new Error("Failed to generate plan structure from Gemini");
        }
        return JSON.parse(response.text);
    },
    /**
     * Generates additional stops to fill gaps in an existing itinerary.
     */
    async generateSupplementStops(data) {
        const prompt = `
      You are an expert travel planner. We are building an itinerary for ${data.destination}.
      Here is the current schedule:
      ${JSON.stringify(data.existingStops)}

      Identify time gaps in this schedule (e.g., afternoon or evening) and suggest 1-3 new activities to fill the gaps based on these preferences: ${data.preferences} and travel style: ${data.travelStyle}.
      Ensure the new suggestions don't overlap with existing times, and try to avoid repeating the same place types too much.
    `;
        const responseSchema = {
            type: genai_1.Type.ARRAY,
            items: {
                type: genai_1.Type.OBJECT,
                properties: {
                    scheduled_time: { type: genai_1.Type.STRING, description: "Time of day (e.g., '14:00')" },
                    type: { type: genai_1.Type.STRING, description: "Type of place (e.g., 'Shopping', 'Restaurant')" },
                    search_keyword: { type: genai_1.Type.STRING, description: "Specific keyword to search on Google Maps" },
                    description: { type: genai_1.Type.STRING, description: "Brief description of the activity" }
                },
                required: ["scheduled_time", "type", "search_keyword", "description"]
            }
        };
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });
        if (!response.text) {
            throw new Error("Failed to generate supplement stops from Gemini");
        }
        return JSON.parse(response.text);
    },
    /**
     * Search for a specific place using Google Places Text Search (New) API
     */
    async searchGooglePlaces(keyword, lat, lng, radiusKm = 5) {
        if (!GOOGLE_PLACES_API_KEY) {
            console.warn("GOOGLE_PLACES_API_KEY is not set. Returning mock data.");
            return [{
                    name: `Mock Place for ${keyword}`,
                    address: "123 Fake Street",
                    lat: lat || 10.762622,
                    lng: lng || 106.660172,
                    rating: 4.5,
                    google_place_id: `mock_id_${Math.random()}`,
                    photo_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80"
                }];
        }
        let url = "https://places.googleapis.com/v1/places:searchText";
        const requestBody = {
            textQuery: keyword,
            languageCode: "vi"
        };
        if (lat && lng) {
            requestBody.locationBias = {
                circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: radiusKm * 1000
                }
            };
        }
        try {
            const response = await axios_1.default.post(url, requestBody, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
                    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos"
                }
            });
            const places = response.data.places || [];
            return places.map((place) => {
                let photo_url = null;
                if (place.photos && place.photos.length > 0) {
                    const photoReference = place.photos[0].name;
                    // Build photo URL (requires a separate call or specific format)
                    // Actually for the new Places API, photo URL is fetched via media URL
                    photo_url = `https://places.googleapis.com/v1/${photoReference}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_PLACES_API_KEY}`;
                }
                return {
                    name: place.displayName?.text || "Unknown Place",
                    address: place.formattedAddress,
                    lat: place.location?.latitude,
                    lng: place.location?.longitude,
                    rating: place.rating,
                    google_place_id: place.id,
                    photo_url
                };
            });
        }
        catch (error) {
            console.error("Google Places API error:", error.response?.data || error.message);
            throw new Error("Failed to search places");
        }
    }
};
