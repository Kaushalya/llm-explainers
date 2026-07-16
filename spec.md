# Speculative Decoding Terminal Simulator

**Version:** 1.0 MVP specification
**Audience:** LLM-inference researchers and advanced ML engineers
**Application type:** Interactive educational simulation
**Methods compared:** Vanilla autoregressive decoding, Gemma-style MTP, EAGLE-3, and DFlash

---

## 1. Product objective

Build an interactive web application that visualizes how four LLM decoding strategies generate the same continuation:

1. Vanilla autoregressive decoding
2. Lightweight target-conditioned MTP
3. EAGLE-3
4. DFlash

The user enters a short prompt. An OpenAI-compatible API generates a deterministic reference continuation, which becomes the target sequence for the simulation.

The application then simulates how each decoding method might propose, verify, reject, and commit tokens while producing that same final continuation.

The application is an **algorithmic simulator**, not a hardware benchmark and not an implementation of real MTP, EAGLE-3, or DFlash inference.

---

## 2. Locked MVP decisions

| Requirement                | Decision                                                                |
| -------------------------- | ----------------------------------------------------------------------- |
| Execution mode             | Educational simulation                                                  |
| MTP architecture           | Lightweight target-conditioned autoregressive drafter inspired by Gemma |
| Decoding                   | Greedy only                                                             |
| Target continuation source | OpenAI-compatible API                                                   |
| Performance values         | Normalized illustrative simulation                                      |
| Audience                   | LLM-inference researchers                                               |
| Frontend stack             | React, TypeScript, Vite, Zustand                                        |
| Export                     | Shareable URL and JSON trace                                            |
| Primary interface          | Multi-panel old-terminal UI                                             |
| Primary device             | Desktop browser                                                         |

---

## 3. Core scientific framing

The application must distinguish three separate operations:

```text
PROPOSE → VERIFY → COMMIT
```

A speculative method does not directly determine the final sequence. It proposes candidate tokens, after which the simulated target model verifies them.

All methods must eventually produce the same greedy target continuation.

### Shared target oracle

Given prompt (x), the backend requests a deterministic continuation:

[
y_1,y_2,\ldots,y_N.
]

This sequence becomes the target oracle for the simulation.

The oracle is immutable during a run.

Each speculative method generates synthetic candidate tokens that may or may not match the target sequence.

### Exact greedy verification

Suppose the next target tokens are:

```text
TARGET:    Paris  is  the  capital  of
```

A drafter proposes:

```text
PROPOSAL:  Paris  is  a    major    city
```

The verifier compares the proposal from left to right:

```text
Paris  ✓
is     ✓
a      ×
```

Only the matching prefix is accepted:

```text
Paris is
```

The application may additionally commit the target token at the first mismatch as a verifier-produced bonus token.

This behavior must be configurable, but enabled by default because it reflects common speculative-decoding formulations.

---

## 4. Greedy-only caveat

The MVP supports greedy decoding only.

The interface must prominently explain:

```text
GREEDY MODE

Candidate tokens are accepted only when they match the target model's
argmax prediction. Stochastic speculative sampling requires rejection
sampling and residual-distribution correction and is not simulated in v1.
```

The application must not imply that token equality is sufficient for exact speculative sampling at nonzero temperature.

A disabled control may show:

```text
SAMPLING MODE — PLANNED
```

---

## 5. OpenAI-compatible API integration

## 5.1 Purpose

The API is used only to obtain the canonical target continuation.

It is not used to generate method-specific MTP, EAGLE-3, or DFlash proposals.

```text
USER PROMPT
     ↓
OPENAI-COMPATIBLE API
     ↓
REFERENCE CONTINUATION
     ↓
LOCAL DECODING SIMULATION
```

## 5.2 Configuration

The application should support:

* Base URL
* API key
* Model identifier
* Maximum output tokens
* Optional request headers
* Request timeout
* Seed, when supported
* Temperature fixed to zero
* Optional stop sequences

Example configuration:

```json
{
  "baseUrl": "http://localhost:8000/v1",
  "model": "Qwen/Qwen3-8B",
  "temperature": 0,
  "maxTokens": 16
}
```

