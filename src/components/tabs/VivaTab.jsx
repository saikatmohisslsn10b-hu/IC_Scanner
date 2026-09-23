import React, { useState } from 'react';
import { GraduationCap, Play, CheckCircle2, XCircle, Trophy, Loader2, RotateCcw, Shuffle } from 'lucide-react';
import { generateVivaQuestions } from '../../services/gemini';

export default function VivaTab({ report }) {
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const startViva = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateVivaQuestions(report.identification.name, JSON.stringify({
        name: report.identification.name,
        number: report.identification.number,
        family: report.identification.family,
        pinout: report.pinout.table,
        specs: report.technicalProfile,
        applications: report.applications,
        logicInfo: report.logicInfo,
        testing: report.testing,
      }));
      setQuestions(result.questions);
      setAnswers(new Array(result.questions.length).fill(-1));
      setSubmitted(false);
      setAttemptCount(prev => prev + 1);
    } catch (e) {
      setError(e.message || 'Failed to generate questions');
    }
    setLoading(false);
  };

  const selectAnswer = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers(prev => { const next = [...prev]; next[qIdx] = optIdx; return next; });
  };

  const submitViva = () => {
    if (answers.includes(-1)) return;
    setSubmitted(true);
  };

  const score = submitted ? answers.reduce((acc, a, i) => acc + (a === questions[i].correctIndex ? 1 : 0), 0) : 0;
  const grade = submitted ? (score >= 9 ? 'A+' : score >= 8 ? 'A' : score >= 6 ? 'B' : score >= 4 ? 'C' : score >= 2 ? 'D' : 'F') : '';

  if (!questions && !loading) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-6">
          <GraduationCap size={28} className="text-primary-600" />
        </div>
        <h3 className="text-lg font-display font-bold text-slate-900 mb-2">Viva Preparation Mode</h3>
        <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
          Generate 10 unique MCQ questions about {report.identification.name} to test your knowledge before the lab viva.
          <br />
          <span className="text-xs text-slate-400 mt-2 block">7 questions about this IC + 3 basic electronics questions</span>
        </p>
        <button onClick={startViva} className="btn-primary">
          <Play size={16} /> Generate 10 Questions
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16">
        <Loader2 size={32} className="animate-spin text-primary-600 mb-4" />
        <p className="text-sm text-slate-500">Generating unique viva questions...</p>
        <p className="text-xs text-slate-400 mt-2">Creating fresh questions for attempt #{attemptCount + 1}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button onClick={startViva} className="btn-secondary text-sm"><RotateCcw size={14} /> Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-primary-600" />
          <span className="section-title !mb-0">Viva Examination — {report.identification.name}</span>
          {attemptCount > 0 && (
            <span className="badge bg-accent-50 text-accent-700 border border-accent-100 text-xs">
              Attempt #{attemptCount + 1}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!submitted && (
            <>
              <div className="flex items-center gap-1 text-xs text-slate-400 mr-2">
                <Shuffle size={12} />
                <span>Unique questions</span>
              </div>
              <button onClick={startViva} className="btn-secondary text-xs py-2 px-3">
                <RotateCcw size={12} /> New Set
              </button>
            </>
          )}
        </div>
      </div>

      {/* Question Distribution Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700 font-medium">
          📝 Question Distribution: <span className="font-bold">7 IC-specific</span> (about {report.identification.name}) + <span className="font-bold">3 Basic Electronics</span>
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qi) => {
          const isCorrect = submitted && answers[qi] === q.correctIndex;
          const isWrong = submitted && answers[qi] !== q.correctIndex && answers[qi] !== -1;
          const isICQuestion = qi < 7;

          return (
            <div key={qi} className={`p-4 rounded-xl border transition-all ${
              isCorrect ? 'bg-green-50 border-green-200' : isWrong ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-start gap-2 mb-3">
                <span className="text-primary-600 font-bold text-sm shrink-0">Q{qi + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{q.question}</p>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isICQuestion 
                      ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                      : 'bg-orange-100 text-orange-700 border border-orange-200'
                  }`}>
                    {isICQuestion ? '🔌 IC-Specific' : '📚 Basic Electronics'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => {
                  const isSelected = answers[qi] === oi;
                  const isCorrectOpt = submitted && oi === q.correctIndex;
                  return (
                    <button
                      key={oi}
                      onClick={() => selectAnswer(qi, oi)}
                      disabled={submitted}
                      className={`text-left p-3 rounded-lg border text-sm transition-all ${
                        isCorrectOpt ? 'bg-green-100 border-green-300 text-green-800 font-semibold'
                        : isWrong && isSelected ? 'bg-red-100 border-red-300 text-red-800'
                        : isSelected ? 'bg-primary-50 border-primary-300 text-primary-700 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className="font-mono text-xs mr-2 opacity-60">{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                      {isCorrectOpt && <CheckCircle2 size={14} className="inline ml-2 text-green-600" />}
                      {isWrong && isSelected && <XCircle size={14} className="inline ml-2 text-red-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit / Result */}
      {!submitted ? (
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400 mb-3">{answers.filter(a => a !== -1).length}/10 answered</p>
          <button onClick={submitViva} disabled={answers.includes(-1)} className="btn-primary disabled:opacity-50">
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="mt-6 p-6 bg-slate-900 rounded-2xl text-center text-white">
          <Trophy size={32} className="mx-auto mb-3 text-accent-400" />
          <p className="text-3xl font-display font-bold">{score}/10</p>
          <p className="text-lg font-display font-bold mt-1">Grade: <span className="text-accent-400">{grade}</span></p>
          <p className="text-xs text-slate-400 mt-2">
            {score >= 8 ? 'Excellent preparation!' : score >= 6 ? 'Good, but review the missed topics.' : 'Needs more study. Review the IC datasheet.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Attempt #{attemptCount + 1}</p>
          <button onClick={startViva} className="btn-primary mt-4 !bg-white !text-slate-900 hover:!bg-slate-100">
            <RotateCcw size={14} /> Try Again (New Questions)
          </button>
        </div>
      )}
    </div>
  );
}