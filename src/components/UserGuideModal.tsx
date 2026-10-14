import React, { useState } from 'react';
import { X, BookOpen, Sparkles, DollarSign, Mic, Compass, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToStep: (step: 'teleprompter' | 'samples' | 'guide' | 'editor' | 'production') => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onGoToStep,
}) => {
  const [activeGuideTab, setActiveGuideTab] = useState<'workflow' | 'intonation' | 'monetization' | 'cost'>('workflow');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Manual del Creador: VoiceLab Coach
              </h2>
              <p className="text-xs text-neutral-400">
                Guía completa de uso, secretos de entonación natural y estrategias de monetización
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 px-6 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveGuideTab('workflow')}
            className={`py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeGuideTab === 'workflow'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>1. El Recorrido en 5 Pasos</span>
          </button>

          <button
            onClick={() => setActiveGuideTab('intonation')}
            className={`py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeGuideTab === 'intonation'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Mic className="w-4 h-4 text-emerald-400" />
            <span>2. Entonación Humana vs Robot</span>
          </button>

          <button
            onClick={() => setActiveGuideTab('cost')}
            className={`py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeGuideTab === 'cost'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>3. Costos & Alternativas Gratis</span>
          </button>

          <button
            onClick={() => setActiveGuideTab('monetization')}
            className={`py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeGuideTab === 'monetization'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>4. Modelos de Monetización</span>
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-neutral-300">
          {/* TAB 1: WORKFLOW */}
          {activeGuideTab === 'workflow' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  ¿Cómo funciona el proceso guiado de principio a fin?
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Para que cualquier persona consiga un podcast con voz idéntica y entonación creíble, la app sigue un recorrido estricto en 5 fases secuenciales:
                </p>
              </div>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    01
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Grabación Dirigida en Teleprómter</span>
                      <button 
                        onClick={() => { onClose(); onGoToStep('teleprompter'); }}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Ir ahora <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      El usuario lee frases calibradas con 5 registros (narrativa, entusiasmo, explicación, intimidad y conversación). Las directivas de voz en pantalla le indican cuándo sonreír, enfatizar o susurrar.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    02
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Gestor y Exportación de Muestras WAV</span>
                      <button 
                        onClick={() => { onClose(); onGoToStep('samples'); }}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Ir ahora <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      La app genera archivos WAV sin compresión (44.1kHz, 16-bit PCM). Muestra un medidor de tiempo acumulado (&gt;60s para clonación instantánea óptima) y paquete listo para subir.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    03
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Selección de Motor & Calibración de Sliders</span>
                      <button 
                        onClick={() => { onClose(); onGoToStep('guide'); }}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Ir ahora <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      El usuario prueba en vivo el simulador de parámetros. Aprende por qué la estabilidad debe situarse entre el 35% y 50% para podcasts, y elige entre ElevenLabs, F5-TTS libre o Gemini Audio.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    04
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Editor de Guion y Prosodia con IA</span>
                      <button 
                        onClick={() => { onClose(); onGoToStep('editor'); }}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Ir ahora <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      La IA de Google Gemini redacta guiones para podcasts con estructura de storytelling, ganchos emocionales e inserta etiquetas de prosodia (&lt;breath&gt;, pausas dramáticas y silencios).
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    05
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Producción, Síntesis y Master Final</span>
                      <button 
                        onClick={() => { onClose(); onGoToStep('production'); }}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Ir ahora <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Se genera el archivo de audio con tu voz clonada o con el sintetizador Gemini integrado. Puedes reproducirlo, cambiar la velocidad (1.0x, 1.2x) y descargarlo listo para Spotify o YouTube.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTONATION SECRETS */}
          {activeGuideTab === 'intonation' && (
            <div className="space-y-5">
              <div className="bg-emerald-950/30 border border-emerald-800/60 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-emerald-300 mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> La Fórmula de la Entonación Natural
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  El 90% de las personas que clonan su voz fracasan porque leen como si fuera un contrato legal o un examen escolar. Los modelos de IA no &quot;adivinan&quot; tus emociones; replican exactamente la dinámica con la que hablaste en el micrófono.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-950 p-4 rounded-xl border border-red-900/40 space-y-2">
                  <div className="text-xs font-bold text-red-400 uppercase tracking-wider">
                    Lo que crea una voz robótica:
                  </div>
                  <ul className="text-xs text-neutral-400 space-y-1.5 list-disc pl-4">
                    <li>Hablar con tono monótono y volumen constante.</li>
                    <li>No mover las manos ni sonreír (el rostro plano aplana los armónicos).</li>
                    <li>Estabilidad de ElevenLabs en más del 70% (congela las inflexiones).</li>
                    <li>Guiones sin comas, sin puntos suspensivos y sin respiraciones.</li>
                  </ul>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-emerald-900/40 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    El secreto de los podcasters profesionales:
                  </div>
                  <ul className="text-xs text-neutral-400 space-y-1.5 list-disc pl-4">
                    <li>Variar la cadencia: empezar suave, subir en preguntas y rematar con convicción.</li>
                    <li>Usar puntos suspensivos (...) para crear pausas de 0.5s naturales.</li>
                    <li>Estabilidad entre 35% y 45% (da margen a la emoción orgánica).</li>
                    <li>Grabar las 5 tomas emocionales que provee el teleprómter de la app.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COSTS & ALTERNATIVES */}
          {activeGuideTab === 'cost' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Cómo Resolver el &quot;Ir y Volver&quot; y los Costos de Clonación
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  ElevenLabs tiene la mayor fidelidad acústica del mercado, pero cobra suscripción mensual y requiere crear la voz en su web. Aquí tienes las 3 vías para usar la app según tu caso:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Vía 1: ElevenLabs</span>
                    <span className="text-[10px] text-amber-400 font-mono">$5 - $22/mes</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Creas tu voz una sola vez en ElevenLabs VoiceLab subiendo los audios WAV del Paso 2. Luego pegas tu Voice ID en el Paso 5 y produces episodios ilimitados desde esta app.
                  </p>
                  <div className="text-[11px] text-emerald-400 pt-2 border-t border-neutral-800">
                    Ideal para máxima calidad comercial.
                  </div>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-emerald-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">Vía 2: F5-TTS / XTTS (Opción C)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">100% Gratis / En App</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Clonación Zero-Shot con tu muestra vocal en español. Genera directamente desde la app en el Paso 5 o mediante el cuaderno Colab reparado (sin errores de dependencias de numpy).
                  </p>
                  <div className="text-[11px] text-emerald-400 pt-2 border-t border-neutral-800">
                    Alineación fonética en español integrada.
                  </div>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">Vía 3: Gemini Audio</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Incluido en la App</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Síntesis de voz con excelente prosodia humana nativa dentro de la aplicación. Te permite generar y escuchar el podcast al instante sin claves ni cuentas externas.
                  </p>
                  <div className="text-[11px] text-emerald-400 pt-2 border-t border-neutral-800">
                    Listo en 1 clic en el Paso 5.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MONETIZATION */}
          {activeGuideTab === 'monetization' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  ¿Cómo monetizar esta aplicación como Negocio, SaaS o Servicio?
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  La producción de podcasts y contenidos orales con IA es uno de los mercados de mayor crecimiento en 2024-2026. Aquí tienes modelos probados:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>1. Agencia de Podcasts Automatizados para Clientes</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Haces que tu cliente (abogado, coach, emprendedor o médico) grabe sus 5 muestras en tu estudio. Una vez clonado, le vendes un servicio mensual donde le entregas 4 a 8 episodios de podcast listos cada mes a partir de sus notas o artículos, sin que tenga que grabar nunca más.
                  </p>
                  <div className="text-xs font-semibold text-emerald-400 pt-1">
                    Precio sugerido: $250 - $600 USD / mes por cliente.
                  </div>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>2. Servicio de Audiolibros y Artículos Narrados</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Autores de libros en Amazon Kindle o creadores de newsletters en Substack quieren su versión en audiolibro pero no tienen 40 horas libres ni estudio insonorizado. Clonas su voz y maquillas el máster completo.
                  </p>
                  <div className="text-xs font-semibold text-emerald-400 pt-1">
                    Precio sugerido: $15 - $35 USD por hora de audio producido.
                  </div>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>3. SaaS con Modelo Freemium / Suscripción</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Publicas este estudio con tu propio dominio o repo en GitHub. Ofreces el teleprómter y las muestras gratis, y cobras una membresía mensual para desbloquear la generación ilimitada de guiones y la síntesis directa.
                  </p>
                  <div className="text-xs font-semibold text-emerald-400 pt-1">
                    Precio sugerido: $19 - $39 USD / mes.
                  </div>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>4. Creación de tu Propio Podcast Monetizado</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Produce un episodio diario de noticias o análisis de tu nicho (cripto, negocios, tecnología, salud) en 5 minutos diarios. Monetiza con patrocinios en Spotify y YouTube Podcast.
                  </p>
                  <div className="text-xs font-semibold text-emerald-400 pt-1">
                    Ingresos por anuncios: $18 - $40 CPM.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            VoiceLab Coach · Tu estudio guiado de producción vocal
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors"
          >
            Cerrar Manual
          </button>
        </div>
      </div>
    </div>
  );
};
