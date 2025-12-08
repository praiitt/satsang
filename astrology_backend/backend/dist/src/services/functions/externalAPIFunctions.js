export const externalAPIFunctions = [
  {
    name: "get_weather_data",
    description: "Get current weather data for a specific location to enhance astrological readings",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City name or coordinates for weather data"
        },
        coordinates: {
          type: "object",
          description: "Geographic coordinates",
          properties: {
            latitude: { type: "number" },
            longitude: { type: "number" }
          }
        },
        includeForecast: {
          type: "boolean",
          description: "Whether to include weather forecast",
          default: false
        }
      },
      required: ["location"]
    }
  },
  {
    name: "get_yoga_poses",
    description: "Get yoga poses and sequences from external API",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced", "therapeutic", "meditation", "pranayama"],
          description: "Category of yoga poses to retrieve",
          default: "beginner"
        },
        focus: {
          type: "string",
          enum: ["flexibility", "strength", "balance", "relaxation", "energy", "meditation"],
          description: "Focus area for yoga poses",
          default: "general"
        },
        duration: {
          type: "string",
          enum: ["5_min", "10_min", "15_min", "30_min", "45_min", "60_min"],
          description: "Duration of yoga session",
          default: "15_min"
        },
        difficulty: {
          type: "string",
          enum: ["easy", "moderate", "challenging"],
          description: "Difficulty level of poses",
          default: "moderate"
        }
      }
    }
  },
  {
    name: "get_astrological_events",
    description: "Get upcoming astrological events and planetary movements",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date for events (YYYY-MM-DD)",
          default: "current"
        },
        endDate: {
          type: "string",
          description: "End date for events (YYYY-MM-DD)",
          default: "30_days_from_start"
        },
        eventTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["new_moon", "full_moon", "planetary_transits", "retrogrades", "eclipses", "solstices", "equinoxes"]
          },
          description: "Types of astrological events to include",
          default: ["new_moon", "full_moon", "planetary_transits"]
        }
      }
    }
  },
  {
    name: "get_crystal_recommendations",
    description: "Get crystal recommendations based on astrological and wellness needs",
    parameters: {
      type: "object",
      properties: {
        purpose: {
          type: "string",
          enum: ["protection", "healing", "love", "prosperity", "spiritual_growth", "energy_clearing", "meditation"],
          description: "Purpose for crystal use",
          default: "general"
        },
        zodiacSign: {
          type: "string",
          enum: ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"],
          description: "User's zodiac sign for personalized recommendations"
        },
        chakra: {
          type: "string",
          enum: ["root", "sacral", "solar_plexus", "heart", "throat", "third_eye", "crown"],
          description: "Chakra to focus on"
        },
        budget: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Budget range for crystal recommendations",
          default: "medium"
        }
      }
    }
  },
  {
    name: "get_meditation_guidance",
    description: "Get personalized meditation guidance and techniques",
    parameters: {
      type: "object",
      properties: {
        experienceLevel: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description: "User's meditation experience level",
          default: "beginner"
        },
        goal: {
          type: "string",
          enum: ["stress_relief", "focus", "spiritual_growth", "emotional_healing", "mindfulness", "sleep"],
          description: "Primary goal for meditation",
          default: "stress_relief"
        },
        duration: {
          type: "string",
          enum: ["5_min", "10_min", "15_min", "20_min", "30_min", "45_min", "60_min"],
          description: "Preferred meditation duration",
          default: "10_min"
        },
        style: {
          type: "string",
          enum: ["mindfulness", "transcendental", "loving_kindness", "body_scan", "breath_focus", "mantra", "guided"],
          description: "Meditation style preference",
          default: "mindfulness"
        }
      }
    }
  },
  {
    name: "get_ayurvedic_recommendations",
    description: "Get Ayurvedic recommendations for diet, lifestyle, and wellness",
    parameters: {
      type: "object",
      properties: {
        dosha: {
          type: "string",
          enum: ["vata", "pitta", "kapha", "vata-pitta", "pitta-kapha", "vata-kapha", "tridosha"],
          description: "User's dosha type"
        },
        season: {
          type: "string",
          enum: ["spring", "summer", "autumn", "winter"],
          description: "Current season for seasonal recommendations",
          default: "current"
        },
        focus: {
          type: "string",
          enum: ["diet", "lifestyle", "herbs", "daily_routine", "seasonal_practices", "detox"],
          description: "Focus area for recommendations",
          default: "daily_routine"
        },
        healthConcerns: {
          type: "array",
          items: {
            type: "string",
            enum: ["digestion", "sleep", "energy", "stress", "immunity", "skin", "weight"]
          },
          description: "Specific health concerns to address"
        }
      },
      required: ["dosha"]
    }
  },
  {
    name: "get_spiritual_guidance",
    description: "Get spiritual guidance and practices based on user's spiritual journey",
    parameters: {
      type: "object",
      properties: {
        spiritualLevel: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced", "seeker"],
          description: "User's spiritual development level",
          default: "beginner"
        },
        tradition: {
          type: "string",
          enum: ["vedic", "buddhist", "yogic", "shamanic", "new_age", "eclectic"],
          description: "Preferred spiritual tradition",
          default: "eclectic"
        },
        focus: {
          type: "string",
          enum: ["self_discovery", "healing", "enlightenment", "service", "devotion", "wisdom"],
          description: "Focus area for spiritual growth",
          default: "self_discovery"
        },
        timeAvailable: {
          type: "string",
          enum: ["15_min", "30_min", "60_min", "90_min", "flexible"],
          description: "Time available for spiritual practices",
          default: "30_min"
        }
      }
    }
  },
  {
    name: "get_energy_healing_techniques",
    description: "Get energy healing techniques and practices",
    parameters: {
      type: "object",
      properties: {
        technique: {
          type: "string",
          enum: ["reiki", "chakra_balancing", "pranic_healing", "crystal_healing", "sound_healing", "distance_healing"],
          description: "Type of energy healing technique",
          default: "chakra_balancing"
        },
        purpose: {
          type: "string",
          enum: ["healing", "protection", "cleansing", "activation", "harmonization"],
          description: "Purpose of energy work",
          default: "healing"
        },
        chakra: {
          type: "string",
          enum: ["root", "sacral", "solar_plexus", "heart", "throat", "third_eye", "crown", "all"],
          description: "Specific chakra to work with",
          default: "all"
        },
        experienceLevel: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description: "User's experience with energy healing",
          default: "beginner"
        }
      }
    }
  },
  {
    name: "get_moon_phase_guidance",
    description: "Get guidance based on current moon phase and lunar cycles",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date for moon phase analysis (YYYY-MM-DD)",
          default: "current"
        },
        focus: {
          type: "string",
          enum: ["manifestation", "release", "intention_setting", "rituals", "meditation", "crystal_work"],
          description: "Focus area for moon phase guidance",
          default: "general"
        },
        zodiacSign: {
          type: "string",
          enum: ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"],
          description: "User's zodiac sign for personalized lunar guidance"
        }
      }
    }
  }
]; 