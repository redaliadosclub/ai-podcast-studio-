import React, { useState } from 'react';
import { Sliders, HelpCircle, Check, ArrowRight, Lightbulb, Mic, BookOpen, AlertCircle } from 'lucide-react';

interface ElevenLabsGuideViewProps {
  onGoToTeleprompter: () => void;
  onGoToEditor: () => void;
}

export const ElevenLabsGuideView: React.FC<ElevenLabsGuideViewProps> = ({
  onGoToTeleprompter,
  onGoToEditor,
}) => {
  const [simStability, setSimStability] = useState(42);
  const [simSimilarity, setSimSimilarity] = useState(82);
  const [simStyle, setSimStyle] = useState(12);

  const getStabilityInsight = (val: number) => {
    if (val < 30) {
      return {
        tag: 'Inestable / Muy Errático',
        color: 'text-amber-400',
        desc: 'La voz tendrá variaciones emocionales extremas e impredecibles. Puede cambiar de tono de forma abrupta entre oraciones.',
      };
    } else if (val <= 50) {
      return {
        tag: 'Punto Óptimo para Podcasts (Recomendado: 35-50%)',
        color: 'text-emerald-400',
        desc: 'Permite que la entonación suba y baje de forma orgánica como en una charla real. Elimina el efecto "robot" o voz de GPS.',
      };
    } else if (val <= 70) {
      return {
        tag: 'Moderadamente Rígido (Lectura Corporativa)',
        color: 'text-neutral-300',
        desc: 'Adecuado para noticias breves o instrucciones paso a paso, pero pierde espontaneidad emocional.',
      };
    } else {
      return {
        tag: 'Plano / Robótico (Poco Expresivo)',
        color: 'text-red-400',
        desc: 'Al fijar la estabilidad tan alta, la IA elimina las inflexiones humanas y suena como una voz sintetizada tradicional.',
      };
    }
  };

  const stabilityInsight = getStabilityInsight(simStability);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl p-6">
        <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2">
          FASE 3 · MASTERCLASS DE ENTONACIÓN NATURAL
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Cómo Configurar ElevenLabs para que Hable como Tú
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
          Clonar tu voz es solo el 50% de la ecuación. El otro 50% es la calibración de parámetros y
          la puntuación del guion para evitar que la IA suene monótona.
        </p>
      </div>

      {/* Interactive Settings Simulator */}
      <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              Simulador Interactivo de Parámetros de Voz
            </h2>
          </div>
          <span className="text-xs text-neutral-400">
            Ajusta los sliders y observa la recomendación
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Slider 1: Stability */}
          <div className="bg-neutral-950 p-5 rounded-lg border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200">
                Stability (Estabilidad)
              </label>
              <span className="text-xs font-mono font-bold text-indigo-400 tabular-nums">
                {simStability}%
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="95"
              value={simStability}
              onChange={(e) => setSimStability(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />

            <div className="space-y-1.5 pt-1">
              <div className={`text-xs font-semibold ${stabilityInsight.color}`}>
                {stabilityInsight.tag}
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {stabilityInsight.desc}
              </p>
            </div>
          </div>

          {/* Slider 2: Clarity / Similarity Boost */}
          <div className="bg-neutral-950 p-5 rounded-lg border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200">
                Clarity / Similarity Boost
              </label>
              <span className="text-xs font-mono font-bold text-indigo-400 tabular-nums">
                {simSimilarity}%
              </span>
            </div>

            <input
              type="range"
              min="30"
              max="100"
              value={simSimilarity}
              onChange={(e) => setSimSimilarity(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />

            <div className="space-y-1.5 pt-1">
              <div className="text-xs font-semibold text-emerald-400">
                {simSimilarity >= 75 && simSimilarity <= 88
                  ? 'Rango Recomendado (75-88%)'
                  : 'Nivel Fuera del Rango Óptimo'}
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Define cuánto se apega la IA al timbre exacto de tu muestra. Por encima de 90%
                puede arrastrar el ruido de fondo o resonancia de tu habitación.
              </p>
            </div>
          </div>

          {/* Slider 3: Style Exaggeration */}
          <div className="bg-neutral-950 p-5 rounded-lg border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200">
                Style Exaggeration
              </label>
              <span className="text-xs font-mono font-bold text-indigo-400 tabular-nums">
                {simStyle}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="50"
              value={simStyle}
              onChange={(e) => setSimStyle(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />

            <div className="space-y-1.5 pt-1">
              <div className="text-xs font-semibold text-indigo-400">
                {simStyle >= 5 && simStyle <= 15
                  ? 'Matiz Expresivo Óptimo (5-15%)'
                  : simStyle === 0
                  ? 'Neutral / Sin Énfasis'
                  : 'Exageración Alta (Riesgo de Distorsión)'}
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Acentúa la personalidad y el entusiasmo que demostraste en la muestra grabada.
                Mantenlo entre 5% y 15% para podcasts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Masterclass Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Secretos de Puntuación */}
        <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Los 4 Secretos de Puntuación Anti-Robótica</span>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            ElevenLabs lee los signos de puntuación como instrucciones de respiración física:
          </p>

          <div className="space-y-3 pt-1">
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 text-xs space-y-1">
              <div className="text-indigo-400 font-semibold font-mono">
                Puntos Suspensivos (...) = Pausa dramática (0.5s)
              </div>
              <p className="text-neutral-300">
                &quot;Lo intenté una y otra vez... hasta que finalmente entendí el secreto.&quot;
              </p>
              <span className="text-[11px] text-neutral-500">
                Obliga al modelo a tomar una micro-inhalación antes de continuar.
              </span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 text-xs space-y-1">
              <div className="text-indigo-400 font-semibold font-mono">
                Guiones largos (--) = Cambio de tono / Inciso
              </div>
              <p className="text-neutral-300">
                &quot;Esa misma noche --y esto no se lo conté a nadie-- tomé la decisión.&quot;
              </p>
              <span className="text-[11px] text-neutral-500">
                Genera un cambio de cadencia y volumen más íntimo.
              </span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 text-xs space-y-1">
              <div className="text-indigo-400 font-semibold font-mono">
                Párrafos cortos (2 a 3 líneas máx.)
              </div>
              <p className="text-neutral-300">
                Separa las ideas con saltos de línea dobles.
              </p>
              <span className="text-[11px] text-neutral-500">
                Evita que la IA acelere el ritmo como si se estuviera quedando sin aire.
              </span>
            </div>
          </div>
        </div>

        {/* Proceso de Subida en ElevenLabs */}
        <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Mic className="w-4 h-4 text-emerald-400" />
            <span>Paso a Paso en ElevenLabs VoiceLab</span>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Cómo crear tu clon en menos de 2 minutos una vez descargadas tus muestras:
          </p>

          <ol className="space-y-3 pt-1 text-xs text-neutral-300">
            <li className="flex items-start gap-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
              <span className="w-5 h-5 rounded-full bg-neutral-800 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-white block mb-0.5">Ve a Voices &gt; Add Voice</strong>
                Selecciona <em>&quot;Instant Voice Cloning&quot;</em>.
              </div>
            </li>

            <li className="flex items-start gap-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
              <span className="w-5 h-5 rounded-full bg-neutral-800 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-white block mb-0.5">Arrastra los 5 archivos WAV</strong>
                Sube las muestras que grabaste en el Teleprómter de esta app.
              </div>
            </li>

            <li className="flex items-start gap-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
              <span className="w-5 h-5 rounded-full bg-neutral-800 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-white block mb-0.5">Copia tu Voice ID</strong>
                Aparecerá en el panel de detalles de tu nueva voz clonada (un código como{' '}
                <code className="text-indigo-400 font-mono">21m00Tcm4TlvDq8ikWAM</code>).
              </div>
            </li>

            <li className="flex items-start gap-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
              <span className="w-5 h-5 rounded-full bg-neutral-800 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-white block mb-0.5">Conéctalo al Estudio</strong>
                Pega tu Voice ID y API Key en la pestaña de Síntesis de esta aplicación para generar
                tus episodios directamente aquí.
              </div>
            </li>
          </ol>
        </div>
      </div>

      {/* Engine Comparison Matrix */}
      <div className="border border-neutral-800 bg-neutral-900 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-white">
              Comparativa: ElevenLabs vs Alternativas Gratuitas y Open Source
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Si buscas evitar la suscripción mensual o los límites de caracteres de ElevenLabs, estas son las opciones:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ElevenLabs Card */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">ElevenLabs (Comercial)</span>
              <span className="text-[11px] font-mono text-amber-400">Desde $5/mes</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              La máxima calidad tímbrica y fidelidad en clonación instantánea.
            </p>
            <div className="text-[11px] space-y-1.5 pt-2 border-t border-neutral-800 text-neutral-300">
              <div><strong>Fidelidad:</strong> 10/10</div>
              <div><strong>Límite:</strong> 30.000 a 100.000 caracteres/mes</div>
              <div><strong>Fricción:</strong> Requiere salir a la web, pagar y copiar Voice ID.</div>
            </div>
          </div>

          {/* F5-TTS Card */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-indigo-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300">F5-TTS (Código Abierto)</span>
              <span className="text-[11px] font-mono text-emerald-400">100% Gratis</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              El rey moderno de clonación Zero-Shot por Flow Matching. Clona con solo 10-12s de audio.
            </p>
            <div className="text-[11px] space-y-1.5 pt-2 border-t border-neutral-800 text-neutral-300">
              <div><strong>Fidelidad:</strong> 9/10</div>
              <div><strong>Límite:</strong> Ilimitado (corre en Google Colab con GPU T4 gratis o Hugging Face).</div>
              <div><strong>Ventaja:</strong> Sin tarjetas de crédito ni cuotas mensuales.</div>
            </div>
          </div>

          {/* Gemini Audio Card */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300">Gemini Voice (Nativo)</span>
              <span className="text-[11px] font-mono text-emerald-400">Gratis en la App</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Integrado al 100% en esta plataforma. No requiere salir a ninguna web externa.
            </p>
            <div className="text-[11px] space-y-1.5 pt-2 border-t border-neutral-800 text-neutral-300">
              <div><strong>Fidelidad:</strong> 8.5/10 (gran prosodia y pausas dramáticas)</div>
              <div><strong>Límite:</strong> Cuota amplia de AI Studio.</div>
              <div><strong>Ventaja:</strong> 1 clic directo en el estudio de producción.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div className="border border-indigo-900/40 bg-indigo-950/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">¿Listo para escribir tu primer episodio?</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Usa el editor de guiones para que la IA estructure el podcast con marcas de entonación automáticas.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onGoToTeleprompter}
            className="px-3.5 py-2 text-xs font-medium text-neutral-300 hover:text-white border border-neutral-700 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Revisar Teleprómter
          </button>
          <button
            onClick={onGoToEditor}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>Confirmar Elección y Continuar al Paso 4</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
