import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSettings } from './config';
import { analyzeIC } from './services/aiProvider';
import { generateReportPDF, generateLabRecordPDF } from './services/pdfExport';
import Navbar from './components/Navbar';
import ApiKeyGate from './components/ApiKeyGate';
import HeroUpload from './components/HeroUpload';
import AnalysisLoader from './components/AnalysisLoader';
import ReportShell from './components/ReportShell';
import HistoryPanel from './components/HistoryPanel';

export default function App() {
  const [apiKeyReady, setApiKeyReady] = useState(() => !!getSettings().apiKey);
  const [currentProvider, setCurrentProvider] = useState(() => getSettings().provider || 'gemini');
  const [image, setImage] = useState(null);
  const [report, setReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ic_scan_history') || '[]'); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const reportRef = useRef(null);

  useEffect(() => { localStorage.setItem('ic_scan_history', JSON.stringify(history)); }, [history]);
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  useEffect(() => {
    let stream = null;
    if (cameraActive) {
      (async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
          });
          if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        } catch {
          setError('Camera access denied. Check permissions.');
          setCameraActive(false);
        }
      })();
    }
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [cameraActive]);

  const processImage = useCallback(async (base64, mimeType = 'image/jpeg') => {
    setImage(base64);
    setReport(null);
    setError(null);
    setIsAnalyzing(true);
    setChatOpen(false);
    try {
      const result = await analyzeIC(base64, mimeType);
      setReport(result);
      setHistory(prev => [{
        id: Date.now().toString(), timestamp: Date.now(),
        name: result.identification?.name || 'Unknown IC', image: base64, report: result
      }, ...prev].slice(0, 20));
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    } catch (e) {
      // Show the ACTUAL error — no override, no guessing
      const msg = e.message || 'Unknown error occurred.';
      console.error('[App] Analysis failed:', msg);
      setError(msg);
    }
    setIsAnalyzing(false);
  }, []);

  const handleFileSelect = (base64, mimeType) => processImage(base64, mimeType);

  const handleCapture = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && videoRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      setCameraActive(false);
      processImage(canvasRef.current.toDataURL('image/jpeg'));
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  };

  const handlePdf = async () => {
    if (!report) return;
    setIsGeneratingPdf(true);
    try { generateReportPDF(report); } catch (e) { setError('PDF failed: ' + e.message); }
    setIsGeneratingPdf(false);
  };

  const handleLabPdf = async () => {
    if (!report) return;
    setIsGeneratingPdf(true);
    try { generateLabRecordPDF(report); } catch (e) { setError('Lab PDF failed: ' + e.message); }
    setIsGeneratingPdf(false);
  };

  const handleHistorySelect = (item) => {
    setReport(item.report);
    setImage(item.image);
    setShowHistory(false);
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  };

  const handleClearHistory = () => { setHistory([]); localStorage.removeItem('ic_scan_history'); };
  const newScan = () => { setReport(null); setImage(null); setError(null); setChatOpen(false); };

  const handleResetProvider = () => {
    localStorage.removeItem('ic_provider_settings');
    setApiKeyReady(false);
  };

  if (!apiKeyReady) return <ApiKeyGate onReady={(s) => { setApiKeyReady(true); setCurrentProvider(s.provider || 'gemini'); }} />;

  return (
    <div className="min-h-screen bg-bg">
      <Navbar
        onHistory={() => setShowHistory(true)}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        provider={currentProvider}
        onResetProvider={handleResetProvider}
      />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-20">
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-up">
            <span className="text-red-600 text-sm leading-relaxed flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs font-semibold shrink-0 ml-2">✕</button>
          </div>
        )}

        {isGeneratingPdf && (
          <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-600">Generating PDF...</p>
          </div>
        )}

        {!report && !isAnalyzing && !cameraActive && (
          <HeroUpload onFileSelect={handleFileSelect} onCameraClick={() => setCameraActive(true)} isAnalyzing={isAnalyzing} />
        )}

        {cameraActive && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex-1 relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 sm:w-80 sm:h-80 border-2 border-primary-400/50 rounded-2xl relative">
                  <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-primary-500 rounded-tl-lg" />
                  <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-primary-500 rounded-tr-lg" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-primary-500 rounded-bl-lg" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-primary-500 rounded-br-lg" />
                </div>
              </div>
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Live</span>
              </div>
            </div>
            <div className="py-8 flex justify-center gap-6 bg-black">
              <button onClick={handleCapture} className="w-16 h-16 bg-white rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-2xl">
                <div className="w-12 h-12 border-4 border-slate-200 rounded-full" />
              </button>
              <button onClick={() => setCameraActive(false)} className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform">✕</button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {isAnalyzing && <AnalysisLoader />}

        {report && !isAnalyzing && (
          <div ref={reportRef} className="mt-6">
            <ReportShell
              report={report} image={image} onNewScan={newScan}
              onPdf={handlePdf} onLabPdf={handleLabPdf}
              isGenerating={isGeneratingPdf} chatOpen={chatOpen} setChatOpen={setChatOpen}
            />
          </div>
        )}
      </main>

      {showHistory && (
        <HistoryPanel history={history} onClose={() => setShowHistory(false)}
          onSelect={handleHistorySelect} onClear={handleClearHistory} />
      )}
    </div>
  );
}