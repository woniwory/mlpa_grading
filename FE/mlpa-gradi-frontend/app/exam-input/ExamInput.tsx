"use client";

import React from "react";
import Link from "next/link";
import Button from "../components/Button";
import { useExamForm } from "../hooks/useExamForm";
import { ExamInfoForm } from "../components/exam-input/ExamInfoForm";
import { QuestionList } from "../components/exam-input/QuestionList";
import { FileUploadSection } from "../components/exam-input/FileUploadSection";
import { FloatingSidebar } from "../components/exam-input/FloatingSidebar";

const ExamInput: React.FC = () => {
    const {
        questions,
        setQuestions,
        examTitle,
        setExamTitle,
        examDate,
        setExamDate,
        isStudentResultEnabled,
        setIsStudentResultEnabled,
        attendanceFile,
        setAttendanceFile,
        answerSheetFiles,
        setAnswerSheetFiles,
        totalScore,
        totalSubCount,
        numberingPreview,
        addQuestion,
        removeQuestion,
        updateQuestion,
        addSubQuestion,
        removeSubQuestion,
        updateSubQuestion,
        insertSubQuestion,
        handleStartGrading,
        isLoading,
        loadingMessage,
    } = useExamForm();

    return (
        <div className="relative mx-auto w-[1152px] bg-white font-semibold">
            {/* 로고 영역 */}
            <Link href="/" className="absolute w-[165px] h-[43px] top-[17px] left-[10px] animate-fade-in-up block cursor-pointer z-50">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage: "url(/Gradi_logo.png)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }}
                />
            </Link>



            <div className="pt-[120px] px-6 pb-24 space-y-24 animate-fade-in-up">

                {/* 1. Exam Info */}
                <ExamInfoForm
                    examTitle={examTitle}
                    setExamTitle={setExamTitle}
                    examDate={examDate}
                    setExamDate={setExamDate}
                    isStudentResultEnabled={isStudentResultEnabled}
                    setIsStudentResultEnabled={setIsStudentResultEnabled}
                />

                {/* 2. Question List */}
                <QuestionList
                    questions={questions}
                    setQuestions={setQuestions}
                    numberingPreview={numberingPreview}
                    addQuestion={addQuestion}
                    removeQuestion={removeQuestion}
                    updateQuestion={updateQuestion}
                    addSubQuestion={addSubQuestion}
                    insertSubQuestion={insertSubQuestion}
                    removeSubQuestion={removeSubQuestion}
                    updateSubQuestion={updateSubQuestion}
                />

                {/* 3. File Uploads */}
                <FileUploadSection
                    attendanceFile={attendanceFile}
                    setAttendanceFile={setAttendanceFile}
                    answerSheetFiles={answerSheetFiles}
                    setAnswerSheetFiles={setAnswerSheetFiles}
                />

                {/* 4. Action Button */}
                <div className="mt-4 flex justify-center">
                    <button
                        onClick={handleStartGrading}
                        disabled={isLoading}
                        className={`
                            relative overflow-hidden
                            whitespace-nowrap w-[320px] px-6 py-5 text-xl font-semibold
                            bg-gradient-to-r from-[#AC5BF8] to-[#636ACF] 
                            rounded-lg text-white shadow-lg
                            transition-all duration-300 ease-in-out
                            ${isLoading
                                ? "cursor-wait opacity-90"
                                : "cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                            }
                        `}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-3">
                                {/* 로딩 스피너 */}
                                <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                <span>{loadingMessage || "처리 중..."}</span>
                            </div>
                        ) : (
                            "🚀 채점 시작하기"
                        )}

                        {/* 로딩 중 배경 애니메이션 */}
                        {isLoading && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
                                style={{ backgroundSize: '200% 100%' }}
                            />
                        )}
                    </button>
                </div>

                {/* 5. Floating Sidebar */}
                <FloatingSidebar
                    questions={questions}
                    totalScore={totalScore}
                    totalSubCount={totalSubCount}
                    addQuestion={addQuestion}
                    removeQuestion={removeQuestion}
                    addSubQuestion={addSubQuestion}
                    removeSubQuestion={removeSubQuestion}
                />
            </div>
        </div>
    );
};

export default ExamInput;
