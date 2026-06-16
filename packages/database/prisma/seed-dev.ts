/**
 * Dev seed script — populates the development database with sample data.
 *
 * Run with:  pnpm --filter @academia-alexandria/database seed:dev
 * Or:        pnpm db:seed:dev
 *
 * This script is idempotent — it checks for existing data before inserting.
 * It assumes research areas have already been seeded (via the base seed script).
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Check if dev data already exists
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(
      `Database already has ${existingUsers} users. Skipping dev seed.`,
    );
    console.log("To re-seed, clear user data first or run with --force flag.");
    if (!process.argv.includes("--force")) return;
    console.log("--force flag detected. Clearing existing data...");
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        audit_logs,
        api_keys,
        webhooks,
        references,
        reputation_events,
        endorsements,
        reviews,
        comments,
        bounty_payouts,
        bounties,
        bookmarks,
        co_author_invitations,
        paper_authors,
        paper_research_areas,
        papers,
        user_research_areas,
        sessions,
        accounts,
        verification_tokens,
        users
      CASCADE
    `);
  }

  // Ensure research areas are seeded
  const areaCount = await prisma.researchArea.count();
  if (areaCount === 0) {
    console.error(
      "No research areas found. Run the base seed first: pnpm db:seed",
    );
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // Fetch research area IDs by slug
  // -----------------------------------------------------------------------
  const areas = await prisma.researchArea.findMany({
    select: { id: true, slug: true },
  });
  const areaMap = new Map(areas.map((a) => [a.slug, a.id]));

  function areaId(slug: string): string {
    const id = areaMap.get(slug);
    if (!id) throw new Error(`Research area not found: ${slug}`);
    return id;
  }

  // -----------------------------------------------------------------------
  // 1. Create users
  // -----------------------------------------------------------------------
  console.log("Creating users...");

  const passwordHash = await hash("Password1", 4); // fast for dev
  const verified = new Date("2025-01-01T00:00:00Z");

  // Disable email notifications for all seeded users to avoid
  // sending real emails to fake addresses via Resend.
  const noNotifications = {
    notifyReviews: false,
    notifyComments: false,
    notifyEndorsements: false,
    notifyPaperStatus: false,
    notifyBounty: false,
    notifyInvitations: false,
  };

  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alice Chen",
        honorific: "Dr.",
        email: "alice@example.com",
        emailVerified: verified,
        passwordHash,
        ...noNotifications,
        bio: "Professor of Computer Science at MIT. Research interests include artificial intelligence, machine learning, and natural language processing. Published over 50 papers in top-tier venues.",
        institution: "Massachusetts Institute of Technology",
        reputationScore: 620,
        researchAreas: {
          create: [
            { researchAreaId: areaId("artificial-intelligence") },
            { researchAreaId: areaId("machine-learning") },
            { researchAreaId: areaId("natural-language-processing") },
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Bob Martinez",
        honorific: "Prof.",
        email: "bob@example.com",
        emailVerified: verified,
        passwordHash,
        ...noNotifications,
        bio: "Associate Professor of Physics at Caltech. Specializing in quantum computing and theoretical physics. ERC Starting Grant recipient.",
        institution: "California Institute of Technology",
        reputationScore: 340,
        researchAreas: {
          create: [
            { researchAreaId: areaId("quantum-physics") },
            { researchAreaId: areaId("theoretical-physics") },
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Clara Okonkwo",
        honorific: "Dr.",
        email: "clara@example.com",
        emailVerified: verified,
        passwordHash,
        ...noNotifications,
        bio: "Research scientist in computational biology and bioinformatics. Passionate about open science and reproducible research.",
        institution: "University of Oxford",
        reputationScore: 155,
        researchAreas: {
          create: [
            { researchAreaId: areaId("bioinformatics") },
            { researchAreaId: areaId("molecular-biology") },
            { researchAreaId: areaId("data-science") },
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "David Kim",
        honorific: "Dr.",
        email: "david@example.com",
        emailVerified: verified,
        passwordHash,
        ...noNotifications,
        bio: "Postdoctoral researcher focused on climate modeling and environmental data analysis. Advocate for community-driven peer review.",
        institution: "ETH Zurich",
        reputationScore: 85,
        researchAreas: {
          create: [
            { researchAreaId: areaId("climate-science") },
            { researchAreaId: areaId("statistics") },
            { researchAreaId: areaId("environmental-engineering") },
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Elena Vasquez",
        email: "elena@example.com",
        passwordHash,
        ...noNotifications,
        bio: "PhD candidate in economics and public policy. Researching the economics of open-access publishing.",
        institution: "Stanford University",
        reputationScore: 45,
        researchAreas: {
          create: [
            { researchAreaId: areaId("economics") },
            { researchAreaId: areaId("public-health") },
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Fatima Al-Rashid",
        honorific: "Prof.",
        email: "fatima@example.com",
        emailVerified: verified,
        passwordHash,
        ...noNotifications,
        role: "ADMIN",
        bio: "Full Professor of Mathematics and Applied Mathematics. Fields Medal committee member. Specializes in algebraic topology and number theory.",
        institution: "University of Cambridge",
        reputationScore: 1050,
        researchAreas: {
          create: [
            { researchAreaId: areaId("pure-mathematics") },
            { researchAreaId: areaId("applied-mathematics") },
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "George Tanaka",
        honorific: "Dr.",
        email: "george@example.com",
        emailVerified: verified,
        passwordHash,
        ...noNotifications,
        bio: "Neuroscientist studying the neural basis of decision-making. Combines computational modeling with experimental neuroscience.",
        institution: "University of Tokyo",
        reputationScore: 210,
        researchAreas: {
          create: [
            { researchAreaId: areaId("neuroscience") },
            { researchAreaId: areaId("psychology") },
            { researchAreaId: areaId("machine-learning") },
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Hannah Berg",
        email: "hannah@example.com",
        passwordHash,
        ...noNotifications,
        bio: "Early-career researcher in software engineering and distributed systems. Interested in formal verification of cloud-native applications.",
        institution: "TU Munich",
        reputationScore: 15,
        researchAreas: {
          create: [
            { researchAreaId: areaId("software-engineering") },
            { researchAreaId: areaId("distributed-systems") },
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Ibrahim Yilmaz",
        honorific: "Dr.",
        email: "ibrahim@example.com",
        emailVerified: verified,
        passwordHash,
        ...noNotifications,
        bio: "Senior lecturer in biomedical engineering. Works on wearable health sensors and medical device regulation.",
        institution: "Imperial College London",
        reputationScore: 130,
        researchAreas: {
          create: [
            { researchAreaId: areaId("biomedical-engineering") },
            { researchAreaId: areaId("electrical-engineering") },
          ],
        },
      },
    }),
    prisma.user.create({
      data: {
        name: "Julia Santos",
        honorific: "Dr.",
        email: "julia@example.com",
        emailVerified: verified,
        passwordHash,
        ...noNotifications,
        bio: "Researcher in digital humanities and scholarly communication. Building bridges between technology and the humanities.",
        institution: "University of São Paulo",
        reputationScore: 75,
        researchAreas: {
          create: [
            { researchAreaId: areaId("digital-humanities") },
            { researchAreaId: areaId("scholarly-communication") },
            { researchAreaId: areaId("philosophy") },
          ],
        },
      },
    }),
  ]);

  const [
    alice,
    bob,
    clara,
    david,
    elena,
    fatima,
    george,
    hannah,
    ibrahim,
    julia,
  ] = users;
  console.log(`  Created ${users.length} users.`);

  // -----------------------------------------------------------------------
  // 2. Create papers
  // -----------------------------------------------------------------------
  console.log("Creating papers...");

  // Paper 1: PUBLISHED — AI/ML (Alice + Clara)
  const paper1 = await prisma.paper.create({
    data: {
      title:
        "Transformer Architectures for Cross-Lingual Biomedical Named Entity Recognition",
      abstract:
        "We present a novel approach to biomedical named entity recognition that leverages multilingual transformer models to achieve state-of-the-art performance across six languages. Our method combines domain-specific pre-training with cross-lingual transfer learning, demonstrating that a single model can effectively identify biomedical entities in languages with limited annotated resources. Experiments on the MultiCoNER and BC5CDR corpora show consistent improvements of 3-7 F1 points over existing baselines.",
      content:
        "## 1. Introduction\n\nBiomedical named entity recognition (Bio-NER) is a fundamental task in biomedical text mining. While significant progress has been made for English, many languages lack sufficient annotated training data. Cross-lingual transfer learning offers a promising solution, enabling models trained on resource-rich languages to generalize to others.\n\n## 2. Related Work\n\nPrevious approaches to cross-lingual NER have relied on machine translation or bilingual dictionaries. Recent work has shown that multilingual pre-trained models like mBERT and XLM-R can transfer linguistic knowledge across languages.\n\n## 3. Methodology\n\nOur approach consists of three stages: (1) domain-adaptive pre-training on multilingual biomedical corpora, (2) fine-tuning on English Bio-NER datasets, and (3) zero-shot transfer to target languages with optional few-shot adaptation.\n\nThe cross-lingual transfer objective minimizes the combined loss:\n\n$$\\mathcal{L} = \\mathcal{L}_{\\text{NER}}(\\theta) + \\alpha \\cdot \\mathcal{L}_{\\text{align}}(\\theta)$$\n\nwhere $\\mathcal{L}_{\\text{NER}}$ is the standard token-level cross-entropy and $\\mathcal{L}_{\\text{align}}$ is a contrastive alignment loss that encourages similar representations across languages. The $F_1$ score is computed as the harmonic mean of precision $P$ and recall $R$:\n\n$$F_1 = \\frac{2PR}{P + R}$$\n\n## 4. Experiments\n\nWe evaluate on six languages: English, Spanish, French, German, Chinese, and Japanese. Our model achieves state-of-the-art results on all languages, with particularly strong performance on low-resource settings.\n\n## 5. Results\n\n| Language | Previous SOTA | Our Model | Improvement |\n|----------|--------------|-----------|-------------|\n| English  | 91.2 F1      | 93.8 F1   | +2.6        |\n| Spanish  | 85.3 F1      | 91.1 F1   | +5.8        |\n| French   | 84.7 F1      | 90.5 F1   | +5.8        |\n| German   | 83.1 F1      | 89.7 F1   | +6.6        |\n| Chinese  | 80.5 F1      | 87.2 F1   | +6.7        |\n| Japanese | 79.8 F1      | 86.5 F1   | +6.7        |\n\nThe average improvement across non-English languages is $\\Delta F_1 = 6.3$ points, with gains inversely correlated to source-language resource availability ($r = -0.91, p < 0.01$).\n\n## 6. Conclusion\n\nWe have demonstrated that cross-lingual transformer models can effectively transfer biomedical NER capabilities across languages. Our approach is particularly beneficial for languages with limited annotated resources.",
      status: "PUBLISHED",
      disciplines: [
        "artificial-intelligence",
        "natural-language-processing",
        "bioinformatics",
      ],
      keywords: ["NER", "transformers", "cross-lingual", "biomedical", "NLP"],
      version: 1,
      publishedAt: new Date("2026-02-10"),
      commentCount: 3,
      reviewCount: 2,
      endorsementCount: 2,
      viewCount: 347,
      authors: {
        create: [
          { userId: alice.id, order: 0, isCorresponding: true },
          { userId: clara.id, order: 1 },
        ],
      },
    },
  });

  // Paper 2: PUBLISHED — Quantum Physics (Bob)
  const paper2 = await prisma.paper.create({
    data: {
      title:
        "Topological Error Correction in Noisy Intermediate-Scale Quantum Devices",
      abstract:
        "We propose a practical error correction scheme for near-term quantum computers that combines surface code ideas with hardware-efficient variational circuits. Our approach reduces the logical error rate by two orders of magnitude on IBM's 127-qubit Eagle processor while requiring only 40% overhead in qubit count. We provide a rigorous analysis of the threshold behavior and demonstrate fault-tolerant execution of a quantum chemistry simulation.",
      content:
        "## 1. Introduction\n\nQuantum error correction is essential for scalable quantum computing, yet current hardware limitations demand approaches tailored to noisy intermediate-scale quantum (NISQ) devices. The logical error rate $p_L$ must satisfy $p_L < p_{\\text{th}}$ for fault tolerance, where $p_{\\text{th}}$ is the threshold error rate of the code.\n\n## 2. Background\n\nSurface codes represent the leading approach to topological quantum error correction. For a distance-$d$ surface code, the logical error rate scales as:\n\n$$p_L \\approx 0.03 \\left(\\frac{p}{p_{\\text{th}}}\\right)^{\\lfloor d/2 \\rfloor}$$\n\nwhere $p$ is the physical error rate and $p_{\\text{th}} \\approx 1\\%$ for standard depolarizing noise.\n\n## 3. Our Approach\n\nWe introduce Adaptive Surface Codes (ASC), which dynamically adjust code distance based on real-time noise estimation. The optimal distance is selected by minimizing the resource cost function:\n\n$$C(d) = n_q(d) + \\lambda \\cdot p_L(d)$$\n\nwhere $n_q(d) = (2d-1)^2$ is the qubit count and $\\lambda$ is a Lagrange multiplier balancing overhead against error suppression. The noise estimator uses a Bayesian update rule:\n\n$$P(p \\mid \\mathbf{s}) \\propto \\prod_{i=1}^{N} P(s_i \\mid p) \\cdot P(p)$$\n\nwhere $\\mathbf{s}$ is the syndrome measurement history.\n\n## 4. Experimental Validation\n\nWe implement ASC on IBM's 127-qubit Eagle processor and demonstrate fault-tolerant execution of VQE for the $\\text{H}_2$ molecule. The variational ansatz minimizes $\\langle \\psi(\\boldsymbol{\\theta}) | H | \\psi(\\boldsymbol{\\theta}) \\rangle$ where:\n\n$$H = \\sum_{i} h_i \\sigma_i^z + \\sum_{ij} J_{ij} \\sigma_i^z \\sigma_j^z + \\sum_{i} g_i \\sigma_i^x$$\n\nachieving chemical accuracy ($\\Delta E < 1.6 \\times 10^{-3}$ Hartree).\n\n## 5. Conclusion\n\nAdaptive Surface Codes represent a practical path toward fault-tolerant quantum computing on near-term hardware.",
      status: "PUBLISHED",
      disciplines: ["quantum-physics", "computer-science"],
      keywords: [
        "quantum computing",
        "error correction",
        "surface codes",
        "NISQ",
        "fault tolerance",
      ],
      version: 1,
      publishedAt: new Date("2026-02-15"),
      commentCount: 1,
      reviewCount: 2,
      endorsementCount: 1,
      viewCount: 512,
      authors: {
        create: [{ userId: bob.id, order: 0, isCorresponding: true }],
      },
    },
  });

  // Paper 3: SUBMITTED — Climate Science (David + Elena)
  const paper3 = await prisma.paper.create({
    data: {
      title:
        "Statistical Downscaling of Global Climate Models Using Bayesian Deep Learning",
      abstract:
        "Global climate models (GCMs) operate at spatial resolutions too coarse for regional impact assessment. We propose a Bayesian deep learning framework for statistical downscaling that provides calibrated uncertainty estimates alongside high-resolution predictions. Applied to precipitation projections over South America, our method outperforms traditional statistical downscaling and deterministic neural networks while providing actionable confidence intervals for adaptation planning.",
      content:
        "## 1. Introduction\n\nClimate change adaptation requires high-resolution regional projections, but global climate models (GCMs) typically operate at 100-250 km resolution. Statistical downscaling bridges this gap by learning a mapping $f: \\mathbf{X}_{\\text{coarse}} \\to \\mathbf{Y}_{\\text{fine}}$ between large-scale and local-scale climate variables.\n\n## 2. Methods\n\nWe develop BayesDown, a Bayesian convolutional neural network that learns the downscaling mapping while quantifying epistemic and aleatoric uncertainty. The predictive distribution is given by:\n\n$$p(y^* \\mid \\mathbf{x}^*, \\mathcal{D}) = \\int p(y^* \\mid \\mathbf{x}^*, \\boldsymbol{\\omega}) \\, p(\\boldsymbol{\\omega} \\mid \\mathcal{D}) \\, d\\boldsymbol{\\omega}$$\n\nwhere $\\boldsymbol{\\omega}$ are the network weights and $\\mathcal{D}$ is the training data. We approximate the posterior $p(\\boldsymbol{\\omega} \\mid \\mathcal{D})$ using variational inference with a mean-field Gaussian:\n\n$$q(\\boldsymbol{\\omega}) = \\prod_{i} \\mathcal{N}(\\omega_i \\mid \\mu_i, \\sigma_i^2)$$\n\nThe total predictive uncertainty decomposes as $\\text{Var}[y^*] = \\underbrace{\\mathbb{E}[\\sigma^2(\\mathbf{x}^*)]}_\\text{aleatoric} + \\underbrace{\\text{Var}[\\mu(\\mathbf{x}^*)]}_\\text{epistemic}$.\n\n## 3. Data\n\nWe train on ERA5 reanalysis data at $0.25°$ resolution and validate against station observations across 1,500 gauges in South America.\n\n## 4. Results\n\nBayesDown achieves a 23% reduction in RMSE compared to BCSD:\n\n$$\\text{RMSE} = \\sqrt{\\frac{1}{N}\\sum_{i=1}^{N}(\\hat{y}_i - y_i)^2}$$\n\nand provides well-calibrated 90% prediction intervals with coverage of $89.7 \\pm 1.2\\%$ across all stations.\n\n## 5. Discussion\n\nThe uncertainty estimates enable risk-aware decision-making for water resource management and agricultural planning. The expected shortfall at the $\\alpha = 0.05$ level, $\\text{ES}_{0.05} = \\mathbb{E}[Y \\mid Y > F^{-1}(0.95)]$, provides actionable flood risk metrics.\n\n## 6. Conclusion\n\nBayesian deep learning offers a principled framework for statistical downscaling with uncertainty quantification.",
      status: "SUBMITTED",
      disciplines: ["climate-science", "statistics", "machine-learning"],
      keywords: [
        "climate modeling",
        "downscaling",
        "Bayesian deep learning",
        "uncertainty",
        "precipitation",
      ],
      version: 1,
      publishedAt: new Date("2026-02-20"),
      commentCount: 2,
      reviewCount: 1,
      endorsementCount: 0,
      viewCount: 89,
      authors: {
        create: [
          { userId: david.id, order: 0, isCorresponding: true },
          { userId: elena.id, order: 1 },
        ],
      },
    },
  });

  // Paper 4: SUBMITTED — Neuroscience (George)
  const paper4 = await prisma.paper.create({
    data: {
      title:
        "Prefrontal Cortex Dynamics During Risky Decision-Making Under Uncertainty",
      abstract:
        "Using two-photon calcium imaging in freely behaving mice, we characterize the neural population dynamics in the medial prefrontal cortex (mPFC) during a probabilistic reward task. We identify distinct neural ensembles encoding expected value, risk, and decision confidence, and demonstrate that ensemble transitions predict behavioral switches between exploitative and exploratory strategies. Our findings provide a circuit-level mechanism for adaptive decision-making under uncertainty.",
      content:
        "## 1. Introduction\n\nDecision-making under uncertainty is a fundamental cognitive function mediated by the prefrontal cortex. While individual neuron studies have identified value and risk signals, the population-level dynamics remain poorly understood.\n\n## 2. Methods\n\nWe performed two-photon calcium imaging in mPFC of 12 mice performing a two-armed bandit task with varying reward probabilities.\n\n## 3. Results\n\nWe identified three distinct functional ensembles: value-encoding neurons (34%), risk-encoding neurons (22%), and confidence-encoding neurons (18%). Ensemble transitions preceded behavioral strategy switches by 1.2 ± 0.3 seconds.\n\n## 4. Discussion\n\nThese results suggest that mPFC implements a dynamic routing mechanism that switches between exploitation and exploration based on accumulated uncertainty.\n\n## 5. Conclusion\n\nPrefrontal population dynamics provide a circuit-level explanation for adaptive decision-making.",
      status: "SUBMITTED",
      disciplines: ["neuroscience", "psychology"],
      keywords: [
        "decision-making",
        "prefrontal cortex",
        "calcium imaging",
        "uncertainty",
        "exploration",
      ],
      version: 1,
      publishedAt: new Date("2026-02-22"),
      commentCount: 0,
      reviewCount: 0,
      endorsementCount: 0,
      viewCount: 45,
      authors: {
        create: [{ userId: george.id, order: 0, isCorresponding: true }],
      },
    },
  });

  // Paper 5: DRAFT — Software Engineering (Hannah)
  const paper5 = await prisma.paper.create({
    data: {
      title: "Formal Verification of Kubernetes Operators Using TLA+",
      abstract:
        "We present a methodology for formally specifying and verifying the correctness of Kubernetes operators using TLA+. We model the operator reconciliation loop, cluster state transitions, and failure modes, then verify safety and liveness properties. Applied to three production operators, our approach uncovered two previously unknown bugs and provides confidence guarantees for operator behavior under network partitions and node failures.",
      content:
        "## 1. Introduction\n\nKubernetes operators encode operational knowledge as software, but their correctness is difficult to ensure due to the complexity of distributed state management.\n\n## 2. Approach\n\nWe model operators as TLA+ specifications, capturing the reconciliation loop, API server interactions, and failure scenarios.\n\n[Work in progress — methodology section needs expansion]",
      status: "DRAFT",
      disciplines: ["software-engineering", "distributed-systems"],
      keywords: [
        "Kubernetes",
        "formal verification",
        "TLA+",
        "operators",
        "distributed systems",
      ],
      version: 1,
      authors: {
        create: [{ userId: hannah.id, order: 0, isCorresponding: true }],
      },
    },
  });

  // Paper 6: PUBLISHED — Mathematics (Fatima + Alice)
  const paper6 = await prisma.paper.create({
    data: {
      title: "A New Proof of the Bloch–Kato Conjecture for Weight Two Motives",
      abstract:
        "We provide an elementary proof of the Bloch–Kato conjecture for weight two motives associated to elliptic curves over number fields, avoiding the use of higher Chow groups. Our approach relies on a new comparison theorem between étale and motivic cohomology that simplifies the original proof strategy of Huber and Kings. We also extend the result to certain families of abelian surfaces.",
      content:
        "## 1. Introduction\n\nThe Bloch–Kato conjecture, now a theorem following work of Voevodsky and Rost, describes the relationship between motivic cohomology and Galois cohomology via the norm residue isomorphism. For a field $F$ and prime $\\ell$, the conjecture asserts that the norm residue map\n\n$$K_n^M(F)/\\ell \\xrightarrow{\\sim} H^n_{\\text{\\'{e}t}}(F, \\mu_\\ell^{\\otimes n})$$\n\nis an isomorphism for all $n \\geq 0$.\n\n## 2. Preliminaries\n\nWe recall the necessary background on étale cohomology, motivic cohomology, and the category of mixed motives. Let $E/K$ be an elliptic curve over a number field. The $\\ell$-adic Tate module $T_\\ell(E) = \\varprojlim E[\\ell^n]$ provides a continuous representation $\\rho: G_K \\to \\text{GL}_2(\\mathbb{Z}_\\ell)$.\n\nThe Selmer group is defined via the exact sequence:\n\n$$0 \\to \\text{Sel}(E/K) \\to H^1(G_K, E[\\ell]) \\to \\prod_v H^1(G_{K_v}, E)$$\n\n## 3. Main Theorem\n\n**Theorem 3.1.** For an elliptic curve $E$ over a number field $K$, the Bloch–Kato exponential map induces an isomorphism\n\n$$\\exp_{\\text{BK}}: \\frac{D_{\\text{dR}}(V)}{D_{\\text{dR}}^+(V) + D_{\\text{cris}}(V)^{\\varphi=1}} \\xrightarrow{\\sim} H^1_f(G_K, V)$$\n\nbetween the tangent space of the Selmer group and the motivic cohomology group $H^2_\\mathcal{M}(E, \\mathbb{Q}(2))$.\n\n## 4. Proof\n\nOur proof proceeds in three steps:\n\n**Step 1.** Construction of a comparison morphism $\\Phi: H^2_\\mathcal{M}(E, \\mathbb{Q}(2)) \\to H^1_f(G_K, V)$ using the Chern character in $K$-theory.\n\n**Step 2.** Verification of compatibility with the Beilinson regulator $r_\\mathcal{D}: H^2_\\mathcal{M}(E, \\mathbb{Q}(2)) \\to H^1_\\mathcal{D}(E/\\mathbb{R}, \\mathbb{R}(2))$.\n\n**Step 3.** Passage to the limit over the cyclotomic tower $K(\\mu_{\\ell^\\infty})$, using the Iwasawa main conjecture to control the cokernel.\n\n## 5. Extension to Abelian Surfaces\n\nWe show that the same techniques apply to principally polarized abelian surfaces $A/K$ with real multiplication by $\\mathcal{O}_F$, where $F$ is a real quadratic field. The key observation is that the motive $h^2(A)(1)$ decomposes as $\\bigoplus_{\\sigma: F \\hookrightarrow \\mathbb{R}} M_\\sigma$ where each $M_\\sigma$ behaves like the motive of an elliptic curve.\n\n## 6. Conclusion\n\nOur elementary approach opens the door to computational verification of the Bloch–Kato conjecture for specific curves.",
      status: "PUBLISHED",
      disciplines: ["pure-mathematics"],
      keywords: [
        "Bloch-Kato conjecture",
        "motivic cohomology",
        "elliptic curves",
        "algebraic K-theory",
      ],
      version: 1,
      publishedAt: new Date("2026-01-28"),
      commentCount: 1,
      reviewCount: 2,
      endorsementCount: 1,
      viewCount: 203,
      authors: {
        create: [
          { userId: fatima.id, order: 0, isCorresponding: true },
          { userId: alice.id, order: 1 },
        ],
      },
    },
  });

  // Paper 7: SUBMITTED — Biomedical Engineering (Ibrahim)
  const paper7 = await prisma.paper.create({
    data: {
      title:
        "Flexible Graphene-Based Biosensor Array for Continuous Glucose Monitoring",
      abstract:
        "We report the development of a flexible, graphene-based biosensor array capable of continuous interstitial glucose monitoring with clinical-grade accuracy. The sensor achieves a mean absolute relative difference (MARD) of 8.2% over 14 days of continuous wear, comparable to commercial CGM devices but at a fraction of the manufacturing cost. The graphene sensing elements are fabricated using roll-to-roll printing on flexible polyimide substrates.",
      content:
        "## 1. Introduction\n\nContinuous glucose monitoring (CGM) has transformed diabetes management, but current devices remain expensive and limited in availability.\n\n## 2. Fabrication\n\nWe developed a roll-to-roll process for printing graphene oxide electrodes on flexible polyimide substrates, followed by laser reduction to restore conductivity.\n\n## 3. Sensor Design\n\nThe biosensor array consists of four working electrodes functionalized with glucose oxidase, providing redundancy and drift compensation.\n\n## 4. In Vivo Evaluation\n\nWe conducted a 14-day clinical trial with 30 participants, comparing our sensor against the Dexcom G7.\n\n## 5. Results\n\nOur sensor achieved MARD of 8.2% with 97.5% of readings in Zones A+B of the consensus error grid.\n\n## 6. Conclusion\n\nLow-cost, flexible graphene biosensors have the potential to democratize continuous glucose monitoring.",
      status: "SUBMITTED",
      disciplines: ["biomedical-engineering", "electrical-engineering"],
      keywords: [
        "biosensor",
        "graphene",
        "glucose monitoring",
        "wearable",
        "flexible electronics",
      ],
      version: 1,
      publishedAt: new Date("2026-02-25"),
      commentCount: 0,
      reviewCount: 0,
      endorsementCount: 0,
      viewCount: 23,
      authors: {
        create: [{ userId: ibrahim.id, order: 0, isCorresponding: true }],
      },
    },
  });

  // Paper 8: DRAFT — Digital Humanities (Julia)
  const paper8 = await prisma.paper.create({
    data: {
      title:
        "Mapping the Republic of Letters: A Network Analysis of Enlightenment Correspondence",
      abstract:
        "Using a dataset of 120,000 letters exchanged between 4,500 scholars during the 17th and 18th centuries, we construct and analyze the correspondence network of the Republic of Letters. We identify key brokers, community structures, and the temporal evolution of intellectual exchange networks across Europe.",
      content:
        "## 1. Introduction\n\nThe Republic of Letters was a long-distance intellectual community of the early modern period. Scholars communicated through extensive correspondence networks.\n\n[Draft in progress — analysis section pending]",
      status: "DRAFT",
      disciplines: ["digital-humanities", "history"],
      keywords: [
        "Republic of Letters",
        "network analysis",
        "Enlightenment",
        "correspondence",
        "digital humanities",
      ],
      version: 1,
      authors: {
        create: [{ userId: julia.id, order: 0, isCorresponding: true }],
      },
    },
  });

  console.log(`  Created 8 papers.`);

  // -----------------------------------------------------------------------
  // 3. Create reviews
  // -----------------------------------------------------------------------
  console.log("Creating reviews...");

  // Reviews for Paper 1 (PUBLISHED AI/NER paper)
  const review1a = await prisma.review.create({
    data: {
      paperId: paper1.id,
      reviewerId: george.id,
      methodologyScore: 9,
      noveltyScore: 8,
      clarityScore: 9,
      reproducibilityScore: 7,
      ethicsScore: 9,
      summary:
        "An excellent contribution to cross-lingual biomedical NER. The methodology is sound and results are impressive across all six languages. The paper is well-written and clearly presents both the approach and experimental results.",
      strengthsText:
        "Strong experimental setup with comprehensive evaluation across multiple languages. Novel combination of domain-adaptive pre-training with cross-lingual transfer. Significant improvements over baselines, especially for low-resource languages.",
      weaknessesText:
        "The reproducibility could be improved — specific hyperparameters for the pre-training phase are not fully documented. The computational cost analysis is missing.",
      detailedComments:
        "Minor: Table 2 has a formatting issue in the Chinese results column. Consider adding a cost-benefit analysis comparing training time vs. performance gains.",
      recommendation: "SOUND",
      confidenceLevel: 4,
      isQualifying: true,
    },
  });

  const review1b = await prisma.review.create({
    data: {
      paperId: paper1.id,
      reviewerId: fatima.id,
      methodologyScore: 8,
      noveltyScore: 7,
      clarityScore: 8,
      reproducibilityScore: 6,
      ethicsScore: 9,
      summary:
        "A solid paper with strong empirical results. The cross-lingual approach is well-motivated and the evaluation is thorough. Some concerns about reproducibility and the limited analysis of failure cases.",
      strengthsText:
        "Comprehensive multilingual evaluation. Clear writing. Practical approach that addresses a real need in biomedical NLP.",
      weaknessesText:
        "Limited error analysis — it would be helpful to understand what types of entities the model struggles with. Pre-training data sources not fully specified.",
      detailedComments:
        "I would like to see more analysis of the few-shot adaptation results. How many examples are needed per language to close the gap with fully supervised models?",
      recommendation: "SOUND",
      confidenceLevel: 3,
      isQualifying: true,
    },
  });

  // Reviews for Paper 2 (PUBLISHED Quantum paper)
  await prisma.review.create({
    data: {
      paperId: paper2.id,
      reviewerId: alice.id,
      methodologyScore: 9,
      noveltyScore: 9,
      clarityScore: 8,
      reproducibilityScore: 8,
      ethicsScore: 10,
      summary:
        "A groundbreaking contribution to practical quantum error correction. The Adaptive Surface Code approach is clever and the experimental validation on real hardware is convincing. This work brings fault-tolerant quantum computing significantly closer to reality.",
      strengthsText:
        "Highly novel approach to adaptive error correction. Real hardware validation on 127-qubit processor. Rigorous threshold analysis. Clear practical implications.",
      weaknessesText:
        "The scaling analysis beyond 127 qubits relies on simulation rather than hardware experiments. Some notation in Section 3 could be clearer.",
      detailedComments:
        "Outstanding work. I have only minor suggestions for improving the presentation of the threshold analysis in Figure 4.",
      recommendation: "SOUND",
      confidenceLevel: 3,
      isQualifying: true,
    },
  });

  await prisma.review.create({
    data: {
      paperId: paper2.id,
      reviewerId: fatima.id,
      methodologyScore: 8,
      noveltyScore: 8,
      clarityScore: 7,
      reproducibilityScore: 7,
      ethicsScore: 10,
      summary:
        "Important work on practical quantum error correction. The mathematical framework is rigorous and the experimental results are promising. Some aspects of the presentation could be improved for a broader audience.",
      strengthsText:
        "Sound mathematical framework. Practical results on real quantum hardware. Addresses a critical bottleneck in quantum computing.",
      weaknessesText:
        "Dense presentation that may be difficult for non-specialists. Would benefit from more intuitive explanations alongside the formal proofs.",
      detailedComments:
        "Consider adding a figure that illustrates the adaptive code distance selection process visually.",
      recommendation: "SOUND",
      confidenceLevel: 4,
      isQualifying: true,
    },
  });

  // Review for Paper 3 (SUBMITTED Climate paper) — only 1 review so far
  await prisma.review.create({
    data: {
      paperId: paper3.id,
      reviewerId: alice.id,
      methodologyScore: 7,
      noveltyScore: 7,
      clarityScore: 8,
      reproducibilityScore: 6,
      ethicsScore: 9,
      summary:
        "A promising approach to statistical downscaling with uncertainty quantification. The Bayesian deep learning framework is well-motivated but the experimental evaluation could be strengthened. The paper is clearly written and addresses an important problem.",
      strengthsText:
        "Novel application of Bayesian deep learning to climate downscaling. Well-calibrated uncertainty estimates. Practical implications for adaptation planning.",
      weaknessesText:
        "Validation limited to South America — generalization to other regions unclear. Computational cost not discussed. Comparison with other UQ methods (dropout, ensemble) missing.",
      detailedComments:
        "I recommend adding comparisons with MC Dropout and deep ensemble baselines. Also, please discuss the computational requirements for producing the uncertainty estimates.",
      recommendation: "NEEDS_REVISION",
      confidenceLevel: 3,
    },
  });

  // Reviews for Paper 6 (PUBLISHED Mathematics paper)
  await prisma.review.create({
    data: {
      paperId: paper6.id,
      reviewerId: bob.id,
      methodologyScore: 10,
      noveltyScore: 9,
      clarityScore: 9,
      reproducibilityScore: 10,
      ethicsScore: 10,
      summary:
        "A remarkable simplification of the proof of the Bloch–Kato conjecture for weight two motives. The new comparison theorem is elegant and the extension to abelian surfaces is a valuable bonus. This paper will be of great interest to the algebraic K-theory community.",
      strengthsText:
        "Elegant proof strategy. Avoids heavy machinery of higher Chow groups. Clear exposition of deep mathematics. Meaningful extension to abelian surfaces.",
      weaknessesText:
        "Very few weaknesses. The only suggestion is to include more explicit computations to aid readers who may want to verify the results computationally.",
      detailedComments:
        "Truly exceptional work. Minor typo in Lemma 3.4: should be H² not H³.",
      recommendation: "SOUND",
      confidenceLevel: 3,
      isQualifying: true,
    },
  });

  await prisma.review.create({
    data: {
      paperId: paper6.id,
      reviewerId: george.id,
      methodologyScore: 9,
      noveltyScore: 9,
      clarityScore: 8,
      reproducibilityScore: 9,
      ethicsScore: 10,
      summary:
        "An important contribution to arithmetic geometry. The elementary approach makes the Bloch–Kato conjecture more accessible and the extension to abelian surfaces opens new research directions.",
      strengthsText:
        "Novel proof technique. Good mathematical exposition. Important theoretical contribution with potential computational applications.",
      weaknessesText:
        "Some steps in Section 4 could benefit from more detailed explanation for non-specialists in motivic cohomology.",
      detailedComments:
        "Consider adding a brief comparison with the Huber-Kings approach to highlight where your proof diverges and simplifies.",
      recommendation: "SOUND",
      confidenceLevel: 4,
      isQualifying: true,
    },
  });

  console.log("  Created 7 reviews.");

  // -----------------------------------------------------------------------
  // 3b. Create bounties
  // -----------------------------------------------------------------------
  console.log("Creating bounties...");

  // Bounty on Paper 1 (PUBLISHED) — COMPLETED, both reviewers paid out
  // $50 total: 90% reviewer pool ($45 → $22.50 each), 10% platform ($5)
  const bounty1 = await prisma.bounty.create({
    data: {
      paperId: paper1.id,
      totalAmountCents: 5000,
      reviewerPoolCents: 4500,
      platformFeeCents: 500,
      currency: "usd",
      status: "COMPLETED",
      maxReviews: 2,
      createdAt: new Date("2026-02-08"),
    },
  });

  // Payout records for the two reviewers (no real Stripe transfer IDs)
  const payout1a = await prisma.bountyPayout.create({
    data: {
      bountyId: bounty1.id,
      recipientUserId: george.id,
      amountCents: 2250,
      paidAt: new Date("2026-02-12"),
      createdAt: new Date("2026-02-12"),
    },
  });

  const payout1b = await prisma.bountyPayout.create({
    data: {
      bountyId: bounty1.id,
      recipientUserId: fatima.id,
      amountCents: 2250,
      paidAt: new Date("2026-02-13"),
      createdAt: new Date("2026-02-13"),
    },
  });

  // Link reviews to payouts
  await prisma.review.update({
    where: { id: review1a.id },
    data: { bountyPayoutId: payout1a.id },
  });
  await prisma.review.update({
    where: { id: review1b.id },
    data: { bountyPayoutId: payout1b.id },
  });

  // Bounty on Paper 3 (SUBMITTED) — ACTIVE, waiting for more reviewers
  // $100 total: 90% reviewer pool ($90 → $30 each for 3 reviewers), 10% platform ($10)
  await prisma.bounty.create({
    data: {
      paperId: paper3.id,
      totalAmountCents: 10000,
      reviewerPoolCents: 9000,
      platformFeeCents: 1000,
      currency: "usd",
      status: "ACTIVE",
      maxReviews: 3,
      createdAt: new Date("2026-02-20"),
      expiresAt: new Date("2026-04-20"),
    },
  });

  // Bounty on Paper 7 (SUBMITTED biomedical) — ACTIVE, no reviews yet
  // $25 total: 90% reviewer pool ($22.50), 10% platform ($2.50)
  await prisma.bounty.create({
    data: {
      paperId: paper7.id,
      totalAmountCents: 2500,
      reviewerPoolCents: 2250,
      platformFeeCents: 250,
      currency: "usd",
      status: "ACTIVE",
      maxReviews: 3,
      createdAt: new Date("2026-02-25"),
      expiresAt: new Date("2026-04-25"),
    },
  });

  console.log("  Created 3 bounties, 2 payouts.");

  // -----------------------------------------------------------------------
  // 4. Create comments
  // -----------------------------------------------------------------------
  console.log("Creating comments...");

  // Comments on Paper 1
  const comment1 = await prisma.comment.create({
    data: {
      paperId: paper1.id,
      authorId: david.id,
      content:
        "Really impressive results on the low-resource languages. Have you considered applying this to indigenous languages where biomedical terminology is even more scarce? I'm working on health data in Quechua-speaking communities and this could be transformative.",
      paperVersion: 1,
    },
  });

  await prisma.comment.create({
    data: {
      paperId: paper1.id,
      authorId: alice.id,
      parentId: comment1.id,
      content:
        "Thank you for the kind words, David! That's a fascinating application. We haven't explored indigenous languages yet, but it's exactly the kind of use case we had in mind. The key challenge would be finding enough biomedical text in Quechua for domain-adaptive pre-training. Would you be interested in collaborating on this?",
      paperVersion: 1,
    },
  });

  await prisma.comment.create({
    data: {
      paperId: paper1.id,
      authorId: elena.id,
      content:
        "The economic implications are interesting too — lower barriers to biomedical NLP could significantly reduce costs for health systems in developing countries. Have you estimated the cost savings from not needing language-specific annotations?",
      paperVersion: 1,
    },
  });

  // Comment on Paper 2
  await prisma.comment.create({
    data: {
      paperId: paper2.id,
      authorId: hannah.id,
      content:
        "The adaptive code distance approach is really clever. I wonder if similar ideas could be applied to classical error correction in distributed systems — adapting redundancy levels based on observed network conditions.",
      paperVersion: 1,
    },
  });

  // Comments on Paper 3
  await prisma.comment.create({
    data: {
      paperId: paper3.id,
      authorId: clara.id,
      content:
        "The uncertainty quantification aspect is crucial for policy decisions. How sensitive are the confidence intervals to the choice of prior? Have you done a prior sensitivity analysis?",
      paperVersion: 1,
    },
  });

  await prisma.comment.create({
    data: {
      paperId: paper3.id,
      authorId: bob.id,
      content:
        "Interesting work! The Bayesian approach reminds me of uncertainty propagation techniques we use in quantum state tomography. The calibration methodology could be relevant across domains.",
      paperVersion: 1,
    },
  });

  // Comment on Paper 6
  await prisma.comment.create({
    data: {
      paperId: paper6.id,
      authorId: julia.id,
      content:
        "As someone working in digital humanities, I find it fascinating how mathematical proof strategies evolve and simplify over time. This paper is a great example of making deep results more accessible. Would it be possible to write a companion piece aimed at a broader mathematical audience?",
      paperVersion: 1,
    },
  });

  console.log("  Created 7 comments.");

  // -----------------------------------------------------------------------
  // 5. Create endorsements
  // -----------------------------------------------------------------------
  console.log("Creating endorsements...");

  // Endorsements for Paper 1 (from high-rep users)
  await prisma.endorsement.create({
    data: {
      paperId: paper1.id,
      endorserId: fatima.id,
      statement:
        "An exemplary cross-lingual NLP study with rigorous evaluation. The multilingual approach addresses a critical gap in biomedical text mining. Highly recommended for anyone working in computational biomedicine.",
    },
  });

  await prisma.endorsement.create({
    data: {
      paperId: paper1.id,
      endorserId: ibrahim.id,
      statement:
        "Important contribution with clear practical applications for healthcare systems worldwide. The methodology is sound and the results are impressive.",
    },
  });

  // Endorsement for Paper 2
  await prisma.endorsement.create({
    data: {
      paperId: paper2.id,
      endorserId: alice.id,
      statement:
        "A breakthrough in practical quantum error correction. The adaptive approach is elegant and the hardware validation is convincing. This will be a landmark paper.",
    },
  });

  // Endorsement for Paper 6
  await prisma.endorsement.create({
    data: {
      paperId: paper6.id,
      endorserId: bob.id,
      statement:
        "A beautiful simplification of an important result in arithmetic geometry. The proof is remarkably clean and accessible.",
    },
  });

  console.log("  Created 4 endorsements.");

  // -----------------------------------------------------------------------
  // 6. Create reputation events (consistent with reputationScore values)
  // -----------------------------------------------------------------------
  console.log("Creating reputation events...");

  const repEvents = [
    // Alice (620): papers accepted + reviews + endorsements received
    {
      userId: alice.id,
      type: "PAPER_ACCEPTED" as const,
      points: 15,
      sourcePaperId: paper1.id,
    },
    {
      userId: alice.id,
      type: "PAPER_ACCEPTED" as const,
      points: 15,
      sourcePaperId: paper6.id,
    },
    {
      userId: alice.id,
      type: "REVIEW_SUBMITTED" as const,
      points: 5,
      sourcePaperId: paper2.id,
    },
    {
      userId: alice.id,
      type: "REVIEW_SUBMITTED" as const,
      points: 5,
      sourcePaperId: paper3.id,
    },
    {
      userId: alice.id,
      type: "PAPER_ENDORSED_BY_TRUSTED" as const,
      points: 20,
      sourcePaperId: paper1.id,
    },
    {
      userId: alice.id,
      type: "ENDORSEMENT_RECEIVED" as const,
      points: 15,
      sourcePaperId: paper1.id,
    },
    {
      userId: alice.id,
      type: "ENDORSEMENT_GIVEN" as const,
      points: 1,
      sourcePaperId: paper2.id,
    },

    // Bob (340): paper accepted + reviews + endorsement
    {
      userId: bob.id,
      type: "PAPER_ACCEPTED" as const,
      points: 15,
      sourcePaperId: paper2.id,
    },
    {
      userId: bob.id,
      type: "REVIEW_SUBMITTED" as const,
      points: 5,
      sourcePaperId: paper6.id,
    },
    {
      userId: bob.id,
      type: "ENDORSEMENT_RECEIVED" as const,
      points: 15,
      sourcePaperId: paper2.id,
    },
    {
      userId: bob.id,
      type: "ENDORSEMENT_GIVEN" as const,
      points: 1,
      sourcePaperId: paper6.id,
    },

    // Clara (155): paper accepted + reviews
    {
      userId: clara.id,
      type: "PAPER_ACCEPTED" as const,
      points: 15,
      sourcePaperId: paper1.id,
    },

    // David (85): reviews
    {
      userId: david.id,
      type: "REVIEW_SUBMITTED" as const,
      points: 5,
      sourcePaperId: paper1.id,
    },

    // Elena (45): paper co-author (submitted, not yet accepted)

    // Fatima (1050): papers accepted + reviews + endorsements
    {
      userId: fatima.id,
      type: "PAPER_ACCEPTED" as const,
      points: 15,
      sourcePaperId: paper6.id,
    },
    {
      userId: fatima.id,
      type: "REVIEW_SUBMITTED" as const,
      points: 5,
      sourcePaperId: paper1.id,
    },
    {
      userId: fatima.id,
      type: "ENDORSEMENT_GIVEN" as const,
      points: 1,
      sourcePaperId: paper1.id,
    },

    // George (210): reviews
    {
      userId: george.id,
      type: "REVIEW_SUBMITTED" as const,
      points: 5,
      sourcePaperId: paper1.id,
    },
    {
      userId: george.id,
      type: "REVIEW_SUBMITTED" as const,
      points: 5,
      sourcePaperId: paper6.id,
    },

    // Ibrahim (130): endorsement given
    {
      userId: ibrahim.id,
      type: "ENDORSEMENT_GIVEN" as const,
      points: 1,
      sourcePaperId: paper1.id,
    },
  ];

  await prisma.reputationEvent.createMany({
    data: repEvents,
  });

  console.log(`  Created ${repEvents.length} reputation events.`);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log("\nDev seed complete!");
  console.log(
    "  10 users (password for all: Password1, notifications disabled)",
  );
  console.log("  8 papers (3 PUBLISHED, 3 SUBMITTED, 2 DRAFT)");
  console.log("  7 reviews");
  console.log("  3 bounties (1 COMPLETED, 2 ACTIVE) + 2 payouts");
  console.log("  7 comments (including 1 threaded reply)");
  console.log("  4 endorsements");
  console.log(`  ${repEvents.length} reputation events`);
  console.log("\nLogin with any user: email from seed + password 'Password1'");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
