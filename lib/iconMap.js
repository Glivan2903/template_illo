// Conjunto fixo de ícones (lucide-react) que o /admin pode escolher para
// cada especialidade — mesmo conjunto usado hoje em SpecialtiesSection.js,
// mais algumas opções extras. Compartilhado entre o site público
// (SpecialtiesSection) e o formulário do /admin, para os dois sempre
// oferecerem/renderizarem exatamente as mesmas chaves.
import {
  Heart,
  Brain,
  Baby,
  Activity,
  Eye,
  Stethoscope,
  Bone,
  Microscope,
  Ear,
  Syringe,
  Pill,
  ShieldPlus,
} from 'lucide-react';

export const ICON_MAP = {
  Heart,
  Brain,
  Baby,
  Activity,
  Eye,
  Stethoscope,
  Bone,
  Microscope,
  Ear,
  Syringe,
  Pill,
  ShieldPlus,
};

export const ICON_KEYS = Object.keys(ICON_MAP);

export function getIconComponent(key) {
  return ICON_MAP[key] || Stethoscope;
}
