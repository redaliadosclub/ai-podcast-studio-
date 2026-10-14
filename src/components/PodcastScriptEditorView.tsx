import React, { useState, useRef } from 'react';
import { PodcastScript } from '../types';
import { Sparkles, Wand2, Volume2, ArrowRight, Check, RefreshCw, FileText, Bot, Clock, Heart, Smile, Sparkle, Tag, CheckCircle2 } from 'lucide-react';

interface PodcastScriptEditorViewProps {
  currentScriptText: string;
  setCurrentScriptText: (text: string) => void;
  onSendToProduction: (text: string, title: string) => void;
}

export const PodcastScriptEditorView: React.FC<PodcastScriptEditorViewProps> = ({
  currentScriptText,
  setCurrentScriptText,
  onSendToProduction,
}) => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Conversacional, cercano y reflexivo');
  const [format, setFormat] = useState('Monólogo reflexivo y divulgativo');
  const [hostName, setHostName] = useState('Anfitrión');
  const [durationMinutes, setDurationMinutes] = useState(2);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Gemini Sentiment Analysis State
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [sentimentResult, setSentimentResult] = useState<{
    overallSentiment: string;
    dominantEmotion: string;
    sentimentScore: string;
    suggestedMarkers: Array<{ marker: string; context: string; reason: string }>;
    scriptWithSuggestedMarkers?: string;
  } | null>(null);

  const [scriptTitle, setScriptTitle] = useState('Episodio Piloto');
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Insert tag at current cursor position
  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentScriptText;

    const newText = text.substring(0, start) + tag + text.substring(end);
    setCurrentScriptText(newText);

    // restore cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  const handleGenerateScript = async () => {
    setErrorMessage(null);
    if (!topic.trim()) {
      setErrorMessage('Por favor ingresa un tema o idea para el episodio antes de generar.');
      return;
    }

    try {
      setIsGenerating(true);
      setAnalysisResult(null);

      const res = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          tone,
          format,
          hostName,
          durationMinutes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al generar el guion');
      }

      const data = await res.json();
      setGeneratedData(data);
      if (data.title) setScriptTitle(data.title);
      if (data.fullScript) {
        setCurrentScriptText(data.fullScript);
      }
    } catch (err: any) {
      setErrorMessage('No se pudo generar el guion: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeProsody = async () => {
    setErrorMessage(null);
    if (!currentScriptText.trim()) {
      setErrorMessage('Ingresa o genera un texto antes de solicitar el análisis de prosodia.');
      return;
    }

    try {
      setIsAnalyzing(true);
      const res = await fetch('/api/script/analyze-prosody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptText: currentScriptText }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al analizar la prosodia');
      }

      const data = await res.json();
      setAnalysisResult(data);
    } catch (err: any) {
      setErrorMessage('Error en el análisis de prosodia: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeSentiment = async () => {
    setErrorMessage(null);
    if (!currentScriptText.trim()) {
      setErrorMessage('Ingresa o genera un texto antes de solicitar el análisis de sentimiento.');
      return;
    }

    try {
      setIsAnalyzingSentiment(true);
      const res = await fetch('/api/script/analyze-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptText: currentScriptText }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al analizar el sentimiento');
      }

      const data = await res.json();
      setSentimentResult(data);
    } catch (err: any) {
      setErrorMessage('Error en el análisis de sentimiento: ' + err.message);
    } finally {
      setIsAnalyzingSentiment(false);
    }
  };

  const charCount = currentScriptText.length;
  // Estimate speaking time (~130 words per minute in Spanish)
  const wordCount = currentScriptText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round((wordCount / 130) * 60);
  const estMins = Math.floor(estimatedSeconds / 60);
  const estSecs = estimatedSeconds % 60;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl p-6">
        <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2">
          FASE 4 · REDACCIÓN CON MARCAS PROSÓDICAS
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Editor de Guiones y Dirección de Entonación
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
          Crea guiones enriquecidos con puntuación dramática y directivas de voz. La IA estructurará
          el contenido para que tu voz clonada suene fresca, fluida y con respiraciones naturales.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-xs text-amber-200 flex items-center justify-between gap-3">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-amber-400 hover:text-amber-200 text-xs underline shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 2-Column Workspace: Left Generator Form & Tips / Right Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: AI Podcast Script Generator (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">
                Generador de Guion con IA
              </h2>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Tema o Idea del Episodio:
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej: Por qué la disciplina supera al talento, anécdota personal y tres lecciones prácticas..."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder-neutral-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Tono de la Locución:
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Conversacional, cercano y reflexivo">
                    Conversacional, cercano y reflexivo
                  </option>
                  <option value="Enérgico, motivador y directo">
                    Enérgico, motivador y directo
                  </option>
                  <option value="Storytelling íntimo y misterioso">
                    Storytelling íntimo y misterioso
                  </option>
                  <option value="Divulgativo, didáctico y claro">
                    Divulgativo, didáctico y claro
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Duración Estimada:
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={1}>~1 minuto (Breve)</option>
                    <option value={2}>~2 minutos (Ideal)</option>
                    <option value={3}>~3 minutos (Completo)</option>
                    <option value={5}>~5 minutos (Profundo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Tu Nombre / Alias:
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateScript}
                disabled={isGenerating}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Redactando con Dirección Vocal...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Generar Guion Estructurado</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Gemini Sentiment & Emotional Markers Card */}
          {sentimentResult && (
            <div className="border border-indigo-800/60 bg-gradient-to-b from-indigo-950/30 to-neutral-900 rounded-xl p-5 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-900/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Análisis Emocional (Gemini)
                  </h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 font-medium">
                  {sentimentResult.dominantEmotion}
                </span>
              </div>

              <div className="text-xs space-y-2.5 text-neutral-300">
                <div className="p-2.5 bg-neutral-950/80 rounded border border-neutral-800">
                  <span className="text-neutral-500 text-[11px] font-medium block mb-0.5">
                    Arco Emocional y Tono:
                  </span>
                  <p className="text-neutral-200 leading-relaxed font-normal">
                    {sentimentResult.overallSentiment}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider block">
                    Marcadores Sugeridos por Gemini:
                  </span>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {sentimentResult.suggestedMarkers?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-neutral-950 border border-neutral-800/80 hover:border-indigo-800/60 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/50">
                            {item.marker}
                          </span>
                          <button
                            type="button"
                            onClick={() => insertTag(`${item.marker} `)}
                            className="text-[11px] px-2 py-0.5 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium flex items-center gap-1 transition-colors"
                          >
                            <Tag className="w-3 h-3" />
                            Insertar
                          </button>
                        </div>
                        {item.context && (
                          <p className="text-[11px] text-neutral-300 italic">
                            &ldquo;{item.context}&rdquo;
                          </p>
                        )}
                        <p className="text-[10px] text-neutral-400 leading-normal">
                          {item.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {sentimentResult.scriptWithSuggestedMarkers && (
                  <button
                    onClick={() => setCurrentScriptText(sentimentResult.scriptWithSuggestedMarkers!)}
                    className="w-full mt-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aplicar Todos los Marcadores al Guion
                  </button>
                )}
              </div>
            </div>
          )}

          {/* AI Prosody Analysis Result Card */}
          {analysisResult && (
            <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                <Bot className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Diagnóstico de Prosodia & Técnica
                </h3>
              </div>

              <div className="text-xs space-y-2 text-neutral-300">
                <div>
                  <span className="text-neutral-500 font-medium block">Ritmo y Cadencia:</span>
                  <p className="mt-0.5 leading-relaxed">{analysisResult.pacingAdvice}</p>
                </div>

                <div>
                  <span className="text-neutral-500 font-medium block">Puntos de Inflexión:</span>
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-neutral-400">
                    {analysisResult.inflectionPoints?.map((pt: string, i: number) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-neutral-500 font-medium block">Respiraciones Clave:</span>
                  <p className="mt-0.5 leading-relaxed">{analysisResult.breathingNotes}</p>
                </div>

                {analysisResult.elevenLabsSettings && (
                  <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 text-[11px] font-mono text-indigo-400">
                    Estabilidad: {analysisResult.elevenLabsSettings.recommendedStability}% ·
                    Claridad: {analysisResult.elevenLabsSettings.recommendedClarity}%
                  </div>
                )}

                {analysisResult.improvedScript && (
                  <button
                    onClick={() => setCurrentScriptText(analysisResult.improvedScript)}
                    className="w-full mt-2 py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs transition-colors"
                  >
                    Aplicar Texto Optimizado al Editor
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Main Editor & Prosody Toolbar (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-5 space-y-4">
            {/* Title & Stats Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
              <input
                type="text"
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
                placeholder="Título del Episodio"
                className="text-base font-bold text-white bg-transparent border-none focus:outline-none placeholder-neutral-600"
              />

              <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 tabular-nums">
                <span>{charCount} caracteres</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  ~{estMins}m {estSecs}s
                </span>
              </div>
            </div>

            {/* Prosody & Emotion Tags Toolbar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Marcadores de Entonación & Prosodia al Cursor:
                </span>
                <span className="text-[10px] text-neutral-500 hidden sm:inline">
                  Haz clic para insertar en el texto
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => insertTag('[Emocionado] ')}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-950 hover:bg-neutral-800 border border-amber-800/70 text-amber-300 font-mono transition-colors font-semibold"
                  title="Expresión de emoción alta y entusiasmo"
                >
                  [Emocionado]
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('[Reflexivo] ')}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-950 hover:bg-neutral-800 border border-indigo-800/70 text-indigo-300 font-mono transition-colors font-semibold"
                  title="Tono pausado, profundo y meditativo"
                >
                  [Reflexivo]
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('[Enérgico] ')}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-950 hover:bg-neutral-800 border border-emerald-800/70 text-emerald-300 font-mono transition-colors font-semibold"
                  title="Fuerza vocal e impulso conversacional"
                >
                  [Enérgico]
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('[Susurrado] ')}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-950 hover:bg-neutral-800 border border-pink-800/70 text-pink-300 font-mono transition-colors font-semibold"
                  title="Confidencia íntima y suave"
                >
                  [Susurrado]
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('[Cálido] ')}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-950 hover:bg-neutral-800 border border-rose-800/70 text-rose-300 font-mono transition-colors font-semibold"
                  title="Cercanía empática"
                >
                  [Cálido]
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('... ')}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono transition-colors"
                  title="Pausa dramática o de pensamiento"
                >
                  ... (Pausa 0.5s)
                </button>
                <button
                  type="button"
                  onClick={() => insertTag(' -- ')}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono transition-colors"
                  title="Inciso o cambio de tono"
                >
                  -- (Inciso)
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('[Pausa reflexiva 1s] ')}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-indigo-400 font-mono transition-colors"
                >
                  [Pausa 1s]
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('&lt;breath&gt; ')}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-cyan-400 font-mono transition-colors"
                >
                  &lt;breath&gt;
                </button>
                <button
                  type="button"
                  onClick={() => insertTag('&lt;laugh&gt; ')}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-yellow-400 font-mono transition-colors"
                >
                  &lt;laugh&gt;
                </button>
              </div>
            </div>

            {/* Main Textarea */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={currentScriptText}
                onChange={(e) => setCurrentScriptText(e.target.value)}
                placeholder="Escribe tu guion aquí o haz clic en 'Generar Guion Estructurado' para comenzar..."
                rows={14}
                className="w-full p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-sm leading-relaxed text-neutral-100 placeholder-neutral-600 focus:border-indigo-500 focus:outline-none font-mono selection:bg-indigo-900"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAnalyzeSentiment}
                  disabled={isAnalyzingSentiment || !currentScriptText.trim()}
                  className="py-2 px-3.5 rounded-lg border border-indigo-700/80 bg-indigo-950/40 hover:bg-indigo-900/50 text-xs font-semibold text-indigo-200 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                  title="Analiza el sentimiento con Gemini y sugiere marcadores emocionales como [Emocionado], [Reflexivo]"
                >
                  {isAnalyzingSentiment ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span>Analizar Sentimientos (Gemini)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAnalyzeProsody}
                  disabled={isAnalyzing || !currentScriptText.trim()}
                  className="py-2 px-3 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-xs font-medium text-neutral-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                  <span>Prosodia Técnica</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onSendToProduction(currentScriptText, scriptTitle)}
                disabled={!currentScriptText.trim()}
                className="py-2.5 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm ml-auto"
              >
                <span>Confirmar Guion y Continuar al Paso 5 (Master Final)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