The API key must not be included in shareable URLs or exported JSON traces.

## 5.3 Compatible providers

The client should work with standard OpenAI-style chat-completion or completion endpoints, including compatible servers such as:

* vLLM
* SGLang
* Local model gateways
* Hosted services exposing OpenAI-compatible APIs

The application should not depend on provider-specific fields unless added through an adapter.

## 5.4 Backend proxy recommendation

A lightweight backend proxy is recommended rather than calling arbitrary model endpoints directly from the browser.

Responsibilities:

* Protect API credentials
* Avoid browser CORS issues
* Normalize provider responses
* Enforce deterministic request parameters
* Apply request limits
* Strip unsupported parameters
* Return a normalized continuation

Suggested endpoint:

```http
POST /api/continuation
```

Request:

```json
{
  "prompt": "The capital of France is",
  "model": "Qwen/Qwen3-8B",
  "maxTokens": 16,
  "seed": 1042
}
```

Response:

```json
{
  "text": " Paris, a city known for its history and culture.",
  "model": "Qwen/Qwen3-8B",
  "finishReason": "length",
  "usage": {
    "promptTokens": 5,
    "completionTokens": 16
  }
}
```

---

## 6. Tokenization model

Many OpenAI-compatible APIs do not expose:

* Token IDs
* Token-level logits
* Token boundaries
* Hidden states
* Alternative-token probabilities

The simulator must therefore distinguish between:

1. **Reference model tokens**, when the backend exposes them
2. **Display tokens**, generated locally for visualization

### Default MVP behavior

Use a deterministic local display tokenizer.

Supported modes:

* Word-and-punctuation tokenization
* GPT-style visual subword approximation
* Backend-provided tokens, when available

Default:

```text
word + punctuation
```

Example:

```text
"Paris is the capital."
```

becomes:

```text
["Paris", " is", " the", " capital", "."]
```

The UI must label this clearly:

```text
DISPLAY TOKENIZATION

Token boundaries are generated by the simulator and may differ from the
actual tokenizer used by the target API.
```

The architecture should allow a real Hugging Face tokenizer to be configured later.

---

## 7. Simulation methods

## 7.1 Vanilla autoregressive decoding

Vanilla decoding performs one target operation for every committed token.

```text
TARGET PASS 1 → y₁
TARGET PASS 2 → y₂
TARGET PASS 3 → y₃
```

### Required visualization

* One active token position
* Sequential dependency arrows
* KV-cache growth indicator
* One committed token per target pass
* No draft row
* No rejection events

### Metrics

* Target passes
* Committed tokens
* Sequential depth
* Simulated elapsed time
* Tokens per target pass

---

## 7.2 Lightweight target-conditioned MTP

The MTP panel represents a Gemma-inspired lightweight assistant drafter.

It is not simulated as independent future-token heads.

Instead, it is a small autoregressive module conditioned on target-model state:

```text
TARGET HIDDEN STATE
        │
        ▼
LIGHTWEIGHT MTP DRAFTER
        │
        ├── step 1 → d₁
        ├── step 2 → d₂
        ├── step 3 → d₃
        └── step 4 → d₄
```

Each draft token depends on earlier draft tokens.

### Simulation cycle

1. Obtain the current simulated target state.
2. Initialize the lightweight MTP drafter.
3. Generate (K) candidate tokens sequentially.
4. Perform one target verification pass.
5. Accept the longest matching prefix.
6. Reject all tokens following the first mismatch.
7. Optionally commit a target bonus token.
8. Start the next cycle.

### Required visualization

The panel must show:

* Target-context input
* A compact MTP assistant block
* Sequential draft steps
* Draft KV-cache growth
* Proposed token row
* Target verification row
* Accepted and rejected prefix
* Drafter restart after rejection

### Method-specific parameters

* Draft length
* First-token agreement probability
* Depth-dependent agreement decay
* Error-propagation strength
* Draft-step cost
* Target-conditioning strength
* Verification cost
* Bonus-token behavior

### Error propagation

For recurrent MTP, a wrong earlier token should reduce the probability that later proposed tokens match the target.

A suggested synthetic rule is:

