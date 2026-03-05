export interface Config {
  databaseUrl: string;
  embeddingModel: string;
  embeddingDimensions: number;
  port: number;
  apiKeyHash: string | null;
  defaultProject: string;
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return {
    databaseUrl,
    embeddingModel: process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2",
    embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS ?? "384", 10),
    port: parseInt(process.env.PORT ?? "3001", 10),
    apiKeyHash: process.env.API_KEY_HASH ?? null,
    defaultProject: process.env.DEFAULT_PROJECT ?? "default",
  };
}
