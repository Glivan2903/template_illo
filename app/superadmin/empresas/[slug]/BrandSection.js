'use client';

import { useRef, useState } from 'react';
import { Wand2, SlidersHorizontal, Check, Loader2 } from 'lucide-react';
import ColorField from '../../../admin/ColorField';
import fieldStyles from '../../../admin/admin.module.css';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function quantize(value) {
  return Math.round(value / 24) * 24;
}

function rgbToHex([r, g, b]) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function colorDistance(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Extração de paleta bem simples, sem dependência nova: reduz a imagem pra
// uma amostra pequena, agrupa pixels parecidos (quantização) ignorando
// fundo quase-branco/quase-preto/transparente (o mais comum em logo), e usa
// a cor mais frequente como primária + a próxima cor bem diferente dela
// como secundária. Aproximado — não é ciência de cor de verdade — mas
// resolve bem pra sugerir uma paleta inicial a partir do logotipo.
async function extractPaletteFromObjectUrl(objectUrl) {
  const img = await loadImage(objectUrl);
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    if (r > 240 && g > 240 && b > 240) continue; // fundo branco
    if (r < 15 && g < 15 && b < 15) continue; // fundo preto
    const key = `${quantize(r)},${quantize(g)},${quantize(b)}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const sorted = [...buckets.entries()]
    .map(([key, count]) => ({ rgb: key.split(',').map(Number), count }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length === 0) return null;

  const primary = sorted[0].rgb;
  const secondaryEntry = sorted.find((c) => colorDistance(c.rgb, primary) > 60) || sorted[1] || sorted[0];

  return { colorPrimary: rgbToHex(primary), colorSecondary: rgbToHex(secondaryEntry.rgb) };
}

export default function BrandSection({ empresa }) {
  const brand = empresa.content?.brand || {};
  const [logoPreview, setLogoPreview] = useState(brand.logoUrl || null);
  const [pendingFile, setPendingFile] = useState(null);
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [colorPrimary, setColorPrimary] = useState(brand.colorPrimary || '#2b7a3e');
  const [colorSecondary, setColorSecondary] = useState(brand.colorSecondary || '#8cc63f');
  const [extracting, setExtracting] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const fileInputRef = useRef(null);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      window.alert('Imagem muito grande (máximo 5MB).');
      event.target.value = '';
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setLogoPreview(objectUrl);

    if (mode === 'auto') {
      setExtracting(true);
      try {
        const paleta = await extractPaletteFromObjectUrl(objectUrl);
        if (paleta) {
          setColorPrimary(paleta.colorPrimary);
          setColorSecondary(paleta.colorSecondary);
        }
      } finally {
        setExtracting(false);
      }
    }
  }

  async function handleSave() {
    setStatus('saving');
    const formData = new FormData();
    formData.append('slug', empresa.slug);
    formData.append('colorPrimary', colorPrimary);
    formData.append('colorSecondary', colorSecondary);
    if (pendingFile) formData.append('file', pendingFile);

    try {
      const res = await fetch('/api/superadmin/upload-logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.ok) {
        if (data.logoUrl) setLogoPreview(data.logoUrl);
        setPendingFile(null);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 1800);
      } else {
        setStatus('idle');
        window.alert(data.erro || 'Não foi possível salvar a marca.');
      }
    } catch {
      setStatus('idle');
      window.alert('Não foi possível salvar a marca.');
    }
  }

  return (
    <div className={fieldStyles.card}>
      <h2 className={fieldStyles.cardTitle} style={{ fontSize: '0.95rem' }}>
        Marca
      </h2>
      <p className={fieldStyles.cardHint}>Logotipo e cores do site dessa empresa.</p>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 180px' }}>
          <div className={fieldStyles.currentImage} style={{ marginBottom: '0.6rem', minHeight: 48 }}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logotipo" />
            ) : (
              <span className={fieldStyles.cardHint} style={{ margin: 0 }}>
                Sem logotipo
              </span>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} />
          {extracting && (
            <p className={fieldStyles.cardHint} style={{ margin: '0.4rem 0 0' }}>
              <Loader2 size={12} className={fieldStyles.spin} style={{ verticalAlign: '-2px' }} /> Extraindo cores do
              logotipo...
            </p>
          )}
        </div>

        <div style={{ flex: '1 1 260px', minWidth: 240 }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.9rem' }}>
            <button
              type="button"
              className={mode === 'auto' ? fieldStyles.btnPrimary : fieldStyles.secondaryBtn}
              onClick={() => setMode('auto')}
            >
              <Wand2 size={13} /> Automático
            </button>
            <button
              type="button"
              className={mode === 'manual' ? fieldStyles.btnPrimary : fieldStyles.secondaryBtn}
              onClick={() => setMode('manual')}
            >
              <SlidersHorizontal size={13} /> Manual
            </button>
          </div>
          <p className={fieldStyles.cardHint} style={{ margin: '0 0 0.9rem' }}>
            {mode === 'auto'
              ? 'Ao escolher um novo logotipo, as cores abaixo são sugeridas automaticamente a partir dele — ainda dá pra ajustar na mão.'
              : 'Escolher um novo logotipo não muda as cores — defina os dois campos abaixo manualmente.'}
          </p>

          <div className={fieldStyles.form}>
            <ColorField label="Cor primária" name="corPrimaria" value={colorPrimary} onChange={setColorPrimary} />
            <ColorField label="Cor secundária" name="corSecundaria" value={colorSecondary} onChange={setColorSecondary} />
          </div>

          <button
            type="button"
            className={fieldStyles.btnPrimary}
            style={{ marginTop: '0.9rem' }}
            onClick={handleSave}
            disabled={status === 'saving'}
          >
            {status === 'saving' ? (
              <>
                <Loader2 size={13} className={fieldStyles.spin} /> Salvando...
              </>
            ) : status === 'saved' ? (
              <>
                <Check size={13} /> Salvo
              </>
            ) : (
              'Salvar marca'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
