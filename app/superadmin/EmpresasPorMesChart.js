'use client';

import { useState } from 'react';
import styles from './charts.module.css';

// Barras verticais simples — magnitude ao longo do tempo, série única (não
// precisa de legenda: o título do card já diz o que é plotado). Tooltip no
// hover mostra o valor exato; o eixo (rótulos dos meses) já carrega o resto.
export default function EmpresasPorMesChart({ data }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={styles.chartCard}>
      <h2 className={styles.chartTitle}>Empresas criadas por mês</h2>
      <p className={styles.chartHint}>Últimos {data.length} meses.</p>
      <div className={styles.barsRow}>
        {data.map((d, i) => (
          <div
            key={d.label}
            className={styles.barCol}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex((v) => (v === i ? null : v))}
          >
            {hoverIndex === i && <span className={styles.tooltip}>{d.value}</span>}
            <div className={styles.bar} style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }} />
            <span className={styles.barLabel}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
