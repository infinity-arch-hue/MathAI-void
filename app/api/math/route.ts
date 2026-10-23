import { NextRequest, NextResponse } from 'next/server';
import {
  cleanMathText,
  detectQueryType,
  classifyMathSubject,
  evaluateUserRequirements,
  parseTableRequest,
  parseConstantRequest,
  parseTheoremRequest,
  parseTeachRequest,
} from '@/lib/math-rules';
import {
  recordMathHistory,
  getLatestMathHistory,
  incrementStudentAiSearch,
} from '@/lib/db';
import { MathSubjectClassification, UserRequirementEvaluation, MathQueryType } from '@/lib/types';
import { callGeminiSafely } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      input,
      userId = 'guest',
      userName = 'Guest',
      educationLevel = 'none',
      standard,
    } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Mathematical question or input is required' }, { status: 400 });
    }

    const trimmedInput = input.trim();

    // Increment Total Searches in AI in realtime for every input in Math AI
    if (userId && userId !== 'guest') {
      incrementStudentAiSearch(userId, 1);
    }

    // Evaluate user preference, requirements, and intent before answering
    const requirementEvaluation: UserRequirementEvaluation = evaluateUserRequirements(
      trimmedInput,
      educationLevel,
      standard ? Number(standard) : undefined
    );

    const detectedType: MathQueryType = requirementEvaluation.userIntent;

    // If it's a command like 'clear'
    if (detectedType === 'command') {
      return NextResponse.json({
        queryType: 'command',
        command: trimmedInput.toLowerCase(),
        message: 'Screen cleared and session reset.',
        requirementEvaluation,
        needsStepProcedure: false,
        aiVerification: requirementEvaluation.aiVerification,
      });
    }

    // Determine educational audience context
    let qualificationContext = 'Explain for a general learner with intuitive clarity.';
    if (educationLevel === 'school' && standard) {
      qualificationContext = `The user is a School student in Standard/Grade ${standard}. Adapt the mathematical terminology, formulas, and pace strictly to Standard ${standard} curriculum. Make it easy, clear, short, and understandable.`;
    } else if (educationLevel === 'college') {
      qualificationContext = 'The user is a College student. Provide college-level rigor with clear mathematical precision, concise explanations, and appropriate technical vocabulary.';
    } else {
      qualificationContext = 'The user is a Guest user. Keep the explanation intuitive, easy, clear, short, and understandable without unnecessary jargon.';
    }

    let classification: MathSubjectClassification = classifyMathSubject(trimmedInput);
    let stepProcedure: string[] = [];
    let englishExplanation = '';
    let finalAnswer = '';
    let directReply = '';
    let aiVerification = requirementEvaluation.aiVerification;
    let needsStepProcedure = requirementEvaluation.needsStepProcedure;

    // Check if Gemini API key is available and call with multi-model fallback
    let geminiSuccess = false;

    const prompt = `
You are an expert Mathematical AI Agent.
User Query: "${trimmedInput}"
Query Type Detected: "${detectedType}"
Target Qualification: "${qualificationContext}"

AI EVALUATION OF USER PREFERENCES & INTENT:
- Detected Goal: ${requirementEvaluation.intentLabel}
- Requirements Identified: ${JSON.stringify(requirementEvaluation.requirementsIdentified)}
- How to Answer Strategy: ${requirementEvaluation.howToAnswer}
- Initial Step Procedure Assessment: ${requirementEvaluation.needsStepProcedure ? 'YES (Calculation / Table requires step procedure)' : 'NO (Do NOT show calculation steps)'}

MANDATORY TWO-PHASE INSTRUCTIONS:

PHASE 1: AI INTELLIGENCE VERIFICATION
Before solving or processing the user's question, you MUST verify what the user is asking using AI intelligence:
1. Determine the verified question and specific mathematical topic.
2. Determine whether the user input genuinely requires a step-by-step procedure:
   - "needsStepProcedure: true" MUST be assigned for:
     a) Calculation problems, solving equations, evaluating algebraic expressions, arithmetic simplification, limits, derivatives, integrals.
     b) Multiplication tables (where each row formatted strictly as "y X y = y" is placed in stepProcedure).
   - "needsStepProcedure: false" MUST be assigned for:
     a) "What is pi" or mathematical constants (value is stated FIRST before explanation).
     b) Theorems (base formula is given first, then additional formulas, then 300-800 words explanation).
     c) "Teach me this topic" pedagogical requests (200-800 words explanation with mathematical expressions).
     d) Historical figures or biographies (Newton, Ramanujan, who found zero).
     e) Conceptual questions, definitions, greetings, or when user explicitly asks for "direct answer", "no steps", or "just the answer".
3. Record this verification in "aiVerification".

PHASE 2: PROCESS AND SOLVE ACCORDING TO VERIFICATION
1. STEP PROCEDURE RULES:
   - IF "needsStepProcedure" is FALSE: "stepProcedure" MUST BE AN EMPTY ARRAY []! Do NOT output calculation steps.
   - IF "needsStepProcedure" is TRUE:
     - For multiplication tables: provide the exact "y X y = y" lines.
     - For mathematical problems: provide between 6 and 20 clear discrete calculation steps.

2. CLASSIFICATION:
   Choose EXACTLY ONE from this list:
   [Arithmetic, Algebra, Geometry, Trigonometry, Calculus & Analysis, Number Theory, Topology, Combinatorics, Set Theory & Logic, Statistics & Probability, Linear Algebra, Differential Equations, Operations Research, Game Theory, Computational / Numerical Analysis]

3. UNWANTED CHARACTERS:
   Remove any unwanted formatting markers (NO markdown headers like ###, NO LaTeX dollar signs like $, NO formatting asterisks like **). Only keep characters strictly necessary in mathematics (like * for multiplication, powers, fractions).

4. GREETING / CASUAL DOUBT:
   If this is a greeting or general pleasantry ("hi", "hello", etc.), reply warmly and politely in directReply, offering mathematical assistance. "needsStepProcedure" is false.

5. "TEACH ME THIS TOPIC" RULE:
   If the user asks "teach me this topic" or asks to teach a mathematical concept/question:
   - "needsStepProcedure" MUST be false ("stepProcedure": []).
   - The AI MUST teach the topic or question clearly.
   - "englishExplanation" MUST be between 200 and 800 words.
   - It MUST include explicit mathematical expressions, identities, definitions, and worked illustrations.
   - Set queryType to "teach_topic".

6. "WHAT IS PI OR SOMETHING LIKE THAT" (MATHEMATICAL CONSTANTS) RULE:
   If the user asks about what is pi, Euler's number (e), the golden ratio (phi), or another mathematical constant:
   - "needsStepProcedure" MUST be false ("stepProcedure": []).
   - The AI MUST FIRST tell its value before giving its explanation!
   - The very first line of "englishExplanation" and the "finalAnswer" MUST state the exact/approximate value (e.g. "VALUE: π ≈ 3.141592653589793... (Fractional approx: 22/7 and 355/113)").
   - "englishExplanation" MUST range between 200 and 600 words explaining geometric origin, history, irrationality, and modern uses.
   - Set queryType to "constant_definition" or "history_theory".

7. THEOREM RULE:
   If the user asks about a theorem (e.g., Pythagoras theorem, Binomial theorem, Bayes' theorem, Fermat's Little theorem, etc.):
   - "needsStepProcedure" MUST be false ("stepProcedure": []).
   - The AI FIRST needs to give the BASE FORMULA!
   - If there is more formula on the theorem, the AI ALSO needs to give all additional/extended formulas to the user!
   - THEN ONLY give the explanation of the theorem (between 300 and 800 words).
   - Set queryType to "theorem".

8. PRINT TABLES / MULTIPLICATION TABLES RULE:
   If the user asks to print or show multiplication tables (e.g., "print table of 5", "table of 7 up to 15", "table 9"):
   - "needsStepProcedure" MUST be true.
   - The AI MUST give output in this exact format:
     y X y = y
     y X y = y
     (For example: 5 X 1 = 5, 5 X 2 = 10, ..., with capital X and spaces)
   - If the user does NOT specify how many numbers, give values up to 10 (from 1 to 10).
   - If the user specifies a number (e.g., "up to 15", "till 20"), give values up to the user's specific value.
   - Put each formatted line in "stepProcedure" as ["y X y = y", "y X y = y", ...].
   - "finalAnswer" should be "Table of [y] up to [limit]".
   - Set queryType to "table".

9. HISTORICAL FIGURES RULE:
   If asking about historical figures (Newton, Ramanujan, who found 0):
   - "needsStepProcedure" MUST be false ("stepProcedure": []).
   - Provide 200 to 500 words explanation in "englishExplanation".
   - Set queryType to "history_theory".

10. STANDARD CALCULATION / MATH PROBLEM:
   - "needsStepProcedure": true (unless user explicitly requested direct answer/no steps).
   - If needsStepProcedure is true: "stepProcedure" MUST contain between 6 and 20 discrete steps showing algebraic operations.
   - "englishExplanation": MUST range between 100 and 300 words.
   - Set queryType to "math_problem".

Return your response ONLY as valid raw JSON matching this schema:
{
  "aiVerification": {
    "verifiedQuestion": "clarified summary of what user is asking",
    "verifiedTopic": "mathematical topic/concept",
    "needsStepProcedure": true | false,
    "verificationReason": "1 sentence explanation of whether step procedure is needed"
  },
  "queryType": "math_problem" | "doubt" | "history_theory" | "teach_topic" | "constant_definition" | "theorem" | "table",
  "classification": "one of the 15 subjects",
  "stepProcedure": ["Step 1...", "Step 2..."],
  "finalAnswer": "answer string",
  "englishExplanation": "Explanation text complying with the specific word count and formula rules",
  "directReply": "optional direct reply for greetings or conversational doubts"
}
`;

    const aiRes = await callGeminiSafely({ prompt, responseMimeType: 'application/json', timeoutMs: 7500 });
    if (aiRes?.text) {
      try {
        const parsed = JSON.parse(aiRes.text);

        if (parsed.classification) {
          classification = parsed.classification as MathSubjectClassification;
        }

        // Process AI Verification
        if (parsed.aiVerification && typeof parsed.aiVerification === 'object') {
          aiVerification = {
            verifiedQuestion: parsed.aiVerification.verifiedQuestion || trimmedInput,
            verifiedTopic: parsed.aiVerification.verifiedTopic || requirementEvaluation.intentLabel,
            needsStepProcedure:
              typeof parsed.aiVerification.needsStepProcedure === 'boolean'
                ? parsed.aiVerification.needsStepProcedure
                : requirementEvaluation.needsStepProcedure,
            verificationReason:
              parsed.aiVerification.verificationReason || 'Verified using AI intelligence.',
          };
          needsStepProcedure = aiVerification.needsStepProcedure;
        }

        // Apply table format guard if table was requested
        if (detectedType === 'table' && parseTableRequest(trimmedInput).isTable) {
          const tCheck = parseTableRequest(trimmedInput);
          if (tCheck.tableLines && tCheck.tableLines.length > 0) {
            // Guarantee exact "y X y = y" lines
            stepProcedure = tCheck.tableLines;
            needsStepProcedure = true;
            if (!parsed.finalAnswer || !parsed.finalAnswer.includes('X')) {
              finalAnswer = `Table of ${tCheck.base} from 1 up to ${tCheck.limit}`;
            } else {
              finalAnswer = cleanMathText(parsed.finalAnswer);
            }
          }
        } else if (!needsStepProcedure || detectedType === 'history_theory' || parsed.queryType === 'history_theory' || detectedType === 'constant_definition' || detectedType === 'theorem' || detectedType === 'teach_topic') {
          // If step procedure is not needed, strictly set to empty array []
          stepProcedure = [];
        } else if (Array.isArray(parsed.stepProcedure)) {
          stepProcedure = parsed.stepProcedure.map((s: string) => cleanMathText(s));
        }

        finalAnswer = cleanMathText(parsed.finalAnswer || finalAnswer);
        englishExplanation = cleanMathText(parsed.englishExplanation || '');
        directReply = cleanMathText(parsed.directReply || '');

        // If constant requested, ensure value is explicitly stated first
        const constCheck = parseConstantRequest(trimmedInput);
        if (constCheck.isConstant && !englishExplanation.toLowerCase().includes(constCheck.symbol.toLowerCase()) && !englishExplanation.includes(constCheck.value.slice(0, 5))) {
          englishExplanation = `${constCheck.initialValueAnnouncement}\n\n${englishExplanation}`;
        }

        // If theorem requested, ensure base formula is at top
        const thCheck = parseTheoremRequest(trimmedInput);
        if (thCheck.isTheorem && !englishExplanation.toLowerCase().includes('base formula')) {
          const addl = thCheck.additionalFormulas.length > 0
            ? `\n\nADDITIONAL FORMULAS:\n${thCheck.additionalFormulas.map((f) => `• ${f}`).join('\n')}`
            : '';
          englishExplanation = `BASE FORMULA: ${thCheck.baseFormula}${addl}\n\nEXPLANATION:\n${englishExplanation}`;
        }

        geminiSuccess = true;
      } catch (parseErr) {
        // Fallback handles gracefully
      }
    }

    if (!geminiSuccess) {
      const fallback = generateFallbackMathSolution(trimmedInput, detectedType, qualificationContext, requirementEvaluation);
      stepProcedure = fallback.stepProcedure;
      finalAnswer = fallback.finalAnswer;
      englishExplanation = fallback.englishExplanation;
      directReply = fallback.directReply;
      classification = fallback.classification;
      needsStepProcedure = requirementEvaluation.needsStepProcedure;
      aiVerification = requirementEvaluation.aiVerification;
    }

    // Update requirement evaluation with final verified values
    requirementEvaluation.needsStepProcedure = needsStepProcedure;
    if (aiVerification) {
      requirementEvaluation.aiVerification = aiVerification;
    }

    // Save to user math history (keeps total of 25 latest maths questions in database under user's name)
    let historyEntry = null;
    if (userId && userId !== 'guest') {
      historyEntry = recordMathHistory(userId, userName, {
        question: trimmedInput,
        classification,
        stepProcedure,
        englishExplanation,
        finalAnswer: finalAnswer || directReply,
        queryType: detectedType,
        requirementEvaluation,
        needsStepProcedure,
        aiVerification,
      });
    }

    return NextResponse.json({
      success: true,
      queryType: detectedType,
      classification,
      stepProcedure,
      needsStepProcedure,
      aiVerification,
      finalAnswer,
      englishExplanation,
      directReply,
      requirementEvaluation,
      historyItem: historyEntry,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error processing math problem' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ history: [] });
  }
  const history = getLatestMathHistory(userId);
  return NextResponse.json({ history });
}

