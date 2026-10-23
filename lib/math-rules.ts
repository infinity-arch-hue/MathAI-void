import {
  MATH_SUBJECT_CLASSIFICATIONS,
  MathSubjectClassification,
  WrongQuizQuestion,
  QuizQuestion,
  UserRequirementEvaluation,
  MathQueryType,
} from './types';

/**
 * Remove unwanted formatting characters (such as markdown headers #, LaTeX/currency $,
 * formatting asterisks * or **), preserving mathematical symbols only when necessary.
 */
export function cleanMathText(text: string): string {
  if (!text) return '';

  return (
    text
      // Remove markdown headings like ### or ##
      .replace(/^[ \t]*#+[ \t]*/gm, '')
      // Remove bold and italic markers like ***, **, or single * not between numbers
      .replace(/\*{3,}/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // Remove single * used for bullet points or emphasis at start of line
      .replace(/^[ \t]*\*[ \t]+/gm, '• ')
      // Remove isolated asterisks used for emphasis, e.g., *word* -> word
      .replace(/(?<![\d\w])\*([a-zA-Z0-9\s]+)\*(?![\d\w])/g, '$1')
      // Remove LaTeX math delimiters ($$ and $) unless it looks like price/currency
      .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
      .replace(/\$([^\$\n]+)\$/g, '$1')
      // Clean up stray double hashes or dollar signs
      .replace(/#{2,}/g, '')
      .replace(/\$/g, '')
      // Clean up multiple empty lines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Generate User ID according to requirements:
 * 1 character + 4 digits:
 * - Student ID: starts with 'S'
 * - Teacher ID: starts with 'T'
 */
export function generateUserId(role: 'student' | 'teacher', existingIds: string[] = []): string {
  const prefix = role === 'student' ? 'S' : 'T';
  for (let i = 0; i < 1000; i++) {
    const num = Math.floor(1000 + Math.random() * 9000); // 4-digit number (1000 - 9999)
    const id = `${prefix}${num}`;
    if (!existingIds.includes(id)) {
      return id;
    }
  }
  return `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Generate Class ID:
 * 3 characters and 5 digits:
 * - 1st character: teacher's name 1st letter (uppercase)
 * - 2nd character: teacher's name last letter (uppercase)
 * - 3rd character: random uppercase letter
 * - Followed by 5 digits
 */
export function generateClassId(teacherName: string): string {
  const cleanedName = teacherName.trim().replace(/[^a-zA-Z]/g, '');
  const firstLetter = (cleanedName[0] || 'T').toUpperCase();
  const lastLetter = (cleanedName[cleanedName.length - 1] || 'C').toUpperCase();

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const thirdLetter = letters[Math.floor(Math.random() * letters.length)];

  // 5 digits (10000 - 99999)
  const digits = Math.floor(10000 + Math.random() * 90000);

  return `${firstLetter}${lastLetter}${thirdLetter}${digits}`;
}

/**
 * Validates Class ID format:
 * 3 uppercase letters followed by 5 digits
 */
export function isValidClassId(classId: string): boolean {
  return /^[A-Z]{3}\d{5}$/.test(classId.trim());
}

/**
 * Detect table request, base number, and limit from user input.
 * Default limit is 10 if not specified by user.
 */
export function parseTableRequest(input: string): {
  isTable: boolean;
  base?: number;
  limit?: number;
  tableLines?: string[];
} {
  const lower = input.trim().toLowerCase();

  // Check if query is asking for multiplication tables
  const isTableQuery =
    /\b(?:multiplication\s+)?tables?\b/i.test(lower) ||
    /\bprint\s+table/i.test(lower) ||
    /^\s*\d+\s*(?:th|st|nd|rd)?\s+table\b/i.test(lower);

  if (!isTableQuery) {
    return { isTable: false };
  }

  // Extract base number (e.g. "table of 5", "print table 7", "multiplication table for 12", "5 table")
  let base: number | undefined;
  const baseMatch =
    lower.match(/(?:table\s+(?:of|for)?\s*|print\s+table\s+|multiplication\s+table\s+(?:of|for)?\s*)(\d+)/i) ||
    lower.match(/(\d+)\s*(?:th|st|nd|rd)?\s+table/i);

  if (baseMatch && baseMatch[1]) {
    base = parseInt(baseMatch[1], 10);
  }

  // Extract user-specified limit (e.g. "up to 15", "till 20", "until 12", "to 25")
  let limit = 10; // Default limit up to 10
  const limitMatch = lower.match(/(?:up\s*to|till|until|through|limit\s*(?:to|of)?)\s*(\d+)/i);
  if (limitMatch && limitMatch[1]) {
    limit = parseInt(limitMatch[1], 10);
  }

  if (!base || isNaN(base)) {
    // Check if there is any lonely number in the query
    const numberMatch = lower.match(/\b\d+\b/);
    if (numberMatch) {
      base = parseInt(numberMatch[0], 10);
    } else {
      base = 1; // Fallback
    }
  }

  // Cap limit safely between 1 and 100
  const safeLimit = Math.min(Math.max(1, limit), 100);

  // Generate output strictly in "y X y = y" format
  const tableLines: string[] = [];
  for (let i = 1; i <= safeLimit; i++) {
    tableLines.push(`${base} X ${i} = ${base * i}`);
  }

  return {
    isTable: true,
    base,
    limit: safeLimit,
    tableLines,
  };
}

/**
 * Detect mathematical constants like pi, e, phi, etc.
 * The AI first tells its value before giving its explanation (about 200 to 600 words).
 */
export function parseConstantRequest(input: string): {
  isConstant: boolean;
  name: string;
  symbol: string;
  value: string;
  fractionalApprox?: string;
  initialValueAnnouncement: string;
} {
  const lower = input.trim().toLowerCase();

  // Pi
  if (/(what\s+is\s+pi|value\s+of\s+pi|explain\s+pi|constant\s+pi|tell\s+me\s+about\s+pi|\bpi\b\s+value)/i.test(lower)) {
    return {
      isConstant: true,
      name: 'Pi',
      symbol: 'π',
      value: '3.141592653589793238462643383279502884197...',
      fractionalApprox: '22/7 (and 355/113 for higher precision)',
      initialValueAnnouncement: 'VALUE OF PI (π): Approximately 3.141592653589793... (Common fractional approximation: 22/7; high-precision: 355/113).',
    };
  }

  // Euler's Number (e)
  if (/(what\s+is\s+e\b|value\s+of\s+e\b|euler'?s?\s+number|constant\s+e\b)/i.test(lower)) {
    return {
      isConstant: true,
      name: "Euler's Number",
      symbol: 'e',
      value: '2.718281828459045235360287471352662497757...',
      fractionalApprox: '193/71 (or 878/323)',
      initialValueAnnouncement: "VALUE OF EULER'S NUMBER (e): Approximately 2.718281828459045... (Common fractional approximation: 193/71; exact series limit: sum 1/k!).",
    };
  }

  // Golden Ratio (phi / φ)
  if (/(golden\s+ratio|what\s+is\s+phi\b|value\s+of\s+phi\b|divine\s+proportion)/i.test(lower)) {
    return {
      isConstant: true,
      name: 'Golden Ratio',
      symbol: 'φ (phi)',
      value: '1.61803398874989484820458683436563811772...',
      fractionalApprox: '(1 + sqrt(5)) / 2',
      initialValueAnnouncement: 'VALUE OF THE GOLDEN RATIO (φ): Exact algebraic value = (1 + sqrt(5)) / 2 ≈ 1.618033988749895... (Fibonacci asymptotic ratio: F_(n+1)/F_n).',
    };
  }

  return {
    isConstant: false,
    name: '',
    symbol: '',
    value: '',
    initialValueAnnouncement: '',
  };
}

/**
 * Detect theorem request.
 * The AI first needs to give base formula, then only give explanation (about 300 to 800 words).
 * If there are more formulas on the theorem, the AI also needs to give the formula to user.
 */
export function parseTheoremRequest(input: string): {
  isTheorem: boolean;
  theoremName: string;
  baseFormula: string;
  additionalFormulas: string[];
} {
  const lower = input.trim().toLowerCase();

  const isTheoremQuery =
    /\btheorem\b/i.test(lower) ||
    /pythagor/i.test(lower) ||
    /binomial\s+theorem/i.test(lower) ||
    /bayes'?\s+theorem/i.test(lower) ||
    /fermat'?s?\s+little/i.test(lower) ||
    /cauchy[- ]schwarz/i.test(lower) ||
    /mean\s+value\s+theorem/i.test(lower) ||
    /fundamental\s+theorem\s+of\s+calculus/i.test(lower);

  if (!isTheoremQuery) {
    return {
      isTheorem: false,
      theoremName: '',
      baseFormula: '',
      additionalFormulas: [],
    };
  }

  // 1. Pythagorean Theorem
  if (/pythagor/i.test(lower)) {
    return {
      isTheorem: true,
      theoremName: 'Pythagorean Theorem',
      baseFormula: 'a^2 + b^2 = c^2 (where c is the hypotenuse, a and b are perpendicular legs of a right-angled triangle)',
      additionalFormulas: [
        'Hypotenuse length: c = sqrt(a^2 + b^2)',
        'Leg a length: a = sqrt(c^2 - b^2)',
        'Leg b length: b = sqrt(c^2 - a^2)',
        '2D Euclidean Distance Formula: d = sqrt((x2 - x1)^2 + (y2 - y1)^2)',
        '3D Space Distance Formula: d = sqrt((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)',
        'Pythagorean Trigonometric Identity: sin^2(theta) + cos^2(theta) = 1',
        'Secant-Tangent Identity: 1 + tan^2(theta) = sec^2(theta)',
        'Cosecant-Cotangent Identity: 1 + cot^2(theta) = csc^2(theta)',
      ],
    };
  }

  // 2. Binomial Theorem
  if (/binomial\s+theorem/i.test(lower)) {
    return {
      isTheorem: true,
      theoremName: 'Binomial Theorem',
      baseFormula: '(a + b)^n = sum from k = 0 to n of [C(n, k) * a^(n - k) * b^k]',
      additionalFormulas: [
        'Binomial Coefficient Combination Formula: C(n, k) = n! / (k! * (n - k)!)',
        'Single Variable Power Expansion: (1 + x)^n = 1 + n*x + (n*(n - 1) / 2!)*x^2 + (n*(n - 1)*(n - 2) / 3!)*x^3 + ...',
        "Pascal's Recursive Identity: C(n, k) = C(n - 1, k - 1) + C(n - 1, k)",
        'Sum of All Binomial Coefficients: sum from k = 0 to n of C(n, k) = 2^n',
        'Alternating Coefficient Sum: sum from k = 0 to n of [(-1)^k * C(n, k)] = 0',
      ],
    };
  }

  // 3. Bayes' Theorem
  if (/bayes/i.test(lower)) {
    return {
      isTheorem: true,
      theoremName: "Bayes' Theorem",
      baseFormula: 'P(A|B) = (P(B|A) * P(A)) / P(B)',
      additionalFormulas: [
        'Law of Total Probability Expansion: P(B) = P(B|A) * P(A) + P(B|not A) * P(not A)',
        'Multi-Partition Bayesian Form: P(Ai|B) = (P(B|Ai) * P(Ai)) / sum from j = 1 to k of [P(B|Aj) * P(Aj)]',
        'Bayesian Odds Form: Odds(A|B) = Odds(A) * (P(B|A) / P(B|not A))',
      ],
    };
  }

  // 4. Fermat's Little Theorem
  if (/fermat/i.test(lower)) {
    return {
      isTheorem: true,
      theoremName: "Fermat's Little Theorem",
      baseFormula: 'a^(p - 1) = 1 (mod p) [where p is a prime number and gcd(a, p) = 1]',
      additionalFormulas: [
        'Universal Congruence for all integers a: a^p = a (mod p)',
        'Modular Multiplicative Inverse: a^(p - 2) = a^(-1) (mod p)',
        'Exponent Reduction Property: a^b = a^(b mod (p - 1)) (mod p)',
      ],
    };
  }

  // 5. Fundamental Theorem of Calculus
  if (/fundamental\s+theorem\s+of\s+calculus/i.test(lower)) {
    return {
      isTheorem: true,
      theoremName: 'Fundamental Theorem of Calculus',
      baseFormula: 'Part 1 (Derivative of Accumulation): d/dx [integral from a to x of f(t) dt] = f(x)',
      additionalFormulas: [
        "Part 2 (Definite Integral Evaluation): integral from a to b of f(x) dx = F(b) - F(a), where F'(x) = f(x)",
        "Leibniz Integral Rule for Variable Limits: d/dx [integral from g(x) to h(x) of f(t) dt] = f(h(x))*h'(x) - f(g(x))*g'(x)",
      ],
    };
  }

  // 6. Cauchy-Schwarz Theorem / Inequality
  if (/cauchy/i.test(lower)) {
    return {
      isTheorem: true,
      theoremName: 'Cauchy-Schwarz Theorem',
      baseFormula: '|u • v|^2 <= ||u||^2 * ||v||^2 (for any vectors u, v in an inner product space)',
      additionalFormulas: [
        'Algebraic Euclidean Sum Form: (sum from i = 1 to n of [ai * bi])^2 <= (sum from i = 1 to n of ai^2) * (sum from i = 1 to n of bi^2)',
        'Continuous Function Integral Form: (integral from a to b of [f(x) * g(x)] dx)^2 <= (integral from a to b of f(x)^2 dx) * (integral from a to b of g(x)^2 dx)',
        'Vector Angle Relation: cos(theta) = (u • v) / (||u|| * ||v||) where -1 <= cos(theta) <= 1',
      ],
    };
  }

  // 7. Generic Theorem
  const matchedWord = lower.match(/([a-zA-Z\s'-]+)\s+theorem/i);
  const theoremName = matchedWord ? `${matchedWord[1].trim()} Theorem` : 'Mathematical Theorem';

  return {
    isTheorem: true,
    theoremName,
    baseFormula: 'Base Governing Equation / Statement for ' + theoremName,
    additionalFormulas: [
      'Equivalent Representation & Corollary 1',
      'Specialized Boundary Condition Form',
    ],
  };
}

/**
 * Detect "teach me this topic" or pedagogical instruction request.
 * The AI needs to teach the topic or question clearly (about 200 to 800 words with mathematical expressions).
 */
export function parseTeachRequest(input: string): {
  isTeach: boolean;
  topic: string;
} {
  const lower = input.trim().toLowerCase();

  const isTeachQuery =
    /teach\s+me\s+(?:this\s+)?topic/i.test(lower) ||
    /teach\s+me\s+(?:about\s+)?([a-zA-Z0-9\s^+-]+)/i.test(lower) ||
    /teach\s+us\s+(?:about\s+)?([a-zA-Z0-9\s^+-]+)/i.test(lower) ||
    /can\s+you\s+teach\s+me/i.test(lower);

  if (!isTeachQuery) {
    return { isTeach: false, topic: '' };
  }

  // Extract topic
  const topicMatch =
    lower.match(/teach\s+me\s+(?:about\s+|this\s+topic\s+on\s+|this\s+topic:\s*)?([a-zA-Z0-9\s^+-]+)/i) ||
    lower.match(/teach\s+us\s+(?:about\s+)?([a-zA-Z0-9\s^+-]+)/i);

  let topic = topicMatch && topicMatch[1] ? topicMatch[1].replace(/^(this\s+topic|please|clearly)/i, '').trim() : '';
  if (!topic) {
    topic = 'this mathematical topic';
  }

  return {
    isTeach: true,
    topic,
  };
}

/**
 * Evaluates user input and user question, sorts user preferences,
 * identifies exact requirements, and determines how to formulate the answer.
 */
export function evaluateUserRequirements(
  input: string,
  educationLevel: string = 'none',
  standard?: number
): UserRequirementEvaluation {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // 1. Table Request Evaluation
  const tableCheck = parseTableRequest(trimmed);
  if (tableCheck.isTable && tableCheck.base) {
    return {
      userIntent: 'table',
      intentLabel: 'Multiplication Table Generation',
      requirementsIdentified: [
        `Target base number: ${tableCheck.base}`,
        `Range limit: 1 to ${tableCheck.limit} (${tableCheck.limit === 10 ? 'default 10 as unspecified' : `user specified ${tableCheck.limit}`})`,
        "Strict output format requirement: 'y X y = y'",
        'Direct sequential lines without unnecessary markdown decoration',
      ],
      howToAnswer: `Generate the multiplication table for ${tableCheck.base} from 1 up to ${tableCheck.limit} strictly following the format 'y X y = y'.`,
      needsStepProcedure: true,
      tableFormat: 'y X y = y',
      tableLimit: tableCheck.limit,
      aiVerification: {
        verifiedQuestion: `Generate multiplication table for ${tableCheck.base}`,
        verifiedTopic: 'Arithmetic Multiplication Table',
        needsStepProcedure: true,
        verificationReason: 'Multiplication table outputs sequential lines in y X y = y format.',
      },
    };
  }

  // 2. "Teach Me" Request Evaluation
  const teachCheck = parseTeachRequest(trimmed);
  if (teachCheck.isTeach) {
    return {
      userIntent: 'teach_topic',
      intentLabel: 'Pedagogical Topic Instruction',
      requirementsIdentified: [
        `Topic to teach: "${teachCheck.topic}"`,
        'Pedagogical clarity tailored to user understanding',
        'Word count constraint: between 200 and 800 words',
        'Mandatory integration of explicit mathematical expressions, identities, and notation',
        'Structured breakdown: intuition, core mathematical rules, worked illustration, and key takeaways',
      ],
      howToAnswer: `Teach ${teachCheck.topic} clearly with structured pedagogical stages, embedded mathematical expressions, and intuitive analogies within 200 to 800 words.`,
      needsStepProcedure: false, // Step procedure not needed; pure pedagogical lesson
      targetWordCount: '200 to 800 words with mathematical expressions',
      aiVerification: {
        verifiedQuestion: `Teach concept of ${teachCheck.topic}`,
        verifiedTopic: 'Pedagogical Mathematics Instruction',
        needsStepProcedure: false,
        verificationReason: 'Pedagogical instruction requires an in-depth explanatory lesson rather than isolated calculation steps.',
      },
    };
  }

  // 3. Constant Request Evaluation (What is pi or something like that)
  const constantCheck = parseConstantRequest(trimmed);
  if (constantCheck.isConstant) {
    return {
      userIntent: 'constant_definition',
      intentLabel: 'Mathematical Constant & Definition',
      requirementsIdentified: [
        `Constant requested: ${constantCheck.name} (${constantCheck.symbol})`,
        'CRITICAL RULE: AI must FIRST state its value before giving any explanation',
        'Explanation length: between 200 and 600 words',
        'Incorporate geometric/algebraic origin, historical discoveries, and applications',
      ],
      howToAnswer: `First announce the exact and approximate values of ${constantCheck.name} (${constantCheck.symbol}), then provide an understandable 200 to 600-word explanation covering its origin, properties, and applications.`,
      needsStepProcedure: false, // Step procedure not needed
      targetWordCount: '200 to 600 words',
      constantValue: constantCheck.value,
      aiVerification: {
        verifiedQuestion: `Define and state value for mathematical constant ${constantCheck.name} (${constantCheck.symbol})`,
        verifiedTopic: 'Mathematical Constants',
        needsStepProcedure: false,
        verificationReason: 'Inquiry is a constant definition requiring exact value first followed by theoretical explanation; no step-by-step calculation needed.',
      },
    };
  }

  // 4. Theorem Request Evaluation
  const theoremCheck = parseTheoremRequest(trimmed);
  if (theoremCheck.isTheorem) {
    return {
      userIntent: 'theorem',
      intentLabel: 'Mathematical Theorem & Formulas',
      requirementsIdentified: [
        `Theorem requested: ${theoremCheck.theoremName}`,
        'CRITICAL RULE 1: AI must FIRST give the fundamental base formula',
        'CRITICAL RULE 2: If there are more formulas on the theorem, the AI must also give all additional formulas to the user',
        'CRITICAL RULE 3: THEN ONLY give the explanation between 300 and 800 words',
        'Provide rigorous conditions, proof intuition, geometric interpretation, and real-world utility',
      ],
      howToAnswer: `Display the base formula prominently at the top, list all related/extended formulas, and then deliver a 300 to 800-word clear explanation of ${theoremCheck.theoremName}.`,
      needsStepProcedure: false, // Step procedure not needed; formula cards and explanation used instead
      targetWordCount: '300 to 800 words',
      baseFormula: theoremCheck.baseFormula,
      additionalFormulas: theoremCheck.additionalFormulas,
      aiVerification: {
        verifiedQuestion: `Theorem explanation and formula derivation for ${theoremCheck.theoremName}`,
        verifiedTopic: 'Theorems & Mathematical Principles',
        needsStepProcedure: false,
        verificationReason: 'Theorem inquiry requires base and additional formulas followed by conceptual explanation; discrete problem calculation steps are not needed.',
      },
    };
  }

  // 5. Command Evaluation
  if (/^(clear|reset|help|exit|quit|cls)$/i.test(lower)) {
    return {
      userIntent: 'command',
      intentLabel: 'System Command',
      requirementsIdentified: ['Reset session state and clear UI display'],
      howToAnswer: 'Execute interface reset immediately.',
      needsStepProcedure: false,
      aiVerification: {
        verifiedQuestion: 'System command to reset session',
        verifiedTopic: 'System Command',
        needsStepProcedure: false,
        verificationReason: 'Command execution requires no mathematical calculation steps.',
      },
    };
  }

  // 6. Doubt Evaluation
  if (
    /^(hi|hello|hey|good\s+(morning|afternoon|evening)|greetings)[\s!.]*$/i.test(lower) ||
    /(clarif(y|ication)|explain\s+more|simplify\s+this|why\s+did|how\s+to\s+understand|doubt|i\s+don't\s+understand|can\s+you\s+elaborate)/i.test(
      lower
    )
  ) {
    // If user explicitly asks for steps in the doubt
    const explicitlyWantsSteps = /(step\s+by\s+step|show\s+steps|solve)/i.test(lower);
    return {
      userIntent: 'doubt',
      intentLabel: 'Mathematical Doubt Resolution',
      requirementsIdentified: [
        'Direct resolution of user doubt or conversational inquiry',
        'Intuitive mathematical clarification with plain English',
      ],
      howToAnswer: 'Provide a polite, direct explanation that untangles the specific doubt.',
      needsStepProcedure: explicitlyWantsSteps,
      aiVerification: {
        verifiedQuestion: `Doubt resolution: ${trimmed}`,
        verifiedTopic: 'Conceptual Doubt',
        needsStepProcedure: explicitlyWantsSteps,
        verificationReason: explicitlyWantsSteps
          ? 'User explicitly requested step-by-step problem resolution.'
          : 'Doubt is conceptual and best addressed through clear English explanation without discrete step procedures.',
      },
    };
  }

  // 7. Historical Theory Query
  if (
    /(who\s+is|who\s+was|who\s+found|who\s+discovered|who\s+invented|newton|ramanujan|history\s+of|origin\s+of|biography\s+of)/i.test(
      lower
    )
  ) {
    return {
      userIntent: 'history_theory',
      intentLabel: 'Mathematical History & Biography',
      requirementsIdentified: [
        'Biographical and historical mathematical context',
        'Zero stepProcedure (only narrative explanation)',
        'Explanation length: 200 to 500 words with embedded formulas',
      ],
      howToAnswer: 'Provide a 200 to 500-word historical narrative with key contributions and formulas.',
      needsStepProcedure: false,
      targetWordCount: '200 to 500 words',
      aiVerification: {
        verifiedQuestion: `Historical/biographical inquiry: ${trimmed}`,
        verifiedTopic: 'Mathematical History',
        needsStepProcedure: false,
        verificationReason: 'Historical narrative requires biographical explanation rather than mathematical calculation steps.',
      },
    };
  }

  // 8. Standard Math Problem Evaluation
  // Check if user explicitly asked to skip steps (e.g. "no steps", "just the answer", "direct answer")
  const explicitlySkipsSteps = /(no\s+steps?|just\s+(?:the\s+)?answer|without\s+steps?|only\s+(?:the\s+)?answer|direct\s+answer)/i.test(lower);
  const isPureDefinition = /^(what\s+is|define|meaning\s+of)\s+[a-zA-Z\s]+$/i.test(lower) && !/[0-9=+\-*/^]/.test(lower);
  const needsSteps = !explicitlySkipsSteps && !isPureDefinition;

  return {
    userIntent: 'math_problem',
    intentLabel: 'Step-by-Step Calculation & Problem Solving',
    requirementsIdentified: [
      'Solve the mathematical expression or equation with high accuracy',
      needsSteps ? 'Step-by-Step Procedure: MUST contain between 6 and 20 discrete steps' : 'Direct solution without discrete calculation steps',
      'Explanation in understandable English: MUST range between 100 and 300 words',
      'Verification check and final concise answer',
    ],
    howToAnswer: needsSteps
      ? 'Break calculation into 6-20 detailed steps, state final answer, and provide a 100-300 word explanation.'
      : 'Provide direct solution and concise explanation without intermediate steps.',
    needsStepProcedure: needsSteps,
    targetWordCount: '100 to 300 words',
    aiVerification: {
      verifiedQuestion: `Mathematical problem / calculation: ${trimmed}`,
      verifiedTopic: 'Mathematical Calculation & Equation Solving',
      needsStepProcedure: needsSteps,
      verificationReason: needsSteps
        ? 'Problem involves numerical, algebraic, or calculus calculation requiring step-by-step procedure.'
        : 'User requested direct answer or definition without discrete steps.',
    },
  };
}

/**
 * AI Verification utility: verifies what the user is asking and whether step-by-step procedure is needed.
 */
export function verifyUserQuestion(
  input: string,
  educationLevel: string = 'none',
  standard?: number
): {
  verifiedQuestion: string;
  verifiedTopic: string;
  needsStepProcedure: boolean;
  verificationReason: string;
} {
  const req = evaluateUserRequirements(input, educationLevel, standard);
  return (
    req.aiVerification || {
      verifiedQuestion: input.trim(),
      verifiedTopic: req.intentLabel,
      needsStepProcedure: req.needsStepProcedure,
      verificationReason: req.needsStepProcedure
        ? 'Verified as requiring discrete mathematical calculation steps.'
        : 'Verified as conceptual / descriptive inquiry; discrete calculation steps omitted in favor of comprehensive explanation.',
    }
  );
}

/**
 * Classify input query into one of:
 * - 'command': clear, reset, help
 * - 'doubt': clarify, explain more, simplify, why, how
 * - 'history_theory': who is newton, who found 0, what is pi, pythagoras theorem
 * - 'teach_topic': teach me this topic, teach me...
 * - 'theorem': pythagoras theorem, binomial theorem, etc.
 * - 'table': print table of 5, table of 7 up to 15
 * - 'math_problem': equations, calculations, solve requests
 */
export function detectQueryType(input: string): MathQueryType {
  const lower = input.trim().toLowerCase();

  // Command detection
  if (/^(clear|reset|help|exit|quit|cls)$/.test(lower)) {
    return 'command';
  }

  // Greeting
  if (/^(hi|hello|hey|good\s+(morning|afternoon|evening)|greetings)[\s!.]*$/.test(lower)) {
    return 'doubt';
  }

  // Table query detection (e.g. "print table of 5", "table of 7 up to 15")
  const tableCheck = parseTableRequest(input);
  if (tableCheck.isTable && tableCheck.base) {
    return 'table';
  }

  // Teach me request
  if (/teach\s+me|teach\s+about|teach\s+this|teach\s+us/i.test(lower)) {
    return 'teach_topic';
  }

  // Doubt detection
  if (
    /(clarif(y|ication)|explain\s+more|simplify\s+this|why\s+did|how\s+to\s+understand|doubt|i\s+don't\s+understand|can\s+you\s+elaborate)/i.test(
      lower
    )
  ) {
    return 'doubt';
  }

  // Specific historical questions (preserved to match existing unit test suite)
  if (
    /(who\s+is|who\s+was|who\s+found|who\s+discovered|who\s+invented|what\s+is\s+pi|explain\s+pi|pythagor|fermat|euler|newton|ramanujan|leibniz|gauss|turing|fibonacci|descartes|archimedes|euclid|aryabhata|brahmagupta|history\s+of|origin\s+of|biography\s+of)/i.test(
      lower
    )
  ) {
    return 'history_theory';
  }

  // Theorem query
  if (/\btheorem\b/i.test(lower)) {
    return 'theorem';
  }

  return 'math_problem';
}

/**
 * Rule-based fallback classifier for the 15 Mathematics Subject Classifications
 */
export function classifyMathSubject(text: string): MathSubjectClassification {
  const lower = text.toLowerCase();

  if (/(derivative|integral|limit|calculus|differential|infinitesimal|continuity|taylor|series)/i.test(lower)) {
    if (/(differential\s+equation|ode|pde|order\s+differential)/i.test(lower)) {
      return 'Differential Equations';
    }
    return 'Calculus & Analysis';
  }
  if (/(matrix|eigenvalue|vector|determinant|linear\s+algebra|dot\s+product|cross\s+product)/i.test(lower)) {
    return 'Linear Algebra';
  }
  if (/(sin|cos|tan|trigonometr|radian|hypotenuse|angle\s+of)/i.test(lower)) {
    return 'Trigonometry';
  }
  if (/(probability|mean|median|variance|standard\s+deviation|bayes|dice|coin|normal\s+distribution|hypothesis)/i.test(lower)) {
    return 'Statistics & Probability';
  }
  if (/(triangle|circle|polygon|perimeter|volume|radius|geometry|pythagor|coordinate\s+plane)/i.test(lower)) {
    return 'Geometry';
  }
  if (/(prime|divisor|gcd|lcm|modular|congruence|number\s+theory|diophantine)/i.test(lower)) {
    return 'Number Theory';
  }
  if (/(permutation|combination|factorial|pigeonhole|graph\s+theory|combinatoric)/i.test(lower)) {
    return 'Combinatorics';
  }
  if (/(subset|union|intersection|truth\s+table|tautology|predicate|set\s+theory|logic)/i.test(lower)) {
    return 'Set Theory & Logic';
  }
  if (/(topology|homeomorphism|manifold|open\s+set|compact)/i.test(lower)) {
    return 'Topology';
  }
  if (/(game\s+theory|nash\s+equilibrium|minimax|zero[- ]sum)/i.test(lower)) {
    return 'Game Theory';
  }
  if (/(linear\s+programming|simplex|optimization|operations\s+research|dual)/i.test(lower)) {
    return 'Operations Research';
  }
  if (/(newton[- ]raphson|numerical|euler's\s+method|runge[- ]kutta|interpolation)/i.test(lower)) {
    return 'Computational / Numerical Analysis';
  }
  if (/(x\^|solve\s+for\s+x|quadratic|polynomial|equation|inequality|factor|algebra)/i.test(lower)) {
    return 'Algebra';
  }

  return 'Arithmetic';
}

/**
 * Shuffles quiz options randomly so the correct answer does NOT follow any predictable pattern.
 */
export function randomizeQuizOptions(options: string[], correctAnswer: string): {
  shuffledOptions: string[];
  newCorrectAnswer: string;
} {
  const cloned = [...options];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return {
    shuffledOptions: cloned,
    newCorrectAnswer: correctAnswer,
  };
}

/**
 * Select questions for a random 10-question quiz:
 * - Pick max 2 or min 1 from the user's previously wrongly answered questions (if available)
 * - Remaining questions from general pool or AI generation
 */
export function selectQuizQuestions(
  pool: QuizQuestion[],
  wrongQuestions: WrongQuizQuestion[],
  totalNeeded: number = 10
): QuizQuestion[] {
  const selected: QuizQuestion[] = [];
  const wrongPool = wrongQuestions.filter((wq) => wq.correctTimesInRandomQuiz < 2);

  // Pick 1 to 2 wrong questions if any exist
  const wrongCountToPick = Math.min(wrongPool.length, Math.floor(Math.random() * 2) + 1);

  if (wrongCountToPick > 0) {
    const shuffledWrong = [...wrongPool].sort(() => 0.5 - Math.random());
    for (let i = 0; i < wrongCountToPick; i++) {
      const wq = shuffledWrong[i];
      const randomized = randomizeQuizOptions(wq.options, wq.correctAnswer);
      selected.push({
        id: `retry-${wq.id}`,
        question: wq.question,
        options: randomized.shuffledOptions,
        correctAnswer: randomized.newCorrectAnswer,
        classification: wq.classification,
        isRetryQuestion: true,
      });
    }
  }

  // Fill the remainder from the pool
  const remainingNeeded = totalNeeded - selected.length;
  const availablePool = pool.filter(
    (p) => !selected.some((s) => s.question.toLowerCase() === p.question.toLowerCase())
  );

  const shuffledPool = [...availablePool].sort(() => 0.5 - Math.random());
  for (let i = 0; i < remainingNeeded && i < shuffledPool.length; i++) {
    const q = shuffledPool[i];
    const randomized = randomizeQuizOptions(q.options, q.correctAnswer);
    selected.push({
      ...q,
      options: randomized.shuffledOptions,
      correctAnswer: randomized.newCorrectAnswer,
      isRetryQuestion: false,
    });
  }

  // Shuffle the entire quiz order so retry questions aren't always at the beginning
  return selected.sort(() => 0.5 - Math.random());
}

/**
 * Calculates weak topic metrics from wrongly answered questions
 */
export function analyzeWeakTopics(wrongQuestions: WrongQuizQuestion[]): {
  classification: MathSubjectClassification;
  wrongCount: number;
}[] {
  const counts: Record<string, number> = {};
  for (const w of wrongQuestions) {
    counts[w.classification] = (counts[w.classification] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([classification, wrongCount]) => ({
      classification: classification as MathSubjectClassification,
      wrongCount,
    }))
    .sort((a, b) => b.wrongCount - a.wrongCount);
}
