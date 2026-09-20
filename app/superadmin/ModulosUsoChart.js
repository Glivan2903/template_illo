'use client';

import styles from './charts.module.css';

// Barras horizontais — % de empresas com cada módulo ligado. Série única
// (proporção), mesmo hue do resto do painel; rótulo do módulo já identifica
// a barra, então o valor fica só como texto ao lado (não precisa de
// tooltip: nada fica escondido).
export default function ModulosUsoChart({ data }) {
  return (
    <div className={styles.chartCard}>
      <h2 className={styles.chartTitle}>Uso de módulos</h2>
      <p className={styles.chartHint}>% de empresas com cada módulo ativo.</p>
      <div>
        {data.map((d) => (
          <div key={d.label} className={styles.hBarRow}>
            <span className={styles.hBarLabel}>{d.label}</span>
            <span className={styles.hBarTrack}>
              <span className={styles.hBarFill} style={{ width: `${d.percent}%` }} />
            </span>
            <span className={styles.hBarValue}>{d.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
