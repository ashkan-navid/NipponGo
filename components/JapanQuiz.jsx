'use client';

import { useState, useMemo, useCallback } from 'react';
import { RotateCcw, Trophy, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import QUIZ_QUESTIONS from '../lib/quizQuestions';
import Confetti from './Confetti';

const QUIZ_SIZE = 10; // questions per round
const CATEGORIES = [...new Set(QUIZ_QUESTIONS.map(q => q.category))];

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function JapanQuiz() {
    const [selectedCategory, setSelectedCategory] = useState(null); // null = all
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selected, setSelected] = useState(null); // option index
    const [isRevealed, setIsRevealed] = useState(false);
    const [score, setScore] = useState(0);
    const [quizDone, setQuizDone] = useState(false);
    const [confettiTrigger, setConfettiTrigger] = useState(0);

    const questions = useMemo(() => {
        const pool = selectedCategory
            ? QUIZ_QUESTIONS.filter(q => q.category === selectedCategory)
            : QUIZ_QUESTIONS;
        return shuffleArray(pool).slice(0, QUIZ_SIZE);
    }, [selectedCategory]);

    const question = questions[currentIndex];

    const handleAnswer = useCallback((optionIndex) => {
        if (isRevealed) return;
        setSelected(optionIndex);
        setIsRevealed(true);
        if (optionIndex === question.correct) {
            setScore(prev => prev + 1);
        }
    }, [isRevealed, question]);

    const handleNext = useCallback(() => {
        if (currentIndex + 1 >= questions.length) {
            setQuizDone(true);
            if (score + (selected === question.correct ? 1 : 0) >= questions.length * 0.8) {
                setConfettiTrigger(prev => prev + 1);
            }
        } else {
            setCurrentIndex(prev => prev + 1);
            setSelected(null);
            setIsRevealed(false);
        }
    }, [currentIndex, questions.length, score, selected, question]);

    const resetQuiz = useCallback(() => {
        setCurrentIndex(0);
        setSelected(null);
        setIsRevealed(false);
        setScore(0);
        setQuizDone(false);
        setSelectedCategory(null);
    }, []);

    const startQuiz = useCallback((category) => {
        setSelectedCategory(category);
        setCurrentIndex(0);
        setSelected(null);
        setIsRevealed(false);
        setScore(0);
        setQuizDone(false);
    }, []);

    // Category selection screen
    if (!quizDone && currentIndex === 0 && !isRevealed && selectedCategory === null && selected === null) {
        return (
            <div className="p-4 pb-8">
                <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white mb-1">🎌 Japan-Quiz</h2>
                <p className="text-sm text-ios-gray-500 mb-6">Teste dein Japan-Wissen!</p>

                <div className="space-y-3">
                    <button
                        onClick={() => startQuiz(null)}
                        className="w-full p-4 bg-gradient-to-br from-rose-500 to-orange-400 text-white
                                 rounded-ios-xl shadow-ios text-left transition-all active:scale-[0.98]"
                    >
                        <p className="font-bold text-lg">Alle Kategorien</p>
                        <p className="text-sm text-white/80">{QUIZ_QUESTIONS.length} Fragen, {QUIZ_SIZE} zufällig</p>
                    </button>

                    {CATEGORIES.map(cat => {
                        const count = QUIZ_QUESTIONS.filter(q => q.category === cat).length;
                        const icons = { Kultur: '⛩️', Essen: '🍜', Transport: '🚄', Geografie: '🗾', Reisetipps: '✈️' };
                        return (
                            <button
                                key={cat}
                                onClick={() => startQuiz(cat)}
                                className="w-full flex items-center gap-4 p-4 bg-white dark:bg-ios-gray-800
                                         rounded-ios-xl shadow-ios text-left transition-all active:scale-[0.98]
                                         border border-ios-gray-100 dark:border-ios-gray-700"
                            >
                                <span className="text-2xl">{icons[cat] || '📝'}</span>
                                <div className="flex-1">
                                    <p className="font-semibold text-ios-gray-950 dark:text-white">{cat}</p>
                                    <p className="text-xs text-ios-gray-500">{count} Fragen</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-ios-gray-400" />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Results screen
    if (quizDone) {
        const percentage = Math.round((score / questions.length) * 100);
        const emoji = percentage >= 80 ? '🏆' : percentage >= 60 ? '🎉' : percentage >= 40 ? '😊' : '📚';
        const message = percentage >= 80 ? 'Japan-Experte!' : percentage >= 60 ? 'Gut gemacht!' : percentage >= 40 ? 'Nicht schlecht!' : 'Weiter üben!';

        return (
            <div className="p-4 pb-8 text-center">
                <Confetti trigger={confettiTrigger} />
                <div className="text-6xl mb-4">{emoji}</div>
                <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white mb-2">{message}</h2>
                <p className="text-lg text-ios-gray-600 dark:text-ios-gray-400 mb-1">
                    <span className="font-bold text-ios-blue">{score}</span> von <span className="font-bold">{questions.length}</span> richtig
                </p>
                <p className="text-sm text-ios-gray-500 mb-8">{percentage}%</p>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={resetQuiz}
                        className="flex items-center gap-2 px-5 py-3 bg-ios-blue text-white
                                 font-semibold rounded-ios-xl shadow-ios transition-all active:scale-95"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Nochmal spielen
                    </button>
                </div>
            </div>
        );
    }

    // Question screen
    return (
        <div className="p-4 pb-8">
            <Confetti trigger={confettiTrigger} />

            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-semibold text-ios-gray-500">
                    {currentIndex + 1}/{questions.length}
                </span>
                <div className="flex-1 h-1.5 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-ios-blue rounded-full transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
                <span className="text-xs font-bold text-ios-blue">
                    <Trophy className="w-3.5 h-3.5 inline mr-0.5" />{score}
                </span>
            </div>

            {/* Category badge */}
            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full
                          bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-600 dark:text-ios-gray-400 mb-3">
                {question.category}
            </span>

            {/* Question */}
            <h3 className="text-lg font-bold text-ios-gray-950 dark:text-white mb-5 leading-snug">
                {question.question}
            </h3>

            {/* Options */}
            <div className="space-y-2.5 mb-6">
                {question.options.map((option, idx) => {
                    let className = 'w-full p-4 rounded-ios-xl text-left font-medium transition-all ';
                    if (isRevealed) {
                        if (idx === question.correct) {
                            className += 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-400';
                        } else if (idx === selected && idx !== question.correct) {
                            className += 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-2 border-red-400';
                        } else {
                            className += 'bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-400 border border-ios-gray-200 dark:border-ios-gray-700';
                        }
                    } else {
                        className += 'bg-white dark:bg-ios-gray-800 text-ios-gray-950 dark:text-white border border-ios-gray-200 dark:border-ios-gray-700 active:scale-[0.98] shadow-ios';
                    }

                    return (
                        <button key={idx} onClick={() => handleAnswer(idx)} className={className} disabled={isRevealed}>
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-ios-gray-200 dark:bg-ios-gray-700
                                              flex items-center justify-center text-xs font-bold shrink-0">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span>{option}</span>
                                {isRevealed && idx === question.correct && <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />}
                                {isRevealed && idx === selected && idx !== question.correct && <XCircle className="w-5 h-5 text-red-500 ml-auto" />}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Explanation + Next */}
            {isRevealed && (
                <div className="animate-fade-in">
                    <div className="p-3 bg-ios-blue/10 dark:bg-ios-blue/20 rounded-ios-lg mb-4">
                        <p className="text-sm text-ios-gray-700 dark:text-ios-gray-300">{question.explanation}</p>
                    </div>
                    <button
                        onClick={handleNext}
                        className="w-full py-3.5 bg-ios-blue text-white font-semibold rounded-ios-xl
                                 shadow-ios transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {currentIndex + 1 >= questions.length ? 'Ergebnis anzeigen' : 'Nächste Frage'}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
