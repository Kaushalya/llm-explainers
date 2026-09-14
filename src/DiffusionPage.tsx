import { useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./diffusion.css";
import SiteHeader from "./SiteHeader";

const sources = [
  [
    "LLaDA · masked diffusion at language-model scale",
    "https://arxiv.org/abs/2502.09992",
  ],
  [
    "Diffusion-LM · continuous word embeddings",
    "https://arxiv.org/abs/2205.14217",
  ],
  ["D3PM · structured discrete corruption", "https://arxiv.org/abs/2107.03006"],
  [
    "SEDD · learning discrete probability ratios",
    "https://proceedings.mlr.press/v235/lou24a.html",
  ],
  [
    "MDLM · simplified masked diffusion objectives",
    "https://arxiv.org/abs/2406.07524",
  ],
  [
    "Block Diffusion · autoregression across blocks",
    "https://arxiv.org/abs/2503.09573",
  ],
  [
    "Dream · adapting an autoregressive checkpoint",
    "https://github.com/DreamLM/Dream",
  ],
  [
    "LLaDA2.2 · editing, block routing, and agentic RL",
    "https://huggingface.co/inclusionAI/LLaDA2.2-flash",
  ],
];
const sentence = "The small robot learned to fold paper cranes".split(" ");
const order = [0, 5, 2, 6, 1, 7, 3, 4];
function Ref({ n }: { n: number }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      if (!trigger.current || !popup.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      if (
        !trigger.current.getClientRects().length ||
        anchor.bottom < 0 ||
        anchor.top > innerHeight
      ) {
        popup.current.hidePopover();
        return;
      }
      const box = popup.current.getBoundingClientRect();
      popup.current.style.left = `${Math.max(12, Math.min(anchor.left, innerWidth - box.width - 12))}px`;
      const top =
        anchor.bottom + 8 + box.height <= innerHeight - 12
          ? anchor.bottom + 8
          : anchor.top - box.height - 8;
      popup.current.style.top = `${Math.max(12, top)}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(document.body);
    observer.observe(popup.current!);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="dl-ref"
        popoverTarget={id}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        aria-label={`Source: ${sources[n][0]}`}
      >
        [{n + 1}]
      </button>
      {createPortal(
        <div
          ref={popup}
          id={id}
          popover="auto"
          role="dialog"
          aria-labelledby={`${id}-title`}
          className="dl-citation"
          onToggle={(event) => setOpen(event.newState === "open")}
        >
          <button
            type="button"
            className="dl-citation-close"
            aria-label="Close citation"
            popoverTarget={id}
            popoverTargetAction="hide"
          >
            ×
          </button>
          <span className="dl-citation-label">SOURCE [{n + 1}]</span>
          <h3 id={`${id}-title`}>{sources[n][0]}</h3>
          <a href={sources[n][1]} target="_blank" rel="noopener noreferrer">
            {sources[n][1]}
          </a>
        </div>,
        document.body,
      )}
    </>
  );
}
function Strip({ words, active = [] }: { words: string[]; active?: number[] }) {
  return (
    <div className="dl-tokens">
      {words.map((w, i) => (
        <span
          key={i}
          className={`${w === "[MASK]" ? "masked" : ""} ${active.includes(i) ? "fresh" : ""}`}
        >
          <small>{String(i + 1).padStart(2, "0")}</small>
          {w}
        </span>
      ))}
    </div>
  );
}
function Experiment({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dl-experiment">
      <div className="dl-lab-label">
        INTERACTIVE LAB <span>{title}</span>
      </div>
      {children}
    </div>
  );
}
function Quiz({
  question,
  options,
  correct,
  explanation,
}: {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}) {
  const [answer, setAnswer] = useState<number | null>(null);
  return (
    <div className="dl-quiz">
      <b>CHECK YOUR INTUITION</b>
      <p>{question}</p>
      <div className="dl-controls">
        {options.map((o, i) => (
          <button
            key={o}
            aria-pressed={answer === i}
            onClick={() => setAnswer(i)}
          >
            {o}
          </button>
        ))}
      </div>
      <p aria-live="polite">
        {answer !== null
          ? `${answer === correct ? "Correct." : "Try again."} ${explanation}`
          : "Choose an answer to reveal the reasoning."}
      </p>
    </div>
  );
}
function Generation() {
  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState(4);
  const n = Math.ceil((step * 8) / budget);
  return (
    <Experiment title="One call, different progress">
      <p>
        Advance both decoders by one model call. The masked sampler reveals a
        scheduled group; the AR decoder appends one token.
      </p>
      <div className="dl-controls">
        <button
          onClick={() => setStep(Math.min(8, step + 1))}
          disabled={step === 8}
        >
          Next model call →
        </button>
        <button onClick={() => setStep(0)} disabled={!step}>
          Reset
        </button>
        <label>
          Denoising calls{" "}
          <select
            value={budget}
            onChange={(e) => {
              setBudget(+e.target.value);
              setStep(0);
            }}
          >
            {[2, 4, 8].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="dl-lane">
        <h3>
          01 / Autoregressive{" "}
          <small>
            {step}/8 tokens · {step} calls
          </small>
        </h3>
        <Strip
          words={sentence.map((w, i) => (i < step ? w : "…"))}
          active={[step - 1]}
        />
      </div>
      <div className="dl-lane">
        <h3>
          02 / Masked diffusion{" "}
          <small>
            {Math.min(8, n)}/8 tokens · {Math.min(step, budget)} calls
          </small>
        </h3>
        <Strip
          words={sentence.map((w, i) => (order.indexOf(i) < n ? w : "[MASK]"))}
          active={order.slice(Math.ceil(((step - 1) * 8) / budget), n)}
        />
      </div>
      <p className="dl-result" aria-live="polite">
        {step === 0
          ? "Both begin with no generated text. Diffusion reserves eight output slots."
          : step >= budget
            ? "The diffusion sequence is complete. Fewer sequential calls can help, but each call processes multiple positions."
            : "Revealed tokens become context for the next round. Positions revealed in this round were predicted from the same previous state."}
      </p>
      <small>
        Scripted word-level illustration, not model inference or a speed
        benchmark. Real tokens may be word pieces; real predictions can be
        wrong. Reducing steps does not guarantee the same answer.
      </small>
    </Experiment>
  );
}
function Attention() {
  const [mode, setMode] = useState("Masked");
  const [position, setPosition] = useState(3);
  const visible = (i: number) =>
    mode === "AR"
      ? i <= position
      : mode === "Block"
        ? Math.floor(i / 4) <= Math.floor(position / 4)
        : true;
  return (
    <Experiment title="Which context can a position see?">
      <div className="dl-controls">
        {["AR", "Masked", "Block"].map((m) => (
          <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
            {m}
          </button>
        ))}
      </div>
      <p>
        Select a query position. “Visible” marks the inputs it can attend to.
      </p>
      <div className="dl-attention">
        {sentence.map((w, i) => (
          <button
            key={i}
            onClick={() => setPosition(i)}
            aria-pressed={position === i}
            className={visible(i) ? "visible" : ""}
          >
            <small>
              {i + 1} ·{" "}
              {i === position ? "QUERY" : visible(i) ? "VISIBLE" : "BLOCKED"}
            </small>
            {w}
          </button>
        ))}
      </div>
      <p className="dl-result" aria-live="polite">
        {mode === "AR"
          ? `Position ${position + 1} sees itself and earlier input tokens; its output predicts the next token. Future input tokens are hidden.`
          : mode === "Masked"
            ? `Position ${position + 1} sees both sides of the corrupted input, including mask symbols. It cannot see the hidden clean answers.`
            : `Position ${position + 1} sees earlier blocks and both directions within its four-token block. Future blocks are hidden.`}
      </p>
      <small>
        Attention topology only. Words label positions here; at denoising time
        some inputs would be masks.
      </small>
    </Experiment>
  );
}
function Training() {
  const [t, setT] = useState(0.5);
  const [seed, setSeed] = useState(0);
  const masked = sentence.map(
    (_, i) => ((i * 37 + seed * 19 + 13) % 101) / 101 < t,
  );
  const count = masked.filter(Boolean).length;
  return (
    <Experiment title="Corrupt → predict → score">
      <label className="dl-slider">
        Mask probability t <output>{t.toFixed(2)}</output>
        <input
          aria-label="Mask probability"
          type="range"
          min=".05"
          max="1"
          step=".05"
          value={t}
          onChange={(e) => setT(+e.target.value)}
        />
      </label>
      <button onClick={() => setSeed(seed + 1)}>Resample corruption</button>
      <Strip words={sentence.map((w, i) => (masked[i] ? "[MASK]" : w))} />
      <p>
        Targets:{" "}
        {sentence.filter((_, i) => masked[i]).join(" · ") ||
          "No masked positions in this draw; zero loss contribution."}
      </p>
      <div className="dl-stats" aria-live="polite">
        <div>
          <small>MASKED IN THIS DRAW</small>
          <strong>{count} / 8</strong>
        </div>
        <div>
          <small>WEIGHT PER MASKED TOKEN</small>
          <strong>{(1 / t).toFixed(2)}×</strong>
        </div>
        <div>
          <small>EXPECTED WEIGHTED COUNT</small>
          <strong>8t / t = 8</strong>
        </div>
      </div>
      <p>
        The expected number of masked tokens grows with t. Weighting by 1/t
        compensates for that count in expectation; it does not make every draw’s
        loss equal. Harder predictions still cost more.
      </p>
      <details>
        <summary>Open the training objective</summary>
        <div className="dl-equation">
          L = E<sub>x₀,t,xₜ</sub> [ −(1/t) Σ<sub>i masked</sub> log p
          <sub>θ</sub>(x₀ⁱ | xₜ) ]
        </div>
        <p>
          For a linear masking schedule, sample t uniformly from (0, 1], mask
          each token with probability t, and compute cross-entropy on masked
          positions. x₀ is clean text; xₜ is corrupted text. The model predicts
          the original token, and gradients update its parameters. The practical
          objective bounds negative log-likelihood; 1/t follows from the
          diffusion derivation. Other schedules and normalizations change the
          expression. <Ref n={0} />
          <Ref n={4} />
        </p>
        <p>
          This lab uses deterministic pseudo-random thresholds for
          reproducibility. The equation describes random masking over the
          training distribution.
        </p>
      </details>
    </Experiment>
  );
}
function Reverse() {
  const [t, setT] = useState(0.8);
  const [ratio, setRatio] = useState(0.75);
  const s = t * ratio;
  const reveal = 1 - ratio;
  return (
    <Experiment title="Why 0.8 → 0.6 reveals 25%">
      <label className="dl-slider">
        Current noise t <output>{t.toFixed(2)}</output>
        <input
          aria-label="Current noise"
          type="range"
          min=".1"
          max="1"
          step=".1"
          value={t}
          onChange={(e) => setT(+e.target.value)}
        />
      </label>
      <label className="dl-slider">
        Earlier noise s <output>{s.toFixed(2)}</output>
        <input
          aria-label="Earlier noise fraction"
          type="range"
          min="0"
          max="1"
          step=".05"
          value={ratio}
          onChange={(e) => setRatio(+e.target.value)}
        />
      </label>
      <div className="dl-prob">
        <span style={{ width: `${ratio * 100}%` }} />
        <span style={{ width: `${reveal * 100}%` }} />
      </div>
      <p className="dl-result" aria-live="polite">
        Remain masked: {(ratio * 100).toFixed(0)}% · Reveal:{" "}
        {(reveal * 100).toFixed(0)}%
      </p>
      <div className="dl-equation">
        P(reveal | currently masked) = (t − s) / t = {reveal.toFixed(2)}
      </div>
      <p>
        The schedule chooses <em>whether</em> to reveal; the network supplies a
        distribution over <em>which token</em> to reveal. This formula assumes
        absorbing masking with marginal mask probability t.
      </p>
      <p>
        In the basic reverse process, a visible token stays fixed.
        Confidence-based selection and editing are additional sampling choices,
        not this exact random transition. <Ref n={0} />
        <Ref n={4} />
      </p>
    </Experiment>
  );
}
const families = [
  {
    name: "Continuous",
    tag: "WHAT IS CORRUPTED?",
    example: "Diffusion-LM",
    flow: [
      "word vectors",
      "+ Gaussian noise",
      "denoise vectors",
      "round to tokens",
    ],
    text: "Add continuous noise to word embeddings, then learn to denoise and map vectors back to discrete words. Gradients can guide the trajectory toward desired attributes.",
    trade:
      "Continuous geometry supports controllable generation; converting smooth vectors into discrete, coherent text is a central challenge.",
    ref: 1,
  },
  {
    name: "Discrete",
    tag: "WHAT IS CORRUPTED?",
    example: "D3PM · SEDD",
    flow: [
      "token IDs",
      "discrete transitions",
      "reverse transitions",
      "token IDs",
    ],
    text: "Corrupt categorical states directly. D3PM supports structured transition matrices, including masking. SEDD learns ratios of noisy-data probabilities with a score-entropy objective.",
    trade:
      "Avoids rounding embeddings to words. The transition process and its parameterization determine which reverse updates are possible.",
    ref: 2,
  },
  {
    name: "Masked",
    tag: "A DISCRETE SPECIAL CASE",
    example: "MDLM · LLaDA · Dream",
    flow: [
      "clean text",
      "replace with [MASK]",
      "predict missing tokens",
      "reveal and repeat",
    ],
    text: "An absorbing mask replaces tokens. MDLM simplifies the objective; LLaDA scales masked diffusion from scratch. Dream instead adapts pretrained autoregressive weights.",
    trade:
      "Bidirectional context supports infilling. Basic sampling fixes revealed tokens, and a fixed output canvas requires a length or stopping policy.",
    ref: 4,
  },
  {
    name: "Block",
    tag: "HOW IS GENERATION ORGANIZED?",
    example: "BD3-LM · LLaDA2 series",
    flow: [
      "completed prefix",
      "noisy next block",
      "denoise block",
      "append and repeat",
    ],
    text: "Model blocks autoregressively while denoising positions inside a block together. Block size bridges fine-grained sequential generation and broad parallel prediction.",
    trade:
      "Can stream completed blocks and cache a fixed prefix under block-causal attention. Each block still needs refinement; later blocks wait for earlier ones.",
    ref: 5,
  },
  {
    name: "Editable",
    tag: "CAN THE CANVAS CHANGE?",
    example: "LLaDA2.2",
    flow: [
      "draft sequence",
      "delete redundancy",
      "insert slots",
      "fill and refine",
    ],
    text: "LLaDA2.2 adds DELETE and INSERT control tokens, allowing changes to sequence structure. Its L-EBPO training uses agentic rewards to improve editing and error correction.",
    trade:
      "Changing length can repair more than a wrong word. Editing needs suitable training and decoding support; it is not automatic in every diffusion LM.",
    ref: 7,
  },
];
function Families() {
  const [index, setIndex] = useState(2);
  const f = families[index];
  return (
    <Experiment title="Explore the design space">
      <div className="dl-controls">
        {families.map((f, i) => (
          <button
            key={f.name}
            aria-pressed={index === i}
            onClick={() => setIndex(i)}
          >
            {f.name}
          </button>
        ))}
      </div>
      <article className="dl-family" aria-live="polite">
        <small>{f.tag}</small>
        <h3>{f.example}</h3>
        <div className="dl-flow">
          {f.flow.map((s, i) => (
            <span key={s}>
              {i > 0 ? "→ " : ""}
              {s}
            </span>
          ))}
        </div>
        <p>
          {f.text} <Ref n={f.ref} />
          {index === 1 && <Ref n={3} />}
          {index === 2 && (
            <>
              <Ref n={0} />
              <Ref n={6} />
            </>
          )}
        </p>
        <p>
          <b>Tradeoff.</b> {f.trade}
        </p>
      </article>
      <p>
        These categories overlap: masked diffusion is discrete; block generation
        can use masked diffusion; editing can be added to blocks. MoE and
        quantization are separate architecture and numerical-precision choices.
      </p>
    </Experiment>
  );
}
function Editing() {
  const [mode, setMode] = useState("Absorbing");
  const [step, setStep] = useState(0);
  const traces: Record<string, string[][]> = {
    Absorbing: [
      ["The", "cat", "cat", "on", "mat"],
      ["The", "cat", "cat", "on", "mat"],
      ["The", "cat", "cat", "on", "mat"],
    ],
    Remasking: [
      ["The", "cat", "cat", "on", "mat"],
      ["The", "cat", "[MASK]", "on", "mat"],
      ["The", "cat", "sat", "on", "mat"],
    ],
    Levenshtein: [
      ["The", "cat", "cat", "on", "mat"],
      ["The", "cat", "[MASK]", "on", "[MASK]", "mat"],
      ["The", "cat", "sat", "on", "the", "mat"],
    ],
  };
  return (
    <Experiment title="Can a wrong draft be repaired?">
      <p>
        Intended sentence: “The cat sat on the mat.” Start from a draft with a
        duplicated word and a missing word.
      </p>
      <div className="dl-controls">
        {Object.keys(traces).map((m) => (
          <button
            key={m}
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setStep(0);
            }}
          >
            {m}
          </button>
        ))}
        <button onClick={() => setStep(step + 1)} disabled={step === 2}>
          Next edit →
        </button>
        <button onClick={() => setStep(0)} disabled={!step}>
          Reset edits
        </button>
      </div>
      <Strip words={traces[mode][step]} />
      <p className="dl-result" aria-live="polite">
        {step === 0
          ? "A five-slot draft. Choose a mechanism, then advance."
          : mode === "Absorbing"
            ? "All tokens are visible. The basic absorbing reverse process has no way to revise them."
            : mode === "Remasking"
              ? step === 1
                ? "Reopen the second “cat” as a mask. The canvas still has five slots."
                : "“sat” replaces the duplicated token. There is still no slot for “the”."
              : step === 1
                ? "Delete the duplicate “cat”; insert slots after “cat” and “on”. The canvas now has six slots."
                : "Fill the new slots with “sat” and “the”. Both wording and length have changed."}
      </p>
      <small>
        Conceptual trace, not LLaDA2.2’s literal control-token protocol. Editing
        may fail in practice. <Ref n={7} />
      </small>
    </Experiment>
  );
}
function Cost() {
  const [block, setBlock] = useState(16);
  const [steps, setSteps] = useState(4);
  const [cost, setCost] = useState(3);
  const calls = (64 / block) * steps;
  return (
    <Experiment title="Fewer calls ≠ guaranteed speed">
      <div className="dl-controls">
        <label>
          Block size{" "}
          <select value={block} onChange={(e) => setBlock(+e.target.value)}>
            {[4, 8, 16, 32, 64].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Calls per block{" "}
          <select value={steps} onChange={(e) => setSteps(+e.target.value)}>
            {[1, 2, 4, 8, 16].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="dl-slider">
        Cost of one block call, relative to one AR decode call{" "}
        <output>{cost}×</output>
        <input
          aria-label="Block call relative cost"
          type="range"
          min="1"
          max="16"
          step=".5"
          value={cost}
          onChange={(e) => setCost(+e.target.value)}
        />
      </label>
      <div className="dl-stats" aria-live="polite">
        <div>
          <small>AR / 64 OUTPUT TOKENS</small>
          <strong>64 calls</strong>
        </div>
        <div>
          <small>BLOCK DIFFUSION</small>
          <strong>{calls} calls</strong>
        </div>
        <div>
          <small>ILLUSTRATIVE SPEED RATIO</small>
          <strong>{(64 / (calls * cost)).toFixed(2)}×</strong>
        </div>
      </div>
      <p>
        Ratio = 64 / (blocks × calls per block × relative call cost). Below 1×
        means slower than AR. This excludes prompt prefill, scheduling, and
        editing overhead; quality is not modeled. The cost slider is an
        assumption, not a measured hardware result.
      </p>
      <p>
        Large parallel updates can lose dependencies among jointly sampled
        tokens. More refinement can improve coordination, but costs extra
        passes. Caching, kernels, batch size, and output quality decide whether
        fewer passes translate into useful speed.
      </p>
    </Experiment>
  );
}
export default function DiffusionPage() {
  useEffect(() => {
    document.body.classList.add("diffusion-page");
    document.title = "Diffusion language models · LLM Explainers";
    return () => document.body.classList.remove("diffusion-page");
  }, []);
  return (
    <>
      <SiteHeader current="diffusion-language-models" />
      <main className="dl-page">
        <a className="dl-skip" href="#dl-basics">
          Skip to lesson
        </a>
        <header className="dl-top">
          <a href="/">← ALL EXPLAINERS</a>
          <span>EXPLAINER / 02</span>
          <span className="dl-status">● INTERACTIVE FIELD GUIDE</span>
        </header>
        <div className="dl-layout">
          <nav className="dl-nav" aria-label="Lesson chapters">
            <b>DIFFUSION / LM</b>
            {[
              "basics",
              "attention",
              "training",
              "reverse",
              "families",
              "editing",
              "tradeoffs",
            ].map((s, i) => (
              <a key={s} href={`#dl-${s}`}>
                <span>0{i + 1}</span>
                {s}
              </a>
            ))}
            <a href="#dl-sources">↗ Reading list</a>
          </nav>
          <div className="dl-content">
            <header className="dl-hero">
              <span className="dl-kicker">
                FROM NEXT TOKEN TO ITERATIVE REFINEMENT
              </span>
              <h1>
                Language, one
                <br />
                <em>denoising step</em> at a time.
              </h1>
              <p>
                What if a language model started with blanks, then built a
                sentence across many positions at once? Explore how diffusion
                turns reconstruction into generation.
              </p>
              <div className="dl-hero-foot">
                <a href="#dl-basics">Start experimenting ↓</a>
                <span>7 chapters · learn by changing things</span>
              </div>
            </header>
            <section id="dl-basics">
              <span className="dl-kicker">01 / THE BASIC IDEA</span>
              <h2>Append a token. Or refine a canvas.</h2>
              <p>
                A token is a small unit of text. An autoregressive (AR) language
                model learns the next-token distribution given a prefix. During
                ordinary generation it samples a token, appends it, and repeats.
                Training can process many positions in parallel even though
                generation has this sequential dependency.
              </p>
              <div className="dl-equation">
                p(x) = ∏<sub>i</sub> p(xᵢ | x₁, …, xᵢ₋₁)
              </div>
              <p>
                A diffusion language model learns to reverse a corruption
                process. For masked diffusion, corruption replaces text with
                mask symbols; generation starts with masked output positions and
                gradually reveals text. A Transformer can still do the
                prediction—the generative objective and sampling procedure
                change. <Ref n={0} />
              </p>
              <Generation />
              <Quiz
                question="If a model reveals four tokens in one round, can the fourth use the newly sampled first token in that same round?"
                options={["Yes, automatically", "No, only next round"]}
                correct={1}
                explanation="Parallel predictions use the same pre-update input. Another forward pass lets the new tokens influence one another."
              />
            </section>
            <section id="dl-attention">
              <span className="dl-kicker">02 / ARCHITECTURE</span>
              <h2>Look both ways before filling a blank.</h2>
              <p>
                Masked denoisers typically use bidirectional self-attention.
                Embeddings, Transformer layers, and a vocabulary prediction head
                remain familiar. Removing a causal mask alone does not make an
                AR checkpoint a trained diffusion model; it needs a compatible
                denoising objective.
              </p>
              <Attention />
              <p>
                Infilling is natural: hold a prefix and suffix fixed and denoise
                the gap. “Bidirectional” means access to available context on
                both sides, not knowledge of future answers.
              </p>
            </section>
            <section id="dl-training">
              <span className="dl-kicker">03 / LEARNING TO RECONSTRUCT</span>
              <h2>Make the problem harder, then learn to undo it.</h2>
              <p>
                Training begins with real, complete text. Sample a noise level
                and a corruption, run the denoiser once, and penalize incorrect
                predictions of the hidden originals. Ordinary training does not
                need to run the entire generation trajectory for each example.
              </p>
              <Training />
              <p>
                In instruction tuning, the prompt can remain visible while the
                response is corrupted and reconstructed. From-scratch
                pretraining (LLaDA) and adaptation of AR weights (Dream) are
                different routes to a denoiser. <Ref n={0} />
                <Ref n={6} />
              </p>
              <details>
                <summary>How is this different from BERT?</summary>
                <p>
                  Both learn to predict masked text with bidirectional context.
                  A diffusion model also specifies a corruption schedule, a
                  reverse generative process, and a matching objective across
                  noise levels. BERT’s conventional masked-token training recipe
                  by itself is not that complete diffusion sampler.
                </p>
              </details>
            </section>
            <section id="dl-reverse">
              <span className="dl-kicker">
                04 / FROM PREDICTION TO GENERATION
              </span>
              <h2>Two questions at every reverse step.</h2>
              <p>
                Which slots should become visible? Which tokens should fill
                them? The basic absorbing process separates these decisions.
                Move from high noise t toward lower noise s, eventually reaching
                clean text at zero.
              </p>
              <Reverse />
              <Quiz
                question="With t = 0.8 and s = 0.6, what fraction of currently masked positions should be revealed in expectation?"
                options={["20%", "25%", "75%"]}
                correct={1}
                explanation="(0.8 − 0.6) / 0.8 = 0.25. The 0.2 difference is a fraction of all positions, not of the currently masked subset."
              />
            </section>
            <section id="dl-families">
              <span className="dl-kicker">05 / THE MODEL LANDSCAPE</span>
              <h2>One idea. Several design choices.</h2>
              <p>
                Ask what gets corrupted, how the reverse process is learned, and
                which positions are generated together. Model names alone hide
                these differences.
              </p>
              <Families />
              <div className="dl-notes">
                <article>
                  <h3>Confidence-based decoding</h3>
                  <p>
                    Prefer higher-confidence predictions when choosing slots to
                    reveal, leaving uncertain ones for more context. Confidence
                    is not correctness. This changes the basic random reveal
                    policy.
                  </p>
                </article>
                <article>
                  <h3>Remasking & self-conditioning</h3>
                  <p>
                    Remasking reopens predictions for another attempt.
                    Self-conditioning feeds a previous prediction back as an
                    input to refinement. These are distinct techniques and
                    require compatible model or sampler designs.
                  </p>
                </article>
                <article>
                  <h3>Guidance & post-training</h3>
                  <p>
                    Guidance biases denoising toward a condition or objective;
                    stronger guidance can reduce diversity. Supervised tuning
                    and reinforcement learning shape useful responses and
                    behavior, beyond simply reconstructing text.
                  </p>
                </article>
                <article>
                  <h3>MoE & precision</h3>
                  <p>
                    A mixture of experts activates a subset of parameters per
                    token or block. Quantization lowers numerical precision.
                    Both can reduce resource costs, but neither defines
                    diffusion. LLaDA2.2 combines block routing and editing.{" "}
                    <Ref n={7} />
                  </p>
                </article>
              </div>
            </section>
            <section id="dl-editing">
              <span className="dl-kicker">
                06 / LEARNING TO CHANGE YOUR MIND
              </span>
              <h2>Filling blanks is not the same as editing.</h2>
              <p>
                Basic absorbing diffusion only reveals masks. To revise visible
                words, reopen or replace them. To fix a missing phrase or remove
                a duplicate, you may also need to change the sequence length.
              </p>
              <Editing />
              <Quiz
                question="Which operation requires more than remasking a fixed set of token slots?"
                options={["Replace “cat” with “dog”", "Insert an extra word"]}
                correct={1}
                explanation="Remasking changes the contents of existing slots. Insertion changes the canvas length; an editing mechanism must support that explicitly."
              />
            </section>
            <section id="dl-tradeoffs">
              <span className="dl-kicker">07 / WHEN PARALLELISM PAYS</span>
              <h2>Count the work, not just the rounds.</h2>
              <p>
                AR decoding can reuse keys and values for its unchanged prefix.
                Full bidirectional denoising changes representations as slots
                change, so ordinary exact KV reuse is harder. Block-causal
                designs can retain a completed prefix cache while refining the
                current block. <Ref n={5} />
              </p>
              <Cost />
              <div className="dl-takeaway">
                <h3>You now have a way to read a DLM paper.</h3>
                <p>
                  Identify the corrupted state, the training target, the
                  attention pattern, the reveal or edit policy, and the cost per
                  denoising round. Then compare quality and latency under the
                  same hardware and workload—not tokens per second alone.
                </p>
              </div>
            </section>
            <footer id="dl-sources">
              <span className="dl-kicker">CONTINUE EXPLORING</span>
              <h2>The original sources</h2>
              <p>
                Representative families, not a leaderboard. Model-specific
                details checked September 13, 2026. All experiments on this page
                are local teaching simulations.
              </p>
              <ol>
                {sources.map(([name, url]) => (
                  <li key={url}>
                    <a href={url}>{name} ↗</a>
                  </li>
                ))}
              </ol>
              <a href="/">← Back to all explainers</a>
            </footer>
          </div>
        </div>
      </main>
    </>
  );
}
