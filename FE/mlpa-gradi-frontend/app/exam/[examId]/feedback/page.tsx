'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// --- MOCK DATA ---
const MOCK_FALLBACKS = [
    {
        id: 'fb-ox-1',
        studentId: '20201234',
        studentName: '김단국',
        questionNum: '3-1', // subquestion support
        answerType: 'OX',
        recognizedText: 'O',
        roiImageUrl: 'https://images.unsplash.com/photo-1627393100177-b4297e79a5be?q=80&w=600&h=200&auto=format&fit=crop',
        confidence: 0.38,
        status: 'pending'
    },
    {
        id: 'fb-1',
        studentId: '20201234',
        studentName: '김단국',
        questionNum: '1',
        answerType: 'MULTIPLE_CHOICE',
        recognizedText: '4',
        roiImageUrl: 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?q=80&w=600&h=200&auto=format&fit=crop',
        confidence: 0.42,
        status: 'pending'
    },
    {
        id: 'fb-2',
        studentId: '20201234',
        studentName: '김단국',
        questionNum: '2-2', // subquestion
        answerType: 'SHORT_ANSWER',
        recognizedText: '인공이능',
        roiImageUrl: 'https://images.unsplash.com/photo-1516414447565-b14be0adf13e?q=80&w=600&h=200&auto=format&fit=crop',
        confidence: 0.55,
        status: 'pending'
    },
    {
        id: 'fb-3',
        studentId: '20195678',
        studentName: '이광운',
        questionNum: '5',
        answerType: 'others',
        recognizedText: '인공지능은 컴퓨터 시스템이 인간의 지능 활동을 모방하도록 만드는 기술입니다. 기계 학습과 딥러닝을 포함하며...',
        roiImageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800&h=300&auto=format&fit=crop',
        confidence: 0.31,
        maxScore: 10,
        aiScore: 7,
        comment: '', // feedback comment
        status: 'pending'
    },
    {
        id: 'fb-4',
        studentId: '20210011',
        studentName: '박세종',
        questionNum: '6-1',
        answerType: 'others',
        recognizedText: '데이터를 분석하여 패턴을 찾아내고 예측을 수행하는 알고리즘의 집합입니다.',
        roiImageUrl: 'https://images.unsplash.com/photo-1515377062327-044cdead277a?q=80&w=800&h=300&auto=format&fit=crop',
        confidence: 0.28,
        maxScore: 10,
        aiScore: 5,
        comment: '근거 부족',
        status: 'pending'
    }
];

