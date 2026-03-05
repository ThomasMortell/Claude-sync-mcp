import type { EmbeddingProvider } from "./provider.js";

let pipeline: any = null;

async function getPipeline(model: string) {
  if (!pipeline) {
    const { pipeline: createPipeline } = await import(
      "@huggingface/transformers"
    );
    pipeline = await createPipeline("feature-extraction", model, {
      dtype: "fp32",
    });
  }
  return pipeline;
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;

  constructor(
    private model: string = "Xenova/all-MiniLM-L6-v2",
    dimensions: number = 384
  ) {
    this.dimensions = dimensions;
  }

  async warmup(): Promise<void> {
    console.log(`Loading embedding model: ${this.model}...`);
    await getPipeline(this.model);
    console.log("Embedding model loaded.");
  }

  async embed(text: string): Promise<number[]> {
    const pipe = await getPipeline(this.model);

    // Truncate to model's max token length (~256 tokens, ~1024 chars conservatively)
    const truncated = text.slice(0, 8192);

    const output = await pipe(truncated, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(output.data as Float32Array);
  }
}