[
p_i =
p_0
\exp(-\lambda i)
\prod_{j < i}
\eta_j,
]

where (\eta_j < 1) when an earlier draft token is incorrect.

This reflects exposure bias without claiming to reproduce a real Gemma checkpoint.

---

## 7.3 EAGLE-3

EAGLE-3 is represented as a small target-specific drafter conditioned on fused features from multiple target layers.

```text
TARGET EARLY FEATURE  ─┐
TARGET MIDDLE FEATURE ─┼── FEATURE FUSION
TARGET LATE FEATURE   ─┘         │
                                  ▼
                          EAGLE-3 DRAFTER
                                  │
                          d₁ → d₂ → d₃ → d₄
```

### Simulation cycle

1. Extract synthetic target features from three target depths.
2. Animate feature fusion.
3. Initialize the EAGLE-3 drafter.
4. Generate candidate tokens autoregressively.
5. Verify all candidate tokens in one target pass.
6. Commit the longest matching prefix.
7. Repeat.

### Required visual distinction from MTP

MTP emphasizes:

* Lightweight assistant
* Direct target conditioning
* Simple autoregressive draft chain

EAGLE-3 emphasizes:

* Multiple target feature levels
* Feature fusion
* Separate feature-conditioned draft transformer
* Stronger target-representation alignment

### Method-specific parameters

* Draft length
* Feature-fusion quality
* Draft agreement probability
* Agreement decay
* Error propagation
* Draft-layer cost
* Number of target feature sources
* Optional candidate tree width

Candidate-tree simulation should remain disabled by default.

---

## 7.4 DFlash

DFlash is represented as a target-conditioned block drafter that predicts several masked positions in parallel.

```text
TARGET FEATURES
      │
      ▼
ANCHOR [MASK] [MASK] [MASK] [MASK]
          ↕      ↕      ↕      ↕
      BIDIRECTIONAL BLOCK ATTENTION
                    │
                    ▼
              d₁ d₂ d₃ d₄
```

### Simulation cycle

1. Select the current anchor token or context boundary.
2. Create a block of masked future positions.
3. Inject synthetic target features.
4. Animate bidirectional communication between mask positions.
5. Reveal the entire proposed block simultaneously.
6. Run target verification.
7. Accept the longest matching prefix.
8. Reject the remaining block.
9. Create the next masked block.

### Required visual distinction

Unlike MTP and EAGLE-3, DFlash must not animate one proposal token at a time.

All block positions should transition:

```text
[MASK] [MASK] [MASK] [MASK]
```

into:

```text
 token₁ token₂ token₃ token₄
```

as one atomic drafting operation.

### Method-specific parameters

* Block size
* Anchor behavior
* Per-position agreement profile
* Block-draft cost
* Target-feature conditioning
* Bidirectional coordination strength
* Verification cost

---

## 8. Proposal-generation model

Because the speculative methods are simulated, draft candidates are generated from controlled stochastic rules.

## 8.1 Reproducibility

Every run is determined by:

```text
prompt
reference continuation
model identifier
method configuration
random seed
```

Two runs with identical inputs must generate identical event traces.

Use a deterministic seeded PRNG rather than `Math.random()`.

## 8.2 Candidate correctness

Each candidate position receives a probability of matching the target token.

Generic profile:

[
p_i = p_0 e^{-\lambda i}.
]

Method-specific modifiers are then applied.

### MTP

* Sequential generation
* Strong exposure-bias penalty after an early error
* Later tokens become progressively less reliable

### EAGLE-3

* Sequential generation
* Higher base alignment from target feature fusion
* Moderate error propagation

### DFlash

* Joint block generation
* No serial propagation from sampled token to sampled token
* Position-dependent degradation still applies
* Optional correlation among block positions

## 8.3 Incorrect token generation

An incorrect proposal should remain plausible.

Sources, in priority order:

1. Alternative tokens returned by a future backend adapter
2. Words appearing in the prompt
3. Words appearing elsewhere in the continuation
4. Syntax-aware distractor tables
5. Built-in language vocabulary

For code, distractors should preserve token type where possible:

