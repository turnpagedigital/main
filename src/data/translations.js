/* Translations for the Turnpage Digital site.
   English is the source of truth and always falls back. Other languages can
   start partial — anything missing falls back to English automatically.

   To add a new key:
   1. Add it under `en` first.
   2. Replace `t("your_key")` in components.
   3. Add translations for each other language. Untranslated keys fall back to English.

   Naming convention: dot-namespaced — section.purpose. */

export const TRANSLATIONS = {
  /* ─── English (source of truth) ─── */
  en: {
    // Nav
    "nav.copyright":   "Copyright Claims",
    "nav.crypto":      "Locked Crypto",
    "nav.litigation":  "Litigation Funding",
    "nav.tariff":      "Tariff Refunds",
    "nav.briefings":   "Briefings",
    "nav.press":       "Press & Publications",
    "nav.contact":     "Get in Touch",

    // Hero
    "hero.eyebrow":     "OTC Claims Desk",
    "hero.title_1":     "Strategic guidance.",
    "hero.title_2":     "Turn-key liquidity.",
    "hero.subtitle":    "For rights holders entitled to compensation — we buy litigation, class action and bankruptcy claims, receivables, refunds, and other locked assets.",
    "hero.cta_primary": "Get in Touch",
    "hero.cta_secondary": "What we cover",
    "hero.scroll":      "Scroll",

    // Stats band
    "stats.claims_traded":    "Claims traded*",
    "stats.claims_advised":   "Claims sold or advised*",
    "stats.institutions":     "Financial institutions on speed dial",
    "stats.footnote":         "*Experience prior to founding Turnpage Digital.",

    // Section eyebrows + titles
    "situations.eyebrow":     "What we cover",
    "situations.title_1":     "The toughest claims",
    "situations.title_2":     "on the docket.",
    "leadership.eyebrow":     "Leadership",
    "testimonials.eyebrow":   "What clients say",
    "testimonials.title_1":   "When others give up,",
    "testimonials.title_2":   "we dig in.",
    "experience.eyebrow":     "Relevant Experience",
    "edge.eyebrow":           "Our Edge",
    "edge.title_1":           "Built to move fast",
    "edge.title_2":           "when it counts.",
    "faq.eyebrow":            "FAQ",
    "faq.title_1":            "Your questions,",
    "faq.title_2":            "answered",

    // Closing
    "closing.eyebrow":  "Get a quote",
    "closing.title":    "Why wait?",
    "closing.kicker":   "Contact us for a quote or to learn more.",
    "closing.email":    "Email",
    "closing.phone":    "Phone",
    "closing.cta":      "Get in Touch",

    // Footer
    "footer.subscribe_title": "Stay current on the latest Turnpage briefings.",
    "footer.subscribe_cta":   "Subscribe",
    "footer.col.desks":       "Desks",
    "footer.col.resources":   "Resources",
    "footer.col.firm":        "Firm",
    "footer.col.legal":       "Legal",
    "footer.firm.contact":    "Get in Touch",
    "footer.legal.privacy":   "Privacy Policy",
    "footer.legal.terms":     "Terms of Use",
    "footer.copyright":       "Turnpage Digital Markets LLC © 2026 · All rights reserved",
    "footer.region_label":    "Global",

    // CTA banner
    "ctabanner.title": "Stay current on the docket.",
    "ctabanner.cta":   "Read the briefings",

    // Situations body paragraph
    "situations.body": "We handle every kind of compensation claim — from class action settlements and Chapter 11 customer positions to refund rights and locked digital assets. Whatever the situation, if there's a path to liquidity, we've got it covered.",

    // Our Edge — three differentiation points
    "edge.p1.title": "Practically unlimited liquidity",
    "edge.p1.body":  "We partner with major asset managers — over 500 institutions on speed dial.",
    "edge.p2.title": "Lightning-fast settlement",
    "edge.p2.body":  "Automation accelerates diligence and closing in the largest volume cases.",
    "edge.p3.title": "Relationship builders, not just dealmakers",
    "edge.p3.body":  "We go the extra mile to understand your business needs so we can structure the right deal for our clients.",

    // Experience section — per-page title + body
    "experience.home.title":        "A track record across the largest claims trades.",
    "experience.home.body":         "A representative slice of recent deals across crypto insolvencies, pension claims, antitrust settlements, and complex litigation matters.",
    "experience.aicopyright.title": "A track record across other class actions.",
    "experience.aicopyright.body":  "A representative selection of our work advising rights holders, class members, and institutional buyers across the emerging AI copyright landscape.",
    "experience.crypto.title":      "A track record across digital-asset insolvencies.",
    "experience.crypto.body":       "A representative slice of deals across crypto insolvencies, exchange failures, and digital-asset restructurings.",

    // FAQ — more link
    "faq.more": "More Questions? See all FAQs →",

    // Bio section
    "bio.seen_in": "As seen in",
    "bio.role":    "Founder & Managing Partner",

    // Service cards — section header
    "service.eyebrow": "How We Help",
    "service.title":   "Our",
    "service.accent":  "Services.",

    // Service cards — card content (4 cards, positional)
    "svc.card0.title":    "Direct Acquisition",
    "svc.card0.subtitle": "Balance sheet capital",
    "svc.card0.body":     "Our dedicated capital partners enable us to offer competitive pricing and an efficient closing process in the largest cases.",
    "svc.card1.title":    "Auctions & Reporting",
    "svc.card1.subtitle": "Auditable, board-ready results",
    "svc.card1.body":     "Achieve comprehensive price discovery with broad-reach marketing and a robust and transparent auction process.",
    "svc.card2.title":    "Structured Portfolios",
    "svc.card2.subtitle": "Increased pricing power",
    "svc.card2.body":     "Enhance marketability and demand by aggregating related interests into a single portfolio, ready to trade.",
    "svc.card3.title":    "Advisory Services",
    "svc.card3.subtitle": "Strategic guidance",
    "svc.card3.body":     "We assemble teams of legal experts and advisors to tackle the most complex cross-border claims disputes and recovery strategies.",

    // Photo break
    "photobreak.text":   "Too hard? Not in",
    "photobreak.accent": "our vocabulary.",

    // Our Edge — intro
    "edge.intro": "Automated diligence and deep integration with our capital sources means rapid onboarding, highly competitive pricing and a streamlined and efficient closing process.",

    // Get Quote section
    "getquote.eyebrow": "Ready to learn more?",
    "getquote.title":   "Talk with",
    "getquote.accent":  "our team.",
    "getquote.body":    "Contact us to discuss your funding needs. Private, fast and secure.",
  },

  /* ─── Spanish ─── */
  es: {
    "nav.copyright":   "Reclamos de Derechos de Autor",
    "nav.crypto":      "Cripto Bloqueada",
    "nav.litigation":  "Financiación de Litigios",
    "nav.tariff":      "Reembolsos Arancelarios",
    "nav.briefings":   "Informes",
    "nav.press":       "Prensa y Publicaciones",
    "nav.contact":     "Contáctenos",

    "hero.eyebrow":     "Mesa OTC de Reclamaciones",
    "hero.title_1":     "Asesoría estratégica.",
    "hero.title_2":     "Liquidez llave en mano.",
    "hero.subtitle":    "Para titulares de derechos con derecho a indemnización — compramos demandas judiciales, acciones colectivas y créditos por quiebra, cuentas por cobrar, reembolsos y otros activos bloqueados.",
    "hero.cta_primary": "Contáctenos",
    "hero.cta_secondary": "Lo que cubrimos",
    "hero.scroll":      "Desplazar",

    "stats.claims_traded":   "Reclamos negociados*",
    "stats.claims_advised":  "Reclamos vendidos o asesorados*",
    "stats.institutions":    "Instituciones financieras en agenda",
    "stats.footnote":        "*Experiencia previa a la fundación de Turnpage Digital.",

    "situations.eyebrow":     "Lo que cubrimos",
    "situations.title_1":     "Los reclamos más complejos",
    "situations.title_2":     "del expediente.",
    "leadership.eyebrow":     "Liderazgo",
    "testimonials.eyebrow":   "Qué dicen los clientes",
    "testimonials.title_1":   "Cuando otros se rinden,",
    "testimonials.title_2":   "nosotros profundizamos.",
    "experience.eyebrow":     "Experiencia Relevante",
    "edge.eyebrow":           "Nuestra Ventaja",
    "edge.title_1":           "Diseñados para actuar rápido",
    "edge.title_2":           "cuando importa.",
    "faq.eyebrow":            "FAQ",
    "faq.title_1":            "Sus preguntas,",
    "faq.title_2":            "respondidas",

    "closing.eyebrow":  "Pida una cotización",
    "closing.title":    "¿Por qué esperar?",
    "closing.kicker":   "Contáctenos para una cotización o más información.",
    "closing.email":    "Correo electrónico",
    "closing.phone":    "Teléfono",
    "closing.cta":      "Contáctenos",

    "footer.subscribe_title": "Reciba las últimas notas de Turnpage.",
    "footer.subscribe_cta":   "Suscribirse",
    "footer.col.desks":       "Mesas",
    "footer.col.resources":   "Recursos",
    "footer.col.firm":        "Empresa",
    "footer.col.legal":       "Legal",
    "footer.firm.contact":    "Contáctenos",
    "footer.legal.privacy":   "Política de Privacidad",
    "footer.legal.terms":     "Términos de Uso",
    "footer.copyright":       "Turnpage Digital Markets LLC © 2026 · Todos los derechos reservados",
    "footer.region_label":    "Global",

    "ctabanner.title": "Manténgase al día con el expediente.",
    "ctabanner.cta":   "Leer los informes",

    "situations.body": "Manejamos todo tipo de reclamaciones de compensación — desde acuerdos de demandas colectivas y posiciones de clientes en el Capítulo 11 hasta derechos de reembolso y activos digitales bloqueados. Cualquiera que sea la situación, si hay un camino hacia la liquidez, lo cubrimos.",

    "edge.p1.title": "Liquidez prácticamente ilimitada",
    "edge.p1.body":  "Nos asociamos con los principales gestores de activos — más de 500 instituciones a disposición inmediata.",
    "edge.p2.title": "Cierre ultrarrápido",
    "edge.p2.body":  "La automatización acelera la diligencia y el cierre en los casos de mayor volumen.",
    "edge.p3.title": "Constructores de relaciones, no solo negociadores",
    "edge.p3.body":  "Hacemos el esfuerzo adicional para comprender las necesidades de su negocio y estructurar el acuerdo adecuado para nuestros clientes.",

    "experience.home.title":        "Un historial en los mayores negocios de reclamaciones.",
    "experience.home.body":         "Una muestra representativa de operaciones recientes en insolvencias cripto, reclamaciones de pensiones, acuerdos antimonopolio y litigios complejos.",
    "experience.aicopyright.title": "Un historial en otras acciones colectivas.",
    "experience.aicopyright.body":  "Una selección representativa de nuestro trabajo asesorando a titulares de derechos, miembros de clases e inversores institucionales en el emergente panorama de derechos de autor de IA.",
    "experience.crypto.title":      "Un historial en insolvencias de activos digitales.",
    "experience.crypto.body":       "Una muestra representativa de operaciones en insolvencias cripto, quiebras de exchanges y reestructuraciones de activos digitales.",

    "faq.more": "¿Más preguntas? Ver todas las FAQ →",

    "bio.seen_in": "Como aparece en",
    "bio.role":    "Fundador y Socio Director",

    "service.eyebrow": "Cómo Ayudamos",
    "service.title":   "Nuestros",
    "service.accent":  "Servicios.",

    "svc.card0.title":    "Adquisición Directa",
    "svc.card0.subtitle": "Capital de balance",
    "svc.card0.body":     "Nuestros socios de capital dedicados nos permiten ofrecer precios competitivos y un proceso de cierre eficiente en los casos más grandes.",
    "svc.card1.title":    "Subastas e Informes",
    "svc.card1.subtitle": "Resultados auditables para el directorio",
    "svc.card1.body":     "Logre un descubrimiento de precios integral con marketing de amplio alcance y un proceso de subasta robusto y transparente.",
    "svc.card2.title":    "Carteras Estructuradas",
    "svc.card2.subtitle": "Mayor poder de negociación de precios",
    "svc.card2.body":     "Mejore la comerciabilidad y la demanda agregando intereses relacionados en una sola cartera lista para negociar.",
    "svc.card3.title":    "Servicios de Asesoría",
    "svc.card3.subtitle": "Orientación estratégica",
    "svc.card3.body":     "Reunimos equipos de expertos legales y asesores para abordar las disputas de reclamaciones transfronterizas más complejas y las estrategias de recuperación.",

    "photobreak.text":   "¿Demasiado difícil?",
    "photobreak.accent": "No está en nuestro vocabulario.",

    "edge.intro": "La diligencia automatizada y la integración profunda con nuestras fuentes de capital significan una incorporación rápida, precios altamente competitivos y un proceso de cierre eficiente.",

    "getquote.eyebrow": "¿Listo para saber más?",
    "getquote.title":   "Hable con",
    "getquote.accent":  "nuestro equipo.",
    "getquote.body":    "Contáctenos para hablar sobre sus necesidades. Privado, rápido y seguro.",
  },

  /* ─── French ─── */
  fr: {
    "nav.copyright":   "Droits d'Auteur",
    "nav.crypto":      "Crypto Bloquée",
    "nav.litigation":  "Financement du Contentieux",
    "nav.tariff":      "Remboursements Douaniers",
    "nav.briefings":   "Briefings",
    "nav.press":       "Presse et Publications",
    "nav.contact":     "Nous contacter",

    "hero.eyebrow":     "Desk OTC pour Créances",
    "hero.title_1":     "Conseil stratégique.",
    "hero.title_2":     "Liquidité clé en main.",
    "hero.subtitle":    "Pour les titulaires de droits à indemnisation — nous achetons des créances issues de contentieux, d'actions collectives et de faillites, des créances commerciales, des remboursements et d'autres actifs bloqués.",
    "hero.cta_primary": "Nous contacter",
    "hero.cta_secondary": "Ce que nous couvrons",
    "hero.scroll":      "Défiler",

    "stats.claims_traded":   "Créances négociées*",
    "stats.claims_advised":  "Créances vendues ou conseillées*",
    "stats.institutions":    "Institutions financières en relation",
    "stats.footnote":        "*Expérience antérieure à la création de Turnpage Digital.",

    "situations.eyebrow":     "Ce que nous couvrons",
    "situations.title_1":     "Les créances les plus complexes",
    "situations.title_2":     "du rôle.",
    "leadership.eyebrow":     "Direction",
    "testimonials.eyebrow":   "Ce que disent nos clients",
    "testimonials.title_1":   "Quand les autres abandonnent,",
    "testimonials.title_2":   "nous persévérons.",
    "experience.eyebrow":     "Expérience pertinente",
    "edge.eyebrow":           "Notre Force",
    "edge.title_1":           "Conçus pour agir vite",
    "edge.title_2":           "quand cela compte.",
    "faq.eyebrow":            "FAQ",
    "faq.title_1":            "Vos questions,",
    "faq.title_2":            "nos réponses",

    "closing.eyebrow":  "Demander un devis",
    "closing.title":    "Pourquoi attendre ?",
    "closing.kicker":   "Contactez-nous pour un devis ou plus d'informations.",
    "closing.email":    "E-mail",
    "closing.phone":    "Téléphone",
    "closing.cta":      "Nous contacter",

    "footer.subscribe_title": "Restez informé des dernières analyses Turnpage.",
    "footer.subscribe_cta":   "S'abonner",
    "footer.col.desks":       "Desks",
    "footer.col.resources":   "Ressources",
    "footer.col.firm":        "Société",
    "footer.col.legal":       "Mentions légales",
    "footer.firm.contact":    "Nous contacter",
    "footer.legal.privacy":   "Politique de confidentialité",
    "footer.legal.terms":     "Conditions d'utilisation",
    "footer.copyright":       "Turnpage Digital Markets LLC © 2026 · Tous droits réservés",
    "footer.region_label":    "Global",

    "ctabanner.title": "Suivez l'actualité du rôle.",
    "ctabanner.cta":   "Lire les briefings",

    "situations.body": "Nous gérons tous les types de créances — des règlements d'actions collectives et des positions clients en Chapitre 11 aux droits de remboursement et aux actifs numériques bloqués. Quelle que soit la situation, s'il existe une voie vers la liquidité, nous l'avons couverte.",

    "edge.p1.title": "Liquidité pratiquement illimitée",
    "edge.p1.body":  "Nous collaborons avec les principaux gestionnaires d'actifs — plus de 500 institutions disponibles immédiatement.",
    "edge.p2.title": "Règlement ultra-rapide",
    "edge.p2.body":  "L'automatisation accélère la diligence et la clôture dans les dossiers à fort volume.",
    "edge.p3.title": "Créateurs de relations, pas seulement des négociateurs",
    "edge.p3.body":  "Nous faisons le nécessaire pour comprendre vos besoins afin de structurer la bonne transaction pour nos clients.",

    "experience.home.title":        "Un historique de performance sur les plus grandes cessions de créances.",
    "experience.home.body":         "Un échantillon représentatif d'opérations récentes dans les insolvabilités crypto, les créances de retraite, les règlements antitrust et les contentieux complexes.",
    "experience.aicopyright.title": "Un historique de performance sur d'autres actions collectives.",
    "experience.aicopyright.body":  "Une sélection représentative de notre travail de conseil auprès des titulaires de droits, des membres des classes et des acheteurs institutionnels dans le paysage émergent du droit d'auteur de l'IA.",
    "experience.crypto.title":      "Un historique de performance dans les insolvabilités d'actifs numériques.",
    "experience.crypto.body":       "Un échantillon représentatif d'opérations dans les insolvabilités crypto, les défaillances d'échanges et les restructurations d'actifs numériques.",

    "faq.more": "Plus de questions ? Voir toutes les FAQ →",

    "bio.seen_in": "Présenté dans",
    "bio.role":    "Fondateur et Associé Gérant",

    "service.eyebrow": "Comment nous aidons",
    "service.title":   "Nos",
    "service.accent":  "Services.",

    "svc.card0.title":    "Acquisition directe",
    "svc.card0.subtitle": "Capital de bilan",
    "svc.card0.body":     "Nos partenaires en capital dédiés nous permettent d'offrir des prix compétitifs et un processus de clôture efficace dans les plus grands dossiers.",
    "svc.card1.title":    "Enchères et rapports",
    "svc.card1.subtitle": "Résultats auditables et prêts pour le conseil",
    "svc.card1.body":     "Réalisez une découverte de prix complète grâce à un marketing à large portée et un processus d'enchères robuste et transparent.",
    "svc.card2.title":    "Portefeuilles structurés",
    "svc.card2.subtitle": "Pouvoir de négociation accru",
    "svc.card2.body":     "Améliorez la commerciabilité et la demande en regroupant des intérêts connexes dans un seul portefeuille, prêt à être négocié.",
    "svc.card3.title":    "Services de conseil",
    "svc.card3.subtitle": "Orientation stratégique",
    "svc.card3.body":     "Nous constituons des équipes d'experts juridiques et de conseillers pour traiter les litiges transfrontaliers les plus complexes et les stratégies de recouvrement.",

    "photobreak.text":   "Trop difficile ?",
    "photobreak.accent": "Pas dans notre vocabulaire.",

    "edge.intro": "La diligence automatisée et l'intégration profonde avec nos sources de capital permettent un onboarding rapide, des prix très compétitifs et un processus de clôture rationalisé et efficace.",

    "getquote.eyebrow": "Prêt à en savoir plus ?",
    "getquote.title":   "Parlez à",
    "getquote.accent":  "notre équipe.",
    "getquote.body":    "Contactez-nous pour discuter de vos besoins. Privé, rapide et sécurisé.",
  },

  /* ─── German ─── */
  de: {
    "nav.copyright":   "Urheberrechtsansprüche",
    "nav.crypto":      "Gesperrtes Krypto",
    "nav.litigation":  "Prozessfinanzierung",
    "nav.tariff":      "Zollrückerstattungen",
    "nav.briefings":   "Briefings",
    "nav.press":       "Presse & Publikationen",
    "nav.contact":     "Kontakt",

    "hero.eyebrow":     "OTC-Desk für Ansprüche",
    "hero.title_1":     "Strategische Beratung.",
    "hero.title_2":     "Schlüsselfertige Liquidität.",
    "hero.subtitle":    "Für Anspruchsberechtigte — wir kaufen Forderungen aus Rechtsstreitigkeiten, Sammelklagen und Insolvenzen sowie Außenstände, Rückerstattungsansprüche und andere gesperrte Vermögenswerte.",
    "hero.cta_primary": "Kontakt aufnehmen",
    "hero.cta_secondary": "Was wir abdecken",
    "hero.scroll":      "Scrollen",

    "stats.claims_traded":   "Gehandelte Ansprüche*",
    "stats.claims_advised":  "Verkaufte oder beratene Ansprüche*",
    "stats.institutions":    "Finanzinstitute im Netzwerk",
    "stats.footnote":        "*Erfahrung vor Gründung von Turnpage Digital.",

    "situations.eyebrow":     "Was wir abdecken",
    "situations.title_1":     "Die komplexesten Forderungen",
    "situations.title_2":     "im Verfahren.",
    "leadership.eyebrow":     "Führung",
    "testimonials.eyebrow":   "Was unsere Kunden sagen",
    "testimonials.title_1":   "Wenn andere aufgeben,",
    "testimonials.title_2":   "graben wir tiefer.",
    "experience.eyebrow":     "Relevante Erfahrung",
    "edge.eyebrow":           "Unser Vorteil",
    "edge.title_1":           "Geschaffen für schnelles Handeln,",
    "edge.title_2":           "wenn es darauf ankommt.",
    "faq.eyebrow":            "FAQ",
    "faq.title_1":            "Ihre Fragen,",
    "faq.title_2":            "beantwortet",

    "closing.eyebrow":  "Angebot anfordern",
    "closing.title":    "Warum warten?",
    "closing.kicker":   "Kontaktieren Sie uns für ein Angebot oder weitere Informationen.",
    "closing.email":    "E-Mail",
    "closing.phone":    "Telefon",
    "closing.cta":      "Kontakt",

    "footer.subscribe_title": "Bleiben Sie über die neuesten Turnpage-Briefings informiert.",
    "footer.subscribe_cta":   "Abonnieren",
    "footer.col.desks":       "Desks",
    "footer.col.resources":   "Ressourcen",
    "footer.col.firm":        "Unternehmen",
    "footer.col.legal":       "Rechtliches",
    "footer.firm.contact":    "Kontakt",
    "footer.legal.privacy":   "Datenschutzerklärung",
    "footer.legal.terms":     "Nutzungsbedingungen",
    "footer.copyright":       "Turnpage Digital Markets LLC © 2026 · Alle Rechte vorbehalten",
    "footer.region_label":    "Global",

    "ctabanner.title": "Bleiben Sie über das Verfahren informiert.",
    "ctabanner.cta":   "Briefings lesen",

    "situations.body": "Wir bearbeiten alle Arten von Entschädigungsansprüchen — von Vergleichen in Sammelklagen und Kundenpositionen in Chapter-11-Verfahren bis hin zu Rückerstattungsrechten und gesperrten digitalen Vermögenswerten. Was auch immer die Situation ist, wenn es einen Weg zur Liquidität gibt, haben wir ihn abgedeckt.",

    "edge.p1.title": "Praktisch unbegrenzte Liquidität",
    "edge.p1.body":  "Wir arbeiten mit führenden Vermögensverwaltern zusammen — über 500 Institutionen auf Kurzwahl.",
    "edge.p2.title": "Blitzschnelle Abwicklung",
    "edge.p2.body":  "Automatisierung beschleunigt die Due Diligence und den Abschluss in Fällen mit dem größten Volumen.",
    "edge.p3.title": "Beziehungsaufbauer, nicht nur Dealmaker",
    "edge.p3.body":  "Wir gehen die Extrameile, um Ihre Geschäftsbedürfnisse zu verstehen und das richtige Geschäft für unsere Kunden zu strukturieren.",

    "experience.home.title":        "Eine Erfolgsbilanz in den größten Forderungsgeschäften.",
    "experience.home.body":         "Eine repräsentative Auswahl jüngster Transaktionen in Krypto-Insolvenzen, Rentenansprüchen, Kartellvergleichen und komplexen Rechtsstreitigkeiten.",
    "experience.aicopyright.title": "Eine Erfolgsbilanz in anderen Sammelklagen.",
    "experience.aicopyright.body":  "Eine repräsentative Auswahl unserer Beratungstätigkeit für Rechteinhaber, Kläger und institutionelle Käufer im aufkommenden KI-Urheberrechtsbereich.",
    "experience.crypto.title":      "Eine Erfolgsbilanz in digitalen Vermögensinsolvenzen.",
    "experience.crypto.body":       "Eine repräsentative Auswahl von Transaktionen in Krypto-Insolvenzen, Börsenzusammenbrüchen und Umstrukturierungen digitaler Vermögenswerte.",

    "faq.more": "Weitere Fragen? Alle FAQs anzeigen →",

    "bio.seen_in": "Zu sehen in",
    "bio.role":    "Gründer und Geschäftsführender Gesellschafter",

    "service.eyebrow": "Wie wir helfen",
    "service.title":   "Unsere",
    "service.accent":  "Dienstleistungen.",

    "svc.card0.title":    "Direkterwerb",
    "svc.card0.subtitle": "Bilanzkapital",
    "svc.card0.body":     "Unsere engagierten Kapitalpartner ermöglichen es uns, in den größten Fällen wettbewerbsfähige Preise und einen effizienten Abschlussprozess anzubieten.",
    "svc.card1.title":    "Auktionen & Berichterstattung",
    "svc.card1.subtitle": "Prüfbare, vorstandsreife Ergebnisse",
    "svc.card1.body":     "Erzielen Sie eine umfassende Preisfindung mit breiter Vermarktung und einem robusten und transparenten Auktionsprozess.",
    "svc.card2.title":    "Strukturierte Portfolios",
    "svc.card2.subtitle": "Gestärkte Preismacht",
    "svc.card2.body":     "Erhöhen Sie die Marktfähigkeit und Nachfrage, indem Sie verwandte Positionen zu einem einzigen, handelsbereiten Portfolio zusammenfassen.",
    "svc.card3.title":    "Beratungsleistungen",
    "svc.card3.subtitle": "Strategische Begleitung",
    "svc.card3.body":     "Wir stellen Teams aus Rechtsexperten und Beratern zusammen, um die komplexesten grenzüberschreitenden Forderungsstreitigkeiten und Einziehungsstrategien zu bewältigen.",

    "photobreak.text":   "Zu schwierig?",
    "photobreak.accent": "Nicht in unserem Wortschatz.",

    "edge.intro": "Automatisierte Due Diligence und tiefe Integration mit unseren Kapitalquellen ermöglichen schnelles Onboarding, hochkompetitive Preise und einen optimierten, effizienten Abschlussprozess.",

    "getquote.eyebrow": "Bereit, mehr zu erfahren?",
    "getquote.title":   "Sprechen Sie mit",
    "getquote.accent":  "unserem Team.",
    "getquote.body":    "Kontaktieren Sie uns, um Ihre Bedürfnisse zu besprechen. Privat, schnell und sicher.",
  },

  /* ─── Italian ─── */
  it: {
    "nav.copyright":   "Diritti d'Autore",
    "nav.crypto":      "Cripto Bloccate",
    "nav.litigation":  "Finanziamento del Contenzioso",
    "nav.tariff":      "Rimborsi Doganali",
    "nav.briefings":   "Briefing",
    "nav.press":       "Stampa e Pubblicazioni",
    "nav.contact":     "Contattaci",

    "hero.eyebrow":     "Desk OTC per Crediti",
    "hero.title_1":     "Guida strategica.",
    "hero.title_2":     "Liquidità chiavi in mano.",
    "hero.subtitle":    "Per i titolari di diritti di indennizzo — acquistiamo crediti da contenzioso, class action e fallimenti, crediti commerciali, rimborsi e altri asset bloccati.",
    "hero.cta_primary": "Contattaci",
    "hero.cta_secondary": "Cosa copriamo",
    "hero.scroll":      "Scorri",

    "stats.claims_traded":   "Crediti negoziati*",
    "stats.claims_advised":  "Crediti venduti o assistiti*",
    "stats.institutions":    "Istituzioni finanziarie in agenda",
    "stats.footnote":        "*Esperienza precedente alla fondazione di Turnpage Digital.",

    "situations.eyebrow":     "Cosa copriamo",
    "situations.title_1":     "I crediti più complessi",
    "situations.title_2":     "in ruolo.",
    "leadership.eyebrow":     "Leadership",
    "testimonials.eyebrow":   "Cosa dicono i clienti",
    "testimonials.title_1":   "Quando gli altri si arrendono,",
    "testimonials.title_2":   "noi insistiamo.",
    "experience.eyebrow":     "Esperienza Rilevante",
    "edge.eyebrow":           "Il Nostro Vantaggio",
    "edge.title_1":           "Costruiti per muoversi rapidamente",
    "edge.title_2":           "quando conta.",
    "faq.eyebrow":            "FAQ",
    "faq.title_1":            "Le tue domande,",
    "faq.title_2":            "le nostre risposte",

    "closing.eyebrow":  "Chiedi un preventivo",
    "closing.title":    "Perché aspettare?",
    "closing.kicker":   "Contattaci per un preventivo o per saperne di più.",
    "closing.email":    "Email",
    "closing.phone":    "Telefono",
    "closing.cta":      "Contattaci",

    "footer.subscribe_title": "Resta aggiornato sui briefing Turnpage.",
    "footer.subscribe_cta":   "Iscriviti",
    "footer.col.desks":       "Desk",
    "footer.col.resources":   "Risorse",
    "footer.col.firm":        "Azienda",
    "footer.col.legal":       "Legale",
    "footer.firm.contact":    "Contattaci",
    "footer.legal.privacy":   "Informativa sulla privacy",
    "footer.legal.terms":     "Termini d'uso",
    "footer.copyright":       "Turnpage Digital Markets LLC © 2026 · Tutti i diritti riservati",
    "footer.region_label":    "Global",

    "ctabanner.title": "Resta al passo con il ruolo.",
    "ctabanner.cta":   "Leggi i briefing",

    "situations.body": "Gestiamo ogni tipo di credito risarcitorio — dagli accordi di class action e le posizioni dei clienti nel Chapter 11 ai diritti di rimborso e agli asset digitali bloccati. Qualunque sia la situazione, se esiste un percorso verso la liquidità, lo copriamo.",

    "edge.p1.title": "Liquidità praticamente illimitata",
    "edge.p1.body":  "Collaboriamo con i principali asset manager — oltre 500 istituzioni sempre a portata di mano.",
    "edge.p2.title": "Regolamento fulmineo",
    "edge.p2.body":  "L'automazione accelera la due diligence e la chiusura nei casi a maggior volume.",
    "edge.p3.title": "Costruttori di relazioni, non solo negoziatori",
    "edge.p3.body":  "Facciamo il passo in più per capire le vostre esigenze aziendali e strutturare l'accordo giusto per i nostri clienti.",

    "experience.home.title":        "Un track record nei più grandi scambi di crediti.",
    "experience.home.body":         "Un campione rappresentativo di operazioni recenti in insolvenze crypto, crediti pensionistici, accordi antitrust e contenziosi complessi.",
    "experience.aicopyright.title": "Un track record in altre class action.",
    "experience.aicopyright.body":  "Una selezione rappresentativa del nostro lavoro di consulenza a titolari di diritti, membri di class action e acquirenti istituzionali nel panorama emergente del diritto d'autore sull'IA.",
    "experience.crypto.title":      "Un track record nelle insolvenze di asset digitali.",
    "experience.crypto.body":       "Un campione rappresentativo di operazioni in insolvenze crypto, fallimenti di exchange e ristrutturazioni di asset digitali.",

    "faq.more": "Altre domande? Vedi tutte le FAQ →",

    "bio.seen_in": "Come visto in",
    "bio.role":    "Fondatore e Socio Amministratore",

    "service.eyebrow": "Come Aiutiamo",
    "service.title":   "I Nostri",
    "service.accent":  "Servizi.",

    "svc.card0.title":    "Acquisizione Diretta",
    "svc.card0.subtitle": "Capitale di bilancio",
    "svc.card0.body":     "I nostri partner di capitale dedicati ci consentono di offrire prezzi competitivi e un processo di chiusura efficiente nei casi più grandi.",
    "svc.card1.title":    "Aste e Reporting",
    "svc.card1.subtitle": "Risultati verificabili e pronti per il CDA",
    "svc.card1.body":     "Ottieni una scoperta dei prezzi completa con un marketing ad ampia portata e un processo d'asta robusto e trasparente.",
    "svc.card2.title":    "Portafogli Strutturati",
    "svc.card2.subtitle": "Maggiore potere di pricing",
    "svc.card2.body":     "Migliora la commerciabilità e la domanda aggregando interessi correlati in un unico portafoglio pronto per la negoziazione.",
    "svc.card3.title":    "Servizi di Consulenza",
    "svc.card3.subtitle": "Guida strategica",
    "svc.card3.body":     "Assembliamo team di esperti legali e consulenti per affrontare le dispute sui crediti transfrontalieri più complesse e le strategie di recupero.",

    "photobreak.text":   "Troppo difficile?",
    "photobreak.accent": "Non è nel nostro vocabolario.",

    "edge.intro": "La diligenza automatizzata e la profonda integrazione con le nostre fonti di capitale significano un onboarding rapido, prezzi altamente competitivi e un processo di chiusura semplificato ed efficiente.",

    "getquote.eyebrow": "Pronto a saperne di più?",
    "getquote.title":   "Parla con",
    "getquote.accent":  "il nostro team.",
    "getquote.body":    "Contattaci per discutere le tue esigenze. Privato, veloce e sicuro.",
  },

  /* ─── Korean ─── */
  ko: {
    "nav.copyright":   "저작권 청구",
    "nav.crypto":      "잠긴 암호화폐",
    "nav.litigation":  "소송 금융",
    "nav.tariff":      "관세 환급",
    "nav.briefings":   "브리핑",
    "nav.press":       "언론 및 출판",
    "nav.contact":     "문의하기",

    "hero.eyebrow":     "OTC 청구 데스크",
    "hero.title_1":     "전략적 자문.",
    "hero.title_2":     "턴키 유동성.",
    "hero.subtitle":    "보상을 받을 권리가 있는 권리자를 위해 — 당사는 소송, 집단소송 및 파산 청구권, 매출채권, 환급금, 기타 잠긴 자산을 매입합니다.",
    "hero.cta_primary": "문의하기",
    "hero.cta_secondary": "취급 범위",
    "hero.scroll":      "스크롤",

    "stats.claims_traded":   "거래된 청구*",
    "stats.claims_advised":  "매각 또는 자문된 청구*",
    "stats.institutions":    "주요 금융기관 네트워크",
    "stats.footnote":        "*Turnpage Digital 설립 이전의 경력.",

    "situations.eyebrow":     "취급 범위",
    "situations.title_1":     "가장 까다로운 청구를",
    "situations.title_2":     "다룹니다.",
    "leadership.eyebrow":     "리더십",
    "testimonials.eyebrow":   "고객의 말",
    "testimonials.title_1":   "다른 이들이 포기할 때,",
    "testimonials.title_2":   "우리는 파고듭니다.",
    "experience.eyebrow":     "관련 경험",
    "edge.eyebrow":           "우리의 강점",
    "edge.title_1":           "결정적 순간에",
    "edge.title_2":           "빠르게 움직입니다.",
    "faq.eyebrow":            "FAQ",
    "faq.title_1":            "여러분의 질문,",
    "faq.title_2":            "답변드립니다",

    "closing.eyebrow":  "견적 받기",
    "closing.title":    "왜 기다리시나요?",
    "closing.kicker":   "견적이나 자세한 안내가 필요하시면 연락 주십시오.",
    "closing.email":    "이메일",
    "closing.phone":    "전화",
    "closing.cta":      "문의하기",

    "footer.subscribe_title": "Turnpage 최신 브리핑을 받아보세요.",
    "footer.subscribe_cta":   "구독",
    "footer.col.desks":       "데스크",
    "footer.col.resources":   "리소스",
    "footer.col.firm":        "회사",
    "footer.col.legal":       "법적 고지",
    "footer.firm.contact":    "문의하기",
    "footer.legal.privacy":   "개인정보 처리방침",
    "footer.legal.terms":     "이용약관",
    "footer.copyright":       "Turnpage Digital Markets LLC © 2026 · 모든 권리 보유",
    "footer.region_label":    "글로벌",

    "ctabanner.title": "최신 동향을 확인하세요.",
    "ctabanner.cta":   "브리핑 읽기",

    "situations.body": "우리는 집단소송 합의금, 챕터 11 고객 지위에서 환급 권리와 잠긴 디지털 자산에 이르기까지 모든 종류의 보상 청구를 처리합니다. 어떠한 상황에서도 유동성으로 가는 길이 있다면, 저희가 해결해 드립니다.",

    "edge.p1.title": "사실상 무제한 유동성",
    "edge.p1.body":  "당사는 주요 자산운용사와 파트너십을 맺고 있으며 — 500개 이상의 기관과 즉시 연결됩니다.",
    "edge.p2.title": "번개처럼 빠른 결제",
    "edge.p2.body":  "자동화가 대규모 사건에서 실사 및 종결 속도를 높입니다.",
    "edge.p3.title": "단순 딜메이커가 아닌 관계 구축자",
    "edge.p3.body":  "고객의 비즈니스 요구를 깊이 이해하여 최적의 거래 구조를 제공합니다.",

    "experience.home.title":        "최대 규모 청구권 거래에서의 실적.",
    "experience.home.body":         "암호화폐 파산, 연금 청구, 반독점 합의, 복잡한 소송 등 최근 거래의 대표적 샘플입니다.",
    "experience.aicopyright.title": "기타 집단소송에서의 실적.",
    "experience.aicopyright.body":  "신흥 AI 저작권 분야에서 권리자, 집단소송 참여자, 기관 투자자를 자문한 대표적 사례입니다.",
    "experience.crypto.title":      "디지털 자산 파산에서의 실적.",
    "experience.crypto.body":       "암호화폐 파산, 거래소 실패, 디지털 자산 구조조정에 걸친 대표 거래 샘플입니다.",

    "faq.more": "더 궁금하신 점이 있으신가요? 모든 FAQ 보기 →",

    "bio.seen_in": "소개된 매체",
    "bio.role":    "창업자 및 대표 파트너",

    "service.eyebrow": "지원 방법",
    "service.title":   "당사의",
    "service.accent":  "서비스.",

    "svc.card0.title":    "직접 인수",
    "svc.card0.subtitle": "대차대조표 자본",
    "svc.card0.body":     "전담 자본 파트너들 덕분에 가장 큰 사건에서 경쟁력 있는 가격과 효율적인 종결 절차를 제공할 수 있습니다.",
    "svc.card1.title":    "경매 및 보고",
    "svc.card1.subtitle": "감사 가능한 이사회 보고 결과",
    "svc.card1.body":     "광범위한 마케팅과 강력하고 투명한 경매 프로세스로 포괄적인 가격 발견을 달성합니다.",
    "svc.card2.title":    "구조화 포트폴리오",
    "svc.card2.subtitle": "향상된 가격 협상력",
    "svc.card2.body":     "관련 이해관계를 단일 포트폴리오로 집계하여 거래 준비를 완료하고 시장성과 수요를 강화합니다.",
    "svc.card3.title":    "자문 서비스",
    "svc.card3.subtitle": "전략적 지침",
    "svc.card3.body":     "가장 복잡한 국경 간 청구 분쟁과 회수 전략을 처리하기 위해 법률 전문가 및 자문가 팀을 구성합니다.",

    "photobreak.text":   "너무 어렵다고요?",
    "photobreak.accent": "저희 사전에 없는 말입니다.",

    "edge.intro": "자동화된 실사와 자본 출처와의 깊은 통합은 빠른 온보딩, 매우 경쟁력 있는 가격 및 효율적인 종결 프로세스를 의미합니다.",

    "getquote.eyebrow": "더 알고 싶으신가요?",
    "getquote.title":   "저희 팀과",
    "getquote.accent":  "상담하세요.",
    "getquote.body":    "자금 조달 필요에 대해 논의하려면 문의하세요. 비공개, 신속 및 보안.",
  },

  /* ─── Mandarin (Simplified) ─── */
  zh: {
    "nav.copyright":   "版权索赔",
    "nav.crypto":      "锁定加密资产",
    "nav.litigation":  "诉讼融资",
    "nav.tariff":      "关税退款",
    "nav.briefings":   "简报",
    "nav.press":       "媒体与出版",
    "nav.contact":     "联系我们",

    "hero.eyebrow":     "OTC 索赔交易台",
    "hero.title_1":     "战略指导。",
    "hero.title_2":     "一站式流动性。",
    "hero.subtitle":    "面向有权获得赔偿的权利人 — 我们收购诉讼、集体诉讼和破产索赔、应收账款、退款及其他锁定资产。",
    "hero.cta_primary": "联系我们",
    "hero.cta_secondary": "我们涵盖的范围",
    "hero.scroll":      "向下滚动",

    "stats.claims_traded":   "已交易索赔*",
    "stats.claims_advised":  "已出售或顾问索赔*",
    "stats.institutions":    "金融机构合作网络",
    "stats.footnote":        "*Turnpage Digital 成立之前的经验。",

    "situations.eyebrow":     "我们涵盖的范围",
    "situations.title_1":     "处理最棘手的",
    "situations.title_2":     "索赔案件。",
    "leadership.eyebrow":     "团队",
    "testimonials.eyebrow":   "客户评价",
    "testimonials.title_1":   "当他人放弃时,",
    "testimonials.title_2":   "我们深入跟进。",
    "experience.eyebrow":     "相关经验",
    "edge.eyebrow":           "我们的优势",
    "edge.title_1":           "在关键时刻",
    "edge.title_2":           "迅速行动。",
    "faq.eyebrow":            "FAQ",
    "faq.title_1":            "您的问题,",
    "faq.title_2":            "我们解答",

    "closing.eyebrow":  "获取报价",
    "closing.title":    "何必等待?",
    "closing.kicker":   "联系我们获取报价或了解更多信息。",
    "closing.email":    "电子邮件",
    "closing.phone":    "电话",
    "closing.cta":      "联系我们",

    "footer.subscribe_title": "了解 Turnpage 最新简报。",
    "footer.subscribe_cta":   "订阅",
    "footer.col.desks":       "业务部门",
    "footer.col.resources":   "资源",
    "footer.col.firm":        "公司",
    "footer.col.legal":       "法律",
    "footer.firm.contact":    "联系我们",
    "footer.legal.privacy":   "隐私政策",
    "footer.legal.terms":     "使用条款",
    "footer.copyright":       "Turnpage Digital Markets LLC © 2026 · 版权所有",
    "footer.region_label":    "全球",

    "ctabanner.title": "紧跟案件进展。",
    "ctabanner.cta":   "阅读简报",

    "situations.body": "我们处理各类补偿索赔——从集体诉讼和解金、第11章客户权益，到退款权利和锁定数字资产。无论情况如何，只要有流动性的途径，我们都能提供支持。",

    "edge.p1.title": "近乎无限的流动性",
    "edge.p1.body":  "我们与主要资产管理机构合作——超过500家机构随时待命。",
    "edge.p2.title": "闪电般快速结算",
    "edge.p2.body":  "自动化加速了大规模案件的尽职调查和交割。",
    "edge.p3.title": "关系缔造者，而不仅仅是交易撮合者",
    "edge.p3.body":  "我们深入了解您的业务需求，为客户构建最合适的交易结构。",

    "experience.home.title":        "在最大规模索赔交易中的业绩记录。",
    "experience.home.body":         "涵盖加密货币破产、养老金索赔、反垄断和解及复杂诉讼的近期交易代表性样本。",
    "experience.aicopyright.title": "在其他集体诉讼中的业绩记录。",
    "experience.aicopyright.body":  "我们在新兴人工智能版权领域为权利人、集体诉讼成员及机构买家提供咨询服务的代表性案例。",
    "experience.crypto.title":      "在数字资产破产中的业绩记录。",
    "experience.crypto.body":       "涵盖加密货币破产、交易所倒闭及数字资产重组的代表性交易样本。",

    "faq.more": "还有更多问题？查看所有 FAQ →",

    "bio.seen_in": "媒体报道",
    "bio.role":    "创始人兼常务合伙人",

    "service.eyebrow": "我们的服务方式",
    "service.title":   "我们的",
    "service.accent":  "服务。",

    "svc.card0.title":    "直接收购",
    "svc.card0.subtitle": "资产负债表资本",
    "svc.card0.body":     "我们专属的资本合作伙伴使我们能够在最大规模的案件中提供具有竞争力的定价和高效的交割流程。",
    "svc.card1.title":    "拍卖与报告",
    "svc.card1.subtitle": "可审计、适合董事会的结果",
    "svc.card1.body":     "通过广泛的市场推广和强大透明的拍卖流程实现全面的价格发现。",
    "svc.card2.title":    "结构化投资组合",
    "svc.card2.subtitle": "增强定价能力",
    "svc.card2.body":     "通过将相关权益汇集到单一投资组合中来提升可市性和需求，随时可交易。",
    "svc.card3.title":    "顾问服务",
    "svc.card3.subtitle": "战略指导",
    "svc.card3.body":     "我们组建法律专家和顾问团队，应对最复杂的跨境索赔纠纷和回收策略。",

    "photobreak.text":   "太难了？这个词",
    "photobreak.accent": "不在我们的字典里。",

    "edge.intro": "自动化尽职调查和与资本来源的深度整合意味着快速入驻、极具竞争力的定价以及高效流畅的交割流程。",

    "getquote.eyebrow": "准备好了解更多？",
    "getquote.title":   "与我们的团队",
    "getquote.accent":  "交流一下。",
    "getquote.body":    "联系我们讨论您的融资需求。私密、快捷、安全。",
  },
};
