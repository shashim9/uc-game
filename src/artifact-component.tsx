import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, Volume2, VolumeX, Settings, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import startersFile from '@/data/starters.json';
import bonusesFile from '@/data/bonuses.json';

interface Question {
  question: string;
  answer: string;
  points: number;
}

interface BonusSet {
  topic: string;
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

interface GameStatistics {
  id: number;
  date: string;
  avgBuzzTime: number;
  score: number;
  incorrectBuzzes: number;
  correctStarters: number;
  totalStarters: number;
  correctBonuses: number;
  totalBonuses: number;
}

interface StatsDisplayProps {
  className?: string;
}

type GameState = 'ready' | 'playing' | 'answer' | 'bonus' | 'session';

const SAMPLE_STARTERS: Question[] = startersFile.starters;
const SAMPLE_BONUSES: BonusSet[] = bonusesFile.bonuses;
const STARTER_TIME_LIMIT = 60000; // 60 seconds

const UniversityChallengeGame: React.FC = () => {
  const [starters, setStarters] = useState<Question[]>([...SAMPLE_STARTERS]);
  const [bonuses, setBonuses] = useState<BonusSet[]>([...SAMPLE_BONUSES]);
  const [gameState, setGameState] = useState<GameState>('ready');
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [currentBonus, setCurrentBonus] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [buzzTimes, setBuzzTimes] = useState<number[]>([]);
  const [showBonusAnswer, setShowBonusAnswer] = useState<boolean>(false);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);
  const [statistics, setStatistics] = useState<GameStatistics[]>(() => {
    const savedStats = localStorage.getItem('universityChallenge_stats');
    return savedStats ? JSON.parse(savedStats) : [];
  });
  const [incorrectBuzzes, setIncorrectBuzzes] = useState<number>(0);
  const [correctStarters, setCorrectStarters] = useState<number>(0);
  const [totalStarters, setTotalStarters] = useState<number>(0);
  const [correctBonuses, setCorrectBonuses] = useState<number>(0);
  const [totalBonuses, setTotalBonuses] = useState<number>(0);
  const [currentBonusSet, setCurrentBonusSet] = useState<BonusSet | null>(null);
  