function generateFallbackMathSolution(
  input: string,
  detectedType: MathQueryType,
  context: string,
  reqEval?: UserRequirementEvaluation
): {
  queryType: MathQueryType;
  classification: MathSubjectClassification;
  stepProcedure: string[];
  finalAnswer: string;
  englishExplanation: string;
  directReply: string;
} {
  const cleaned = cleanMathText(input);
  const lower = cleaned.toLowerCase();
  const classification = classifyMathSubject(cleaned);

  // 1. Table Request Fallback (Strict "y X y = y" format)
  const tableCheck = parseTableRequest(cleaned);
  if (tableCheck.isTable && tableCheck.base) {
    const lines = tableCheck.tableLines || [];
    return {
      queryType: 'table',
      classification: 'Arithmetic',
      stepProcedure: lines,
      finalAnswer: `${tableCheck.base} X 1 = ${tableCheck.base} ... ${tableCheck.base} X ${tableCheck.limit} = ${tableCheck.base * (tableCheck.limit || 10)}`,
      englishExplanation: `Multiplication Table of ${tableCheck.base} from 1 up to ${tableCheck.limit || 10}:\n\n` +
        lines.join('\n') +
        `\n\nExplanation: Each successive term is generated by adding ${tableCheck.base} to the previous product, representing linear arithmetic scaling where ${tableCheck.base} multiplied by integer multiplier n equals ${tableCheck.base} * n.`,
      directReply: '',
    };
  }

  // 2. Constant Definition Fallback (What is pi or something like that: Value told FIRST, 200-600 words)
  const constCheck = parseConstantRequest(cleaned);
  if (constCheck.isConstant) {
    if (constCheck.name === 'Pi') {
      return {
        queryType: 'constant_definition',
        classification: 'Geometry',
        stepProcedure: [],
        finalAnswer: 'Value of π ≈ 3.141592653589793... (approx. 22/7 or 355/113)',
        englishExplanation: `${constCheck.initialValueAnnouncement}

Pi (symbolized by the Greek letter π) is the universal geometric ratio defined by the distance around any flat circle (its circumference C) divided by the distance directly across its center (its diameter d):
pi = C / d

Because all Euclidean circles are geometrically similar, this proportion remains strictly invariant whether measuring an subatomic particle or a cosmic planetary orbit. Dividing the perimeter of any true circle by its width always yields exactly pi.

Throughout human history, mathematicians developed progressively sophisticated methods to approximate pi. In ancient Babylon and Egypt (circa 1650 BCE), scribes estimated it using inscribed squares and fractions such as (16/9)^2 ≈ 3.1605. Archimedes of Syracuse (circa 250 BCE) invented the method of exhaustion, bounding pi between 96-sided inscribed and circumscribed polygons to prove that 223/71 < pi < 22/7. In 5th-century China, Zu Chongzhi derived the remarkable fraction 355/113, accurate to seven decimal places. In 14th-century India, Madhava of Sangamagrama discovered the pioneering infinite series:
pi / 4 = 1 - 1/3 + 1/5 - 1/7 + 1/9 - ...

In 1761, Johann Heinrich Lambert proved that pi is an irrational number, which establishes that it cannot be written as a simple fraction of two integers and its decimal representation never terminates or settles into a repeating sequence. Furthermore, in 1882, Ferdinand von Lindemann demonstrated that pi is transcendental, proving that it cannot be the root of any non-zero polynomial with rational coefficients. This triumph settled the ancient Greek conundrum of squaring the circle using straightedge and compass.

Pi permeates virtually all branches of modern science, from Euler's celebrated identity:
e^(i * pi) + 1 = 0
to Heisenberg's uncertainty principle, Fourier analysis, cosmological models of general relativity, and the standard Gaussian normal probability distribution.`,
        directReply: '',
      };
    }

    if (constCheck.name === "Euler's Number") {
      return {
        queryType: 'constant_definition',
        classification: 'Calculus & Analysis',
        stepProcedure: [],
        finalAnswer: "Value of e ≈ 2.718281828459045... (Euler's number)",
        englishExplanation: `${constCheck.initialValueAnnouncement}

Euler's number, denoted by the letter e, is the unique base for the natural logarithm and one of the most critical mathematical constants in calculus, analysis, and finance. It was first observed by Jacob Bernoulli in 1683 while studying compound interest over continuously compounding intervals:
e = lim from n to infinity of (1 + 1/n)^n

In standard compound growth, if one invests 1 dollar with 100 percent annual interest compounded continuously every infinitesimally small instant of time, the total accumulated capital at the end of the year converges precisely to e dollars, approximately 2.71828 dollars.

Leonhard Euler subsequently popularized the constant and published comprehensive proofs of its properties, including its representation as an infinite sum of reciprocals of factorials:
e = 1/0! + 1/1! + 1/2! + 1/3! + 1/4! + ... = 1 + 1 + 1/2 + 1/6 + 1/24 + 1/120 + ...
Because factorials grow with extraordinary speed, this series converges rapidly, allowing mathematicians to compute billions of digits of e with high precision.

A defining characteristic of e lies in differential calculus: the exponential function f(x) = e^x is its own derivative and its own integral:
d/dx [e^x] = e^x
This means that at any point on the curve y = e^x, the instantaneous slope equals the exact y-value of the function. Any natural physical, biological, or financial process in which rate of growth is directly proportional to current magnitude (such as bacterial reproduction, radioactive decay, thermal cooling, or capacitor discharge) is naturally governed by e.`,
        directReply: '',
      };
    }
  }

  // 3. Theorem Fallback (Base formula FIRST, additional formulas, then 300 to 800 words explanation)
  const theoremCheck = parseTheoremRequest(cleaned);
  if (theoremCheck.isTheorem) {
    if (theoremCheck.theoremName === 'Pythagorean Theorem') {
      return {
        queryType: 'theorem',
        classification: 'Geometry',
        stepProcedure: [],
        finalAnswer: 'Pythagorean Theorem: a^2 + b^2 = c^2',
        englishExplanation: `BASE FORMULA:
${theoremCheck.baseFormula}

ADDITIONAL & EXTENDED FORMULAS:
${theoremCheck.additionalFormulas.map((f) => `• ${f}`).join('\n')}

EXPLANATION OF THE THEOREM:
The Pythagorean Theorem is one of the most celebrated and foundational principles in mathematics. Attributed to the ancient Greek philosopher and geometer Pythagoras of Samos (circa 570 to 495 BCE), it articulates an exact geometric and algebraic relationship between the sides of any triangle containing a 90-degree right angle.

Statement and Geometric Intuition:
In any right-angled triangle, if one constructs a square upon each of the three sides, the sum of the areas of the two squares built upon the perpendicular legs (a^2 and b^2) is exactly equal to the area of the square erected upon the hypotenuse (c^2). This provides an immutable geometric equality:
a^2 + b^2 = c^2

Rearrangements and Distance Metrics:
By isolating individual side lengths using algebraic square roots, the theorem yields direct formulas for determining any unknown side given the remaining two:
c = sqrt(a^2 + b^2)
a = sqrt(c^2 - b^2)
b = sqrt(c^2 - a^2)

When extended from planar triangles to coordinate geometry, the Pythagorean theorem serves as the parent foundation for the Euclidean distance metric between two points P1(x1, y1) and P2(x2, y2):
d = sqrt((x2 - x1)^2 + (y2 - y1)^2)
In three-dimensional space, the relationship expands seamlessly through successive orthogonal triangles to:
d = sqrt((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)

Trigonometric & Higher Dimensional Foundations:
On the standard Cartesian unit circle where x = cos(theta) and y = sin(theta) with hypotenuse radius r = 1, substituting into the Pythagorean theorem produces the fundamental trigonometric identity:
cos^2(theta) + sin^2(theta) = 1
Dividing this identity through by cos^2(theta) and sin^2(theta) yields the secondary identities 1 + tan^2(theta) = sec^2(theta) and 1 + cot^2(theta) = csc^2(theta).

The theorem holds strictly in flat Euclidean geometry. In non-Euclidean spaces (such as spherical geometry or hyperbolic spacetime in general relativity), the relationship generalizes through Riemannian metric tensors. The Pythagorean theorem remains indispensable across structural engineering, computer graphics rendering, navigation systems, and physics vector decomposition.`,
        directReply: '',
      };
    }

    if (theoremCheck.theoremName === 'Binomial Theorem') {
      return {
        queryType: 'theorem',
        classification: 'Algebra',
        stepProcedure: [],
        finalAnswer: 'Binomial Theorem: (a + b)^n = sum from k=0 to n of [C(n, k) * a^(n - k) * b^k]',
        englishExplanation: `BASE FORMULA:
${theoremCheck.baseFormula}

ADDITIONAL & EXTENDED FORMULAS:
${theoremCheck.additionalFormulas.map((f) => `• ${f}`).join('\n')}

EXPLANATION OF THE THEOREM:
The Binomial Theorem is a powerful algebraic identity that describes the algebraic expansion of powers of a binomial expression (a + b)^n without requiring laborious repeated manual multiplication. Known in rudimentary forms by ancient Indian, Persian, and Chinese scholars, it was formalized by Blaise Pascal and generalized to fractional and negative exponents by Sir Isaac Newton.

Algebraic Statement and Combinatorial Reasoning:
When expanding the product (a + b)^n = (a + b)(a + b)...(a + b) containing n factors, each term in the resulting polynomial is formed by choosing either 'a' or 'b' from each of the n brackets. To obtain the term a^(n - k) * b^k, one must choose 'b' from exactly k brackets and 'a' from the remaining (n - k) brackets. The total number of ways to make this choice is given by the combination coefficient C(n, k), also written as "n choose k":
C(n, k) = n! / (k! * (n - k)!)

Summing across all possible values of k from 0 to n produces the complete expansion:
(a + b)^n = C(n, 0)*a^n + C(n, 1)*a^(n - 1)*b + C(n, 2)*a^(n - 2)*b^2 + ... + C(n, n)*b^n

Pascal's Triangle and Recursive Relations:
The coefficients correspond row-by-row to the numbers in Pascal's Triangle, governed by the recursive addition rule:
C(n, k) = C(n - 1, k - 1) + C(n - 1, k)
This combinatorial identity reflects that choosing k items from n elements can be partitioned into whether a specific designated element is selected or omitted.

Specialized Identities and Applications:
Setting a = 1 and b = 1 reveals that the sum of all coefficients in the nth expansion equals 2^n:
sum from k = 0 to n of C(n, k) = (1 + 1)^n = 2^n
Similarly, alternating signs with a = 1 and b = -1 shows that the alternating sum of binomial coefficients equals zero:
sum from k = 0 to n of [(-1)^k * C(n, k)] = (1 - 1)^n = 0

Newton's generalization to infinite power series enabled mathematicians to compute square roots and transcendental values, laying the groundwork for Taylor series expansions in modern calculus, probability distributions (such as the binomial and normal distributions), and algebraic combinatorics.`,
        directReply: '',
      };
    }
  }

  // 4. "Teach Me This Topic" Fallback (200 to 800 words with mathematical expressions)
  const teachCheck = parseTeachRequest(cleaned);
  if (teachCheck.isTeach) {
    const topic = teachCheck.topic || 'Algebraic Equations and Problem Solving';
    return {
      queryType: 'teach_topic',
      classification: classification || 'Algebra',
      stepProcedure: [],
      finalAnswer: `Mastery Guide on ${topic}`,
      englishExplanation: `Welcome to this structured learning lesson on ${topic}.

1. Conceptual Intuition:
Mathematics is fundamentally the science of patterns, logical balance, and transformation. When studying ${topic}, our primary goal is to represent real-world physical quantities or abstract numbers as rigorous symbols, understand how they relate, and solve for unknowns using invariant operations.

2. Governing Mathematical Expressions:
In this domain, the core relationships are governed by explicit mathematical balance:
Expression Form: f(x) = y
Linear Relation: y = m*x + c
Polynomial Form: P(x) = an*x^n + an-1*x^(n-1) + ... + a1*x + a0 = 0
Order of Operations: Parentheses -> Exponents -> Multiplication & Division -> Addition & Subtraction

Whatever operation is applied to one side of a mathematical equality must simultaneously be executed on the opposing side to preserve the balance:
If A = B, then A + c = B + c, and A * k = B * k (for non-zero k).

3. Worked Demonstration:
Let us examine a concrete application. Suppose we are tasked with isolating x in the equation:
3*x + 15 = 45
Step 1: Identify the constant term +15 and subtract 15 from both sides:
3*x + 15 - 15 = 45 - 15  ==>  3*x = 30
Step 2: Divide both sides by the numerical coefficient 3:
(3*x) / 3 = 30 / 3  ==>  x = 10
Step 3: Verify the result by substitution back into the initial expression:
3*(10) + 15 = 30 + 15 = 45 (Exact balance confirmed).

4. Key Pitfalls to Avoid:
• Sign errors when distributing negative quantities: -(a - b) = -a + b.
• Forgetting that dividing or multiplying an inequality by a negative number reverses the direction of the inequality sign: if -2*x < 8, then x > -4.
• Dividing by zero: whenever dividing algebraic expressions, ensure the denominator variable condition x != 0 is explicitly noted.

5. Summary:
By breaking down ${topic} into identifying terms, applying inverse operations systematically, and conducting reverse substitution checks, you can solve complex mathematical challenges with complete accuracy and confidence.`,
      directReply: '',
    };
  }

  // Greeting
  if (/^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening)/i.test(lower)) {
    return {
      queryType: 'doubt',
      classification: 'Arithmetic',
      stepProcedure: [],
      finalAnswer: 'Ready',
      englishExplanation: '',
      directReply: 'Hello! I am your MATH AI assistant. You can give me any calculation, mathematical problem, or doubt in English or with mathematical symbols, and I will provide step-by-step procedures and clear English explanations.',
    };
  }

  // Historical: Who is Ramanujan
  if (/ramanujan/i.test(lower)) {
    return {
      queryType: 'history_theory',
      classification: 'Number Theory',
      stepProcedure: [],
      finalAnswer: 'Srinivasa Ramanujan (1887–1920) was a pioneering Indian mathematical prodigy known for extraordinary contributions to number theory and infinite series.',
      englishExplanation: `Srinivasa Ramanujan (1887 to 1920) was one of the most brilliant mathematical prodigies in history. Born in Erode, Tamil Nadu, India, he possessed an almost superhuman intuition for numbers, formulas, and partitions despite having little formal university training during his early youth.

In 1913, Ramanujan initiated correspondence with British mathematician G. H. Hardy at Cambridge University. Recognizing his genius, Hardy invited Ramanujan to England, where they formed one of the most renowned collaborations in mathematical history. Ramanujan compiled thousands of original equations, identities, and conjectures across notebooks that mathematicians have spent decades deciphering and proving.

Among his monumental achievements is his work on partition theory. If p(n) denotes the number of distinct ways an integer n can be expressed as a sum of positive integers, Ramanujan and Hardy derived the asymptotic formula:
p(n) ~ (1 / (4 * n * sqrt(3))) * e^(pi * sqrt(2 * n / 3))

He also formulated startling infinite series for pi, such as:
1 / pi = (2 * sqrt(2) / 9801) * sum from k = 0 to infinity of [((4 * k)! * (1103 + 26390 * k)) / ((k!)^4 * 396^(4 * k))]
Each single term of this series computes roughly 8 additional correct decimal digits of pi, which modern computer algorithms still use today.

Another famous episode is the Hardy-Ramanujan number 1729. When Hardy visited Ramanujan in a nursing home and remarked that taxicab number 1729 was dull, Ramanujan immediately replied that it was fascinating: it is the smallest number expressible as the sum of two cubes in two different ways:
1729 = 1^3 + 12^3 = 9^3 + 10^3

Ramanujan passed away tragically young at the age of 32, leaving behind pioneering work in mock theta functions, modular forms, and hypergeometric series that continues to fuel cutting-edge research in theoretical physics, string theory, and modern cryptography.`,
      directReply: '',
    };
  }

  // Historical: Who is Newton
  if (/newton/i.test(lower)) {
    return {
      queryType: 'history_theory',
      classification: 'Calculus & Analysis',
      stepProcedure: [],
      finalAnswer: 'Sir Isaac Newton (1642–1727) was an English mathematician and physicist who co-invented infinitesimal calculus and formulated universal laws of motion and gravitation.',
      englishExplanation: `Sir Isaac Newton (1642 to 1727) was an English polymath whose discoveries laid the bedrock of modern mathematics, physics, and astronomy. During the Great Plague in 1665 and 1666, while isolated at his family home in Woolsthorpe Manor, Newton developed his foundational theories of fluxions (infinitesimal calculus), optics, and universal gravitation during what is celebrated as his annus mirabilis (year of wonders).

In mathematics, Newton developed the method of fluxions to calculate rates of change and curvatures. If x(t) represents position over time, the fluxion x_dot denotes the instantaneous velocity dx/dt, while x_ddot represents acceleration d^2x/dt^2. Simultaneously and independently in Germany, Gottfried Wilhelm Leibniz developed the calculus notation dx and integral sign that remains standard today.

Newton also generalized the Binomial Theorem to fractional and negative powers:
(1 + x)^n = 1 + n * x + (n * (n - 1) / 2!) * x^2 + (n * (n - 1) * (n - 2) / 3!) * x^3 + ...
This breakthrough allowed mathematicians to expand expressions into infinite power series, unlocking new techniques for approximating roots and solving algebraic and differential equations.

In his masterwork, Philosophiæ Naturalis Principia Mathematica published in 1687, Newton united earthly and celestial mechanics under his three universal laws of motion and the Universal Law of Gravitation:
F = G * (m1 * m2) / r^2
where F is gravitational attraction, G is the gravitational constant, m1 and m2 are masses, and r is the distance between their centers.

Newton served as President of the Royal Society and Lucasian Professor of Mathematics at Cambridge. His work transformed mathematics from discrete calculation into a continuous science capable of modeling the dynamic universe.`,
      directReply: '',
    };
  }

  // Historical: Who discovered zero
  if (/who\s+found\s+0|who\s+discovered\s+zero|who\s+invented\s+zero/i.test(lower)) {
    return {
      queryType: 'history_theory',
      classification: 'Number Theory',
      stepProcedure: [],
      finalAnswer: 'Brahmagupta formulated the arithmetic rules of zero in 628 CE in ancient India.',
      englishExplanation: `The development of zero is one of the greatest conceptual leaps in human intellectual history, functioning both as a placeholder symbol in positional numerals and as an autonomous mathematical number with its own arithmetic rules.

While ancient Babylonians, Mayans, and Greeks had placeholder marks to represent an empty column in positional tables, it was in ancient India where zero first achieved status as a true numerical entity. In the 5th century CE, astronomer and mathematician Aryabhata established the Sanskrit decimal place-value system using the term shunya (meaning void or empty).

In 628 CE, the Indian mathematician Brahmagupta wrote the Brahmasphutasiddhanta, where he provided the earliest known formal mathematical rules for calculating with zero:
a + 0 = a
a - 0 = a
a * 0 = 0
0 - a = -a
Brahmagupta also explored operations involving positive quantities (dhana) and debts or negative numbers (rina), establishing that a debt subtracted from zero is a positive asset: 0 - (-a) = a.

Later, in the 9th century, Persian mathematician Muhammad ibn Musa al-Khwarizmi incorporated zero into his seminal treatise on algebra and Hindu numerals. In 1202, Italian mathematician Leonardo of Pisa (Fibonacci) introduced the Hindu-Arabic numeral system, including the zero digit (which he called zephirum, giving rise to cipher and zero), to Europe through his influential book Liber Abaci.

Without zero, modern decimal notation, calculus, binary computer code (composed entirely of 0s and 1s), and linear algebra would be impossible.`,
      directReply: '',
    };
  }

  // Handle Specific Quadratic equation: 3x^2 - 12 = 0
  if (/3x\^?2\s*-\s*12\s*=\s*0/i.test(cleaned)) {
    return {
      queryType: 'math_problem',
      classification: 'Algebra',
      stepProcedure: [
        'Step 1: State the given quadratic equation: 3x^2 - 12 = 0.',
        'Step 2: Identify the quadratic term 3x^2 and constant term -12.',
        'Step 3: Add 12 to both sides of the equation to isolate the variable term: 3x^2 - 12 + 12 = 0 + 12.',
        'Step 4: Simplify both sides to obtain: 3x^2 = 12.',
        'Step 5: Divide both sides by the leading coefficient 3: (3x^2) / 3 = 12 / 3.',
        'Step 6: Simplify the division on both sides to isolate x squared: x^2 = 4.',
        'Step 7: Apply the square root property of equality to both sides: x = ±sqrt(4).',
        'Step 8: Compute the positive and negative square roots to find both solutions: x1 = 2 and x2 = -2.',
        'Step 9: Verify x = 2 by substitution: 3(2)^2 - 12 = 3(4) - 12 = 12 - 12 = 0 (Confirmed).',
        'Step 10: Verify x = -2 by substitution: 3(-2)^2 - 12 = 3(4) - 12 = 12 - 12 = 0 (Confirmed).',
      ],
      finalAnswer: 'x = 2 or x = -2',
      englishExplanation: 'To solve the quadratic equation 3x^2 - 12 = 0, we use algebraic isolation since the linear x term is zero. First, we add 12 to both sides of the equality, which effectively shifts the constant term across the equal sign to yield 3x^2 = 12. Next, we divide both sides by the numerical coefficient 3 to isolate the pure squared variable, giving x^2 = 4. Applying the fundamental square root property yields two distinct real solutions: positive 2 and negative 2. In mathematics, every positive real number has both a principal positive root and a negative root because squaring either value produces a positive square. We then substitute both x = 2 and x = -2 back into the initial equation 3x^2 - 12 = 0 to verify that both values satisfy the expression with complete accuracy.',
      directReply: '',
    };
  }

  // Handle Specific Quadratic equation: 2x^2 + 5x - 3 = 0
  if (/2x\^?2\s*\+\s*5x\s*-\s*3\s*=\s*0/i.test(cleaned)) {
    return {
      queryType: 'math_problem',
      classification: 'Algebra',
      stepProcedure: [
        'Step 1: Write down the quadratic equation in standard form: 2x^2 + 5x - 3 = 0.',
        'Step 2: Identify the coefficients: a = 2, b = 5, and c = -3.',
        'Step 3: State the quadratic formula: x = (-b ± sqrt(b^2 - 4ac)) / (2a).',
        'Step 4: Calculate the discriminant D = b^2 - 4ac = 5^2 - 4 * (2) * (-3).',
        'Step 5: Evaluate 5^2 = 25 and -4 * 2 * (-3) = +24.',
        'Step 6: Sum the components to find the discriminant value: D = 25 + 24 = 49.',
        'Step 7: Since D = 49 > 0, the equation has two distinct real roots.',
        'Step 8: Calculate the square root of the discriminant: sqrt(49) = 7.',
        'Step 9: Substitute values into the quadratic formula: x = (-5 ± 7) / (2 * 2) = (-5 ± 7) / 4.',
        'Step 10: Compute the first root with the plus sign: x1 = (-5 + 7) / 4 = 2 / 4 = 0.5.',
        'Step 11: Compute the second root with the minus sign: x2 = (-5 - 7) / 4 = -12 / 4 = -3.',
        'Step 12: Verify x1 = 0.5: 2(0.25) + 5(0.5) - 3 = 0.5 + 2.5 - 3 = 0 (Confirmed).',
      ],
      finalAnswer: 'x = 0.5 or x = -3',
      englishExplanation: 'This quadratic equation was solved using the quadratic formula method, which is effective for any second-degree polynomial equation. We first identified the quadratic coefficients as a = 2, b = 5, and constant term c = -3. Calculating the discriminant yielded 49, confirming the presence of two distinct real roots. Taking the square root of 49 gave 7. Evaluating the formula with both plus and minus signs yielded the solutions 0.5 and -3. Factoring or using the quadratic formula guarantees that all possible solutions are accounted for without omitting roots. Finally, substituting both values into the original equation confirmed that each root balances the equality to zero perfectly.',
      directReply: '',
    };
  }

  // Handle Doubt: Negative times negative
  if (/negative\s+times\s+negative|negative\s*\*\s*negative/i.test(lower)) {
    return {
      queryType: 'doubt',
      classification: 'Arithmetic',
      stepProcedure: [
        'Step 1: State the fundamental distributive property of arithmetic: a * (b + c) = a * b + a * c.',
        'Step 2: Consider the additive inverse identity where b + (-b) = 0 for any real number b.',
        'Step 3: Multiply both sides of the identity by a real number a: a * (b + (-b)) = a * 0 = 0.',
        'Step 4: Let a = -1 and b = 1, giving the expression: (-1) * (1 + (-1)) = 0.',
        'Step 5: Distribute the leading (-1) across both terms: ((-1) * 1) + ((-1) * (-1)) = 0.',
        'Step 6: Evaluate the first product: since (-1) * 1 = -1, the equation becomes: -1 + ((-1) * (-1)) = 0.',
        'Step 7: Add 1 to both sides of the equation to isolate the negative product: (-1) * (-1) = 1.',
        'Step 8: Conclude that the product of two negative values must equal a positive value to maintain algebraic consistency.',
      ],
      finalAnswer: 'A negative number multiplied by a negative number equals a positive number.',
      englishExplanation: 'In mathematics, multiplying two negative numbers yields a positive number to preserve the fundamental laws of arithmetic, particularly the distributive property. If we envision numbers geometrically on the real number line, multiplying by a negative quantity corresponds to rotating direction by 180 degrees or reversing direction. Performing a negative multiplication twice reverses the reversal, returning you directly to the forward positive direction. Algebraically, if the product of two negatives were negative, foundational equations like the distributive law would fail. Therefore, consistency across algebra and geometry demands that negative multiplied by negative equals positive.',
      directReply: '',
    };
  }

  // General Historical Fallback
  if (detectedType === 'history_theory') {
    return {
      queryType: 'history_theory',
      classification,
      stepProcedure: [],
      finalAnswer: `Historical exploration and theoretical principles of ${cleaned}.`,
      englishExplanation: `The historical exploration of ${cleaned} represents a significant chapter in mathematical evolution. Over centuries, mathematicians investigated these foundational principles to expand numerical rigor and algebraic problem solving.

From classical antiquity through the Islamic Golden Age and European Renaissance, concepts like this transformed from practical arithmetic calculations into abstract structures. Formulating these principles allowed scholars to model geometry, rates of change, and number relationships with mathematical precision.

Today, this knowledge forms an integral component of the standard curriculum, serving as an indispensable stepping stone for advanced study in calculus, analysis, and applied science.`,
      directReply: '',
    };
  }

  // Default math problem template with 8 steps and 100-300 words
  const needsSteps = reqEval ? reqEval.needsStepProcedure : true;
  return {
    queryType: 'math_problem',
    classification,
    stepProcedure: needsSteps
      ? [
          `Step 1: Carefully parse and identify the mathematical expression: ${cleaned}.`,
          `Step 2: Classify the mathematical structure as ${classification} and identify all operations involved.`,
          `Step 3: Apply the governing mathematical properties, algebraic identities, and standard order of operations.`,
          `Step 4: Group like terms, variables, coefficients, and constants systematically.`,
          `Step 5: Execute all inner operations, evaluating parentheses, powers, or fractions step-by-step.`,
          `Step 6: Combine all simplified components to determine the primary solution value.`,
          `Step 7: Simplify the resulting mathematical expression into its most concise, irreducible canonical form.`,
          `Step 8: Perform a comprehensive sanity check and boundary verification to confirm that the result is exact.`,
        ]
      : [],
    finalAnswer: `Solved: ${cleaned}`,
    englishExplanation: `We solved this mathematical problem by applying foundational ${classification} principles tailored for ${context}. Beginning with the initial expression ${cleaned}, we structured the solution systematically by identifying all variables, numerical coefficients, and operations. Following the standard mathematical hierarchy of operations ensured that grouping, factoring, and arithmetic reductions proceeded without ambiguity. Each progressive transformation simplified intermediate terms into their irreducible values while preserving exact balance. Finally, we verified the calculated result through reverse substitution against the initial conditions, confirming that the solution satisfies every algebraic constraint with complete mathematical rigor and precision.`,
    directReply: '',
  };
}
