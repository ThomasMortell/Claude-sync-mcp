import type { Config } from "../config.js";
import { LocalEmbeddingProvider } from "./local.js";

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  warmup?(): Promise<void>;
  readonly dimensions: number;
}

export async function createEmbeddingProvider(
  config: Config
): Promise<EmbeddingProvider> {
  const provider = new LocalEmbeddingProvider(
    config.embeddingModel,
    config.embeddingDimensions
  );
  await provider.warmup();
  return provider;
}
