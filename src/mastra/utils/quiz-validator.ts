/**
 * Quiz Validator
 *
 * Validates quiz quality to prevent inappropriate or low-quality quiz questions.
 */

import type { Quiz, QuizQuestion } from "../types/game-types.ts";

export interface QuizValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a quiz object for quality and correctness
 */
export function validateQuiz(quiz: Quiz): QuizValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check quiz structure
  if (!quiz) {
    errors.push("Quiz is null or undefined");
    return { valid: false, errors, warnings };
  }

  if (!quiz.quizId || quiz.quizId.trim().length === 0) {
    errors.push("Quiz missing quizId");
  }

  if (!quiz.topic) {
    errors.push("Quiz missing topic");
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    errors.push("Quiz has no questions");
    return { valid: false, errors, warnings };
  }

  // Validate number of questions (should be 3-5)
  if (quiz.questions.length < 3) {
    warnings.push(
      `Quiz has only ${quiz.questions.length} questions (recommended: 3-5)`,
    );
  } else if (quiz.questions.length > 5) {
    warnings.push(
      `Quiz has ${quiz.questions.length} questions (recommended: 3-5)`,
    );
  }

  // Validate each question
  quiz.questions.forEach((question, idx) => {
    const questionNum = idx + 1;
    const questionErrors = validateQuestion(question, questionNum);
    errors.push(...questionErrors.errors);
    warnings.push(...questionErrors.warnings);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a single quiz question
 */
function validateQuestion(
  question: QuizQuestion,
  questionNum: number,
): QuizValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check question structure
  if (!question.questionId || question.questionId.trim().length === 0) {
    errors.push(`Question ${questionNum}: Missing questionId`);
  }

  if (!question.question || question.question.trim().length === 0) {
    errors.push(`Question ${questionNum}: Missing question text`);
  } else if (question.question.trim().length < 10) {
    warnings.push(
      `Question ${questionNum}: Question text is very short (${question.question.length} chars)`,
    );
  }

  // Check options
  if (!question.options || question.options.length !== 4) {
    errors.push(
      `Question ${questionNum}: Must have exactly 4 options (found ${question.options?.length || 0})`,
    );
  } else {
    // Validate each option
    question.options.forEach((option, optIdx) => {
      const optNum = optIdx + 1;

      if (!option || option.trim().length === 0) {
        errors.push(`Question ${questionNum}, Option ${optNum}: Empty option`);
      } else if (option.trim().length < 5) {
        warnings.push(
          `Question ${questionNum}, Option ${optNum}: Very short (${option.length} chars) - may not be specific enough`,
        );
      }

      // Check for generic/inappropriate phrases
      const genericPhrases = [
        "make drastic",
        "make immediate changes",
        "do nothing",
        "wait and see",
        "ignore it",
        "ignore this",
        "don't worry",
        "just wait",
      ];

      const optionLower = option.toLowerCase();
      genericPhrases.forEach((phrase) => {
        if (optionLower.includes(phrase)) {
          warnings.push(
            `Question ${questionNum}, Option ${optNum}: Contains generic phrase "${phrase}" - may not be topic-specific`,
          );
        }
      });

      // Check for very vague answers
      const vagueAnswers = ["yes", "no", "maybe", "kyllä", "ei", "ehkä"];
      if (vagueAnswers.includes(option.toLowerCase().trim())) {
        warnings.push(
          `Question ${questionNum}, Option ${optNum}: Too vague ("${option}") - should be more specific`,
        );
      }
    });
  }

  // Check correct answer index
  if (question.correctAnswer === undefined || question.correctAnswer === null) {
    errors.push(`Question ${questionNum}: Missing correctAnswer`);
  } else if (question.correctAnswer < 0 || question.correctAnswer > 3) {
    errors.push(
      `Question ${questionNum}: correctAnswer must be 0-3 (found ${question.correctAnswer})`,
    );
  }

  // Check explanation
  if (!question.explanation || question.explanation.trim().length === 0) {
    errors.push(`Question ${questionNum}: Missing explanation`);
  } else if (question.explanation.trim().length < 20) {
    warnings.push(
      `Question ${questionNum}: Explanation is very short (${question.explanation.length} chars) - may not be educational enough`,
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
