export function generateSearchTerms(trackData: any): string[] {
    const textToTokenize: string[] = [];

    if (trackData.title) textToTokenize.push(trackData.title);
    if (trackData.prompt) textToTokenize.push(trackData.prompt);
    if (trackData.category) textToTokenize.push(trackData.category);
    if (trackData.healingBenefits) textToTokenize.push(trackData.healingBenefits);
    if (trackData.tags && Array.isArray(trackData.tags)) {
        textToTokenize.push(...trackData.tags);
    }
    if (trackData.lyrics) textToTokenize.push(trackData.lyrics);
    if (trackData.story) textToTokenize.push(trackData.story);

    // If there are sub-tracks (Suno returns multiple tracks in an array sometimes)
    if (trackData.tracks && Array.isArray(trackData.tracks)) {
        trackData.tracks.forEach((subTrack: any) => {
            if (subTrack.title) textToTokenize.push(subTrack.title);
            if (subTrack.lyrics) textToTokenize.push(subTrack.lyrics);
            if (subTrack.prompt) textToTokenize.push(subTrack.prompt);
            if (subTrack.tags && Array.isArray(subTrack.tags)) {
                textToTokenize.push(...subTrack.tags);
            }
        });
    }

    const fullText = textToTokenize.join(' ').toLowerCase();
    
    // Split by non-alphanumeric characters to get words
    const words = fullText.split(/[\s,.\-!?"'()\[\]{}|\\/;:_]+/);

    const termSet = new Set<string>();

    for (const word of words) {
        // Only keep words with 3 or more characters
        if (word && word.length >= 3) {
            termSet.add(word);
        }
    }

    // Convert Set to Array
    const terms = Array.from(termSet);
    
    // Firestore has a limit of ~20,000 indexed entries per document,
    // but practically we should limit search_terms to avoid hitting size limits
    // Typically a song won't have more than 1000 unique words anyway
    return terms.slice(0, 2000); 
}
