/* ============================================================================
   content.js  —  EDIT THIS FILE ONLY
   ----------------------------------------------------------------------------
   Every piece of text on this site lives here. terminal.js reads from this
   object; it contains no logic worth editing.

   Update the content in this file to personalize the portfolio.
   ============================================================================ */

window.CONTENT = {
  /* ---------------------------------------------------------------- basics */
  meta: {
    name: 'danu',
    tagline: 'Cybersecurity student',
    host: 'portfolio',                        // appears in the prompt
    user: 'guest',                            // appears in the prompt
    pageTitle: 'danu — terminal portfolio',
  },

  /* ASCII banner transcribed from banner.rtf. */
  banner: [
    "                                    ,--.",
    "   ,--.                         .-,|  |,-.",
    " ,-|  | ,--,--.,--,--, ,--.,--. _\\ '  ' /_",
    "' .-. |' ,-.  ||      \\|  ||  |(__      __)",
    "\\ `-' |\\ '-'  ||  ||  |'  ''  '  / .  . \\",
    " `---'  `--`--'`--''--' `----'  `-'|  |`-'",
    "                                   `--'",
  ].map((line, index) => (index === 0 ? line.slice(1) : line) + ' '.repeat([5, 2, 2, 1, 3, 2, 5][index])),

  /* Printed under the banner. Keep it short. */
  welcome: [
    'Welcome. This site is a Unix shell that happens to be a portfolio.',
    'Type `help` for the command list, or tap a chip below on mobile.',
  ],

  /* ------------------------------------------------------------------ about */
  about: {
    heading: 'About',
    /* An array of paragraphs. Empty strings become blank lines. */
    paragraphs: [
      "Hi, I'm danu, a cybersecurity student.",
      'I am studying cybersecurity at UTM and building my knowledge in the field.',
    ],
    facts: [
      ['Role', 'Cybersecurity student'],
      ['Learning', 'UTM Cybersecurity'],
    ],
  },

  /* --------------------------------------------------------------- projects */
  /* GitHub profile where the project repositories are published. */
  projects: [
    {
      id: 1,
      name: 'GitHub repositories',
      status: 'published',
      year: '2026',
      summary: 'Browse my projects on GitHub.',
      description: ['My projects and source code are available on my GitHub profile.'],
      stack: [],
      links: [
        { label: 'github', url: 'https://github.com/danuv98' },
      ],
    },
  ],

  /* ----------------------------------------------------------------- skills */
  /* Each entry is a heading followed by the items under it. */
  skills: [
    {
      group: 'Languages',
      items: ['Russian', 'English', 'Romanian'],
    },
    {
      group: 'Learning',
      items: ['UTM Cybersecurity'],
    },
  ],

  /* ---------------------------------------------------------------- contact */
  /* `url` is optional for plain text rows; it is omitted for rows with no link. */
  contact: [
    { label: 'github',   value: 'github.com/danuv98',    url: 'https://github.com/danuv98' },
    { label: 'instagram', value: 'instagram.com/danuv98', url: 'https://instagram.com/danuv98' },
  ],

  /* ------------------------------------------------------------- easter eggs */
  /* These feed the hidden commands `sudo hire-me`, `matrix`, `exit` and `danu`. */
  eggs: {
    sudoHireMe: {
      prompt: 'sudo: are you absolutely sure you want to hire danu? [y/N]',
      answer: [
        'Access granted. You have unlocked: one enthusiastic candidate.',
        'Throws: curiosity, persistence, and a low tolerance for guesswork.',
        'Currently studying: UTM Cybersecurity.',
        'Contact: https://github.com/danuv98',
      ],
    },
    matrix: {
      answer: [
        'Wake up, danu...',
        'The portfolio has you. Follow the white rabbit.',
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
