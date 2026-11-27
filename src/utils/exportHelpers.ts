import { jsPDF } from 'jspdf';

const DATA_URL_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const BLOB_REVOKE_DELAY_MS = 20_000; // >= 15s safe margin before revoking Blob URLs

/**
 * Normalizes typography and strips emojis / non-Latin-1 glyphs
 * that break or stall jsPDF's built-in Helvetica font metrics.
 */
export function sanitizeForPdf(input: string): string {
  if (!input) return '';
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '--')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25CF]/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    // Keep tabs, newlines, printable ASCII, and Latin-1 Spanish punctuation/accents (U+00A1..U+00FF)
    .replace(/[^\t\n\x20-\x7E\xA1-\xFF]/g, '');
}

/**
 * Cleans a filename segment leaving ONLY ASCII letters, numbers, and underscores.
 */
export function sanitizeFilename(raw: string, fallback = 'archivo'): string {
  const base = (raw || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || fallback;
}

/**
 * Splits base name and extension, keeping only letters, numbers, and underscores
 * in the base name (e.g. "muestra_voz_1.wav").
 */
export function buildCleanDownloadFilename(filename: string, defaultExt = 'bin'): string {
  const trimmed = (filename || '').trim();
  const lastDot = trimmed.lastIndexOf('.');
  let rawBase = trimmed;
  let rawExt = defaultExt;

  if (lastDot > 0 && lastDot < trimmed.length - 1) {
    rawBase = trimmed.slice(0, lastDot);
    rawExt = trimmed.slice(lastDot + 1);
  }

  const cleanBase = sanitizeFilename(rawBase, 'archivo');
  const cleanExt =
    rawExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '') || defaultExt;

  return `${cleanBase}.${cleanExt}`;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo convertir el archivo a Data URL.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Error leyendo archivo para descarga.'));
    reader.readAsDataURL(blob);
  });
}

function executeAnchorDownload(href: string, cleanFilename: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = cleanFilename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
  }, 250);
}

/**
 * Reliable browser/iframe file download:
 * - Sanitizes filename to [a-z0-9_] + extension
 * - Converts files < 10 MB to Data URL via FileReader.readAsDataURL
 * - Falls back to Blob URL attached to document.body with >= 15s delayed revocation
 */
export async function triggerBlobDownload(blob: Blob, filename: string): Promise<void> {
  const cleanFilename = buildCleanDownloadFilename(filename);

  if (blob.size < DATA_URL_MAX_BYTES) {
    try {
      const dataUrl = await blobToDataUrl(blob);
      executeAnchorDownload(dataUrl, cleanFilename);
      return;
    } catch (err) {
      console.warn('Data URL fallback to delayed Blob URL:', err);
    }
  }

  const url = URL.createObjectURL(blob);
  executeAnchorDownload(url, cleanFilename);
  window.setTimeout(() => URL.revokeObjectURL(url), BLOB_REVOKE_DELAY_MS);
}

/**
 * Downloads audio or generated assets from either an in-memory Blob or a URL,
 * routing through triggerBlobDownload so Data URL (<10MB) and delayed revocation apply.
 */
export async function downloadFromBlobOrUrl(params: {
  blob?: Blob | null;
  url?: string | null;
  filename: string;
}): Promise<void> {
  const cleanFilename = buildCleanDownloadFilename(params.filename, 'wav');

  if (params.blob) {
    await triggerBlobDownload(params.blob, cleanFilename);
    return;
  }

  if (!params.url) {
    throw new Error('No hay archivo disponible para descargar.');
  }

  if (params.url.startsWith('data:')) {
    executeAnchorDownload(params.url, cleanFilename);
    return;
  }

  const response = await fetch(params.url);
  if (!response.ok) {
    throw new Error('No se pudo leer el archivo de audio en memoria.');
  }
  const fetchedBlob = await response.blob();
  await triggerBlobDownload(fetchedBlob, cleanFilename);
}

