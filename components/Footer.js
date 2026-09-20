'use client';

import { useRef } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';
import { MapPin, Phone } from 'lucide-react';
import { gsap, useGSAP } from '../lib/gsap';
import { useSiteConfig } from '../lib/siteConfigContext';

const instagramPath = 'M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zM12 7a5 5 0 1 1 0 10A5 5 0 0 1 12 7zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm5.25-2.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2z';
const whatsappPath = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z';

export default function Footer({ mostrarMatriz = true, mostrarFilial = true } = {}) {
  const {
    CLINIC_NOME,
    CLINIC_WHATSAPP_URL,
    CLINIC_PHONE_DISPLAY_MATRIZ,
    CLINIC_PHONE_DISPLAY_FILIAL,
    CLINIC_ENDERECO_MATRIZ,
    CLINIC_ENDERECO_FILIAL,
    CLINIC_HORARIO_ATENDIMENTO,
    CLINIC_INSTAGRAM_URL,
    LOGO_URL,
    TEXTOS,
    FEATURE_PROFISSIONAIS,
    FEATURE_AGENDAMENTO,
    FEATURE_ORCAMENTO,
    FEATURE_AREA_CLIENTE,
    FEATURE_CENTRAL_AGENDAMENTO,
  } = useSiteConfig();
  const rootRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(rootRef.current.children, {
          opacity: 0,
          y: 24,
          duration: 0.7,
          scrollTrigger: { trigger: rootRef.current, start: 'top 88%', once: true },
        });
      });
    },
    { scope: rootRef }
  );

  return (
    <footer id="contato" ref={rootRef} className={styles.footer}>
      <div className={`container ${styles.footerGrid}`}>
        <div>
          <img src={LOGO_URL} alt={CLINIC_NOME} className={styles.logoImg} data-editable="brand.logoUrl" />
          <p className={styles.description} data-editable="textos.footerDescricao">
            {TEXTOS?.footerDescricao}
          </p>
          <div className={styles.socials}>
            <a
              href={CLINIC_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialIcon}
              aria-label="Instagram da clínica"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d={instagramPath} />
              </svg>
            </a>
            <a
              href={CLINIC_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialIcon}
              aria-label="WhatsApp da clínica"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d={whatsappPath} />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <h4 className={styles.heading}>Navegação</h4>
          <ul className={styles.linksList}>
            <li><Link href="/#sobre" data-editable="textos.navSobre">{TEXTOS?.navSobre}</Link></li>
            <li><Link href="/#especialidades" data-editable="textos.navEspecialidades">{TEXTOS?.navEspecialidades}</Link></li>
            {FEATURE_PROFISSIONAIS && <li><Link href="/medicos" data-editable="textos.navProfissionais">{TEXTOS?.navProfissionais}</Link></li>}
            {FEATURE_ORCAMENTO && <li><Link href="/orcamento" data-editable="textos.navOrcamento">{TEXTOS?.navOrcamento}</Link></li>}
            {FEATURE_AGENDAMENTO && <li><Link href="/agendamento" data-editable="textos.botaoAgendarConsulta">{TEXTOS?.botaoAgendarConsulta}</Link></li>}
            {FEATURE_CENTRAL_AGENDAMENTO && <li><Link href="/central-agendamento">Central de Agendamento</Link></li>}
            {FEATURE_AREA_CLIENTE && <li><Link href="/area-cliente" data-editable="textos.navAreaCliente">{TEXTOS?.navAreaCliente}</Link></li>}
          </ul>
        </div>

        <div>
          <h4 className={styles.heading}>Contato e horários</h4>
          <ul className={styles.contactList}>
            {mostrarMatriz && (
              <li className={styles.contactItem}>
                <MapPin size={18} className={styles.icon} />
                <div>
                  <strong className={styles.contactStrong}>Unidade Matriz</strong>
                  <span data-editable="unidades.matriz.endereco">{CLINIC_ENDERECO_MATRIZ}</span>
                  <span className={styles.contactPhone}>
                    <Phone size={14} /> <span data-editable="unidades.matriz.telefoneDisplay">{CLINIC_PHONE_DISPLAY_MATRIZ}</span>
                  </span>
                </div>
              </li>
            )}
            {mostrarFilial && (
              <li className={styles.contactItem}>
                <MapPin size={18} className={styles.icon} />
                <div>
                  <strong className={styles.contactStrong}>Unidade Filial</strong>
                  <span data-editable="unidades.filial.endereco">{CLINIC_ENDERECO_FILIAL}</span>
                  <span className={styles.contactPhone}>
                    <Phone size={14} /> <span data-editable="unidades.filial.telefoneDisplay">{CLINIC_PHONE_DISPLAY_FILIAL}</span>
                  </span>
                </div>
              </li>
            )}
            <li className={styles.contactItem}>
              <span className={styles.hoursText} data-editable="horarioAtendimento">
                {CLINIC_HORARIO_ATENDIMENTO}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <p className={styles.bottomText}>
          &copy; {new Date().getFullYear()} {CLINIC_NOME}. Todos os direitos reservados.
        </p>
        <a
          href={CLINIC_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.whatsappLink}
          data-editable="textos.botaoFalarWhatsappRodape"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d={whatsappPath} />
          </svg>
          {TEXTOS?.botaoFalarWhatsappRodape}
        </a>
      </div>
    </footer>
  );
}