```text
")" → "]", "}", ":", ","
"return" → "yield", "raise", "print"
```

---

## 9. Simulated performance model

All performance values are illustrative.

The application should expose both:

* **Critical-path time**
* **Total work**

This distinction is essential for a research audience.

### Default normalized costs

| Operation                         |       Default cost |
| --------------------------------- | -----------------: |
| One vanilla target decoding pass  |               1.00 |
| Target verification of (K) tokens | (1.00 + 0.06(K-1)) |
| One MTP draft step                |               0.08 |
| EAGLE feature fusion              |               0.05 |
| One EAGLE draft step              |               0.10 |
| One DFlash block pass             |    (0.28 + 0.015K) |
| Commit/update operation           |               0.01 |

All constants must be editable through advanced settings.

### Required metrics

* Committed tokens
* Proposed tokens
* Accepted tokens
* Rejected tokens
* Acceptance ratio
* Mean accepted prefix length
* Draft passes
* Target decoding passes
* Target verification passes
* Accepted tokens per verification
* Sequential critical-path units
* Total work units
* Simulated speedup over vanilla
* Wasted speculative work
* Proposal efficiency

Suggested definitions:

[
\text{acceptance ratio}
=======================

\frac{\text{accepted draft tokens}}
{\text{proposed draft tokens}}
]

[
\text{proposal efficiency}
==========================

\frac{\text{accepted draft tokens}}
{\text{draft work units}}
]

[
\text{simulated speedup}
========================

\frac{\text{vanilla critical-path cost}}
{\text{method critical-path cost}}
]

Persistent label:

```text
SIMULATED PERFORMANCE — NOT A HARDWARE BENCHMARK
```

---

## 10. Terminal user interface

## 10.1 Main layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│ SPECDEC-LAB 1.0   MODEL=qwen3   SEED=1042   MODE=GREEDY   READY    │
├─────────────────────────────────────────────────────────────────────┤
│ PROMPT> The capital of France is_                                   │
│ [RUN] [STEP OP] [STEP CYCLE] [PAUSE] [RESET] [CONFIG] [SHARE]     │
├────────────────────────────────┬────────────────────────────────────┤
│ PROC 01 — VANILLA AR           │ PROC 02 — GEMMA-STYLE MTP          │
│                                │                                    │
│ committed sequence             │ target state                       │
│ target-pass chain              │ lightweight drafter                │
│ KV-cache growth                │ sequential proposals               │
│ metrics                        │ verification and metrics            │
├────────────────────────────────┼────────────────────────────────────┤
│ PROC 03 — EAGLE-3              │ PROC 04 — DFLASH                   │
│                                │                                    │
│ target feature taps            │ anchor and mask block              │
│ feature fusion                 │ bidirectional block attention       │
│ autoregressive draft chain     │ parallel block proposal             │
│ verification and metrics       │ verification and metrics            │
├────────────────────────────────┴────────────────────────────────────┤
│ GLOBAL TIMELINE                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ EVENT LOG | METRIC MATRIX | TOKEN INSPECTOR                        │
└─────────────────────────────────────────────────────────────────────┘
```

## 10.2 Visual style

* Near-black background
* Green phosphor primary text
* Amber warnings
* Cyan target-state and feature signals
* Red rejected tokens
* Subtle CRT scanlines
* Optional screen curvature
* Monospace font
* Thin square panel borders
* Block cursor
* Minimal rounded corners

CRT effects must be optional.

## 10.3 Panel status symbols

```text
✓ accepted
× rejected
? speculative
■ masked
T target-produced
D draft-produced
V verification
C committed
```

Color must never be the only indicator.

---

## 11. Simulation controls

### Primary controls

* Prompt input
* Run
* Pause
* Reset
* Step operation
* Step cycle
* Replay
* Animation speed
* Reference token count
* Random seed
* Share
* Export JSON

### Step operation

Advances one atomic operation, such as:

* One vanilla target pass
* One MTP draft step
* One EAGLE feature-fusion operation
* One EAGLE draft step
* One DFlash block pass
* One verification pass
* One commit operation

### Step cycle

Advances each active method until it commits at least one new target token.

This makes side-by-side comparison easier despite different internal operation counts.

---

## 12. Global timeline

The timeline should support two modes.

### Simulated-time alignment

```text
AR:      [TARGET][TARGET][TARGET][TARGET]

