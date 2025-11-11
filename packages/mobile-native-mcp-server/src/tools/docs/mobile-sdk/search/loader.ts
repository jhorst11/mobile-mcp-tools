import fs from 'fs';

interface Chunk {
  text: string;
  file_path: string;
  similarity?: number;
  [key: string]: unknown; // Allow other properties from JSONL
}

interface IndexEntry {
  index: number;
  searchableText: string;
  filePath: string;
}

interface ScoreEntry {
  score: number;
  index: number;
}

export class EmbeddingSearch {
  private embeddingsPath: string;
  private chunks: Chunk[] = [];
  private index: IndexEntry[] | null = null; // For text search indexing

  constructor(embeddingsPath: string) {
    this.embeddingsPath = embeddingsPath;
  }

  /**
   * Load embeddings from JSONL file
   */
  async load(): Promise<void> {
    const fileContent = fs.readFileSync(this.embeddingsPath, 'utf-8');
    const lines = fileContent.trim().split('\n');

    for (const line of lines) {
      const data = JSON.parse(line) as Chunk;
      this.chunks.push(data);
    }

    // Build text search index
    this.buildIndex();
  }

  /**
   * Build a simple text search index
   */
  private buildIndex(): void {
    // Create a searchable text index
    this.index = this.chunks.map((chunk, idx) => ({
      index: idx,
      searchableText: this.normalizeText(chunk.text),
      filePath: chunk.file_path.toLowerCase(),
    }));
  }

  /**
   * Normalize text for searching (lowercase, remove punctuation)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate text similarity score using simple keyword matching
   */
  private calculateTextScore(query: string, text: string, filePath: string): number {
    const normalizedQuery = this.normalizeText(query);
    const queryTerms = normalizedQuery.split(' ').filter(term => term.length > 2);

    if (queryTerms.length === 0) {
      return 0;
    }

    let score = 0;
    const normalizedText = this.normalizeText(text);
    const normalizedFilePath = filePath.toLowerCase();

    // Exact phrase match (highest score)
    if (normalizedText.includes(normalizedQuery)) {
      score += 10;
    }

    // Individual term matches
    for (const term of queryTerms) {
      const termCount = (normalizedText.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
      score += termCount * 2;

      // Boost if term appears in file path
      if (normalizedFilePath.includes(term)) {
        score += 1;
      }
    }

    // Title/heading boost (lines that start with capital letters or are short)
    const lines = text.split('\n');
    for (const line of lines) {
      const normalizedLine = this.normalizeText(line);
      if (normalizedLine.length < 100 && queryTerms.some(term => normalizedLine.includes(term))) {
        score += 1;
      }
    }

    return score;
  }

  /**
   * Search for relevant documentation chunks using text matching
   */
  async search(query: string, topK: number = 5): Promise<Chunk[]> {
    if (this.chunks.length === 0) {
      await this.load();
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    // Calculate scores for all chunks
    const scores: ScoreEntry[] = [];
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      const score = this.calculateTextScore(query, chunk.text, chunk.file_path);

      if (score > 0) {
        scores.push({ score, index: i });
      }
    }

    // Sort by score (descending)
    scores.sort((a, b) => b.score - a.score);

    // Return top K results
    const results: Chunk[] = [];
    for (let i = 0; i < Math.min(topK, scores.length); i++) {
      const { score, index } = scores[i];
      const chunk: Chunk = { ...this.chunks[index] };

      // Normalize score to 0-1 range for similarity (approximate)
      // Max score is roughly: (queryTerms.length * 2 * avgTermCount) + phraseBonus
      const maxPossibleScore = Math.max(score, 20); // Rough estimate
      chunk.similarity = Math.min(score / maxPossibleScore, 1.0);

      results.push(chunk);
    }

    return results;
  }
}
