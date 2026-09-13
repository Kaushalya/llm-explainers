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
      "Compare EAGLE, DFlash, DSpark, and MTP through animated traces, architecture diagrams, and a load-aware playground.",
    href: "/posts/speculative-decoding.html",
    format: "READ + EXPERIMENT",
    chapters: "6 sections",
    accent: "violet",
    concepts: ["drafting", "verification", "serving"],
    featured: true,
  },
  {
    id: "specdec-lab",
    index: "02",
    title: "Speculative decoding terminal lab",
    shortTitle: "SpecDec lab",
    eyebrow: "SIDE-BY-SIDE SIMULATOR",
    description:
      "Step through the same continuation with vanilla AR, target-attached MTP, EAGLE-3, and DFlash while inspecting work and acceptance.",
    href: "/?explainer=speculative-decoding",
    format: "SIMULATE",
    chapters: "4 methods",
    accent: "green",
    concepts: ["tokens", "acceptance", "metrics"],
  },
  {
    id: "diffusion-language-models",
    index: "03",
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
    index: "04",
    title: "LLM quantization without the hand-waving",
    shortTitle: "Quantization",
    eyebrow: "PRECISION + PERFORMANCE",
    description:
      "See values become low-bit codes, expose the accuracy tradeoffs, and estimate memory and throughput without confusing storage with compute.",
    href: "/quantization-explainer.html",
    format: "CALCULATE + INSPECT",
    chapters: "4 experiments",
    accent: "amber",
    concepts: ["weights", "KV cache", "throughput"],
  },
];