MTP:     [D1][D2][D3][D4][ VERIFY ]

EAGLE:   [FUSE][D1][D2][D3][ VERIFY ]

DFLASH:  [ BLOCK DRAFT ][ VERIFY ]
```

### Token-index alignment

Each column corresponds to one committed output position.

This view highlights how many speculative operations were required to reach each token.

The user should be able to zoom, pan, and inspect operations.

---

## 13. Research-oriented inspection

Clicking a proposal or committed token opens an inspector containing:

* Text
* Display-token index
* Target position
* Source method
* Draft-cycle number
* Proposal position
* Proposal confidence
* Target match
* Acceptance result
* Parent dependencies
* Simulated start time
* Simulated duration
* Work units
* Critical-path contribution
* Rejection reason

Each method panel should also contain a collapsible terminal-style manual:

```text
$ man dflash

NAME
    dflash — target-conditioned parallel block drafter

DRAFTING
    Predicts several masked future positions in one block operation.

VERIFICATION
    The target model verifies the proposed block and commits the longest
    valid prefix.

CRITICAL PATH
    One block-draft pass plus one target verification pass.
```

---

## 14. Shareable URLs

The shareable URL should encode simulation state but never secrets.

Include:

* Prompt
* Target length
* Seed
* Selected model name
* Method parameters
* Cost-model parameters
* Animation settings
* UI theme
* Optional canonical continuation

Exclude:

* API key
* Authorization headers
* Private endpoint credentials

Recommended strategy:

1. Serialize public state as JSON.
2. Compress using a URL-safe algorithm.
3. Store in a query parameter or URL fragment.

Example:

```text
/sim#state=eJyrVkrLz1eyUkpKLFKqBQA...
```

### Continuation-sharing modes

**Portable mode**

Include the canonical continuation in the URL. Opening the link reproduces the simulation without another API request.

**Regenerate mode**

Include only the prompt and configuration. Opening the link requests a new continuation.

Portable mode should be the default for reproducibility.

The UI must warn when the URL becomes unusually long.

---

## 15. JSON trace export

The JSON export should contain:

```json
{
  "schemaVersion": "1.0",
  "createdAt": "2026-07-16T12:00:00Z",
  "prompt": "The capital of France is",
  "referenceContinuation": " Paris, a city known for...",
  "model": "Qwen/Qwen3-8B",
  "tokenizerMode": "word-punctuation",
  "seed": 1042,
  "configuration": {},
  "events": [],
  "metrics": {}
}
```

### Export requirements

* Deterministic replay
* Schema versioning
* No API secrets
* Zod validation on import
* Graceful rejection of unsupported versions
* Optional human-readable pretty printing

---

## 16. State and software architecture

### Frontend

* React
* TypeScript
* Vite
* Zustand
* Zod
* Framer Motion or CSS animations
* Vitest
* Playwright

### Suggested backend

* FastAPI or lightweight Node.js service
* One continuation endpoint
* Optional server-side endpoint profiles
* No persistent database required for MVP

### Core modules

```text
src/
├── api/
│   ├── client.ts
│   └── schemas.ts
├── simulation/
│   ├── oracle.ts
│   ├── scheduler.ts
│   ├── verifier.ts
│   ├── random.ts
│   ├── costs.ts
│   ├── trace.ts
│   └── methods/
│       ├── autoregressive.ts
│       ├── mtp.ts
│       ├── eagle3.ts
│       └── dflash.ts
├── store/
│   └── simulation-store.ts
├── components/
│   ├── TerminalHeader.tsx
│   ├── PromptBar.tsx
│   ├── MethodPanel.tsx
│   ├── TokenCell.tsx
│   ├── GlobalTimeline.tsx
│   ├── EventLog.tsx
│   ├── TokenInspector.tsx
│   └── ConfigurationDrawer.tsx
└── sharing/
    ├── url-state.ts
    └── trace-schema.ts
