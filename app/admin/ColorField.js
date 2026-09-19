'use client';

import styles from './admin.module.css';

// Input nativo type="color" já guarda a cor certa, mas o swatch dele é
// pequeno e some assim que a página perde o foco do picker — aqui a cor
// atual fica sempre visível num bloco grande, sincronizado com um campo de
// hex editável, sem precisar abrir o seletor para "ver" a cor escolhida.
// Controlado pelo pai (AdminWorkspace) para alimentar o preview ao vivo.
export default function ColorField({ label, name, value, onChange }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <div className={styles.colorRow}>
        <span className={styles.colorSwatch} style={{ background: value }} aria-hidden="true" />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.colorPicker}
          aria-label={`Selecionar ${label}`}
        />
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.colorHexInput}
          maxLength={7}
        />
      </div>
    </label>
  );
}