export default function IntegratedFeedbackPage() {
    const params = useParams();
    const router = useRouter();
    const [items, setItems] = useState(MOCK_FALLBACKS);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Zoom state
    const [zoomScale, setZoomScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const inputRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>([]);

    const oxFallbacks = items.filter(item => item.answerType === 'OX');
    const simpleFallbacks = items.filter(item => item.answerType !== 'others' && item.answerType !== 'OX');
    const descriptiveFallbacks = items.filter(item => item.answerType === 'others');

    // Unified list for focus management
    const allItems = [...oxFallbacks, ...simpleFallbacks, ...descriptiveFallbacks];

    const handleComplete = () => {
        alert('피드백이 저장되었습니다. 결과 페이지로 이동합니다.');
        router.push(`/exam/${params.examId}/grading/result`);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (zoomedImage) {
                if (e.key === 'Escape') setZoomedImage(null);
                return;
            }

            if (e.key === 'ArrowDown' || (e.key === 'Enter' && e.ctrlKey)) {
                e.preventDefault();
                const next = Math.min(focusedIndex + 1, allItems.length - 1);
                setFocusedIndex(next);
                inputRefs.current[next]?.focus();
                inputRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = Math.max(focusedIndex - 1, 0);
                setFocusedIndex(prev);
                inputRefs.current[prev]?.focus();
                inputRefs.current[prev]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [focusedIndex, allItems.length, zoomedImage]);

    // Zoom Handlers
    const resetZoom = useCallback(() => {
        setZoomScale(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    const handleZoomIn = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setZoomScale(prev => Math.min(prev + 0.5, 4));
    };

    const handleZoomOut = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setZoomScale(prev => {
            const next = Math.max(prev - 0.5, 1);
            if (next === 1) setPosition({ x: 0, y: 0 });
            return next;
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomScale <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || zoomScale <= 1) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-10">
                {/* Header */}
                <header className="flex flex-col gap-2 border-b border-gray-200 pb-6">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        🎯 통합 피드백 및 검토
                    </h1>
                    <div className="flex justify-between items-end">
                        <p className="text-gray-500">
                            AI 인식 결과를 확인하고 필요한 항목은 직접 수정하거나 채점해주세요.
                        </p>
                        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 hidden sm:block">
                            <span className="text-xs font-bold text-gray-400 uppercase mr-2">이동</span>
                            <span className="text-sm font-black text-[#636ACF]">↑ ↓ 화살표 / Ctrl+Enter</span>
                        </div>
                    </div>
                </header>

                {/* --- 상단 1: OX 섹션 --- */}
                {oxFallbacks.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-[#10B981] pl-4">
                            <h2 className="text-lg font-extrabold text-[#1E293B]">✅ OX 문제 확인</h2>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold">
                                {oxFallbacks.length}건
                            </span>
                        </div>

                        <div className="flex flex-col gap-4">
                            {oxFallbacks.map((item, idx) => (
                                <SimpleFallbackCard
                                    key={item.id}
                                    data={item}
                                    isFocused={focusedIndex === idx}
                                    onFocus={() => setFocusedIndex(idx)}
                                    inputRef={(el: HTMLInputElement | HTMLTextAreaElement | null) => { inputRefs.current[idx] = el; }}
                                    onImageClick={() => {
                                        setZoomedImage(item.roiImageUrl);
                                        resetZoom();
                                    }}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* --- 상단 2: 객관식/단답형 섹션 --- */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-[#3B82F6] pl-4">
                        <h2 className="text-lg font-extrabold text-[#1E293B]">📌 객관식 및 단답형</h2>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold">
                            {simpleFallbacks.length}건
                        </span>
                    </div>

                    <div className="flex flex-col gap-4">
                        {simpleFallbacks.map((item, idx) => {
                            const globalIdx = oxFallbacks.length + idx;
                            return (
                                <SimpleFallbackCard
                                    key={item.id}
                                    data={item}
                                    isFocused={focusedIndex === globalIdx}
                                    onFocus={() => setFocusedIndex(globalIdx)}
                                    inputRef={(el) => { inputRefs.current[globalIdx] = el; }}
                                    onImageClick={() => {
                                        setZoomedImage(item.roiImageUrl);
                                        resetZoom();
                                    }}
                                />
                            );
                        })}
                    </div>
                </section>

                {/* --- 하단: 서술형 섹션 --- */}
                <section className="space-y-6 pt-6">
                    <div className="flex items-center gap-3 border-l-4 border-[#A855F7] pl-4">
                        <h2 className="text-lg font-extrabold text-[#1E293B]">✍️ 서술형 채점</h2>
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-bold">
                            {descriptiveFallbacks.length}건
                        </span>
                    </div>

                    <div className="space-y-8">
                        {descriptiveFallbacks.map((item, idx) => {
                            const globalIdx = oxFallbacks.length + simpleFallbacks.length + idx;
                            return (
                                <DescriptiveFallbackCard
                                    key={item.id}
                                    data={item}
                                    isFocused={focusedIndex === globalIdx}
                                    onFocus={() => setFocusedIndex(globalIdx)}
                                    inputRef={(el) => { inputRefs.current[globalIdx] = el; }}
                                    onImageClick={() => {
                                        setZoomedImage(item.roiImageUrl);
                                        resetZoom();
                                    }}
                                />
                            );
                        })}
                    </div>
                </section>

                {/* 검토 완료 버튼 - 맨 아래 배치 */}
                <div className="flex justify-center pt-10 pb-20">
                    <button
                        onClick={handleComplete}
                        className="w-full sm:w-[400px] px-8 py-5 bg-gradient-to-r from-[#AC5BF8] to-[#636ACF] text-white rounded-2xl font-black text-xl shadow-2xl hover:shadow-[#AC5BF8]/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                        모든 검토 완료 및 확정
                    </button>
                </div>

                <footer className="text-center text-gray-300 text-xs pb-10">
                    Gradi AI System • Fallback Verification Mode
                </footer>
            </div>

            {/* Image Zoom Modal */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 cursor-pointer"
                    onClick={() => setZoomedImage(null)}
                >
                    <div
                        className={`relative w-[90vw] h-[75vh] overflow-hidden rounded-2xl bg-black/50 flex items-center justify-center border-4 border-transparent
                            ${zoomScale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"}`}
                        style={{
                            borderImage: 'linear-gradient(to right, #AC5BF8, #636ACF) 1',
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <img
                            src={zoomedImage}
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoomScale})`,
                                transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                            }}
                            className="max-w-full max-h-full object-contain pointer-events-none"
                            alt="Large View"
                        />
                    </div>

                    {/* Controls with Purple Gradient */}
                    <div className="mt-8 flex items-center gap-8 bg-gradient-to-r from-[#AC5BF8]/20 to-[#636ACF]/20 backdrop-blur-xl px-10 py-5 rounded-full border border-white/10 shadow-2xl shadow-[#AC5BF8]/10" onClick={e => e.stopPropagation()}>
                        <button onClick={handleZoomOut} className="text-white text-3xl font-light hover:scale-125 transition-transform cursor-pointer">－</button>
                        <div className="text-center min-w-[60px]">
                            <p className="text-white font-black text-xl">{Math.round(zoomScale * 100)}%</p>
                            <button onClick={resetZoom} className="text-[10px] text-[#AC5BF8] hover:text-white font-bold tracking-widest mt-1 cursor-pointer">RESET</button>
                        </div>
                        <button onClick={handleZoomIn} className="text-white text-3xl font-light hover:scale-125 transition-transform cursor-pointer">＋</button>
                    </div>

                    <button
                        className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-[#AC5BF8] to-[#636ACF] text-white text-xl hover:scale-110 transition-all shadow-lg cursor-pointer"
                        onClick={() => setZoomedImage(null)}
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}

// --- 공통 컴포넌트: OX/객관/단답 ---
function SimpleFallbackCard({ data, isFocused, onFocus, inputRef, onImageClick }: { data: any, isFocused: boolean, onFocus: () => void, inputRef: any, onImageClick: () => void }) {
    const [val, setVal] = useState(data.recognizedText);
    const [verdict, setVerdict] = useState<'none' | 'o' | 'x'>(data.answerType === 'OX' ? (data.recognizedText === 'O' ? 'o' : 'x') : 'none');

    const isOX = data.answerType === 'OX';

    return (
        <div
            className={`group bg-white rounded-3xl p-6 flex flex-col items-stretch gap-6 border-2 transition-all duration-300 cursor-pointer
                ${isFocused ? 'border-[#AC5BF8] shadow-2xl shadow-purple-50 scale-[1.01]' : 'border-transparent shadow-sm'}
            `}
            onClick={onFocus}
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs translate-y-[-1px] 
                        ${isFocused ? 'bg-[#AC5BF8] text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {data.questionNum}
                    </div>
                    <span className="font-bold text-gray-800">{data.studentName} ({data.studentId})</span>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-[#AC5BF8] uppercase tracking-widest">
                        {isOX ? 'OX TYPE' : 'SHORT ANSWER'}
                    </span>
                </div>
            </div>

            {/* 이미지 확대 (서술형 스타일) */}
            <div
                className="w-full h-40 bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-center cursor-zoom-in group-hover:bg-gray-100 transition-colors"
                onClick={(e) => { e.stopPropagation(); onImageClick(); }}
            >
                <img src={data.roiImageUrl} className="max-h-full mix-blend-multiply transition-transform group-hover:scale-105" alt="ROI" />
            </div>

            <div className="flex flex-col gap-3">
                {isOX && (
                    <p className="text-xs font-bold text-gray-400 pl-1 italic">학생이 답안지에 표시한 내용을 선택해주세요:</p>
                )}
                <div className="flex items-center gap-4">
                    {!isOX ? (
                        // 단답형인 경우 텍스트 인풋만 제공
                        <div className="relative flex-1">
                            <input
                                ref={inputRef}
                                value={val}
                                onFocus={onFocus}
                                onChange={(e) => setVal(e.target.value)}
                                placeholder="인식된 답안을 확인하거나 수정하세요"
                                className="w-full px-6 py-4 font-black text-2xl rounded-2xl outline-none border-2 border-gray-100 bg-gray-50 focus:border-[#AC5BF8] focus:bg-white transition-all shadow-inner"
                            />
                        </div>
                    ) : (
                        // OX형인 경우 "정답/오답" 텍스트 없이 버튼만 크게
                        <div className="flex-1 flex gap-4 h-20">
                            <button
                                ref={inputRef as any}
                                onClick={(e) => { e.stopPropagation(); setVerdict('o'); setVal('O'); }}
                                onFocus={onFocus}
                                className={`flex-1 rounded-2xl font-black text-3xl transition-all cursor-pointer flex items-center justify-center
                                    ${verdict === 'o' ? 'bg-[#10B981] text-white shadow-2xl scale-[1.02]' : 'bg-white border-2 border-gray-100 text-gray-300 hover:bg-green-50 hover:text-[#10B981]'}
                                `}
                            >
                                O
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setVerdict('x'); setVal('X'); }}
                                onFocus={onFocus}
                                className={`flex-1 rounded-2xl font-black text-3xl transition-all cursor-pointer flex items-center justify-center
                                    ${verdict === 'x' ? 'bg-[#EF4444] text-white shadow-2xl scale-[1.02]' : 'bg-white border-2 border-gray-100 text-gray-300 hover:bg-red-50 hover:text-[#EF4444]'}
                                `}
                            >
                                X
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- 서술형 컴포넌트 ---
function DescriptiveFallbackCard({ data, isFocused, onFocus, inputRef, onImageClick }: { data: any, isFocused: boolean, onFocus: () => void, inputRef: any, onImageClick: () => void }) {
    const [score, setScore] = useState(0);

    return (
        <div
            className={`bg-white rounded-3xl border-2 transition-all duration-300 overflow-hidden cursor-pointer
                ${isFocused ? 'border-[#AC5BF8] shadow-2xl scale-[1.01]' : 'border-transparent shadow-sm'}
            `}
            onClick={onFocus}
        >
            {/* 상단 바 */}
            <div className={`px-6 py-4 flex justify-between items-center ${isFocused ? 'bg-purple-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#AC5BF8] to-[#636ACF] text-white flex items-center justify-center font-black text-sm shadow-md">
                        {data.questionNum}
                    </div>
                    <span className="font-bold text-gray-800">{data.studentName} ({data.studentId})</span>
                </div>
                <div className="flex gap-4 items-center">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">OTHERS TYPE</span>
                    <div className="h-4 w-px bg-gray-200" />
                    <span className="text-sm font-black text-gray-900">배점 {data.maxScore}점</span>
                </div>
            </div>

            <div className="p-6 flex flex-col gap-8">
                {/* 1. 이미지 (중앙 배치) */}
                <div className="w-full flex justify-center">
                    <div
                        className="w-full md:w-2/3 bg-gray-100 rounded-2xl p-6 border border-gray-100 flex items-center justify-center cursor-zoom-in h-60"
                        onClick={(e) => { e.stopPropagation(); onImageClick(); }}
                    >
                        <img src={data.roiImageUrl} className="max-h-full mix-blend-multiply transition-transform hover:scale-105" alt="Answer" />
                    </div>
                </div>

                {/* 2. 피드백 코멘트 (Why? 항목) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">📝 감점 사유 및 피드백 (코멘트)</label>
                    <textarea
                        ref={inputRef as any}
                        onFocus={onFocus}
                        className="w-full bg-yellow-50/30 border-2 border-dashed border-yellow-100 rounded-2xl p-4 text-sm outline-none focus:border-yellow-200 focus:bg-yellow-50/50 transition-all h-24"
                        placeholder="이 답안에 대한 피드백을 남겨주세요 (예: 불완전한 문장, 키워드 누락 등)"
                        defaultValue={data.comment || ""}
                    />
                </div>

                {/* 3. 최종 점수 조절 바 */}
                <div className="bg-gradient-to-r from-[#FAF5FF] to-white rounded-2xl p-5 flex items-center justify-between border border-purple-100 shadow-inner">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-[#636ACF] uppercase tracking-widest">FINAL SCORE</span>
                        <span className="text-xs text-gray-400 italic">점수를 채점해주세요</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden p-1">
                            <button onClick={(e) => { e.stopPropagation(); setScore(Math.max(0, score - 0.5)); }} className="w-12 h-12 flex items-center justify-center font-bold text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer text-xl">－</button>
                            <input
                                type="number"
                                value={score}
                                readOnly
                                className="w-16 text-center font-black text-2xl text-gray-900 select-none outline-none"
                            />
                            <button onClick={(e) => { e.stopPropagation(); setScore(Math.min(data.maxScore, score + 0.5)); }} className="w-12 h-12 flex items-center justify-center font-bold text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer text-xl">＋</button>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-lg font-black text-gray-800">{data.maxScore}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase italic">Max</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
