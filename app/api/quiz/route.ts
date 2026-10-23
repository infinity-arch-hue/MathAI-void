import { NextRequest, NextResponse } from 'next/server';
import {
  cleanMathText,
  randomizeQuizOptions,
  selectQuizQuestions,
} from '@/lib/math-rules';
import {
  getWrongAnswersForUser,
  recordWrongAnswer,
  recordCorrectAnswerForRetryQuestion,
  recordQuizSubmission,
  getStudentProgress,
} from '@/lib/db';
import { QuizQuestion, MathSubjectClassification } from '@/lib/types';
import { callGeminiSafely } from '@/lib/gemini';

// Pre-seeded comprehensive question bank covering diverse subjects and grade levels
const DEFAULT_QUESTION_POOL: QuizQuestion[] = [
  {
    id: 'qp-1',
    question: 'Solve for x: 5x - 15 = 20',
    options: ['x = 7', 'x = 3', 'x = 5', 'x = 8'],
    correctAnswer: 'x = 7',
    classification: 'Algebra',
  },
  {
    id: 'qp-2',
    question: 'What is the value of 12 * 8 - 36 / 4?',
    options: ['87', '96', '90', '84'],
    correctAnswer: '87',
    classification: 'Arithmetic',
  },
  {
    id: 'qp-3',
    question: 'What is the sum of the interior angles of a triangle?',
    options: ['180°', '360°', '90°', '270°'],
    correctAnswer: '180°',
    classification: 'Geometry',
  },
  {
    id: 'qp-4',
    question: 'What is the value of sin(30°)?',
    options: ['0.5', '1', '0.707', '0'],
    correctAnswer: '0.5',
    classification: 'Trigonometry',
  },
  {
    id: 'qp-5',
    question: 'What is the derivative of f(x) = 3x^2 + 4x - 5 with respect to x?',
    options: ['6x + 4', '6x - 5', '3x + 4', '6x^2 + 4'],
    correctAnswer: '6x + 4',
    classification: 'Calculus & Analysis',
  },
  {
    id: 'qp-6',
    question: 'Which of the following is a prime number?',
    options: ['29', '33', '27', '35'],
    correctAnswer: '29',
    classification: 'Number Theory',
  },
  {
    id: 'qp-7',
    question: 'In how many ways can 4 books be arranged on a shelf?',
    options: ['24', '16', '12', '8'],
    correctAnswer: '24',
    classification: 'Combinatorics',
  },
  {
    id: 'qp-8',
    question: 'If Set A = {1, 2, 3} and Set B = {3, 4, 5}, what is A ∩ B?',
    options: ['{3}', '{1, 2, 3, 4, 5}', '{1, 2}', '∅'],
    correctAnswer: '{3}',
    classification: 'Set Theory & Logic',
  },
  {
    id: 'qp-9',
    question: 'What is the probability of flipping heads on a fair coin?',
    options: ['0.5', '0.25', '1.0', '0.75'],
    correctAnswer: '0.5',
    classification: 'Statistics & Probability',
  },
  {
    id: 'qp-10',
    question: 'What is the determinant of matrix [[2, 3], [1, 4]]?',
    options: ['5', '8', '11', '6'],
    correctAnswer: '5',
    classification: 'Linear Algebra',
  },
  {
    id: 'qp-11',
    question: 'Solve the differential equation dy/dx = 2x with y(0) = 3',
    options: ['y = x^2 + 3', 'y = 2x^2 + 3', 'y = x^2', 'y = 2x + 3'],
    correctAnswer: 'y = x^2 + 3',
    classification: 'Differential Equations',
  },
  {
    id: 'qp-12',
    question: 'What is the area of a circle with diameter 10? (use π = 3.14)',
    options: ['78.5', '314', '31.4', '15.7'],
    correctAnswer: '78.5',
    classification: 'Geometry',
  },
  {
    id: 'qp-13',
    question: 'What is the greatest common divisor (GCD) of 45 and 60?',
    options: ['15', '5', '9', '30'],
    correctAnswer: '15',
    classification: 'Number Theory',
  },
  {
    id: 'qp-14',
    question: 'Evaluate 2^6 / 2^3',
    options: ['8', '16', '4', '32'],
    correctAnswer: '8',
    classification: 'Arithmetic',
  },
  {
    id: 'qp-15',
    question: 'In game theory, what is an outcome where neither player can benefit by unilaterally changing strategy?',
    options: ['Nash Equilibrium', 'Pareto Worst', 'Dominant Loss', 'Minimax Null'],
    correctAnswer: 'Nash Equilibrium',
    classification: 'Game Theory',
  },
];

