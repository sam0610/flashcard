import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Atom, Zap, ChevronLeft, ChevronRight, RotateCw, CheckCircle2, XCircle, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { flashcardsData, Subject, Flashcard } from './data/flashcards';
import { GoogleGenAI, Type } from '@google/genai';

const STORAGE_KEY = 'igcse-flashcards-data';

export default function App() {
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          flashcards: parsed.flashcards || flashcardsData,
          knownCards: new Set<string>(parsed.knownCards || []),
          learningCards: new Set<string>(parsed.learningCards || []),
          totalAttempts: parsed.totalAttempts || { Biology: 0, Chemistry: 0, Physics: 0 },
          wrongAttempts: parsed.wrongAttempts || { Biology: 0, Chemistry: 0, Physics: 0 },
          currentSubject: parsed.currentSubject || 'Biology'
        };
      }
    } catch (e) {
      console.error("Failed to load save data", e);
    }
    return null;
  };

  const initialData = loadSavedData();

  const [currentSubject, setCurrentSubject] = useState<Subject>(initialData?.currentSubject || 'Biology');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(initialData?.knownCards || new Set());
  const [learningCards, setLearningCards] = useState<Set<string>>(initialData?.learningCards || new Set());
  const [flashcards, setFlashcards] = useState<Record<Subject, Flashcard[]>>(initialData?.flashcards || flashcardsData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [totalAttempts, setTotalAttempts] = useState<Record<Subject, number>>(initialData?.totalAttempts || { Biology: 0, Chemistry: 0, Physics: 0 });
  const [wrongAttempts, setWrongAttempts] = useState<Record<Subject, number>>(initialData?.wrongAttempts || { Biology: 0, Chemistry: 0, Physics: 0 });

  useEffect(() => {
    const dataToSave = {
      flashcards,
      knownCards: Array.from(knownCards),
      learningCards: Array.from(learningCards),
      totalAttempts,
      wrongAttempts,
      currentSubject
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [flashcards, knownCards, learningCards, totalAttempts, wrongAttempts, currentSubject]);

  useEffect(() => {
    const currentCards = flashcards[currentSubject];
    const currentCard = currentCards[currentIndex] || currentCards[0];
    if (currentCard && (knownCards.has(currentCard.id) || learningCards.has(currentCard.id))) {
      const available = currentCards.filter(c => !knownCards.has(c.id) && !learningCards.has(c.id));
      if (available.length > 0) {
        const randomIndex = Math.floor(Math.random() * available.length);
        setCurrentIndex(currentCards.findIndex(c => c.id === available[randomIndex].id));
      }
    }
  }, []);

  const cards = flashcards[currentSubject];
  const availableCards = cards.filter(c => !knownCards.has(c.id) && !learningCards.has(c.id));
  const isSubjectComplete = availableCards.length === 0;
  const currentCard = cards[currentIndex] || cards[0];

  const pickNextCard = (currentKnown: Set<string>, currentLearning: Set<string>, currentCards: Flashcard[] = cards) => {
    setIsFlipped(false);
    setTimeout(() => {
      const available = currentCards.filter(c => !currentKnown.has(c.id) && !currentLearning.has(c.id));
      if (available.length > 0) {
        let nextAvailable = available;
        if (available.length > 1 && currentCard) {
          nextAvailable = available.filter(c => c.id !== currentCard.id);
        }
        const randomIndex = Math.floor(Math.random() * nextAvailable.length);
        const nextCardId = nextAvailable[randomIndex].id;
        const nextIndex = currentCards.findIndex(c => c.id === nextCardId);
        setCurrentIndex(nextIndex);
      }
    }, 150);
  };

  const handleSubjectChange = (subject: Subject) => {
    setCurrentSubject(subject);
    setIsFlipped(false);
    setErrorMsg('');
    const subjCards = flashcards[subject];
    const available = subjCards.filter(c => !knownCards.has(c.id) && !learningCards.has(c.id));
    if (available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      setCurrentIndex(subjCards.findIndex(c => c.id === available[randomIndex].id));
    } else {
      setCurrentIndex(0);
    }
  };

  const skipCard = () => {
    pickNextCard(knownCards, learningCards);
  };

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const markAsKnown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newKnown = new Set(knownCards).add(currentCard.id);
    setKnownCards(newKnown);
    const newLearning = new Set(learningCards);
    newLearning.delete(currentCard.id);
    setLearningCards(newLearning);
    
    setTotalAttempts(prev => ({ ...prev, [currentSubject]: prev[currentSubject] + 1 }));
    pickNextCard(newKnown, newLearning);
  };

  const markAsLearning = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newKnown = new Set(knownCards);
    newKnown.delete(currentCard.id);
    setKnownCards(newKnown);
    const newLearning = new Set(learningCards).add(currentCard.id);
    setLearningCards(newLearning);
    
    setTotalAttempts(prev => ({ ...prev, [currentSubject]: prev[currentSubject] + 1 }));
    setWrongAttempts(prev => ({ ...prev, [currentSubject]: prev[currentSubject] + 1 }));
    pickNextCard(newKnown, newLearning);
  };

  const resetProgress = () => {
    setKnownCards(new Set());
    setLearningCards(new Set());
    setTotalAttempts({ Biology: 0, Chemistry: 0, Physics: 0 });
    setWrongAttempts({ Biology: 0, Chemistry: 0, Physics: 0 });
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(0);
    }, 150);
  };

  const generateNewQuestions = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const topics = { Biology: 'photosynthesis', Chemistry: 'atomic structure', Physics: 'velocity time graph' };
      const prompt = `Generate 5 new IGCSE flashcards for the subject ${currentSubject}. The topic is ${topics[currentSubject]}. Return a JSON array of objects with 'question' and 'answer' string properties. Make the questions different from standard basic ones, perhaps slightly more advanced or applied. All questions and answers MUST be in English.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING }
              },
              required: ["question", "answer"]
            }
          }
        }
      });

      const newCards = JSON.parse(response.text || '[]');
      const formattedCards: Flashcard[] = newCards.slice(0, 5).map((c: any, i: number) => ({
        id: `${currentSubject.charAt(0).toLowerCase()}-gen-${Date.now()}-${i}`,
        question: c.question,
        answer: c.answer
      }));

      setFlashcards(prev => {
        const newState = { ...prev, [currentSubject]: formattedCards };
        
        setTimeout(() => {
          setCurrentIndex(0);
          setIsFlipped(false);
        }, 150);
        
        return newState;
      });
    } catch (error) {
      console.error("Failed to generate questions:", error);
      setErrorMsg("Failed to generate new questions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const currentAllCards = Object.values(flashcards).flat();
  const totalCards = currentAllCards.length;
  const answeredCurrentCardsCount = currentAllCards.filter(c => knownCards.has(c.id) || learningCards.has(c.id)).length;
  const progress = totalCards > 0 ? (answeredCurrentCardsCount / totalCards) * 100 : 0;
  const subjectAnsweredCount = cards.filter(c => knownCards.has(c.id) || learningCards.has(c.id)).length;

  const currentTotalAttempts = totalAttempts[currentSubject];
  const currentWrongAttempts = wrongAttempts[currentSubject];
  const currentCorrectAttempts = currentTotalAttempts - currentWrongAttempts;

  const subjectConfig = {
    Biology: { icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100', activeBg: 'bg-green-600' },
    Chemistry: { icon: Atom, color: 'text-blue-600', bg: 'bg-blue-100', activeBg: 'bg-blue-600' },
    Physics: { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100', activeBg: 'bg-purple-600' },
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-800">IGCSE Flashcards</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-neutral-500 hidden sm:block">Overall Progress</div>
            <div className="w-24 sm:w-32 h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-neutral-800 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              onClick={resetProgress}
              className="ml-2 sm:ml-4 p-2 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-full transition-colors flex items-center gap-2"
              title="Reset Progress"
            >
              <RefreshCw size={18} />
              <span className="hidden sm:inline text-sm font-medium">Reset</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col">
        {/* Cumulative Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4 sm:p-6 mb-8 flex flex-wrap items-center justify-around gap-4 text-center">
          <div className="w-full text-center mb-2 sm:mb-0 sm:w-auto">
            <span className="text-sm font-bold text-neutral-400 uppercase tracking-widest">{currentSubject} Stats</span>
          </div>
          <div className="w-px h-12 bg-neutral-200 hidden sm:block"></div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-neutral-800">{currentTotalAttempts}</div>
            <div className="text-xs sm:text-sm font-medium text-neutral-500 uppercase tracking-wider mt-1">已問題數 (Total)</div>
          </div>
          <div className="w-px h-12 bg-neutral-200 hidden sm:block"></div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-green-600">{currentCorrectAttempts}</div>
            <div className="text-xs sm:text-sm font-medium text-neutral-500 uppercase tracking-wider mt-1">答對 (Correct)</div>
          </div>
          <div className="w-px h-12 bg-neutral-200 hidden sm:block"></div>
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-red-600">{currentWrongAttempts}</div>
            <div className="text-xs sm:text-sm font-medium text-neutral-500 uppercase tracking-wider mt-1">答錯 (Wrong)</div>
          </div>
        </div>

        {/* Subject Selector */}
        <div className="flex justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 flex-wrap">
          {(Object.keys(flashcards) as Subject[]).map((subject) => {
            const Icon = subjectConfig[subject].icon;
            const isActive = currentSubject === subject;
            const subjCards = flashcards[subject];
            const subjAnswered = subjCards.filter(c => knownCards.has(c.id) || learningCards.has(c.id)).length;
            
            return (
              <button
                key={subject}
                onClick={() => handleSubjectChange(subject)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-medium transition-all duration-200 ${
                  isActive 
                    ? `${subjectConfig[subject].activeBg} text-white shadow-md transform scale-105` 
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : subjectConfig[subject].color} />
                <span className="text-sm sm:text-base">{subject} ({subjAnswered}/{subjCards.length})</span>
              </button>
            );
          })}
        </div>

        {/* Flashcard Area */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto">
          <div className="w-full flex justify-between items-center mb-6 px-4">
            <span className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
              Card {currentIndex + 1} of {cards.length}
            </span>
            <span className="text-sm font-medium text-neutral-500">
              Answered: {subjectAnsweredCount}/{cards.length}
            </span>
          </div>

          {/* Card Container */}
          <div className="relative w-full aspect-[4/3] md:aspect-[3/2] perspective-1000">
            {isSubjectComplete ? (
              <div className="absolute inset-0 w-full h-full rounded-3xl shadow-lg bg-green-50 border-2 border-green-200 flex flex-col items-center justify-center p-8 text-center">
                <CheckCircle2 size={64} className="text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-green-800 mb-2">Round Complete!</h2>
                <p className="text-green-600 mb-6">You've answered all 5 questions. Would you like to generate 5 new cards?</p>
                {errorMsg && <div className="text-red-500 text-sm mb-3">{errorMsg}</div>}
                <button 
                  onClick={() => generateNewQuestions()} 
                  disabled={isGenerating}
                  className="px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isGenerating ? 'Generating...' : 'Generate 5 New Cards (AI)'}
                </button>
              </div>
            ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id + (isFlipped ? '-back' : '-front')}
                initial={{ rotateX: isFlipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: isFlipped ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                onClick={toggleFlip}
                className={`absolute inset-0 w-full h-full rounded-3xl shadow-lg cursor-pointer flex flex-col items-center justify-center p-6 sm:p-8 md:p-12 text-center border-2 ${
                  isFlipped 
                    ? 'bg-white border-neutral-200' 
                    : `${subjectConfig[currentSubject].bg} border-transparent`
                }`}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 text-neutral-400 flex gap-2">
                  {learningCards.has(currentCard.id) && !isFlipped && (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                      <AlertCircle size={12} /> Still Learning
                    </span>
                  )}
                  <RotateCw size={20} className="sm:w-6 sm:h-6" />
                </div>
                
                <span className={`text-xs sm:text-sm font-bold uppercase tracking-widest mb-4 sm:mb-6 ${
                  isFlipped ? 'text-neutral-400' : subjectConfig[currentSubject].color
                }`}>
                  {isFlipped ? 'Answer' : 'Question'}
                </span>
                
                <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium leading-tight ${
                  isFlipped ? 'text-neutral-800' : 'text-neutral-900'
                }`}>
                  {isFlipped ? currentCard.answer : currentCard.question}
                </h2>
              </motion.div>
            </AnimatePresence>
            )}
          </div>

          {/* Controls */}
          {!isSubjectComplete && (
            <div className="flex items-center justify-center w-full mt-8 sm:mt-10 gap-4 sm:gap-8">
              <button
                onClick={markAsLearning}
                className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 font-bold transition-colors shadow-sm hover:shadow"
              >
                <XCircle size={24} />
                <span className="text-base sm:text-lg">答錯 (Wrong)</span>
              </button>
              
              <button 
                onClick={skipCard}
                className="p-3 sm:p-4 rounded-full bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
                title="Skip to random card"
              >
                <RefreshCw size={24} />
              </button>

              <button
                onClick={markAsKnown}
                className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white border-2 border-green-200 text-green-600 hover:bg-green-50 font-bold transition-colors shadow-sm hover:shadow"
              >
                <CheckCircle2 size={24} />
                <span className="text-base sm:text-lg">答對 (Correct)</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