```

---

## 17. Event-sourced simulation

The simulator should use immutable events rather than directly mutating the rendered token arrays.

Core events:

```ts
type SimulationEvent =
  | { type: "PREFILL_STARTED" }
  | { type: "PREFILL_COMPLETED" }
  | { type: "TARGET_PASS_STARTED" }
  | { type: "TARGET_TOKEN_PRODUCED" }
  | { type: "FEATURES_EXTRACTED" }
  | { type: "FEATURES_FUSED" }
  | { type: "DRAFT_CYCLE_STARTED" }
  | { type: "DRAFT_TOKEN_PRODUCED" }
  | { type: "DRAFT_BLOCK_PRODUCED" }
  | { type: "VERIFICATION_STARTED" }
  | { type: "TOKEN_ACCEPTED" }
  | { type: "TOKEN_REJECTED" }
  | { type: "BONUS_TOKEN_PRODUCED" }
  | { type: "TOKENS_COMMITTED" }
  | { type: "CYCLE_COMPLETED" }
  | { type: "SIMULATION_COMPLETED" };
```

Benefits:

* Deterministic replay
* JSON export
* Timeline rendering
* Step-by-step execution
* Debugging
* Reproducible test fixtures

---

## 18. MVP acceptance criteria

The MVP is complete when:

1. A user can configure an OpenAI-compatible endpoint.
2. A short prompt produces a deterministic reference continuation.
3. The simulation displays vanilla AR, MTP, EAGLE-3, and DFlash concurrently.
4. All four methods commit the same final continuation.
5. Vanilla AR commits one token per target pass.
6. MTP visibly uses a lightweight target-conditioned autoregressive drafter.
7. EAGLE-3 visibly fuses features from several target layers before drafting.
8. DFlash visibly predicts a full masked block in one parallel operation.
9. Proposal verification accepts only the longest matching prefix.
10. Rejected descendants are clearly visualized.
11. Greedy-only limitations are prominently documented.
12. The simulation supports run, pause, reset, operation-step, and cycle-step.
13. The global timeline compares sequential depth and total work.
14. Performance values are marked as simulated.
15. Identical seeds reproduce identical traces.
16. A run can be exported and imported as JSON.
17. A portable shareable URL reproduces the same continuation and trace.
18. API keys never appear in URLs or trace exports.
19. Playwright tests cover all four methods.
20. The application remains usable at 1280 × 720 resolution.

---

## 19. Recommended initial defaults

```text
MODE                    GREEDY
REFERENCE TOKENS        16
RANDOM SEED             1042
MTP DRAFT LENGTH        4
EAGLE-3 DRAFT LENGTH    4
DFLASH BLOCK SIZE       4
BONUS TOKEN             ENABLED
DISPLAY TOKENIZER       WORD + PUNCTUATION
ANIMATION SPEED         1.0×
CRT EFFECT              ENABLED
PERFORMANCE MODEL       NORMALIZED
SHARE MODE              PORTABLE
```

### Illustrative agreement defaults

```text
MTP
  first-token agreement      0.82
  agreement decay            0.12
  error propagation          strong

EAGLE-3
  first-token agreement      0.88
  agreement decay            0.08
  error propagation          moderate

DFLASH
  first-position agreement   0.86
  position decay             0.07
  within-block correlation   moderate
```

These values must be explicitly described as illustrative rather than empirical.

---

## 20. Central visual comparison

The application’s most important teaching element is this contrast:

```text
VANILLA AR
    T₁ → T₂ → T₃ → T₄

GEMMA-STYLE MTP
    target state → d₁ → d₂ → d₃ → d₄ → verify

EAGLE-3
    target features → fuse → d₁ → d₂ → d₃ → d₄ → verify

DFLASH
    target features → [MASK MASK MASK MASK]
                              ↓
                       d₁ d₂ d₃ d₄
                              ↓
                           verify
```

MTP and EAGLE-3 reduce target-model invocations but retain a sequential draft chain.

DFlash attempts to remove that draft-side sequential chain by predicting a coordinated block in parallel.

Vanilla AR remains the reference path against which critical-path reduction, speculative waste, and accepted-token efficiency are compared.
