import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanMathText,
  generateUserId,
  generateClassId,
  isValidClassId,
  detectQueryType,
  classifyMathSubject,
  randomizeQuizOptions,
  selectQuizQuestions,
  analyzeWeakTopics,
  parseTableRequest,
  parseConstantRequest,
  parseTheoremRequest,
  parseTeachRequest,
  evaluateUserRequirements,
} from './math-rules.ts';
import { QuizQuestion, WrongQuizQuestion } from './types.ts';

test('cleanMathText removes markdown headers, dollar signs and formatting asterisks', () => {
  const raw = '### Step 1: Solve equation\nSolve $2x + 4 = 10$\n**Subtract** 4 from both sides: 2 * 3 = 6';
  const cleaned = cleanMathText(raw);

  assert.ok(!cleaned.includes('###'));
  assert.ok(!cleaned.includes('$'));
  assert.ok(!cleaned.includes('**'));
  assert.ok(cleaned.includes('Step 1: Solve equation'));
  assert.ok(cleaned.includes('2x + 4 = 10'));
  // Math multiplication asterisk or numbers preserved
  assert.ok(cleaned.includes('2 * 3 = 6'));
});

test('generateUserId satisfies 1 character + 4 digits with S for student and T for teacher', () => {
  const studentId = generateUserId('student');
  assert.match(studentId, /^S\d{4}$/, 'Student ID must start with S followed by 4 digits');

  const teacherId = generateUserId('teacher');
  assert.match(teacherId, /^T\d{4}$/, 'Teacher ID must start with T followed by 4 digits');
});

test('generateClassId satisfies 3 uppercase letters (first, last, random) and 5 digits', () => {
  const teacherName = 'Alice Smith';
  const classId = generateClassId(teacherName);

  assert.equal(classId.length, 8);
  assert.match(classId, /^[A-Z]{3}\d{5}$/);
  // First letter of Alice is A, last letter of Smith is H
  assert.equal(classId[0], 'A');
  assert.equal(classId[1], 'H');
  assert.ok(isValidClassId(classId));
});

test('detectQueryType differentiates commands, doubts, history/theory, and math problems', () => {
  assert.equal(detectQueryType('clear'), 'command');
  assert.equal(detectQueryType('hello'), 'doubt');
  assert.equal(detectQueryType('can you clarify how to factor polynomials?'), 'doubt');
  assert.equal(detectQueryType('who discovered zero?'), 'history_theory');
  assert.equal(detectQueryType('what is pi?'), 'history_theory');
  assert.equal(detectQueryType('who is newton'), 'history_theory');
  assert.equal(detectQueryType('who is ramanujan'), 'history_theory');
  assert.equal(detectQueryType('solve 3x^2 - 12 = 0'), 'math_problem');
});

test('classifyMathSubject categorizes topics into the 15 subjects', () => {
  assert.equal(classifyMathSubject('Find the derivative of x^3 + 2x'), 'Calculus & Analysis');
  assert.equal(classifyMathSubject('Solve for x in 2x + 5 = 15'), 'Algebra');
  assert.equal(classifyMathSubject('Calculate sin(30) + cos(60)'), 'Trigonometry');
  assert.equal(classifyMathSubject('What is the determinant of a 3x3 matrix?'), 'Linear Algebra');
  assert.equal(classifyMathSubject('If you roll two dice, what is the probability of sum 7?'), 'Statistics & Probability');
  assert.equal(classifyMathSubject('What is the area of a circle with radius 5?'), 'Geometry');
});

test('selectQuizQuestions prioritizes user wrong questions (1-2) and fills remaining', () => {
  const mockPool: QuizQuestion[] = Array.from({ length: 15 }, (_, i) => ({
    id: `q${i}`,
    question: `Math Question ${i}`,
    options: ['Ans A', 'Ans B', 'Ans C', 'Ans D'],
    correctAnswer: 'Ans A',
    classification: 'Arithmetic',
  }));

  const mockWrong: WrongQuizQuestion[] = [
    {
      id: 'w1',
      userId: 'S1001',
      question: 'Wrong Question 1',
      options: ['1', '2', '3', '4'],
      correctAnswer: '3',
      userAnswer: '1',
      classification: 'Algebra',
      correctTimesInRandomQuiz: 0,
      timestamp: new Date().toISOString(),
    },
  ];

  const selected = selectQuizQuestions(mockPool, mockWrong, 10);
  assert.equal(selected.length, 10);
  const retryQuestions = selected.filter((q) => q.isRetryQuestion);
  assert.ok(retryQuestions.length >= 1 && retryQuestions.length <= 2);
  assert.equal(retryQuestions[0].question, 'Wrong Question 1');
});

