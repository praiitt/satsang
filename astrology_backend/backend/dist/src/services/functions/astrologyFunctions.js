export const astrologyFunctions = [
  {
    name: "get_birth_chart",
    description: "Calculate and analyze a person's birth chart using their birth details",
    parameters: {
      type: "object",
      properties: {
        birthData: {
          type: "object",
          description: "Complete birth data including date, time, and location",
          properties: {
            name: { type: "string", description: "Person's name" },
            birthDate: { type: "string", description: "Birth date in YYYY-MM-DD format" },
            birthTime: { type: "string", description: "Birth time in HH:MM format" },
            latitude: { type: "number", description: "Birth place latitude" },
            longitude: { type: "number", description: "Birth place longitude" },
            placeOfBirth: { type: "string", description: "Birth place name" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        chartType: {
          type: "string",
          enum: ["natal", "solar_return", "lunar_return", "progressed"],
          description: "Type of chart to calculate",
          default: "natal"
        }
      },
      required: ["birthData"]
    }
  },
  {
    name: "get_current_transits",
    description: "Get current planetary transits and their effects on a person's birth chart",
    parameters: {
      type: "object",
      properties: {
        birthData: {
          type: "object",
          description: "Person's birth data",
          properties: {
            name: { type: "string", description: "Person's name" },
            birthDate: { type: "string", description: "Birth date in YYYY-MM-DD format" },
            birthTime: { type: "string", description: "Birth time in HH:MM format" },
            latitude: { type: "number", description: "Birth place latitude" },
            longitude: { type: "number", description: "Birth place longitude" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        transitDate: {
          type: "string",
          description: "Date for transit calculation (defaults to current date)",
          default: "current"
        }
      },
      required: ["birthData"]
    }
  },
  {
    name: "get_personalized_reading",
    description: "Generate a personalized astrological reading based on birth chart",
    parameters: {
      type: "object",
      properties: {
        birthData: {
          type: "object",
          description: "Person's birth data",
          properties: {
            name: { type: "string", description: "Person's name" },
            birthDate: { type: "string", description: "Birth date in YYYY-MM-DD format" },
            birthTime: { type: "string", description: "Birth time in HH:MM format" },
            latitude: { type: "number", description: "Birth place latitude" },
            longitude: { type: "number", description: "Birth place longitude" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        readingType: {
          type: "string",
          enum: ["daily", "weekly", "monthly", "yearly", "career", "love", "health", "spiritual"],
          description: "Type of reading to generate",
          default: "daily"
        },
        focus: {
          type: "string",
          description: "Specific area of life to focus on in the reading",
          default: "general"
        }
      },
      required: ["birthData", "readingType"]
    }
  },
  {
    name: "analyze_planetary_positions",
    description: "Analyze planetary positions and their astrological significance",
    parameters: {
      type: "object",
      properties: {
        birthData: {
          type: "object",
          description: "Person's birth data",
          properties: {
            name: { type: "string", description: "Person's name" },
            birthDate: { type: "string", description: "Birth date in YYYY-MM-DD format" },
            birthTime: { type: "string", description: "Birth time in HH:MM format" },
            latitude: { type: "number", description: "Birth place latitude" },
            longitude: { type: "number", description: "Birth place longitude" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        planets: {
          type: "array",
          items: {
            type: "string",
            enum: ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]
          },
          description: "Specific planets to analyze",
          default: ["Sun", "Moon", "Mercury", "Venus", "Mars"]
        }
      },
      required: ["birthData"]
    }
  },
  {
    name: "get_aspects_analysis",
    description: "Analyze planetary aspects and their effects",
    parameters: {
      type: "object",
      properties: {
        birthData: {
          type: "object",
          description: "Person's birth data",
          properties: {
            name: { type: "string", description: "Person's name" },
            birthDate: { type: "string", description: "Birth date in YYYY-MM-DD format" },
            birthTime: { type: "string", description: "Birth time in HH:MM format" },
            latitude: { type: "number", description: "Birth place latitude" },
            longitude: { type: "number", description: "Birth place longitude" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        aspectType: {
          type: "string",
          enum: ["conjunction", "opposition", "trine", "square", "sextile", "all"],
          description: "Type of aspects to analyze",
          default: "all"
        }
      },
      required: ["birthData"]
    }
  },
  {
    name: "get_house_analysis",
    description: "Analyze the 12 houses of the birth chart",
    parameters: {
      type: "object",
      properties: {
        birthData: {
          type: "object",
          description: "Person's birth data",
          properties: {
            name: { type: "string", description: "Person's name" },
            birthDate: { type: "string", description: "Birth date in YYYY-MM-DD format" },
            birthTime: { type: "string", description: "Birth time in HH:MM format" },
            latitude: { type: "number", description: "Birth place latitude" },
            longitude: { type: "number", description: "Birth place longitude" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        houses: {
          type: "array",
          items: {
            type: "integer",
            minimum: 1,
            maximum: 12
          },
          description: "Specific houses to analyze (1-12)",
          default: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        }
      },
      required: ["birthData"]
    }
  }
]; 