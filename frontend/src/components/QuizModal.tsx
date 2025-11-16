import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { CheckCircle2, XCircle, Trophy, Award } from "lucide-react";

interface QuizQuestion {
  questionId: string;
  question: string;
  options: string[];
  correctAnswer: number; // index
  explanation: string;
}

interface Quiz {
  quizId: string;
  topic: string;
  questions: QuizQuestion[];
}

interface QuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz;
  onComplete?: (score: number, correctCount: number) => void;
}

export function QuizModal({
  open,
  onOpenChange,
  quiz,
  onComplete,
}: QuizModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Format quiz topic name for display (convert underscores to spaces and capitalize)
  const formatTopicName = (topic: string): string => {
    return topic
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Don't render if quiz is null or has no questions
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return null;
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const hasAnswered = selectedAnswers[currentQuestionIndex] !== undefined;
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  const handleSelectAnswer = (optionIndex: number) => {
    if (hasAnswered) return;

    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: optionIndex,
    });
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Calculate score
      const correctCount = quiz.questions.reduce((count, question, idx) => {
        return (
          count + (selectedAnswers[idx] === question.correctAnswer ? 1 : 0)
        );
      }, 0);
      const score = (correctCount / quiz.questions.length) * 10; // 0-10 scale

      setQuizCompleted(true);
      if (onComplete) {
        onComplete(score, correctCount);
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowExplanation(false);
    }
  };

  const calculateScore = () => {
    const correctCount = quiz.questions.reduce((count, question, idx) => {
      return count + (selectedAnswers[idx] === question.correctAnswer ? 1 : 0);
    }, 0);
    return {
      correctCount,
      total: quiz.questions.length,
      percentage: (correctCount / quiz.questions.length) * 100,
      score: (correctCount / quiz.questions.length) * 10,
    };
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowExplanation(false);
    setQuizCompleted(false);
  };

  if (quizCompleted) {
    const results = calculateScore();

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl h-[90vh] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <DialogHeader
            className="px-6 py-5 border-b flex-shrink-0"
            style={{ borderColor: "var(--border)" }}
          >
            <DialogTitle
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "var(--text-xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--card-foreground)",
              }}
            >
              Quiz Results
            </DialogTitle>
            <DialogDescription style={{ display: "none" }}>
              Your quiz results
            </DialogDescription>
          </DialogHeader>

          <ScrollArea 
            className="flex-1 min-h-0" 
            style={{ maxHeight: "calc(90vh - 80px)" }}
          >
            <div className="px-6 py-6 space-y-6">
              {/* Score Display */}
              <div
                className="p-6 rounded-lg border text-center"
                style={{
                  backgroundColor: "var(--muted)",
                  borderColor: "var(--border)",
                }}
              >
                <Trophy
                  className="w-16 h-16 mx-auto mb-4"
                  style={{
                    color:
                      results.percentage >= 80
                        ? "var(--chart-1)"
                        : results.percentage >= 60
                          ? "var(--chart-4)"
                          : "var(--chart-3)",
                  }}
                />
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-4xl)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--card-foreground)",
                    marginBottom: "var(--spacing-2)",
                  }}
                >
                  {results.correctCount}/{results.total}
                </p>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {results.percentage.toFixed(0)}% Correct
                </p>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--font-weight-semibold)",
                    color:
                      results.percentage >= 80
                        ? "var(--chart-1)"
                        : results.percentage >= 60
                          ? "var(--chart-4)"
                          : "var(--chart-3)",
                    marginTop: "var(--spacing-2)",
                  }}
                >
                  Score: {Math.round(results.score)}/10
                </p>
              </div>

              {/* Review Questions */}
              <div>
                <h3
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                    marginBottom: "var(--spacing-3)",
                  }}
                >
                  Question Review
                </h3>
                <div className="space-y-4">
                  {quiz.questions.map((question, idx) => {
                    const selectedAnswer = selectedAnswers[idx];
                    const isCorrect = selectedAnswer === question.correctAnswer;

                    return (
                      <div
                        key={question.questionId}
                        className="p-4 rounded-lg border"
                        style={{
                          backgroundColor: "var(--muted)",
                          borderColor: isCorrect
                            ? "var(--chart-1)"
                            : "var(--chart-2)",
                          borderWidth: "2px",
                        }}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          {isCorrect ? (
                            <CheckCircle2
                              className="w-5 h-5 mt-0.5 flex-shrink-0"
                              style={{ color: "var(--chart-1)" }}
                            />
                          ) : (
                            <XCircle
                              className="w-5 h-5 mt-0.5 flex-shrink-0"
                              style={{ color: "var(--chart-2)" }}
                            />
                          )}
                          <div className="flex-1">
                            <p
                              style={{
                                fontFamily: "Inter, sans-serif",
                                fontSize: "var(--text-sm)",
                                fontWeight: "var(--font-weight-semibold)",
                                color: "var(--card-foreground)",
                                marginBottom: "var(--spacing-2)",
                              }}
                            >
                              {idx + 1}. {question.question}
                            </p>
                            <p
                              style={{
                                fontFamily: "Inter, sans-serif",
                                fontSize: "var(--text-sm)",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              Your answer:{" "}
                              <span
                                style={{
                                  color: isCorrect
                                    ? "var(--chart-1)"
                                    : "var(--chart-2)",
                                  fontWeight: "var(--font-weight-medium)",
                                }}
                              >
                                {question.options[selectedAnswer]}
                              </span>
                            </p>
                            {!isCorrect && (
                              <p
                                style={{
                                  fontFamily: "Inter, sans-serif",
                                  fontSize: "var(--text-sm)",
                                  color: "var(--muted-foreground)",
                                  marginTop: "var(--spacing-1)",
                                }}
                              >
                                Correct answer:{" "}
                                <span
                                  style={{
                                    color: "var(--chart-1)",
                                    fontWeight: "var(--font-weight-medium)",
                                  }}
                                >
                                  {question.options[question.correctAnswer]}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bonuses */}
              {results.percentage >= 80 && (
                <div
                  className="p-5 rounded-lg border"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderColor: "var(--primary)",
                    borderWidth: "2px",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Award
                      className="w-6 h-6"
                      style={{ color: "var(--primary)" }}
                    />
                    <div>
                      <h4
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-base)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--card-foreground)",
                          marginBottom: "var(--spacing-1)",
                        }}
                      >
                        Skill Bonus Earned!
                      </h4>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: "var(--text-sm)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        Great performance! Your skill level has improved.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={resetQuiz}
                  className="transition-all duration-200"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    padding: "var(--spacing-2) var(--spacing-4)",
                    borderRadius: "var(--radius)",
                    backgroundColor: "var(--muted)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--card)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--muted)";
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Retake Quiz
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="transition-all duration-200"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    padding: "var(--spacing-2) var(--spacing-4)",
                    borderRadius: "var(--radius)",
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(127, 86, 217, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl h-[90vh] max-h-[90vh] p-0 flex flex-col gap-0"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <DialogHeader
          className="px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <DialogTitle
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "var(--text-xl)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--card-foreground)",
            }}
          >
            Quiz: {formatTopicName(quiz.topic)}
          </DialogTitle>
          <DialogDescription style={{ display: "none" }}>
            Test your knowledge on {formatTopicName(quiz.topic)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-6 space-y-6">
            {/* Progress Bar */}
            <div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--muted)" }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`,
                    backgroundColor: "var(--primary)",
                  }}
                />
              </div>
            </div>

            {/* Question */}
            <div>
              <h3
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--card-foreground)",
                  marginBottom: "2rem",
                  lineHeight: "1.6",
                }}
              >
                {currentQuestion.question}
              </h3>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected =
                    selectedAnswers[currentQuestionIndex] === idx;
                  const isCorrect = idx === currentQuestion.correctAnswer;
                  const showResult = hasAnswered && showExplanation;

                  let borderColor = "var(--border)";
                  let backgroundColor = "var(--card)";

                  if (showResult) {
                    if (isSelected && isCorrect) {
                      borderColor = "#22c55e"; // Green for correct
                      backgroundColor = "rgba(34, 197, 94, 0.1)";
                    } else if (isSelected && !isCorrect) {
                      borderColor = "#ef4444"; // Red for wrong
                      backgroundColor = "rgba(239, 68, 68, 0.1)";
                    } else if (isCorrect) {
                      borderColor = "#22c55e"; // Green for correct answer
                      backgroundColor = "rgba(34, 197, 94, 0.1)";
                    }
                  } else if (isSelected) {
                    borderColor = "var(--primary)";
                    backgroundColor = "var(--muted)";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      disabled={hasAnswered}
                      className="w-full p-4 rounded-lg border text-left transition-all duration-200"
                      style={{
                        backgroundColor,
                        borderColor,
                        borderWidth: "2px",
                        cursor: hasAnswered ? "default" : "pointer",
                        opacity:
                          hasAnswered && !isSelected && !isCorrect ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!hasAnswered) {
                          e.currentTarget.style.backgroundColor = "var(--muted)";
                          e.currentTarget.style.borderColor = "var(--primary)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(127, 86, 217, 0.15)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!hasAnswered) {
                          e.currentTarget.style.backgroundColor = backgroundColor;
                          e.currentTarget.style.borderColor = borderColor;
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {showResult && (isSelected || isCorrect) && (
                          <div className="flex-shrink-0">
                            {isSelected && isCorrect ? (
                              <CheckCircle2
                                className="w-5 h-5"
                                style={{ color: "#22c55e" }}
                              />
                            ) : isSelected && !isCorrect ? (
                              <XCircle
                                className="w-5 h-5"
                                style={{ color: "#ef4444" }}
                              />
                            ) : isCorrect ? (
                              <CheckCircle2
                                className="w-5 h-5"
                                style={{ color: "#22c55e" }}
                              />
                            ) : null}
                          </div>
                        )}
                        <span
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "var(--text-sm)",
                            color: "var(--card-foreground)",
                          }}
                        >
                          {option}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: "rgba(127, 86, 217, 0.1)",
                  borderColor: "var(--primary)",
                  borderWidth: "2px",
                }}
              >
                <h4
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--card-foreground)",
                    marginBottom: "var(--spacing-2)",
                  }}
                >
                  Explanation
                </h4>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    color: "var(--foreground)",
                    lineHeight: "1.6",
                  }}
                >
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Next Button */}
            {hasAnswered && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleNext}
                  className="transition-all duration-200"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    padding: "0.75rem 2rem",
                    borderRadius: "var(--radius)",
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    border: "none",
                    cursor: "pointer",
                  }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--primary)";
                  e.currentTarget.style.opacity = "0.9";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(127, 86, 217, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--primary)";
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {isLastQuestion ? "See Results" : "Next Question →"}
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