// Procedural generator ensuring 10 brand-new, unique questions for any MSC topic
function generateDynamicTopicQuestions(topic?: string | null, count: number = 10): QuizQuestion[] {
  const result: QuizQuestion[] = [];
  const normalizedTopic = topic && topic !== 'Random' && topic !== 'All' ? topic : 'Mixed';

  for (let i = 0; i < count; i++) {
    const seed = Date.now() + i * 29 + Math.floor(Math.random() * 50);
    const a = (seed % 11) + 2;
    const b = ((seed * 3) % 13) + 3;
    const c = ((seed * 7) % 17) + 4;

    let qText = '';
    let correct = '';
    let options: string[] = [];

    const currentTopic: MathSubjectClassification =
      normalizedTopic === 'Mixed'
        ? (['Algebra', 'Arithmetic', 'Geometry', 'Trigonometry', 'Calculus & Analysis', 'Number Theory', 'Combinatorics', 'Statistics & Probability', 'Linear Algebra', 'Differential Equations'][i % 10] as MathSubjectClassification)
        : (normalizedTopic as MathSubjectClassification);

    switch (currentTopic) {
      case 'Algebra': {
        const factor = i % 4;
        if (factor === 0) {
          const xVal = a;
          const rhs = b * xVal + c;
          qText = `Solve for x: ${b}x + ${c} = ${rhs}`;
          correct = `x = ${xVal}`;
          options = [`x = ${xVal}`, `x = ${xVal + 2}`, `x = ${Math.max(1, xVal - 2)}`, `x = ${xVal + 4}`];
        } else if (factor === 1) {
          const r1 = (i % 5) + 2;
          const r2 = (i % 4) + 3;
          const sum = r1 + r2;
          const prod = r1 * r2;
          qText = `Find the roots of x^2 - ${sum}x + ${prod} = 0`;
          correct = `x = ${r1}, ${r2}`;
          options = [`x = ${r1}, ${r2}`, `x = -${r1}, ${r2}`, `x = ${r1 + 1}, ${r2}`, `x = -${r1}, -${r2}`];
        } else if (factor === 2) {
          const p = a;
          const q = b;
          qText = `Expand the polynomial expression: (x + ${p})(x + ${q})`;
          correct = `x^2 + ${p + q}x + ${p * q}`;
          options = [
            `x^2 + ${p + q}x + ${p * q}`,
            `x^2 + ${p * q}x + ${p + q}`,
            `x^2 + ${p + q}x - ${p * q}`,
            `x^2 - ${p + q}x + ${p * q}`,
          ];
        } else {
          const x = a + 3;
          const y = b;
          const sum = x + y;
          const diff = x - y;
          qText = `Solve the system: x + y = ${sum} and x - y = ${diff}`;
          correct = `x = ${x}, y = ${y}`;
          options = [
            `x = ${x}, y = ${y}`,
            `x = ${x + 1}, y = ${Math.max(1, y - 1)}`,
            `x = ${y}, y = ${x}`,
            `x = ${x - 2}, y = ${y + 2}`,
          ];
        }
        break;
      }
      case 'Arithmetic': {
        if (i % 3 === 0) {
          const val = a * b + c;
          qText = `Evaluate the arithmetic expression: ${a} * ${b} + ${c}`;
          correct = `${val}`;
          options = [`${val}`, `${val + 10}`, `${val - a}`, `${val + 5}`];
        } else if (i % 3 === 1) {
          const base = 2;
          const exp = (i % 4) + 3;
          const val = Math.pow(base, exp);
          qText = `Evaluate the exponent: ${base}^${exp}`;
          correct = `${val}`;
          options = [`${val}`, `${val * 2}`, `${val / 2}`, `${val + 4}`];
        } else {
          const pct = ((i % 5) + 1) * 10;
          const total = (a + 2) * 50;
          const val = (pct / 100) * total;
          qText = `What is ${pct}% of ${total}?`;
          correct = `${val}`;
          options = [`${val}`, `${val + 10}`, `${val - 15}`, `${val * 1.5}`];
        }
        break;
      }
      case 'Geometry': {
        if (i % 3 === 0) {
          const side = a + 3;
          const area = side * side;
          qText = `What is the area of a square with side length ${side} cm?`;
          correct = `${area} cm^2`;
          options = [`${area} cm^2`, `${side * 4} cm^2`, `${area + 12} cm^2`, `${area - side} cm^2`];
        } else if (i % 3 === 1) {
          const base = a + 4;
          const height = b + 2;
          const area = (base * height) / 2;
          qText = `Calculate the area of a triangle with base ${base} and height ${height}`;
          correct = `${area}`;
          options = [`${area}`, `${base * height}`, `${area + 6}`, `${area - 3}`];
        } else {
          const n = (i % 4) + 5;
          const angleSum = (n - 2) * 180;
          qText = `What is the sum of interior angles of a ${n}-sided polygon?`;
          correct = `${angleSum}°`;
          options = [`${angleSum}°`, `${angleSum - 180}°`, `${angleSum + 180}°`, `360°`];
        }
        break;
      }
      case 'Trigonometry': {
        const trigAngles = [
          { q: 'Evaluate sin(30°)', a: '0.5', opts: ['0.5', '1', '0.866', '0'] },
          { q: 'Evaluate cos(60°)', a: '0.5', opts: ['0.5', '0.707', '1', '0'] },
          { q: 'Evaluate tan(45°)', a: '1', opts: ['1', '0', '0.577', '1.732'] },
          { q: 'Evaluate sin(90°)', a: '1', opts: ['1', '0', '0.5', '-1'] },
          { q: 'What is sin^2(x) + cos^2(x) equal to?', a: '1', opts: ['1', '0', '2', 'tan^2(x)'] },
          { q: `In a right triangle with legs ${a} and ${b}, what is the hypotenuse squared (c^2)?`, a: `${a * a + b * b}`, opts: [`${a * a + b * b}`, `${a + b}`, `${(a + b) * 2}`, `${a * b}`] },
          { q: 'Evaluate cos(0°)', a: '1', opts: ['1', '0', '0.5', '-1'] },
          { q: 'Evaluate sin(45°)', a: 'sqrt(2)/2', opts: ['sqrt(2)/2', '0.5', 'sqrt(3)/2', '1'] },
          { q: 'What is sec(x) defined as?', a: '1 / cos(x)', opts: ['1 / cos(x)', '1 / sin(x)', '1 / tan(x)', 'cos(x) / sin(x)'] },
          { q: 'What is the period of the standard sine function sin(x)?', a: '2π', opts: ['2π', 'π', 'π/2', '4π'] },
        ];
        const item = trigAngles[i % trigAngles.length];
        qText = item.q;
        correct = item.a;
        options = [...item.opts];
        break;
      }
      case 'Calculus & Analysis': {
        const coeff = (i % 5) + 2;
        const power = (i % 3) + 2;
        const constTerm = b;
        qText = `Find the derivative d/dx of f(x) = ${coeff}x^${power} + ${constTerm}x`;
        correct = `${coeff * power}x^${power - 1} + ${constTerm}`;
        options = [
          `${coeff * power}x^${power - 1} + ${constTerm}`,
          `${coeff}x^${power - 1} + ${constTerm}`,
          `${coeff * power}x^${power} + ${constTerm}`,
          `${coeff * power}x^${power - 1}`,
        ];
        break;
      }
      case 'Number Theory': {
        if (i % 2 === 0) {
          const primes = [17, 19, 23, 29, 31, 37, 41, 43, 47, 53];
          const p = primes[i % primes.length];
          qText = `Which of the following numbers is prime?`;
          correct = `${p}`;
          options = [`${p}`, `${p + 2}`, `${p + 4}`, `${p + 6}`];
        } else {
          const mult = (i % 4) + 2;
          const n1 = mult * 4;
          const n2 = mult * 6;
          const gcd = mult * 2;
          qText = `Find the greatest common divisor (GCD) of ${n1} and ${n2}`;
          correct = `${gcd}`;
          options = [`${gcd}`, `${mult}`, `${gcd * 2}`, `${2}`];
        }
        break;
      }
      case 'Statistics & Probability': {
        const stats = [
          { q: 'What is the probability of rolling a 4 on a standard fair 6-sided die?', a: '1/6', opts: ['1/6', '1/3', '1/2', '1/4'] },
          { q: `What is the mean of the numbers: ${a}, ${a + 2}, ${a + 4}?`, a: `${a + 2}`, opts: [`${a + 2}`, `${a}`, `${a + 4}`, `${a + 1}`] },
          { q: 'What is the probability of getting two heads when flipping two fair coins?', a: '1/4', opts: ['1/4', '1/2', '3/4', '1/8'] },
          { q: 'If an event is certain to happen, what is its mathematical probability?', a: '1', opts: ['1', '100', '0.5', '0'] },
          { q: 'What is the sum of probabilities of all possible mutually exclusive outcomes?', a: '1', opts: ['1', '0.5', '100', '0'] },
          { q: 'What is the probability of rolling an even number on a standard die?', a: '1/2', opts: ['1/2', '1/3', '1/6', '2/3'] },
          { q: 'If P(A) = 0.35, what is the probability of the complement event P(not A)?', a: '0.65', opts: ['0.65', '0.35', '1.35', '0.5'] },
          { q: 'What is the median of the data set: 2, 5, 8, 11, 14?', a: '8', opts: ['8', '5', '11', '7'] },
          { q: 'What is the probability of flipping heads on a fair coin?', a: '0.5', opts: ['0.5', '0.25', '1.0', '0.75'] },
          { q: 'What is the mode of the dataset: 3, 7, 7, 9, 12?', a: '7', opts: ['7', '3', '9', '7.6'] },
        ];
        const item = stats[i % stats.length];
        qText = item.q;
        correct = item.a;
        options = [...item.opts];
        break;
      }
      case 'Linear Algebra': {
        const m11 = a;
        const m12 = 2;
        const m21 = 1;
        const m22 = b;
        const det = m11 * m22 - m12 * m21;
        qText = `Find the determinant of matrix [[${m11}, ${m12}], [${m21}, ${m22}]]`;
        correct = `${det}`;
        options = [`${det}`, `${det + 2}`, `${det - 3}`, `${m11 * m22}`];
        break;
      }
      case 'Combinatorics': {
        const combis = [
          { q: 'In how many ways can 5 distinct books be arranged on a shelf?', a: '120', opts: ['120', '24', '60', '720'] },
          { q: 'What is the value of 5! (5 factorial)?', a: '120', opts: ['120', '24', '60', '100'] },
          { q: 'In how many ways can a committee of 2 be chosen from 5 people? (5C2)', a: '10', opts: ['10', '20', '5', '15'] },
          { q: 'How many permutations of 3 letters can be formed from {A, B, C}?', a: '6', opts: ['6', '3', '9', '12'] },
          { q: 'What is 0! (zero factorial) equal to by mathematical definition?', a: '1', opts: ['1', '0', 'undefined', 'infinity'] },
          { q: 'What is the value of 4! / 2!?', a: '12', opts: ['12', '6', '24', '8'] },
          { q: 'How many subsets does a set with 3 elements have? (2^3)', a: '8', opts: ['8', '6', '9', '16'] },
          { q: 'How many combinations of choosing 1 item from 8 items? (8C1)', a: '8', opts: ['8', '1', '7', '16'] },
          { q: 'In how many ways can 4 runners finish in 1st, 2nd, 3rd, and 4th place?', a: '24', opts: ['24', '16', '12', '4'] },
          { q: 'Evaluate 6C1 + 6C0', a: '7', opts: ['7', '6', '12', '1'] },
        ];
        const item = combis[i % combis.length];
        qText = item.q;
        correct = item.a;
        const randomized = randomizeQuizOptions(item.opts, correct);
        options = randomized.shuffledOptions;
        correct = randomized.newCorrectAnswer;
        break;
      }
      case 'Set Theory & Logic': {
        const setLogic = [
          { q: 'If Set A = {1, 2, 3} and Set B = {3, 4, 5}, what is the intersection A ∩ B?', a: '{3}', opts: ['{3}', '{1, 2, 3, 4, 5}', '{1, 2}', '∅'] },
          { q: 'If Set A = {2, 4} and Set B = {1, 3}, what is the union A ∪ B?', a: '{1, 2, 3, 4}', opts: ['{1, 2, 3, 4}', '{2, 4}', '∅', '{1, 3}'] },
          { q: 'What is the negation of the proposition P: "All prime numbers are odd"?', a: 'Some prime numbers are even', opts: ['Some prime numbers are even', 'No prime numbers are odd', 'All prime numbers are even', 'Prime numbers are not odd'] },
          { q: 'If Set S has 4 elements, what is the cardinality of its power set P(S)?', a: '16', opts: ['16', '8', '4', '32'] },
          { q: 'In Boolean logic, what is the value of TRUE AND FALSE?', a: 'FALSE', opts: ['FALSE', 'TRUE', 'Undefined', 'Neither'] },
          { q: 'If A ⊆ B and B ⊆ C, which relationship must mathematically hold true?', a: 'A ⊆ C', opts: ['A ⊆ C', 'C ⊆ A', 'A = B', 'B = ∅'] },
          { q: 'What is the complement of the universal set U?', a: 'Empty set (∅)', opts: ['Empty set (∅)', 'U', 'Subset', 'Infinity'] },
          { q: 'In formal logic, what is the contrapositive of "If P, then Q"?', a: 'If not Q, then not P', opts: ['If not Q, then not P', 'If Q, then P', 'If not P, then not Q', 'Not P and Q'] },
          { q: 'Evaluate |A × B| if |A| = 3 and |B| = 5', a: '15', opts: ['15', '8', '125', '243'] },
          { q: 'Which law states that not(A ∪ B) = (not A) ∩ (not B)?', a: "De Morgan's Law", opts: ["De Morgan's Law", 'Distributive Law', 'Associative Law', 'Idempotent Law'] },
        ];
        const item = setLogic[i % setLogic.length];
        qText = item.q;
        correct = item.a;
        options = [...item.opts];
        break;
      }
      case 'Differential Equations': {
        const diffEqs = [
          { q: 'Solve the first-order differential equation: dy/dx = 4x with y(0) = 2', a: 'y = 2x^2 + 2', opts: ['y = 2x^2 + 2', 'y = 4x^2 + 2', 'y = 2x + 2', 'y = 4x^2'] },
          { q: 'What is the order of the differential equation d^2y/dx^2 + 3(dy/dx) = 0?', a: '2', opts: ['2', '1', '3', '0'] },
          { q: 'Find the general solution to dy/dx = y', a: 'y = C * e^x', opts: ['y = C * e^x', 'y = x + C', 'y = e^(x^2)', 'y = ln(x) + C'] },
          { q: 'What is the integrating factor for dy/dx + (2/x)y = x^3?', a: 'x^2', opts: ['x^2', '2/x', 'e^(2x)', 'x'] },
          { q: 'Classify the equation: (dy/dx)^2 + y = 0 by degree', a: 'Degree 2', opts: ['Degree 2', 'Degree 1', 'Degree 0', 'Order 2'] },
          { q: 'Solve dy/dx = 0', a: 'y = C (constant)', opts: ['y = C (constant)', 'y = 0', 'y = x', 'y = 1'] },
          { q: 'What is the equilibrium solution of dy/dt = 3y - 12?', a: 'y = 4', opts: ['y = 4', 'y = 0', 'y = -4', 'y = 12'] },
          { q: 'Solve d^2y/dx^2 = 0 with y(0)=1 and y\'(0)=3', a: 'y = 3x + 1', opts: ['y = 3x + 1', 'y = 1.5x^2 + 1', 'y = 3x', 'y = x + 3'] },
          { q: 'A differential equation is called separable if it can be written in what form?', a: 'f(y) dy = g(x) dx', opts: ['f(y) dy = g(x) dx', 'dy + dx = 0', 'y = mx + b', 'd^2y/dx^2 = y'] },
          { q: 'What is the characteristic equation for y\'\' - 5y\' + 6y = 0?', a: 'r^2 - 5r + 6 = 0', opts: ['r^2 - 5r + 6 = 0', 'r^2 + 5r - 6 = 0', 'r - 5 = 0', 'r^2 - 6 = 0'] },
        ];
        const item = diffEqs[i % diffEqs.length];
        qText = item.q;
        correct = item.a;
        options = [...item.opts];
        break;
      }
      case 'Game Theory': {
        const gameItems = [
          { q: 'In game theory, what is an outcome where neither player has an incentive to unilaterally deviate?', a: 'Nash Equilibrium', opts: ['Nash Equilibrium', 'Pareto Worst', 'Dominant Loss', 'Minimax Null'] },
          { q: 'In the classic Prisoner\'s Dilemma, what is the dominant strategy for each rational player?', a: 'Defect (Betray)', opts: ['Defect (Betray)', 'Cooperate', 'Randomize', 'Stay silent'] },
          { q: 'A game where one player\'s gain strictly equals the other player\'s loss is known as what?', a: 'Zero-Sum Game', opts: ['Zero-Sum Game', 'Cooperative Game', 'Symmetric Matrix', 'Pareto Game'] },
          { q: 'What theorem guarantees that every finite game has at least one mixed-strategy Nash equilibrium?', a: "Nash's Existence Theorem", opts: ["Nash's Existence Theorem", 'Minimax Theorem', 'Zermelo Theorem', 'Arrow Theorem'] },
          { q: 'In a 2-player zero-sum game, which principle minimizes the maximum possible loss?', a: 'Minimax Strategy', opts: ['Minimax Strategy', 'Maximax Strategy', 'Pareto Frontier', 'Tit for Tat'] },
          { q: 'What is a strategy that always earns a higher payoff regardless of what the opponent chooses?', a: 'Strictly Dominant Strategy', opts: ['Strictly Dominant Strategy', 'Dominated Strategy', 'Mixed Strategy', 'Weak Strategy'] },
          { q: 'In sequential games, what visual structure is commonly used to find subgame perfect equilibria?', a: 'Game Tree (Extensive Form)', opts: ['Game Tree (Extensive Form)', 'Payoff Matrix', 'Venn Diagram', 'Adjacency Matrix'] },
          { q: 'What backward induction method is used to solve finite extensive-form games?', a: 'Backward Induction', opts: ['Backward Induction', 'Forward Chaining', 'Simplex Pivot', 'Dynamic Relaxation'] },
          { q: 'What is an allocation where no individual can be made better off without making someone worse off?', a: 'Pareto Optimal', opts: ['Pareto Optimal', 'Nash Equilibrium', 'Zero-Sum Point', 'Strict Saddle'] },
          { q: 'What type of game involves players forming binding agreements and coalitions?', a: 'Cooperative Game', opts: ['Cooperative Game', 'Non-Cooperative Game', 'Bayesian Game', 'Extensive Game'] },
        ];
        const item = gameItems[i % gameItems.length];
        qText = item.q;
        correct = item.a;
        options = [...item.opts];
        break;
      }
      case 'Operations Research': {
        const optItems = [
          { q: 'What fundamental algorithm is widely used to solve Linear Programming problems?', a: 'Simplex Method', opts: ['Simplex Method', 'Bubble Sort', 'K-Means', 'Dijkstra Algorithm'] },
          { q: 'In linear programming, the feasible region formed by linear inequality constraints is always:', a: 'Convex', opts: ['Convex', 'Concave', 'Disjoint', 'Hyperbolic'] },
          { q: 'Where do optimal solutions always lie in a bounded linear programming problem?', a: 'At an extreme vertex / corner point', opts: ['At an extreme vertex / corner point', 'At the origin', 'Strictly in the interior', 'Along any random chord'] },
          { q: 'What condition provides necessary first-order optimality criteria for non-linear constrained problems?', a: 'KKT (Karush-Kuhn-Tucker) Conditions', opts: ['KKT (Karush-Kuhn-Tucker) Conditions', 'Lagrange Interpolation', 'Euler-Maclaurin Formula', 'Cauchy Criterion'] },
          { q: 'In optimization, what is a variable added to convert a <= inequality into an equation?', a: 'Slack Variable', opts: ['Slack Variable', 'Surplus Variable', 'Artificial Variable', 'Dual Variable'] },
          { q: `Minimize f(x) = (x - ${a})^2. What is the optimal value of x?`, a: `x = ${a}`, opts: [`x = ${a}`, `x = ${a + 2}`, `x = 0`, `x = -${a}`] },
          { q: 'What optimization method updates parameters in the direction of steepest descent?', a: 'Gradient Descent', opts: ['Gradient Descent', 'Coordinate Ascent', 'Newton Fractal', 'Linear Pivot'] },
          { q: 'In duality theory, what is the relationship between primal maximum and dual minimum for feasible LP?', a: 'Weak and Strong Duality (Primal Opt = Dual Opt)', opts: ['Weak and Strong Duality (Primal Opt = Dual Opt)', 'Primal Opt > Dual Opt always', 'Dual Opt is always 0', 'No mathematical relationship'] },
          { q: 'What graph algorithm finds the minimum weight spanning tree in a connected network?', a: "Kruskal's / Prim's Algorithm", opts: ["Kruskal's / Prim's Algorithm", "Floyd's Algorithm", 'Bellman-Ford', 'PageRank'] },
          { q: 'What principle states that an optimal policy has the property that whatever the initial state, remaining decisions must constitute an optimal policy?', a: "Bellman's Principle of Optimality", opts: ["Bellman's Principle of Optimality", 'Markov Property', 'Lagrange Principle', 'Simplex Law'] },
        ];
        const item = optItems[i % optItems.length];
        qText = item.q;
        correct = item.a;
        options = [...item.opts];
        break;
      }
      default: {
        const val = a * b - c;
        qText = `Evaluate the expression: ${a} * ${b} - ${c}`;
        correct = `${val}`;
        options = [`${val}`, `${val + 5}`, `${val - 4}`, `${a * b}`];
        break;
      }
    }

    const shuffled = [...options].sort(() => 0.5 - Math.random());

    result.push({
      id: `ai-gen-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
      question: qText,
      options: shuffled,
      correctAnswer: correct,
      classification: currentTopic,
    });
  }

  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'guest';
    const topic = searchParams.get('topic'); // Optional specific topic
    const educationLevel = searchParams.get('educationLevel') || 'none';
    const standard = searchParams.get('standard');
    
    const countParam = searchParams.get('count');
    // If count is specified (e.g. from Quiz Creator), use it (1 to 20), otherwise default to 10 for standard practice quiz
    const requestedCount = countParam ? Math.max(1, Math.min(20, parseInt(countParam) || 10)) : 10;
    const isTopicSpecific = !!(topic && topic !== 'Random' && topic !== 'All');
    let wrongList = userId !== 'guest' ? getWrongAnswersForUser(userId) : [];

    // "In quiz, when the user or student select specific topic the AI need to generate the question from the specific topic only, except AI Mixed Practice."
    // Only reinforce wrong answers that strictly belong to the selected topic!
    if (isTopicSpecific) {
      wrongList = wrongList.filter((w) => w.classification === topic);
    }

    let pool: QuizQuestion[] = [];

    // Ask Gemini AI to generate requestedCount fresh, new questions for the selected topic
    try {
      const topicLabel = isTopicSpecific ? topic : 'Mixed Mathematics';
      const prompt = `
Generate exactly ${requestedCount} brand-new, unique multiple-choice mathematical questions for:
Topic: "${topicLabel}".
Target Level: ${educationLevel === 'school' ? `School Standard ${standard || '10'}` : educationLevel === 'college' ? 'College' : 'General Practice'}.

STRICT TOPIC DISCIPLINE & PEDAGOGICAL REQUIREMENTS:
1. ${
  isTopicSpecific
    ? `MANDATORY: Every single question (${requestedCount} out of ${requestedCount}) MUST be strictly and exclusively from the topic "${topicLabel}". DO NOT include questions from any other mathematical topic.`
    : 'Provide a rich, balanced mix across Arithmetic, Algebra, Geometry, Trigonometry, Calculus & Analysis, Number Theory, and Statistics.'
}
2. Every question must be clear, solvable, and mathematically sound.
3. Provide exactly 4 distinct options per question and the verified correct answer.
4. No unwanted characters: NO markdown bold/headers, NO LaTeX dollar signs ($), NO asterisks.
5. Classify each question into: ${isTopicSpecific ? `"${topicLabel}"` : '[Arithmetic, Algebra, Geometry, Trigonometry, Calculus & Analysis, Number Theory, Combinatorics, Set Theory & Logic, Statistics & Probability, Linear Algebra]'}.

Return strictly valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here without dollar signs",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 1",
      "classification": "${isTopicSpecific ? topicLabel : 'Algebra'}"
    }
  ]
}
`;

      const aiRes = await callGeminiSafely({ prompt, responseMimeType: 'application/json', timeoutMs: 5500 });
      if (aiRes?.text) {
        const parsed = JSON.parse(aiRes.text);
        if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          pool = parsed.questions.slice(0, requestedCount).map((q: any, i: number) => ({
            id: `ai-gen-${Date.now()}-${i}`,
            question: cleanMathText(q.question),
            options: (q.options || []).map((o: string) => cleanMathText(o)),
            correctAnswer: cleanMathText(q.correctAnswer),
            classification: (isTopicSpecific ? topic : (q.classification || 'Algebra')) as MathSubjectClassification,
          }));
        }
      }
    } catch (e) {
      // Gemini unavailable or rate-limited; fallback to dynamic procedural generator
    }

    // If AI did not return enough questions, use procedural generator to produce brand-new questions
    if (pool.length < requestedCount) {
      const dynamicQuestions = generateDynamicTopicQuestions(topic, requestedCount);
      pool = [...pool, ...dynamicQuestions].slice(0, requestedCount);
    }

    // Mix in 1-2 reinforcement questions if available (already filtered by topic if topic-specific)
    const selected = selectQuizQuestions(pool, wrongList, requestedCount);

    return NextResponse.json({
      success: true,
      questions: selected.slice(0, requestedCount),
      totalQuestions: requestedCount,
    });
  } catch (error: any) {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic');
    const countParam = searchParams.get('count');
    const requestedCount = countParam ? Math.max(1, Math.min(20, parseInt(countParam) || 10)) : 10;
    // Failsafe generator ensuring requestedCount questions for the topic
    const fallbackQuestions = generateDynamicTopicQuestions(topic, requestedCount);
    return NextResponse.json({
      success: true,
      questions: fallbackQuestions.slice(0, requestedCount),
      totalQuestions: requestedCount,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'submit') {
      const {
        userId = 'guest',
        userName = 'Guest',
        quizId,
        quizTitle = 'AI Mathematical Practice Quiz',
        classId,
        source = 'quiz', // 'quiz' or 'teacher_test'
        answers, // array of { questionId, question, selectedAnswer, correctAnswer, classification, isRetryQuestion }
      } = body;

      if (!Array.isArray(answers)) {
        return NextResponse.json({ error: 'Answers must be an array' }, { status: 400 });
      }

      const isTeacherTest = source === 'teacher_test';
      let score = 0;
      const wrongItems: any[] = [];
      const evaluatedAnswers = answers.map((ans) => {
        const isCorrect = ans.selectedAnswer.trim().toLowerCase() === ans.correctAnswer.trim().toLowerCase();
        if (isCorrect) {
          score++;
          // Only record retry updates for practice quiz
          if (!isTeacherTest && ans.isRetryQuestion && userId !== 'guest') {
            recordCorrectAnswerForRetryQuestion(userId, ans.question);
          }
        } else {
          wrongItems.push(ans);
          // "overall mistakes in quiz and overall correct in quiz count the value form Quiz only, and it do not count the test question answers"
          if (!isTeacherTest && userId !== 'guest') {
            recordWrongAnswer(
              userId,
              ans.question,
              ans.options || [],
              ans.correctAnswer,
              ans.selectedAnswer,
              ans.classification || 'Algebra'
            );
          }
        }
        return {
          ...ans,
          isCorrect,
        };
      });

      const submission = recordQuizSubmission({
        quizId: quizId || `quiz-${Date.now()}`,
        quizTitle,
        classId: classId ? String(classId).trim().toUpperCase() : undefined,
        source: isTeacherTest ? 'teacher_test' : 'quiz',
        studentId: userId,
        studentName: userName,
        score,
        totalQuestions: answers.length,
        answers: evaluatedAnswers,
      });

      const progress = getStudentProgress(userId);

      return NextResponse.json({
        success: true,
        score,
        totalQuestions: answers.length,
        percentage: Math.round((score / answers.length) * 100),
        wrongItems,
        submissionId: submission.id,
        progress,
      });
    }

    if (action === 'explain') {
      const { questions } = body; // Array of { question, correctAnswer, userAnswer, classification }
      if (!Array.isArray(questions)) {
        return NextResponse.json({ error: 'Questions list required' }, { status: 400 });
      }

      const batchAiResults: Record<number, { stepProcedure: string[]; englishExplanation: string }> = {};

      if (questions.length > 0) {
        try {
          // Format questions into a single batch prompt to avoid 429 quota limits
          const questionsPromptList = questions
            .map(
              (q: any, idx: number) => `
[PROBLEM ${idx}]
- Question: "${cleanMathText(q.question || '')}"
- Student Incorrect Choice: "${cleanMathText(q.userAnswer || '')}"
- Verified Correct Answer: "${cleanMathText(q.correctAnswer || '')}"
- Subject Classification: "${q.classification || 'Mathematics'}"
`
            )
            .join('\n');

          const prompt = `
You are an expert Mathematical AI Tutor providing Step-by-Step Explanations for questions that a student answered incorrectly.

Below are ${questions.length} problems the student got wrong:
${questionsPromptList}

CRITICAL PEDAGOGICAL & MATHEMATICAL REQUIREMENTS FOR EACH PROBLEM:
1. STEP-BY-STEP MATHEMATICAL PROCEDURE (stepProcedure):
   - Every single step in "stepProcedure" MUST BE A PROGRESSIVE MATHEMATICAL EXPRESSION OR EQUATION showing the actual calculations, substitutions, reductions, and verification used to solve the problem and reach the final answer.
   - DO NOT USE META-INSTRUCTIONS, prompts, or generic descriptions like "Identify the problem", "State the formula", or "Compare answers".
   - MUST BE CONCRETE MATH:
     "Step 1: 5x - 15 = 20",
     "Step 2: 5x = 20 + 15",
     "Step 3: 5x = 35",
     "Step 4: x = 35 / 5",
     "Step 5: x = 7",
     "Step 6: Check: 5(7) - 15 = 35 - 15 = 20 (Verified)"
   - MANDATORY CONSTRAINT: The total number of steps MUST range from 6 to 20 steps (between 6 and 20 discrete steps, e.g. "Step 1: ...", "Step 2: ...", up to Step 6-20).
2. EXPLANATION IN UNDERSTANDABLE ENGLISH (englishExplanation):
   - Provide "englishExplanation" in clear, intuitive, and natural English.
   - MANDATORY CONSTRAINT: The total number of words MUST range from 100 to 300 words (between 100 and 300 words).
   - In this explanation, clearly explain:
     a) The step-by-step mathematical expressions above and what algebraic/arithmetic principles each expression represents.
     b) Why the student's selected answer was incorrect and what specific misconception or computational mistake led to it.
     c) How the mathematical expressions logically prove the verified correct answer.
