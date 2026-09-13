export type Explainer = {
  id: string;
  index: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  href: string;
  format: string;
  chapters: string;
  accent: "green" | "cyan" | "violet" | "amber";
  concepts: string[];
  featured?: boolean;
  companion?: {
    label: string;
    href: string;
  };
};

/**
 * The explainer catalog is the single inventory used by the homepage and
 * shared navigation. Add new public explainers here when they land.
 */
export const explainers: Explainer[] = [
  {
    id: "speculative-decoding",
    index: "01",
    title: "Speculative decoding, from draft to verification",
    shortTitle: "Speculative decoding",
    eyebrow: "INTERACTIVE FIELD GUIDE",
    description:
      "Compare EAGLE, DFlash, DFlash 2, DSpark, and MTP through animated traces, architecture diagrams, and a load-aware playground.",
    href: "/posts/speculative-decoding.html",
    format: "READ + EXPERIMENT",
    chapters: "6 sections",
    accent: "violet",
    concepts: ["drafting", "verification", "serving"],
    featured: true,
    companion: {
      label: "OPEN SPECDEC LAB",
      href: "/?explainer=speculative-decoding",
    },
  },
  {
    id: "diffusion-language-models",
    index: "02",
    title: "Diffusion language models",
    shortTitle: "Diffusion LMs",
    eyebrow: "ITERATIVE GENERATION",
    description:
      "Build an intuition for corruption, denoising, bidirectional attention, editing, and the real cost of parallel token generation.",
    href: "/?explainer=diffusion",
    format: "LEARN BY CHANGING",
    chapters: "7 chapters",
    accent: "cyan",
    concepts: ["denoising", "attention", "editing"],
  },
  {
    id: "quantization",
    index: "03",
    title: "LLM quantization without the hand-waving",
    shortTitle: "Quantization",
    eyebrow: "PRECISION + PERFORMANCE",
    description:
      "See values become low-bit codes, expose the accuracy tradeoffs, and estimate memory and throughput without confusing storage with compute.",
    href: "/posts/quantization-explainer.html",
    format: "CALCULATE + INSPECT",
    chapters: "4 experiments",
    accent: "amber",
    concepts: ["weights", "KV cache", "throughput"],
  },
];
