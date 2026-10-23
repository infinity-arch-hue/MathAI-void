import { jsPDF } from 'jspdf';

export interface MathSolutionExportData {
  title?: string;
  question: string;
  classification: string;
  finalAnswer?: string;
  stepProcedure: string[];
  englishExplanation: string;
  studentName?: string;
}

export interface QuizIncorrectProblemExportData {
  quizTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  studentName?: string;
  problems: {
    question: string;
    classification: string;
    userAnswer: string;
    correctAnswer: string;
    stepProcedure: string[];
    englishExplanation: string;
  }[];
}

/**
 * Cleanly wraps text and adds pages automatically if cursor exceeds page boundary
 */
function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 6
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const lines = doc.splitTextToSize(text, maxWidth);

  let currentY = y;
  for (const line of lines) {
    if (currentY + lineHeight > pageHeight - 15) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

/**
 * Exports a Math AI chat/problem solution to a clean PDF document
 */
export function exportMathSolutionToPDF(data: MathSolutionExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 22;

  // Header Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.roundedRect(margin, cursorY - 6, contentWidth, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MATH AI - MATHEMATICAL SOLUTION REPORT', margin + 6, cursorY + 5);

  cursorY += 24;

  // Metadata Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, cursorY);
  if (data.studentName) {
    doc.text(`Student: ${data.studentName}`, margin + 90, cursorY);
  }
  cursorY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Subject: ${data.classification || 'Mathematics'}`, margin, cursorY);
  if (data.finalAnswer) {
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(`Final Result: ${data.finalAnswer}`, margin + 90, cursorY);
    doc.setTextColor(30, 41, 59);
  }

  cursorY += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, margin + contentWidth, cursorY);
  cursorY += 8;

  // Problem Question
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Problem Question / Query:', margin, cursorY);
  cursorY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  cursorY = addWrappedText(doc, data.question, margin, cursorY, contentWidth, 5.5);
  cursorY += 6;

  // Step-by-Step Mathematical Procedure
  if (data.stepProcedure && data.stepProcedure.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.text('1. Step-by-Step Mathematical Procedure:', margin, cursorY);
    cursorY += 7;

    doc.setFont('courier', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    data.stepProcedure.forEach((step, sIdx) => {
      // Check page break
      if (cursorY + 12 > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        cursorY = 20;
      }

      // Draw subtle step background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      const stepLines = doc.splitTextToSize(step, contentWidth - 8);
      const boxHeight = stepLines.length * 5 + 4;

      doc.roundedRect(margin, cursorY - 3, contentWidth, boxHeight, 1.5, 1.5, 'FD');
      cursorY = addWrappedText(doc, step, margin + 4, cursorY + 1, contentWidth - 8, 5);
      cursorY += 4;
    });

    cursorY += 4;
  }

  // Explanation in Understandable English
  if (data.englishExplanation) {
    if (cursorY + 20 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.text('2. Explanation in Understandable English:', margin, cursorY);
    cursorY += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    cursorY = addWrappedText(doc, data.englishExplanation, margin, cursorY, contentWidth, 5.5);
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MATH AI • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const safeFilename = `math_ai_solution_${Date.now()}.pdf`;
  doc.save(safeFilename);
}

/**
 * Exports incorrect quiz problems with AI step-by-step mathematical procedures & explanations to PDF
 */
export function exportQuizIncorrectProblemsToPDF(data: QuizIncorrectProblemExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 22;

  // Header Banner
  doc.setFillColor(225, 29, 72); // Rose 600
  doc.roundedRect(margin, cursorY - 6, contentWidth, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('MATH AI - INCORRECT PROBLEMS & STEP-BY-STEP SOLUTIONS', margin + 6, cursorY + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Quiz: ${data.quizTitle} • Score: ${data.score}/${data.totalQuestions} (${data.percentage}%)`,
    margin + 6,
    cursorY + 10
  );

  cursorY += 26;

  // Overview summary text
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Review of ${data.problems.length} problem(s) requiring reinforcement. Includes step-by-step mathematical expressions and conceptual explanations.`,
    margin,
    cursorY
  );
  cursorY += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, margin + contentWidth, cursorY);
  cursorY += 8;

  // Iterate over each problem
  data.problems.forEach((prob, pIdx) => {
    if (cursorY + 30 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      cursorY = 20;
    }

    // Problem Header Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, cursorY - 4, contentWidth, 10, 2, 2, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`Problem ${pIdx + 1}: ${prob.classification || 'Mathematics'}`, margin + 4, cursorY + 2.5);

    cursorY += 12;

    // Question Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    cursorY = addWrappedText(doc, `Question: ${prob.question}`, margin, cursorY, contentWidth, 5.5);
    cursorY += 3;

    // Student choice vs Correct answer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // Rose
    doc.text(`Student Answer: ${prob.userAnswer || '(None)'}`, margin, cursorY);

    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(`Verified Correct: ${prob.correctAnswer}`, margin + 80, cursorY);
    cursorY += 7;

    // Mathematical Procedure
    if (prob.stepProcedure && prob.stepProcedure.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229);
      doc.text('Mathematical Procedure (Step-by-Step Expressions):', margin, cursorY);
      cursorY += 5.5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      prob.stepProcedure.forEach((step) => {
        if (cursorY + 8 > doc.internal.pageSize.getHeight() - 15) {
          doc.addPage();
          cursorY = 20;
        }
        cursorY = addWrappedText(doc, `  ${step}`, margin, cursorY, contentWidth, 4.8);
      });
      cursorY += 4;
    }

    // English Explanation
    if (prob.englishExplanation) {
      if (cursorY + 15 > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        cursorY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229);
      doc.text('Explanation of Mathematical Expressions in Understandable English:', margin, cursorY);
      cursorY += 5.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      cursorY = addWrappedText(doc, prob.englishExplanation, margin, cursorY, contentWidth, 5);
      cursorY += 6;
    }

    // Divider between problems
    if (pIdx < data.problems.length - 1) {
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cursorY, margin + contentWidth, cursorY);
      cursorY += 8;
    }
  });

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MATH AI Incorrect Solutions • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const safeFilename = `math_ai_incorrect_problems_${Date.now()}.pdf`;
  doc.save(safeFilename);
}

export interface StudentReviewExportData {
  studentName: string;
  studentId: string;
  classId?: string;
  standard?: number;
  educationLevel?: string;
  totalMistakeCount: number;
  totalCorrectCount: number;
  totalAiSearches: number;
  overallAccuracy: number;
  totalQuizzesTaken: number;
  topicStats: {
    topic: string;
    correctCount: number;
    mistakeCount: number;
    aiSearches: number;
    totalAttempted?: number;
    accuracy: number;
    status: string;
  }[];
}

export function exportStudentReviewReportToPDF(data: StudentReviewExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 20;

  // Header Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.roundedRect(margin, cursorY - 5, contentWidth, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MATH AI - STUDENT PERFORMANCE & TOPIC REVIEW', margin + 6, cursorY + 5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Mathematics Learning & Subject Classification Progress Report', margin + 6, cursorY + 11);

  cursorY += 25;

  // Student Info Row
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Student: ${data.studentName} (${data.studentId})`, margin, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`, margin + 110, cursorY);

  cursorY += 6;
  const classLabel = data.classId ? `Class ID: ${data.classId}` : 'Class: Not Enrolled';
  const gradeLabel = data.standard ? `Standard: ${data.standard}th Grade` : `Level: ${data.educationLevel || 'General'}`;
  doc.text(`${classLabel}  •  ${gradeLabel}`, margin, cursorY);
  doc.text(`Total Quizzes Taken: ${data.totalQuizzesTaken}`, margin + 110, cursorY);

  cursorY += 10;

  // 3 Metric Cards Highlight: Mistakes, Correct, AI Searches
  const cardWidth = (contentWidth - 8) / 3;

  // Card 1: Mistake Answers
  doc.setFillColor(254, 242, 242); // Rose 50
  doc.setDrawColor(254, 205, 211); // Rose 200
  doc.roundedRect(margin, cursorY, cardWidth, 20, 2, 2, 'FD');
  doc.setTextColor(190, 18, 60); // Rose 700
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('OVERALL MISTAKE ANSWERS', margin + 4, cursorY + 6);
  doc.setFontSize(15);
  doc.text(String(data.totalMistakeCount), margin + 4, cursorY + 15);

  // Card 2: Correct Answers
  const card2X = margin + cardWidth + 4;
  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(167, 243, 208); // Emerald 200
  doc.roundedRect(card2X, cursorY, cardWidth, 20, 2, 2, 'FD');
  doc.setTextColor(4, 120, 87); // Emerald 700
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('OVERALL CORRECT ANSWERS', card2X + 4, cursorY + 6);
  doc.setFontSize(15);
  doc.text(String(data.totalCorrectCount), card2X + 4, cursorY + 15);

  // Card 3: Total AI Searches
  const card3X = card2X + cardWidth + 4;
  doc.setFillColor(238, 242, 255); // Indigo 50
  doc.setDrawColor(199, 210, 254); // Indigo 200
  doc.roundedRect(card3X, cursorY, cardWidth, 20, 2, 2, 'FD');
  doc.setTextColor(67, 56, 202); // Indigo 700
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL SEARCHES IN AI', card3X + 4, cursorY + 6);
  doc.setFontSize(15);
  doc.text(String(data.totalAiSearches), card3X + 4, cursorY + 15);

  cursorY += 28;

  // Topic Performance Table Header
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cursorY, contentWidth, 8, 1, 1, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');

  doc.text('MATHEMATICS SUBJECT CLASSIFICATION', margin + 3, cursorY + 5.5);
  doc.text('CORRECT', margin + 78, cursorY + 5.5);
  doc.text('MISTAKES', margin + 102, cursorY + 5.5);
  doc.text('AI SEARCHES', margin + 128, cursorY + 5.5);
  doc.text('ACCURACY', margin + 156, cursorY + 5.5);

  cursorY += 10;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  data.topicStats.forEach((t, idx) => {
    if (cursorY + 9 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      cursorY = 20;

      // Repeat table header on new page
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, cursorY, contentWidth, 8, 1, 1, 'F');
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('MATHEMATICS SUBJECT CLASSIFICATION', margin + 3, cursorY + 5.5);
      doc.text('CORRECT', margin + 78, cursorY + 5.5);
      doc.text('MISTAKES', margin + 102, cursorY + 5.5);
      doc.text('AI SEARCHES', margin + 128, cursorY + 5.5);
      doc.text('ACCURACY', margin + 156, cursorY + 5.5);
      cursorY += 10;
    }

    // Row alternating background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, cursorY - 3, contentWidth, 7, 'F');
    }

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(t.topic, margin + 3, cursorY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(4, 120, 87);
    doc.text(String(t.correctCount), margin + 82, cursorY + 2);

    doc.setTextColor(190, 18, 60);
    doc.text(String(t.mistakeCount), margin + 106, cursorY + 2);

    doc.setTextColor(67, 56, 202);
    doc.text(String(t.aiSearches), margin + 134, cursorY + 2);

    // Accuracy badge color
    const attempted = t.totalAttempted ?? (t.correctCount + t.mistakeCount);
    if (attempted === 0 && t.aiSearches === 0) {
      doc.setTextColor(148, 163, 184);
      doc.text('Unexplored', margin + 156, cursorY + 2);
    } else {
      if (t.accuracy >= 80) doc.setTextColor(4, 120, 87);
      else if (t.accuracy >= 60) doc.setTextColor(180, 83, 9);
      else doc.setTextColor(190, 18, 60);
      doc.text(`${t.accuracy}% (${t.status})`, margin + 156, cursorY + 2);
    }

    cursorY += 7;
  });

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MATH AI Performance Review • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const safeFilename = `student_review_report_${data.studentId}_${Date.now()}.pdf`;
  doc.save(safeFilename);
}

export interface StudentSubmissionExportData {
  studentName: string;
  studentId: string;
  quizTitle: string;
  classId?: string;
  score: number;
  totalQuestions: number;
  submittedAt: string;
  answers: {
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    classification: string;
  }[];
}

export function exportStudentSubmissionTestToPDF(data: StudentSubmissionExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 20;

  // Header Banner
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(margin, cursorY - 5, contentWidth, 18, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT QUIZ EVALUATION BREAKDOWN', margin + 6, cursorY + 4);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Verified Question-by-Question Evaluation by AI', margin + 6, cursorY + 10);

  cursorY += 24;

  // Meta Information
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Student: ${data.studentName} (${data.studentId})`, margin, cursorY);
  doc.text(`Score: ${data.score} / ${data.totalQuestions} (${Math.round((data.score / data.totalQuestions) * 100)}%)`, margin + 110, cursorY);

  cursorY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Quiz: ${data.quizTitle}`, margin, cursorY);
  doc.text(`Class ID: ${data.classId || 'N/A'}`, margin + 110, cursorY);

  cursorY += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, margin + contentWidth, cursorY);
  cursorY += 8;

  // Questions breakdown
  data.answers.forEach((ans, idx) => {
    if (cursorY + 25 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Question ${idx + 1} [${ans.classification || 'Mathematics'}]:`, margin, cursorY);
    cursorY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    cursorY = addWrappedText(doc, ans.question, margin, cursorY, contentWidth, 5);
    cursorY += 4;

    // Student Answer
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    if (ans.isCorrect) {
      doc.setTextColor(4, 120, 87);
      doc.text(`Student Answer: ${ans.selectedAnswer || '(No answer)'} ✓ Correct`, margin, cursorY);
    } else {
      doc.setTextColor(190, 18, 60);
      doc.text(`Student Answer: ${ans.selectedAnswer || '(No answer)'} ✗ Incorrect`, margin, cursorY);
      cursorY += 5;
      doc.setTextColor(4, 120, 87);
      doc.text(`Correct Answer: ${ans.correctAnswer}`, margin, cursorY);
    }

    cursorY += 8;
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, cursorY, margin + contentWidth, cursorY);
    cursorY += 6;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MATH AI Evaluation Report • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const safeFilename = `student_evaluation_${data.studentId}_${Date.now()}.pdf`;
  doc.save(safeFilename);
}

