/**
 * Enrichment utils: extract contact info from bio text
 * and determine the best outreach channel.
 */

/**
 * Extract phone numbers from bio text
 * Handles Indian formats: +91XXXXXXXXXX, 91XXXXXXXXXX, 10-digit numbers
 */
export function extractPhone(text: string): string | null {
    if (!text) return null;
    // Match +91, 91 prefix, or raw 10-digit Indian mobile
    const patterns = [
        /(?:\+91|91)[\s\-]?([6-9]\d{9})/,
        /(?<!\d)([6-9]\d{9})(?!\d)/,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const digits = match[1] || match[0];
            return `+91${digits.replace(/\D/g, '').slice(-10)}`;
        }
    }
    return null;
}

/**
 * Extract WhatsApp link (wa.me or api.whatsapp.com)
 */
export function extractWhatsApp(text: string): string | null {
    if (!text) return null;
    const match = text.match(/https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send)[^\s]*/i);
    return match ? match[0] : null;
}

/**
 * Extract email from bio or webpage text
 */
export function extractEmail(text: string): string | null {
    if (!text) return null;
    const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    return match ? match[0].toLowerCase() : null;
}

/**
 * Extract website URL (not social media platforms)
 */
export function extractWebsite(text: string): string | null {
    if (!text) return null;
    const SOCIAL_DOMAINS = ['instagram.com', 'facebook.com', 'twitter.com', 'youtube.com', 
        'wa.me', 'whatsapp.com', 'linktr.ee', 't.me', 'threads.net'];
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const matches = text.match(urlPattern) || [];
    for (const url of matches) {
        if (!SOCIAL_DOMAINS.some(d => url.includes(d))) {
            return url;
        }
    }
    return null;
}

/**
 * Extract Linktree URL
 */
export function extractLinktree(text: string): string | null {
    if (!text) return null;
    const match = text.match(/https?:\/\/linktr\.ee\/[^\s]*/i);
    return match ? match[0] : null;
}

/**
 * Extract city/location from Indian bio text
 */
export function extractLocation(text: string): string | null {
    if (!text) return null;
    const INDIAN_CITIES = [
        'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
        'Pune', 'Varanasi', 'Vrindavan', 'Mathura', 'Ayodhya', 'Haridwar',
        'Rishikesh', 'Jaipur', 'Ahmedabad', 'Surat', 'Nagpur', 'Bhopal',
        'Lucknow', 'Patna', 'Chandigarh', 'Amritsar', 'Jodhpur', 'Udaipur',
        'Goa', 'Kochi', 'Indore', 'Nashik', 'Dehradun', 'Agra'
    ];
    for (const city of INDIAN_CITIES) {
        if (new RegExp(`\\b${city}\\b`, 'i').test(text)) return city;
    }
    // Match "📍 CityName" pattern common in Instagram bios
    const locationPin = text.match(/📍\s*([A-Za-z\s]+)/);
    if (locationPin) return locationPin[1].trim();
    return null;
}

/**
 * Determine the best contact method based on available data
 */
export function determineBestContact(contact: {
    phone?: string | null;
    whatsappUrl?: string | null;
    email?: string | null;
    website?: string | null;
}): 'whatsapp' | 'email' | 'dm' | 'call' {
    if (contact.whatsappUrl || contact.phone) return 'whatsapp';
    if (contact.email) return 'email';
    if (contact.website) return 'dm'; // Can use contact form
    return 'dm';
}

/**
 * Detect language of content
 */
export function detectLanguage(text: string): 'hindi' | 'english' | 'sanskrit' | 'urdu' | 'other' {
    if (!text) return 'other';
    // Devanagari script = Hindi/Sanskrit
    if (/[\u0900-\u097F]/.test(text)) {
        // Sanskrit markers
        if (/\b(om|aum|namah|shivaya|ganesh|brahma|vishnu|mantra|shloka)\b/i.test(text)) return 'sanskrit';
        return 'hindi';
    }
    // Urdu/Arabic script
    if (/[\u0600-\u06FF]/.test(text)) return 'urdu';
    // Check for Urdu romanized markers
    if (/\b(shayari|ghazal|nazm|masnavi|rubai|murshid)\b/i.test(text)) return 'urdu';
    return 'english';
}

/**
 * Compute poet score from profile data (0–100)
 */
export function computePoetScore(data: {
    bio?: string;
    hashtags?: string[];
    followersCount?: number;
    postsCount?: number;
    engagementRate?: number;
}): number {
    let score = 0;

    const POET_KEYWORDS = [
        'poet', 'shayar', 'kavita', 'kavishwar', 'lyricist', 'writer',
        'bhajan', 'mantra', 'doha', 'ghazal', 'nazm', 'spiritual', 'devotional',
        'कवि', 'शायर', 'कविता', 'भजन', 'मंत्र', 'गज़ल'
    ];

    const SPIRITUAL_HASHTAGS = [
        'bhajanwriter', 'hindipoetry', 'shayari', 'spiritualpoetry', 'mantrawriter',
        'devotionalpoet', 'bhaktipoet', 'kavita', 'bhajan', 'spiritualawakening',
        'healingfrequency', 'soundhealing', 'meditation', 'bhakti'
    ];

    // Bio keyword match (max 30 pts)
    if (data.bio) {
        const bioLower = data.bio.toLowerCase();
        const keywordMatches = POET_KEYWORDS.filter(k => bioLower.includes(k.toLowerCase())).length;
        score += Math.min(keywordMatches * 10, 30);
    }

    // Spiritual hashtag match (max 25 pts)
    if (data.hashtags?.length) {
        const hashtagsLower = data.hashtags.map(h => h.toLowerCase().replace('#', ''));
        const hashtagMatches = SPIRITUAL_HASHTAGS.filter(h => hashtagsLower.includes(h)).length;
        score += Math.min(hashtagMatches * 5, 25);
    }

    // Engagement rate (max 25 pts)
    if (data.engagementRate) {
        // 3%+ engagement is excellent
        score += Math.min(Math.floor(data.engagementRate * 8), 25);
    }

    // Post count activity (max 20 pts)
    if (data.postsCount) {
        if (data.postsCount > 200) score += 20;
        else if (data.postsCount > 100) score += 15;
        else if (data.postsCount > 50) score += 10;
        else if (data.postsCount > 10) score += 5;
    }

    return Math.min(score, 100);
}

/**
 * Extract all contact info from bio in one shot
 */
export function extractAllContactInfo(bio: string): {
    phone: string | null;
    whatsappUrl: string | null;
    email: string | null;
    website: string | null;
    linktreeUrl: string | null;
    location: string | null;
    language: string;
    bestContactMethod: 'whatsapp' | 'email' | 'dm' | 'call';
} {
    const phone = extractPhone(bio);
    const whatsappUrl = extractWhatsApp(bio);
    const email = extractEmail(bio);
    const website = extractWebsite(bio);
    const linktreeUrl = extractLinktree(bio);
    const location = extractLocation(bio);
    const language = detectLanguage(bio);
    const bestContactMethod = determineBestContact({ phone, whatsappUrl, email, website });

    return { phone, whatsappUrl, email, website, linktreeUrl, location, language, bestContactMethod };
}