test('analyzeWeakTopics aggregates wrong answers by classification', () => {
  const wrong: WrongQuizQuestion[] = [
    { id: '1', userId: 'S1', question: 'q1', options: [], correctAnswer: '', userAnswer: '', classification: 'Algebra', correctTimesInRandomQuiz: 0, timestamp: '' },
    { id: '2', userId: 'S1', question: 'q2', options: [], correctAnswer: '', userAnswer: '', classification: 'Algebra', correctTimesInRandomQuiz: 0, timestamp: '' },
    { id: '3', userId: 'S1', question: 'q3', options: [], correctAnswer: '', userAnswer: '', classification: 'Trigonometry', correctTimesInRandomQuiz: 0, timestamp: '' },
  ];

  const analysis = analyzeWeakTopics(wrong);
  assert.equal(analysis[0].classification, 'Algebra');
  assert.equal(analysis[0].wrongCount, 2);
  assert.equal(analysis[1].classification, 'Trigonometry');
  assert.equal(analysis[1].wrongCount, 1);
});

test('parseTableRequest extracts base and limit and formats as y X y = y', () => {
  // Unspecified limit defaults to 10
  const res1 = parseTableRequest('print table of 5');
  assert.equal(res1.isTable, true);
  assert.equal(res1.base, 5);
  assert.equal(res1.limit, 10);
  assert.equal(res1.tableLines?.length, 10);
  assert.equal(res1.tableLines?.[0], '5 X 1 = 5');
  assert.equal(res1.tableLines?.[1], '5 X 2 = 10');
  assert.equal(res1.tableLines?.[9], '5 X 10 = 50');

  // Specified limit
  const res2 = parseTableRequest('table of 7 up to 15');
  assert.equal(res2.isTable, true);
  assert.equal(res2.base, 7);
  assert.equal(res2.limit, 15);
  assert.equal(res2.tableLines?.length, 15);
  assert.equal(res2.tableLines?.[14], '7 X 15 = 105');
});

test('parseConstantRequest detects constants and provides value announcement first', () => {
  const piRes = parseConstantRequest('what is pi?');
  assert.equal(piRes.isConstant, true);
  assert.equal(piRes.name, 'Pi');
  assert.ok(piRes.initialValueAnnouncement.includes('3.1415926535'));
  assert.ok(piRes.initialValueAnnouncement.includes('22/7'));
});

test('parseTheoremRequest provides base formula and additional formulas', () => {
  const pyth = parseTheoremRequest('pythagoras theorem');
  assert.equal(pyth.isTheorem, true);
  assert.ok(pyth.baseFormula.includes('a^2 + b^2 = c^2'));
  assert.ok(pyth.additionalFormulas.length >= 3);
  assert.ok(pyth.additionalFormulas.some((f: string) => f.includes('sqrt(a^2 + b^2)')));
});

test('parseTeachRequest detects pedagogical topic instruction requests', () => {
  const teach = parseTeachRequest('teach me this topic: Quadratic Equations');
  assert.equal(teach.isTeach, true);
  assert.ok(teach.topic.toLowerCase().includes('quadratic'));
});

test('evaluateUserRequirements sorts user preference, finds requirements, and plans answer', () => {
  const evalTable = evaluateUserRequirements('print table of 8');
  assert.equal(evalTable.userIntent, 'table');
  assert.equal(evalTable.tableFormat, 'y X y = y');
  assert.equal(evalTable.tableLimit, 10);

  const evalTeach = evaluateUserRequirements('teach me calculus');
  assert.equal(evalTeach.userIntent, 'teach_topic');
  assert.ok(evalTeach.requirementsIdentified.some((r: string) => r.includes('200 and 800 words')));

  const evalTheorem = evaluateUserRequirements('state the binomial theorem');
  assert.equal(evalTheorem.userIntent, 'theorem');
  assert.ok(evalTheorem.requirementsIdentified.some((r: string) => r.includes('base formula')));
  assert.ok(evalTheorem.requirementsIdentified.some((r: string) => r.includes('additional formulas')));
});

