'use client';

import { Trash2, Plus } from 'lucide-react';
import { ICON_KEYS, getIconComponent } from '../../lib/iconMap';
import SaveButton from './SaveButton';
import styles from './admin.module.css';

// Controlado pelo pai (AdminWorkspace): "rows" vem do draft compartilhado,
// e cada edição sobe via onChange — é o que permite o preview ao vivo
// refletir a lista de especialidades antes de salvar.
export default function SpecialtiesEditor({ rows, onChange, formAction, pending, dirty }) {
  function updateRow(idx, field, value) {
    onChange(rows.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    onChange([...rows, { nome: '', descricao: '', icone: 'Stethoscope' }]);
  }

  function removeRow(idx) {
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="especialidadesJson" value={JSON.stringify(rows)} readOnly />

      {rows.map((row, idx) => {
        const Icon = getIconComponent(row.icone);
        return (
          <div key={idx} className={styles.specRow}>
            <div className={styles.specRowHead}>
              <Icon size={20} className={styles.specIconPreview} />
              <select
                className={styles.specSelect}
                value={row.icone}
                onChange={(e) => updateRow(idx, 'icone', e.target.value)}
              >
                {ICON_KEYS.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
              <button type="button" className={styles.iconBtn} onClick={() => removeRow(idx)} aria-label="Remover especialidade">
                <Trash2 size={16} />
              </button>
            </div>
            <input
              className={styles.specInput}
              placeholder="Nome (ex.: Cardiologia)"
              value={row.nome}
              onChange={(e) => updateRow(idx, 'nome', e.target.value)}
            />
            <input
              className={styles.specInput}
              placeholder="Descrição curta"
              value={row.descricao}
              onChange={(e) => updateRow(idx, 'descricao', e.target.value)}
            />
          </div>
        );
      })}

      <button type="button" className={styles.secondaryBtn} onClick={addRow}>
        <Plus size={16} /> Adicionar especialidade
      </button>

      <SaveButton pending={pending} dirty={dirty} label="Salvar especialidades" />
    </form>
  );
}