export interface SolvedFileQuestionsPDFData {
  fileName: string;
  totalQuestions: number;
  studentName?: string;
  problems: {
    questionNumber: number;
    questionSnippet: string;
    classification: string;
    finalSolution: string;
    fullStepProcedure: string[];
    fullEnglishExplanation: string;
  }[];
}

export function exportSolvedFileQuestionsToPDF(data: SolvedFileQuestionsPDFData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 20;

  // Header Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.roundedRect(margin, cursorY - 5, contentWidth, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('MATH AI - SOLVED FILE QUESTIONS REPORT', margin + 6, cursorY + 4);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Source Document: ${data.fileName} • ${data.totalQuestions} Math Question(s) Solved Step-by-Step`, margin + 6, cursorY + 10);

  cursorY += 24;

  // Meta information
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Document: ${data.fileName}`, margin, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 110, cursorY);
  cursorY += 5;
  if (data.studentName) {
    doc.text(`Processed for: ${data.studentName}`, margin, cursorY);
  }
  doc.text(`Total Questions Extracted & Solved: ${data.totalQuestions}`, margin + 110, cursorY);

  cursorY += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, margin + contentWidth, cursorY);
  cursorY += 8;

  // Iterate over each question in sorted order
  const sortedProblems = [...data.problems].sort((a, b) => a.questionNumber - b.questionNumber);

  sortedProblems.forEach((prob, pIdx) => {
    if (cursorY + 35 > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      cursorY = 20;
    }

    // Problem Header Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, cursorY - 4, contentWidth, 9, 2, 2, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`Question ${prob.questionNumber || pIdx + 1}: ${prob.classification || 'Mathematics'}`, margin + 4, cursorY + 2);

    cursorY += 10;

    // Question Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    cursorY = addWrappedText(doc, `Problem: ${prob.questionSnippet}`, margin, cursorY, contentWidth, 5);
    cursorY += 3;

    // Final Answer Badge
    if (prob.finalSolution) {
      doc.setFillColor(236, 253, 245); // Emerald 50
      doc.setDrawColor(167, 243, 208); // Emerald 200
      doc.roundedRect(margin, cursorY, contentWidth, 7, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(4, 120, 87);
      doc.text(`Final Answer: ${prob.finalSolution}`, margin + 4, cursorY + 4.5);
      cursorY += 10;
    }

    // Mathematical Procedure
    if (prob.fullStepProcedure && prob.fullStepProcedure.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229);
      doc.text('Step-by-Step Mathematical Procedure:', margin, cursorY);
      cursorY += 5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      prob.fullStepProcedure.forEach((step) => {
        if (cursorY + 8 > doc.internal.pageSize.getHeight() - 15) {
          doc.addPage();
          cursorY = 20;
        }
        cursorY = addWrappedText(doc, `  ${step}`, margin, cursorY, contentWidth, 4.5);
      });
      cursorY += 4;
    }

    // English Explanation
    if (prob.fullEnglishExplanation) {
      if (cursorY + 18 > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        cursorY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(79, 70, 229);
      doc.text('Explanation of Expressions in Understandable English:', margin, cursorY);
      cursorY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      cursorY = addWrappedText(doc, prob.fullEnglishExplanation, margin, cursorY, contentWidth, 4.5);
      cursorY += 6;
    }

    // Divider between problems
    if (pIdx < sortedProblems.length - 1) {
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cursorY, margin + contentWidth, cursorY);
      cursorY += 8;
    }
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MATH AI File Solutions • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const cleanName = data.fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = `solved_${cleanName || 'document'}_${Date.now()}.pdf`;
  doc.save(safeFilename);
}