export async function downloadScriptTxt(params: {
  scriptText: string;
  scriptTitle: string;
  brandName?: string;
}): Promise<void> {
  const cleanTitle = (params.scriptTitle || 'Guion de Podcast').trim();
  const brand = (params.brandName || 'VOICELAB COACH').toUpperCase();
  const divider = '==================================================';
  const wordCount = params.scriptText.trim().split(/\s+/).filter(Boolean).length;
  const content = `${divider}
${brand} - GUION DE PODCAST PARA CLONACION
${divider}
Titulo: ${cleanTitle}
Fecha: ${new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })}
Longitud: ${params.scriptText.length} caracteres (${wordCount} palabras)
Duracion estimada: ~${Math.round(wordCount / 2.2)} seg
${divider}

${params.scriptText.replace(/\r\n?/g, '\n')}
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  await triggerBlobDownload(blob, `${sanitizeFilename(cleanTitle, 'guion_podcast')}_guion.txt`);
}

export async function downloadScriptPdf(params: {
  scriptText: string;
  scriptTitle: string;
  brandName?: string;
}): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cleanTitle = sanitizeForPdf(params.scriptTitle || 'Guion de Podcast').trim() || 'Guion de Podcast';
  const brand = sanitizeForPdf(params.brandName || 'VOICELAB COACH').toUpperCase();
  const safeBody = sanitizeForPdf(params.scriptText);
  const dateStr = sanitizeForPdf(
    new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  );

  const wordCount = safeBody.trim().split(/\s+/).filter(Boolean).length;
  const durationSec = Math.round(wordCount / 2.2);
  const estMin = Math.floor(durationSec / 60);
  const estSec = durationSec % 60;

  // Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(129, 140, 248);
  doc.text(`${brand} - GUION MAESTRO PARA LOCUCION`, 14, 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanTitle.slice(0, 60), 14, 18);

  // Meta info banner
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 24, 210, 8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Fecha: ${dateStr}   |   ${wordCount} palabras   |   Duracion estimada: ~${estMin}m ${estSec}s   |   Prosodia incluida`,
    14,
    29.5
  );

  // Body
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pageWidth - margin * 2;

  const paragraphs = safeBody.split('\n');
  let y = 39;
  const lineHeight = 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  for (const para of paragraphs) {
    if (!para.trim()) {
      y += 3.5;
      continue;
    }

    const lines = doc.splitTextToSize(para, maxWidth);
    for (const line of lines) {
      if (y + lineHeight > pageHeight - 16) {
        doc.addPage();
        y = 18;
      }

      if (line.includes('[') && line.includes(']')) {
        doc.setTextColor(79, 70, 229);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
      }

      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += 2;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Pagina ${i} de ${totalPages} - ${brand}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  const pdfBlob = doc.output('blob');
  await triggerBlobDownload(
    pdfBlob,
    `${sanitizeFilename(cleanTitle, 'guion_podcast')}_guion.pdf`
  );
}

function escapePythonTripleQuote(str: string): string {
  return (str || '').replace(/\r\n?/g, '\n').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function downloadColabNotebook(params: {
  refText?: string;
  scriptText: string;
  scriptTitle?: string;
  refAudioBase64?: string | null;
}): Promise<void> {
  const hasEmbeddedSample =
    Boolean(params.refAudioBase64) && (params.refAudioBase64?.length || 0) <= 3_200_000;

  const sampleSetupCode = hasEmbeddedSample
    ? [
        '# Muestra vocal del usuario incrustada automáticamente desde el estudio\n',
        'import base64\n',
        `ref_b64 = "${params.refAudioBase64}"\n`,
        'with open("muestra_voz.wav", "wb") as f:\n',
        '    f.write(base64.b64decode(ref_b64))\n',
        'ref_audio = "muestra_voz.wav"\n',
        'print("✅ Muestra de voz cargada: muestra_voz.wav")\n\n',
      ]
    : [
        '# Sube tu muestra WAV (muestra_voz.wav) cuando Colab te lo pida\n',
        'from google.colab import files\n',
        'print("📂 Selecciona tu muestra WAV (muestra_voz.wav) grabada en el Paso 1...")\n',
        'uploaded = files.upload()\n',
        'ref_audio = list(uploaded.keys())[0]\n\n',
      ];

  const notebook = {
    nbformat: 4,
    nbformat_minor: 0,
    metadata: {
      colab: { provenance: [] },
      language_info: { name: 'python' },
      accelerator: 'GPU',
    },
    cells: [
      {
        cell_type: 'markdown',
        metadata: {},
        source: [
          '# 🎙️ Clonación de Voz en Español Nativo (Coqui XTTS v2 · GPU Gratis)\n',
          'Cuaderno preconfigurado automáticamente con tu **muestra de voz** (`muestra_voz.wav`) y tu **guion de podcast**.\n\n',
          '1. Activa GPU en Google Colab: **Entorno de ejecución > Cambiar tipo de entorno > T4 GPU**.\n',
          '2. Ejecuta la **Celda 1** para instalar `coqui-tts>=0.26.0` y `soundfile` (compatible con Python 3.13).\n',
          '3. Ejecuta la **Celda 2** para clonar tu voz en español nativo (`language="es"`), reproducir `episodio_clonado.wav` y descargarlo automáticamente.',
        ],
      },
      {
        cell_type: 'code',
        metadata: {},
        execution_count: null,
        outputs: [],
        source: [
          '# Celda 1: Instalación compatible con Python 3.13 en Google Colab\n',
          '!pip install -q --upgrade pip\n',
          '!pip install -q "coqui-tts>=0.26.0" soundfile || pip install -q git+https://github.com/idiap/coqui-ai-TTS.git soundfile\n',
          'import TTS\n',
          'print("✅ Coqui TTS instalado:", TTS.__version__)',
        ],
      },
      {
        cell_type: 'code',
        metadata: {},
        execution_count: null,
        outputs: [],
        source: [
          '# Celda 2: Síntesis en Español Nativo y ritmo natural (Coqui XTTS v2)\n',
          'import os\n',
          'os.environ["COQUI_TOS_AGREED"] = "1"\n',
          'os.environ["TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD"] = "1"\n\n',
          'import re\n',
          'import sys\n',
          'import subprocess\n',
          'import torch\n',
          'from IPython.display import Audio, display\n\n',
          'try:\n',
          '    from TTS.api import TTS\n',
          'except ModuleNotFoundError:\n',
          '    print("⚙️ Instalando coqui-tts>=0.26.0 y soundfile automáticamente...")\n',
          '    try:\n',
          '        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "coqui-tts>=0.26.0", "soundfile"])\n',
          '    except Exception:\n',
          '        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "git+https://github.com/idiap/coqui-ai-TTS.git", "soundfile"])\n',
          '    from TTS.api import TTS\n\n',
          ...sampleSetupCode,
          `raw_script = """${escapePythonTripleQuote(params.scriptText)}"""\n`,
          '# Limpia etiquetas, saltos de línea múltiples (\\n+), puntos suspensivos (...) y guiones largos\n',
          'gen_text_limpio = re.sub(r"\\[[^\\]]+\\]", " ", raw_script)\n',
          'gen_text_limpio = re.sub(r"<[^>]+>", " ", gen_text_limpio)\n',
          'gen_text_limpio = re.sub(r"(\\.{2,}|\\u2026)", ".", gen_text_limpio)\n',
          'gen_text_limpio = re.sub(r"[\\u2013\\u2014]+|-{2,}", " ", gen_text_limpio)\n',
          'gen_text_limpio = re.sub(r"\\s+-\\s+", " ", gen_text_limpio)\n',
          'gen_text_limpio = re.sub(r"\\r?\\n+", " ", gen_text_limpio)\n',
          'gen_text_limpio = re.sub(r"\\s+([.,!?;:])", r"\\1", gen_text_limpio)\n',
          'gen_text_limpio = re.sub(r"([.,!?]){2,}", r"\\1", gen_text_limpio)\n',
          'gen_text_limpio = re.sub(r"\\s+", " ", gen_text_limpio).strip()\n\n',
          'device = "cuda" if torch.cuda.is_available() else "cpu"\n',
          'print(f"⬇️ Cargando modelo oficial Coqui XTTS v2 en {device.upper()}...")\n',
          'tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)\n\n',
          'print("⏳ Sintetizando audio en español nativo sin silencios largos...")\n',
          'tts.tts_to_file(\n',
          '    text=gen_text_limpio,\n',
          '    speaker_wav=ref_audio,\n',
          '    language="es",\n',
          '    file_path="episodio_clonado.wav",\n',
          '    split_sentences=True,\n',
          '    temperature=0.65,\n',
          '    repetition_penalty=5.0,\n',
          ')\n\n',
          'print("✨ ¡Audio clonado listo en episodio_clonado.wav!")\n',
          'display(Audio("episodio_clonado.wav"))\n\n',
          'try:\n',
          '    from google.colab import files\n',
          '    files.download("episodio_clonado.wav")\n',
          'except Exception:\n',
          '    pass\n',
        ],
      },
    ],
  };

  const blob = new Blob([JSON.stringify(notebook, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  await triggerBlobDownload(
    blob,
    `clonador_xtts_es_${sanitizeFilename(params.scriptTitle || 'podcast', 'podcast')}.ipynb`
  );
}
