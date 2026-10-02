/* ============================================================================
   content.js  —  EDIT THIS FILE ONLY
   ----------------------------------------------------------------------------
   Every piece of text on this site lives here. terminal.js reads from this
   object; it contains no logic worth editing.

   Search this file for  PLACEHOLDER  to find everything you still need to fill
   in. Nothing breaks if a placeholder is left in place — it just shows up
   on screen as-is, so you can see the layout before the real content lands.
   ============================================================================ */

window.CONTENT = {
  /* ---------------------------------------------------------------- basics */
  meta: {
    name: 'danu',
    tagline: 'Cybersecurity student',          // PLACEHOLDER: your one-liner
    host: 'portfolio',                        // appears in the prompt
    user: 'guest',                            // appears in the prompt
    location: 'PLACEHOLDER — your city, country',
    pageTitle: 'danu — terminal portfolio',
  },

  /* ASCII banner, one string per line. 5 rows, block letters.
     Keep lines the same width or the art will shear. */
  banner: [
    '███  ███ ███  █  █',
    '█  █ █  █ █ ██ █  █',
    '█  █ ████ █  █ █  █',
    '█  █ █  █ █  █ █  █',
    '███  ███ █  █  ██ ',
  ],

  /* Printed under the banner. Keep it short. */
  welcome: [
    'Welcome. This site is a Unix shell that happens to be a portfolio.',
    'Type `help` for the command list, or tap a chip below on mobile.',
  ],

  /* Shown at the bottom of every `help` output. */
  helpFooter: [
    'Tip: Tab completes commands and file names. Ctrl+L clears the screen.',
    'Tip: Up/Down arrows walk through your command history.',
    'Tip: Escape leaves the input so Tab can reach the links above.',
  ],

  /* ------------------------------------------------------------------ about */
  about: {
    heading: 'About',
    /* An array of paragraphs. Empty strings become blank lines. */
    paragraphs: [
      "Hi, I'm danu. PLACEHOLDER: two or three sentences about who you are and what you're currently studying or building.",
      'PLACEHOLDER: what you enjoy about security — the kind of thing you would happily spend a whole Saturday on.',
      'PLACEHOLDER: what you are looking for right now (an internship, a mentorship, collaborators on a project).',
    ],
    facts: [
      ['Role', 'PLACEHOLDER — Cybersecurity student'],
      ['Focus', 'PLACEHOLDER — e.g. network security, web app security'],
      ['Learning', 'PLACEHOLDER — e.g. OSCP, TryHackMe, university coursework'],
      ['Status', 'Open to PLACEHOLDER — internships / freelance / collaboration'],
    ],
  },

  /* --------------------------------------------------------------- projects */
  /* Numbered by position. `projects` lists them, `project 1` shows one.
     `id` must be a number; it is the index used in the `project <n>` command. */
  projects: [
    {
      id: 1,
      name: 'PLACEHOLDER project one',
      status: 'in progress',                     // e.g. in progress / shipped / archived
      year: '2026',
      summary: 'PLACEHOLDER: one sentence on what it does.',
      description: [
        'PLACEHOLDER: a short paragraph. What problem does it solve, who is it for, what did you build yourself?',
        'PLACEHOLDER: anything interesting you learned or got stuck on while building it.',
      ],
      stack: ['PLACEHOLDER', 'PLACEHOLDER'],
      links: [
        { label: 'source', url: 'https://github.com/danuv98' },   // PLACEHOLDER
        { label: 'write-up', url: 'https://github.com/danuv98' }, // PLACEHOLDER
      ],
    },
    {
      id: 2,
      name: 'PLACEHOLDER project two',
      status: 'shipped',
      year: '2025',
      summary: 'PLACEHOLDER: one sentence on what it does.',
      description: [
        'PLACEHOLDER: a short paragraph about the problem and your approach.',
      ],
      stack: ['PLACEHOLDER'],
      links: [
        { label: 'source', url: 'https://github.com/danuv98' },   // PLACEHOLDER
      ],
    },
    {
      id: 3,
      name: 'PLACEHOLDER project three',
      status: 'shipped',
      year: '2024',
      summary: 'PLACEHOLDER: one sentence on what it does.',
      description: [
        'PLACEHOLDER: a short paragraph about the problem and your approach.',
      ],
      stack: ['PLACEHOLDER'],
      links: [],
    },
  ],

  /* ----------------------------------------------------------------- skills */
  /* Each entry is a heading followed by the items under it. */
  skills: [
    {
      group: 'Languages',
      items: ['PLACEHOLDER', 'PLACEHOLDER', 'PLACEHOLDER'],
    },
    {
      group: 'Security',
      items: ['PLACEHOLDER', 'PLACEHOLDER', 'PLACEHOLDER'],
    },
    {
      group: 'Tools',
      items: ['PLACEHOLDER', 'PLACEHOLDER'],
    },
    {
      group: 'Learning',
      items: ['PLACEHOLDER', 'PLACEHOLDER'],
    },
  ],

  /* ---------------------------------------------------------------- contact */
  /* `url` is optional for plain text rows; email rows may use a bare address. */
  contact: [
    { label: 'email',    value: 'placeholder@example.com', url: 'mailto:placeholder@example.com' }, // PLACEHOLDER
    { label: 'github',   value: 'github.com/danuv98',       url: 'https://github.com/danuv98' },
    { label: 'instagram', value: 'instagram.com/danuv98',    url: 'https://instagram.com/danuv98' },
    { label: 'linkedin', value: 'PLACEHOLDER — linkedin.com/in/yourhandle', url: '' }, // PLACEHOLDER
  ],

  /* ----------------------------------------------------------------- resume */
  resume: {
    label: 'danu-cv.pdf',
    url: 'resume.pdf',        // PLACEHOLDER: drop the PDF next to index.html
    note: 'PLACEHOLDER: one line on what the CV covers.',
  },

  /* ------------------------------------------------------------- easter eggs */
  /* These feed the hidden commands `sudo hire-me`, `matrix`, `exit` and `danu`. */
  eggs: {
    sudoHireMe: {
      prompt: 'sudo: are you absolutely sure you want to hire danu? [y/N]',
      answer: [
        'Access granted. You have unlocked: one enthusiastic candidate.',
        'Throws: curiosity, persistence, and a low tolerance for guesswork.',
        'Currently studying: PLACEHOLDER — security.',
        'Contact: https://github.com/danuv98',
      ],
    },
    matrix: {
      answer: [
        'Wake up, danu...',
        'The portfolio has you. Follow the white rabbit.',
        '(you can switch back with `theme dracula`)',
      ],
    },
    exit: {
      answer: [
        'logout: there is no escape from a portfolio.',
        'The prompt will wait. Type `help` whenever you are ready.',
      ],
    },
  },

  /* Shown in the mobile chip bar. Only argument-free commands belong here. */
  quickCommands: [
    { label: 'help',     command: 'help' },
    { label: 'about',    command: 'about' },
    { label: 'projects', command: 'projects' },
    { label: 'skills',   command: 'skills' },
    { label: 'contact',  command: 'contact' },
    { label: 'ls',       command: 'ls' },
    { label: 'theme',    command: 'theme' },
    { label: 'whoami',   command: 'whoami' },
    { label: 'clear',    command: 'clear' },
  ],
};