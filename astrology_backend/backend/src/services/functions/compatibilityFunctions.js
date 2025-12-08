export const compatibilityFunctions = [
  {
    name: "analyze_compatibility",
    description: "Analyze compatibility between two individuals using astrological principles",
    parameters: {
      type: "object",
      properties: {
        person1Data: {
          type: "object",
          description: "First person's birth data",
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
        person2Data: {
          type: "object",
          description: "Second person's birth data",
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
        relationshipType: {
          type: "string",
          enum: ["romantic", "friendship", "business", "family", "general"],
          description: "Type of relationship to analyze",
          default: "romantic"
        },
        focusAreas: {
          type: "array",
          items: {
            type: "string",
            enum: ["communication", "emotional", "intellectual", "physical", "spiritual", "financial", "social"]
          },
          description: "Specific areas of compatibility to focus on",
          default: ["communication", "emotional", "intellectual"]
        }
      },
      required: ["person1Data", "person2Data"]
    }
  },
  {
    name: "get_relationship_insights",
    description: "Get detailed insights about specific aspects of a relationship",
    parameters: {
      type: "object",
      properties: {
        person1Data: {
          type: "object",
          description: "First person's birth data",
          properties: {
            name: { type: "string" },
            birthDate: { type: "string" },
            birthTime: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        person2Data: {
          type: "object",
          description: "Second person's birth data",
          properties: {
            name: { type: "string" },
            birthDate: { type: "string" },
            birthTime: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        aspect: {
          type: "string",
          enum: ["sun_moon", "venus_mars", "mercury_mercury", "jupiter_saturn", "ascendant", "midheaven", "composite"],
          description: "Specific astrological aspect to analyze",
          default: "sun_moon"
        },
        timeFrame: {
          type: "string",
          enum: ["current", "monthly", "yearly", "long_term"],
          description: "Time frame for the analysis",
          default: "current"
        }
      },
      required: ["person1Data", "person2Data", "aspect"]
    }
  },
  {
    name: "calculate_synastry",
    description: "Calculate synastry (relationship chart) between two individuals",
    parameters: {
      type: "object",
      properties: {
        person1Data: {
          type: "object",
          description: "First person's birth data",
          properties: {
            name: { type: "string" },
            birthDate: { type: "string" },
            birthTime: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        person2Data: {
          type: "object",
          description: "Second person's birth data",
          properties: {
            name: { type: "string" },
            birthDate: { type: "string" },
            birthTime: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        chartType: {
          type: "string",
          enum: ["synastry", "composite", "davison"],
          description: "Type of relationship chart to calculate",
          default: "synastry"
        }
      },
      required: ["person1Data", "person2Data"]
    }
  },
  {
    name: "get_compatibility_score",
    description: "Calculate overall compatibility score between two individuals",
    parameters: {
      type: "object",
      properties: {
        person1Data: {
          type: "object",
          description: "First person's birth data",
          properties: {
            name: { type: "string" },
            birthDate: { type: "string" },
            birthTime: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        person2Data: {
          type: "object",
          description: "Second person's birth data",
          properties: {
            name: { type: "string" },
            birthDate: { type: "string" },
            birthTime: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        scoringMethod: {
          type: "string",
          enum: ["harmonic", "aspect_based", "elemental", "comprehensive"],
          description: "Method for calculating compatibility score",
          default: "comprehensive"
        },
        includeAreas: {
          type: "array",
          items: {
            type: "string",
            enum: ["emotional", "intellectual", "physical", "spiritual", "communication", "values", "lifestyle"]
          },
          description: "Areas to include in compatibility scoring",
          default: ["emotional", "intellectual", "communication"]
        }
      },
      required: ["person1Data", "person2Data"]
    }
  },
  {
    name: "get_relationship_forecast",
    description: "Get forecast for relationship development over time",
    parameters: {
      type: "object",
      properties: {
        person1Data: {
          type: "object",
          description: "First person's birth data",
          properties: {
            name: { type: "string" },
            birthDate: { type: "string" },
            birthTime: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        person2Data: {
          type: "object",
          description: "Second person's birth data",
          properties: {
            name: { type: "string" },
            birthDate: { type: "string" },
            birthTime: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" }
          },
          required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
        },
        forecastPeriod: {
          type: "string",
          enum: ["3_months", "6_months", "1_year", "2_years", "5_years"],
          description: "Period for relationship forecast",
          default: "1_year"
        },
        focusEvents: {
          type: "array",
          items: {
            type: "string",
            enum: ["communication", "emotional", "commitment", "challenges", "growth", "harmony"]
          },
          description: "Types of events to focus on in forecast",
          default: ["communication", "emotional", "growth"]
        }
      },
      required: ["person1Data", "person2Data"]
    }
  },
  {
    name: "analyze_group_compatibility",
    description: "Analyze compatibility within a group of people",
    parameters: {
      type: "object",
      properties: {
        groupMembers: {
          type: "array",
          items: {
            type: "object",
            description: "Group member's birth data",
            properties: {
              name: { type: "string" },
              birthDate: { type: "string" },
              birthTime: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
              role: { type: "string", description: "Role in the group" }
            },
            required: ["name", "birthDate", "birthTime", "latitude", "longitude"]
          },
          minItems: 2,
          maxItems: 10,
          description: "Array of group members' birth data"
        },
        groupType: {
          type: "string",
          enum: ["family", "work", "friendship", "romantic", "spiritual", "business"],
          description: "Type of group for analysis",
          default: "friendship"
        },
        analysisFocus: {
          type: "string",
          enum: ["dynamics", "leadership", "communication", "harmony", "conflict", "growth"],
          description: "Focus area for group analysis",
          default: "dynamics"
        }
      },
      required: ["groupMembers"]
    }
  }
]; 