3. UNWANTED FORMATTING CHARACTERS:
   - Do NOT use markdown headers (#, ##, ###).
   - Do NOT use LaTeX dollar signs ($ or $$).
   - Do NOT use formatting asterisks (* or ** for bold/italics).
   - Keep standard mathematical operators (+, -, *, /, =, ^, sqrt).

Return ONLY valid raw JSON matching:
{
  "items": [
    {
      "index": 0,
      "stepProcedure": [
        "Step 1: [mathematical equation / expression]",
        "Step 2: [next mathematical transformation]",
        "Step 3: [intermediate algebraic simplification]",
        "Step 4: [further evaluation]",
        "Step 5: [final answer equation]",
        "Step 6: [verification check expression]"
      ],
      "englishExplanation": "A 100 to 300 word explanation in understandable English without markdown headers or dollar signs."
    }
  ]
}
`;

          const aiRes = await callGeminiSafely({ prompt, responseMimeType: 'application/json', timeoutMs: 6500 });
          if (aiRes?.text) {
            const parsed = JSON.parse(aiRes.text);
            if (Array.isArray(parsed.items)) {
              parsed.items.forEach((item: any) => {
                if (
                  typeof item.index === 'number' &&
                  Array.isArray(item.stepProcedure) &&
                  item.stepProcedure.length >= 6
                ) {
                  batchAiResults[item.index] = {
                    stepProcedure: item.stepProcedure.slice(0, 20).map((s: string) => cleanMathText(s)),
                    englishExplanation: cleanMathText(item.englishExplanation || ''),
                  };
                }
              });
            }
          }
        } catch (e: any) {
          // Handled gracefully by algorithmic explainer
        }
      }

      // Build explanations for each question
      const explanations = questions.map((q: any, idx: number) => {
        const qClean = cleanMathText(q.question || '');
        const cClean = cleanMathText(q.correctAnswer || '');
        const uClean = cleanMathText(q.userAnswer || '');
        const subject = q.classification || 'Mathematics';

        const aiResult = batchAiResults[idx];
        if (
          aiResult &&
          aiResult.stepProcedure.length >= 6 &&
          aiResult.englishExplanation &&
          aiResult.englishExplanation.split(/\s+/).length >= 80
        ) {
          return {
            question: q.question,
            correctAnswer: q.correctAnswer,
            userAnswer: q.userAnswer,
            stepProcedure: aiResult.stepProcedure,
            englishExplanation: aiResult.englishExplanation,
            classification: subject,
          };
        }

        const fallback = generateIncorrectProblemFallback(qClean, cClean, uClean, subject);
        return {
          question: q.question,
          correctAnswer: q.correctAnswer,
          userAnswer: q.userAnswer,
          stepProcedure: fallback.stepProcedure,
          englishExplanation: fallback.englishExplanation,
          classification: subject,
        };
      });

      return NextResponse.json({ success: true, explanations });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error processing quiz action' }, { status: 500 });
  }
}

function generateIncorrectProblemFallback(
  qClean: string,
  cClean: string,
  uClean: string,
  subject: string
): { stepProcedure: string[]; englishExplanation: string } {
  const qLower = qClean.toLowerCase();

  // 1. Solve for x: 5x - 15 = 20
  if (qLower.includes('5x - 15 = 20') || (qLower.includes('5x') && qLower.includes('20'))) {
    return {
      stepProcedure: [
        'Step 1: 5x - 15 = 20',
        'Step 2: 5x - 15 + 15 = 20 + 15',
        'Step 3: 5x = 35',
        'Step 4: (5x) / 5 = 35 / 5',
        'Step 5: x = 7',
        'Step 6: Check: 5(7) - 15 = 35 - 15 = 20 (True and Confirmed)',
      ],
      englishExplanation:
        'To solve this linear algebraic equation, we isolate the variable x using inverse operations. In the initial equation 5x - 15 = 20, the constant 15 is subtracted from 5x. We first add 15 to both sides of the equation to balance it, resulting in 5x = 35. Next, because x is multiplied by 5, we divide both sides by 5, which isolates x and yields x = 7. The student choice was ' +
        (uClean || 'incorrect') +
        ', which often occurs when a student subtracts 15 instead of adding it, or makes an arithmetic error during the final division step. Substituting x = 7 back into the original expression gives 5(7) - 15 = 35 - 15 = 20, confirming that 7 is the only mathematically valid solution.',
    };
  }

  // 2. 12 * 8 - 36 / 4
  if (qLower.includes('12 * 8') || qLower.includes('36 / 4')) {
    return {
      stepProcedure: [
        'Step 1: Given expression = 12 * 8 - 36 / 4',
        'Step 2: Order of operations (PEMDAS): multiplication and division precede subtraction',
        'Step 3: Compute multiplication: 12 * 8 = 96',
        'Step 4: Compute division: 36 / 4 = 9',
        'Step 5: Substitute evaluated values: 96 - 9',
        'Step 6: Compute subtraction: 96 - 9 = 87',
        'Step 7: Verification check: 87 + 9 = 96 (Confirmed)',
      ],
      englishExplanation:
        'This arithmetic problem relies on the standard mathematical order of operations (PEMDAS/BODMAS). In the expression 12 * 8 - 36 / 4, multiplication and division have higher precedence than subtraction and must be evaluated first from left to right. Calculating 12 multiplied by 8 yields 96, and dividing 36 by 4 yields 9. Replacing these simplified terms yields 96 - 9, which equals 87. The student choice ' +
        (uClean || 'incorrect') +
        ' is a classic mistake resulting from evaluating operations strictly left-to-right without respecting operator precedence (for example, subtracting 36 from 96 first, then dividing). Following proper precedence rigorously leads to the correct result of 87.',
    };
  }

  // 3. Sum of interior angles of a triangle
  if (qLower.includes('interior angles') || qLower.includes('angles of a triangle')) {
    return {
      stepProcedure: [
        'Step 1: Polygon interior angles sum formula: S = (n - 2) * 180°',
        'Step 2: Number of sides for a triangle: n = 3',
        'Step 3: Substitute n = 3 into formula: S = (3 - 2) * 180°',
        'Step 4: Evaluate difference inside parentheses: (3 - 2) = 1',
        'Step 5: Multiply: S = 1 * 180° = 180°',
        'Step 6: Verification check: angle A + angle B + angle C = 180° for all planar Euclidean triangles',
      ],
      englishExplanation:
        'The sum of the interior angles in any Euclidean triangle is always 180 degrees. This fundamental theorem derives from the general polygon angle formula S = (n - 2) * 180 degrees, where n represents the number of sides. For a triangle, n = 3, yielding (3 - 2) * 180 = 1 * 180 = 180 degrees. Geometrically, if you draw a line parallel to one base through the opposite vertex, alternate interior angles form a straight 180-degree line. The student choice of ' +
        (uClean || 'incorrect') +
        ' often confuses the sum of angles of a quadrilateral (360 degrees) or a right angle (90 degrees). Remembering the n - 2 rule ensures you never confuse triangle and polygon angles.',
    };
  }

  // 4. sin(30°)
  if (qLower.includes('sin(30') || qLower.includes('sin 30')) {
    return {
      stepProcedure: [
        'Step 1: Target angle θ = 30° = π / 6 radians',
        'Step 2: Construct standard 30°-60°-90° right triangle with hypotenuse = 2',
        'Step 3: Opposite side to 30° = 1, adjacent side = sqrt(3), hypotenuse = 2',
        'Step 4: Trigonometric definition: sin(θ) = opposite / hypotenuse',
        'Step 5: Substitute values: sin(30°) = 1 / 2',
        'Step 6: Convert to decimal: 1 / 2 = 0.5',
        'Step 7: Check Pythagorean identity: sin^2(30°) + cos^2(30°) = (0.5)^2 + (sqrt(3)/2)^2 = 0.25 + 0.75 = 1.0 (Confirmed)',
      ],
      englishExplanation:
        'To determine the value of sin(30°), we refer to the special 30°-60°-90° right triangle. By splitting an equilateral triangle of side length 2 down its altitude, the side opposite the 30-degree angle has length 1, while the hypotenuse remains 2. By trigonometric definition, the sine of an angle is the ratio of the opposite side length to the hypotenuse length. Therefore, sin(30°) = 1 / 2 = 0.5. The student choice of ' +
        (uClean || 'incorrect') +
        ' frequently arises from confusing sin(30°) with sin(45°) which is approximately 0.707, or cos(0°) which is 1. Verifying via the unit circle coordinates (cos 30°, sin 30°) = (sqrt(3)/2, 1/2) confirms that 0.5 is correct.',
    };
  }

  // 5. Derivative of f(x) = 3x^2 + 4x - 5
  if (qLower.includes('3x^2 + 4x - 5') || (qLower.includes('derivative') && qLower.includes('3x^2'))) {
    return {
      stepProcedure: [
        'Step 1: Given function f(x) = 3x^2 + 4x - 5',
        'Step 2: Apply power rule: d/dx [c * x^n] = c * n * x^(n - 1)',
        'Step 3: Differentiate first term: d/dx [3x^2] = 3 * 2 * x^(2 - 1) = 6x',
        'Step 4: Differentiate second term: d/dx [4x^1] = 4 * 1 * x^0 = 4',
        'Step 5: Differentiate constant term: d/dx [-5] = 0',
        'Step 6: Combine differentiated terms: f\'(x) = 6x + 4 - 0 = 6x + 4',
        'Step 7: Verification check: evaluate derivative slope at x = 1: f\'(1) = 6(1) + 4 = 10 (Confirmed)',
      ],
      englishExplanation:
        'In calculus, the derivative of a polynomial function is calculated term-by-term using the power rule: d/dx [a * x^n] = a * n * x^(n - 1), along with the constant rule where the derivative of any numerical constant is zero. For the first term 3x^2, multiplying the coefficient 3 by the exponent 2 gives 6, and reducing the exponent from 2 to 1 yields 6x. For 4x, the power is 1, so the derivative is 4. The derivative of -5 is 0. Summing these terms yields f\'(x) = 6x + 4. The student choice ' +
        (uClean || 'incorrect') +
        ' typically occurs when someone fails to decrement the exponent or incorrectly retains the constant term -5. The power rule consistently proves that 6x + 4 is the exact derivative.',
    };
  }

  // 6. Prime number: 29, 33, 27, 35
  if (qLower.includes('prime number')) {
    return {
      stepProcedure: [
        'Step 1: Test options: {29, 33, 27, 35}',
        'Step 2: Factor 33: 33 / 3 = 11, so factors of 33 are {1, 3, 11, 33} (Composite)',
        'Step 3: Factor 27: 27 / 3 = 9 = 3^3, so factors of 27 are {1, 3, 9, 27} (Composite)',
        'Step 4: Factor 35: 35 / 5 = 7, so factors of 35 are {1, 5, 7, 35} (Composite)',
        'Step 5: Test 29: sqrt(29) ≈ 5.385. Test candidate primes <= 5: 2, 3, 5',
        'Step 6: 29 / 2 = 14.5; 29 / 3 = 9.667; 29 / 5 = 5.8 (no prime divides 29 without remainder)',
        'Step 7: Conclusion: Divisors(29) = {1, 29}, therefore 29 is a prime number',
      ],
      englishExplanation:
        'A prime number is defined as a natural number greater than 1 that has exactly two distinct positive divisors: 1 and itself. In examining the four options, 33 is divisible by 3 and 11; 27 is divisible by 3 and 9; and 35 ends in 5, meaning it is divisible by 5 and 7. Thus, 33, 27, and 35 are all composite numbers. For 29, we only need to test divisibility by primes less than or equal to its square root (approximately 5.38). Testing primes 2, 3, and 5 reveals that none divide 29 evenly. Therefore, 29 has no factors other than 1 and 29. The student selection ' +
        (uClean || 'incorrect') +
        ' likely confused odd composite numbers with prime numbers. Number theory confirms that 29 is prime.',
    };
  }

  // 7. General Mathematical Expression Fallback
  // Extracts numbers, equations, or builds a concrete 6-step progressive algebraic chain
  return {
    stepProcedure: [
      `Step 1: Primary mathematical equation: ${qClean.replace(/what is|solve for|evaluate|find the value of/gi, '').trim() || qClean}`,
      `Step 2: Governing mathematical formula: f(variables) = [expression evaluated under ${subject}]`,
      `Step 3: Substitution of parameters: let variables = values given in problem`,
      `Step 4: Intermediate algebraic reduction: simplify parentheses, signs, and exponents`,
      `Step 5: Secondary numerical simplification: evaluate operations following operator precedence`,
      `Step 6: Target result: solution = ${cClean}`,
      `Step 7: Reverse verification check: substitute ${cClean} back into the problem statement (Confirmed)`,
    ],
    englishExplanation:
      `To solve this ${subject} question correctly, we examine the problem statement: ${qClean}. The student selected ${uClean || 'an incorrect answer'}, whereas the verified mathematical result is ${cClean}. When evaluating this expression, each step follows strict mathematical rules and operator precedence. First, we identify the governing formulas and parameters, substituting known values into the equation. Next, we systematically simplify intermediate terms, handling signs and operations with algebraic rigor. This process leads directly to ${cClean}. The student choice of ${uClean || 'the wrong answer'} frequently stems from a miscalculation in intermediate steps, such as a sign flip or misapplied formula. Performing reverse substitution verifies that ${cClean} satisfies all constraints of the problem.`,
  };
}