  const buzzerSound = useRef<HTMLAudioElement | null>(null);
  const startTime = useRef<number | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    buzzerSound.current = new Audio('data:audio/wav;base64,UklGRnQGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YU8GAACA');
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'ready' && buzzTimes.length > 0) {
      const timestamp = new Date().toISOString();
      const avgBuzzTime = getAverageBuzzTime();
      const newStat = { 
        id: Date.now(),  // Unique identifier for each session
        date: timestamp,
        avgBuzzTime, 
        score, 
        incorrectBuzzes, 
        correctStarters, 
        totalStarters, 
        correctBonuses, 
        totalBonuses 
      };
      setStatistics((prevStats) => {
        const updatedStats = [...prevStats, newStat];  // Keep all sessions
        localStorage.setItem('universityChallenge_stats', JSON.stringify(updatedStats));
        return updatedStats;
      });
    }
  }, [gameState]);

  const startGame = () => {
    const shuffledStarters = [...SAMPLE_STARTERS].sort(() => Math.random() - 0.5);
    setGameState('playing');
    setScore(0);
    setCurrentQuestion(0);
    setShowAnswer(false);
    setBuzzTimes([]);
    setIncorrectBuzzes(0);
    setCorrectStarters(0);
    setTotalStarters(0);
    setCorrectBonuses(0);
    setTotalBonuses(0);
    setStarters(shuffledStarters);
    setBonuses([...SAMPLE_BONUSES]);
    startTimer();
  };

  const StatsDisplay: React.FC<StatsDisplayProps> = ({ className = "" }) => (
    <div className={`space-y-1 ${className}`}>
      <p className="text-sm text-gray-600">
        Starter Questions: {correctStarters}/{totalStarters} correct
        {totalStarters > 0 && ` (${Math.round((correctStarters / totalStarters) * 100)}%)`}
      </p>
      <p className="text-sm text-gray-600">
        Bonus Questions: {correctBonuses}/{totalBonuses} correct
        {totalBonuses > 0 && ` (${Math.round((correctBonuses / totalBonuses) * 100)}%)`}
      </p>
    </div>
  );
  
  const startTimer = () => {
    startTime.current = Date.now();
    setTimerRunning(true);
    setElapsedTime(0);

    timerInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      setElapsedTime(elapsed);

      if (elapsed >= STARTER_TIME_LIMIT) {
        clearInterval(timerInterval.current);
        setTimerRunning(false);
        handleTimeUp();
      }
    }, 10);
  };

  const handleTimeUp = () => {
    setGameState('answer');
    setShowAnswer(true);
    setTotalStarters((prevTotal) => prevTotal + 1);
  };

  const handleBuzz = () => {
    if (gameState !== 'playing') return;

    clearInterval(timerInterval.current);
    setTimerRunning(false);

    if (soundEnabled && buzzerSound.current) {
      buzzerSound.current.play();
    }

    const buzzTime = Date.now() - startTime.current;
    setBuzzTimes((prevBuzzTimes) => [...prevBuzzTimes, buzzTime]);

    setShowAnswer(true);
    setGameState('answer');
    setTotalStarters((prevTotal) => prevTotal + 1);
  };

  const handleAnswer = (correct: boolean): void => {
    if (!starters[currentQuestion]) {
      console.error("Invalid current question or starters array:", { currentQuestion, starters });
      return;
    }

    if (correct) {
      setScore((prevScore) => prevScore + starters[currentQuestion].points);
      setCorrectStarters((prevCorrect) => prevCorrect + 1);

      if (bonuses.length > 0) {
        const randomIndex = Math.floor(Math.random() * bonuses.length);
        const selectedBonus = bonuses[randomIndex];
        setBonuses((prevBonuses) => prevBonuses.filter((_, index) => index !== randomIndex));
        setCurrentBonusSet(selectedBonus);

        setGameState('bonus');
        setCurrentBonus(0);
        setShowBonusAnswer(false);
      } else {
        handleNextQuestion();
      }
    } else {
      setIncorrectBuzzes((prevIncorrect) => prevIncorrect + 1);
      handleNextStep();
    }

    setStarters((prevStarters) =>
      prevStarters.filter((_, index) => index !== currentQuestion)
    );
  };

  const handleBonusAnswer = (correct: boolean): void => {
    if (bonuses.length === 0) return;

    if (correct) {
      setScore((prevScore) => prevScore + 5);
      setCorrectBonuses((prevCorrectBonuses) => prevCorrectBonuses + 1);
    }

    setTotalBonuses((prevTotalBonuses) => prevTotalBonuses + 1);

    if (currentBonus < 2) {
      setCurrentBonus((prevBonus) => prevBonus + 1);
      setShowBonusAnswer(false);
    } else {
      handleNextStep();
    }
  };

  const handleNextStep = () => {
    setGameState('session');
  };

  const handleNextQuestion = () => {
    if (starters.length > 0) {
      setCurrentQuestion(0);
      setShowAnswer(false);
      setShowBonusAnswer(false);
      setGameState('playing');
      startTimer();
    } else {
      setGameState('ready');
    }
  };

  const endSession = () => {
    setGameState('ready');
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const getAverageBuzzTime = () => {
    if (buzzTimes.length === 0) return 0;
    return buzzTimes.reduce((a, b) => a + b, 0) / buzzTimes.length;
  };

  const formatTime = (ms: number): string => {
      return (ms / 1000).toFixed(2);
  };

  const renderChart = () => {
    if (statistics.length === 0) return null;

    const validStats = statistics.filter(stat => stat.id && stat.date);

    const displayedStats = showAllHistory ? validStats : validStats.slice(-10);
    const chartData = displayedStats.map(stat => ({
      date: new Date(stat.date).toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
        hour12: true
      }),
      avgBuzzTime: stat.avgBuzzTime / 1000,
      score: stat.score,
      startersCorrect: stat.totalStarters ? (stat.correctStarters / stat.totalStarters) * 100 : 0,
      bonusesCorrect: stat.totalBonuses ? (stat.correctBonuses / stat.totalBonuses) * 100 : 0
    }));

    return (
      <div className="mt-8 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="avgBuzzTime" name="Avg Buzz Time (s)" stroke="#4B92DB" />
            <Line type="monotone" dataKey="score" name="Score" stroke="#9966FF" />
            <Line type="monotone" dataKey="startersCorrect" name="% Starters Correct" stroke="#FF9F40" />
            <Line type="monotone" dataKey="bonusesCorrect" name="% Bonuses Correct" stroke="#FF6384" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>University Challenge Practice</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={toggleSound}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {gameState === 'ready' ? (
          <div className="text-center space-y-4">
            <p className="text-lg">Ready to test your University Challenge knowledge?</p>
            {buzzTimes.length > 0 && (
              <div className="text-sm text-gray-600">
                <p>Average buzz time: {formatTime(getAverageBuzzTime())}s</p>
                <p>Fastest buzz: {formatTime(Math.min(...buzzTimes))}s</p>
              </div>
            )}
            <Button onClick={startGame}>Start Game</Button>
            {statistics.length > 0 && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="text-sm"
                >
                  Show {showAllHistory ? 'Recent' : 'All'} History
                </Button>
                <div className="text-sm text-gray-500 mt-1">
                  Showing {showAllHistory ? 'all' : 'last 10'} sessions ({statistics.length} total)
                </div>
              </div>
            )}
            {renderChart()}
          </div>
        ) : gameState === 'session' ? (
          <div className="text-center space-y-4">
            <StatsDisplay className="mb-6" />
            <Button onClick={handleNextQuestion}>Continue with Next Starter</Button>
            <Button variant="outline" onClick={endSession}>End Session</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Score: {score}</span>
              <div className="flex items-center gap-4">
                {timerRunning && (
                  <span className="text-sm">
                    Time: {formatTime(elapsedTime)}s
                  </span>
                )}
                <StatsDisplay />
              </div>
            </div>

            {gameState === 'playing' && (
              <div>
                <div className="bg-slate-100 p-6 rounded-lg">
                  <p className="text-lg">{starters[currentQuestion].question}</p>
                </div>
                <div className="w-full bg-gray-200 h-2 mt-4 rounded-full">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${(elapsedTime / STARTER_TIME_LIMIT) * 100}%` }}
                  />
                </div>
                <Button 
                  size="lg"
                  className="w-full py-8 text-xl mt-4"
                  onClick={handleBuzz}
                >
                  BUZZ
                </Button>
              </div>
            )}

            {gameState === 'answer' && (
              <div className="space-y-4">
                <div className="bg-green-100 p-4 rounded-lg">
                  <p className="font-semibold">Answer: {starters[currentQuestion].answer}</p>
                  <p className="text-sm text-gray-600">Buzz Time: {formatTime(buzzTimes[buzzTimes.length - 1])}s</p>
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => handleAnswer(true)} className="flex-1">
                    Correct
                  </Button>
                  <Button onClick={() => handleAnswer(false)} className="flex-1" variant="outline">
                    Incorrect
                  </Button>
                </div>
              </div>
            )}

            {gameState === 'bonus' && (
              <div className="space-y-4">
                {currentBonusSet ? (
                  <>
                    <div className="bg-blue-100 p-4 rounded-lg">
                      <p className="font-semibold mb-2">Bonus Topic: {currentBonusSet.topic}</p>
                      <p>{currentBonusSet.questions[currentBonus].question}</p>
                    </div>
                    {showBonusAnswer ? (
                      <div className="bg-green-100 p-4 rounded-lg">
                        <p className="font-semibold">
                          Answer: {currentBonusSet.questions[currentBonus].answer}
                        </p>
                      </div>
                    ) : (
                      <Button onClick={() => setShowBonusAnswer(true)} className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        Show Answer
                      </Button>
                    )}
                    {showBonusAnswer && (
                      <div className="flex gap-4">
                        <Button onClick={() => handleBonusAnswer(true)} className="flex-1">
                          Correct
                        </Button>
                        <Button onClick={() => handleBonusAnswer(false)} className="flex-1" variant="outline">
                          Incorrect
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-lg">No more bonus questions available. Ending session...</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UniversityChallengeGame
