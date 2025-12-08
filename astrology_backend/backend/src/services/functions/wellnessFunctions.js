export const wellnessFunctions = [
  {
    name: "get_yoga_recommendations",
    description: "Get personalized yoga recommendations based on user's wellness goals and dosha",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "User's wellness query or specific concern"
        },
        userProfile: {
          type: "object",
          description: "User's wellness profile including dosha and preferences",
          properties: {
            dosha: {
              type: "string",
              enum: ["vata", "pitta", "kapha", "vata-pitta", "pitta-kapha", "vata-kapha", "tridosha"],
              description: "User's primary dosha or dosha combination"
            },
            fitnessLevel: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced"],
              description: "User's fitness level"
            },
            goals: {
              type: "array",
              items: {
                type: "string",
                enum: ["flexibility", "strength", "meditation", "stress_relief", "energy", "balance", "spiritual_growth"]
              },
              description: "User's wellness goals"
            },
            timeAvailable: {
              type: "string",
              enum: ["15_min", "30_min", "45_min", "60_min", "90_min"],
              description: "Time available for practice"
            }
          }
        },
        focus: {
          type: "string",
          enum: ["morning", "evening", "stress_relief", "energy_boost", "flexibility", "strength", "meditation"],
          description: "Specific focus area for yoga practice",
          default: "general"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_dosha_analysis",
    description: "Analyze user's dosha based on questionnaire answers and provide personalized recommendations",
    parameters: {
      type: "object",
      properties: {
        answers: {
          type: "array",
          items: {
            type: "integer",
            minimum: 1,
            maximum: 5
          },
          description: "Array of answers from dosha questionnaire (1-5 scale)",
          minItems: 20,
          maxItems: 50
        },
        userProfile: {
          type: "object",
          description: "Additional user information for dosha analysis",
          properties: {
            age: { type: "integer", description: "User's age" },
            gender: { type: "string", enum: ["male", "female", "other"] },
            lifestyle: { type: "string", enum: ["sedentary", "moderate", "active", "very_active"] },
            diet: { type: "string", enum: ["vegetarian", "non_vegetarian", "vegan", "mixed"] }
          }
        }
      },
      required: ["answers"]
    }
  },
  {
    name: "get_mantra_suggestions",
    description: "Suggest appropriate mantras for spiritual practice and meditation",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "User's spiritual query or specific need"
        },
        userProfile: {
          type: "object",
          description: "User's spiritual profile",
          properties: {
            experienceLevel: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced"],
              description: "User's spiritual practice experience"
            },
            tradition: {
              type: "string",
              enum: ["vedic", "buddhist", "yogic", "general"],
              description: "Preferred spiritual tradition"
            },
            goals: {
              type: "array",
              items: {
                type: "string",
                enum: ["peace", "prosperity", "health", "wisdom", "protection", "devotion", "enlightenment"]
              },
              description: "Spiritual goals"
            }
          }
        },
        duration: {
          type: "string",
          enum: ["5_min", "10_min", "15_min", "30_min", "60_min"],
          description: "Preferred duration for mantra practice",
          default: "10_min"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_ritual_recommendations",
    description: "Recommend spiritual rituals and practices based on user's needs",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "User's query about rituals or spiritual practices"
        },
        userProfile: {
          type: "object",
          description: "User's spiritual and lifestyle profile",
          properties: {
            dosha: {
              type: "string",
              enum: ["vata", "pitta", "kapha", "vata-pitta", "pitta-kapha", "vata-kapha", "tridosha"]
            },
            timeOfDay: {
              type: "string",
              enum: ["morning", "afternoon", "evening", "night"],
              description: "Preferred time for rituals"
            },
            spaceAvailable: {
              type: "string",
              enum: ["minimal", "moderate", "dedicated"],
              description: "Available space for rituals"
            }
          }
        },
        purpose: {
          type: "string",
          enum: ["purification", "blessing", "healing", "protection", "prosperity", "spiritual_growth"],
          description: "Purpose of the ritual",
          default: "spiritual_growth"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_wellness_advice",
    description: "Provide personalized wellness advice based on Ayurvedic principles",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "User's wellness query or health concern"
        },
        userProfile: {
          type: "object",
          description: "User's health and wellness profile",
          properties: {
            dosha: {
              type: "string",
              enum: ["vata", "pitta", "kapha", "vata-pitta", "pitta-kapha", "vata-kapha", "tridosha"]
            },
            age: { type: "integer" },
            lifestyle: {
              type: "string",
              enum: ["sedentary", "moderate", "active", "very_active"]
            },
            currentHealth: {
              type: "array",
              items: {
                type: "string",
                enum: ["stress", "digestion", "sleep", "energy", "immunity", "mental_health"]
              },
              description: "Current health concerns"
            }
          }
        },
        season: {
          type: "string",
          enum: ["spring", "summer", "autumn", "winter"],
          description: "Current season for seasonal recommendations",
          default: "current"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_cosmic_guidance",
    description: "Provide spiritual and cosmic guidance based on astrological and spiritual principles",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "User's spiritual or cosmic guidance query"
        },
        userProfile: {
          type: "object",
          description: "User's spiritual profile",
          properties: {
            zodiacSign: {
              type: "string",
              enum: ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]
            },
            spiritualLevel: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced", "seeker"],
              description: "User's spiritual development level"
            },
            interests: {
              type: "array",
              items: {
                type: "string",
                enum: ["meditation", "yoga", "astrology", "crystals", "energy_healing", "chakras", "kundalini"]
              },
              description: "Spiritual interests"
            }
          }
        },
        guidanceType: {
          type: "string",
          enum: ["daily", "life_path", "spiritual_growth", "healing", "manifestation"],
          description: "Type of guidance needed",
          default: "daily"
        }
      },
      required: ["query"]
    }
  }
]; 