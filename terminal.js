/* ============================================================================
   terminal.js — the engine. You should not need to edit this file.
   ----------------------------------------------------------------------------
   How it fits together:

     content.js   all of your text, as data
     FS           a fake filesystem built *from* that data, so `cat ~/about.txt`
                  and the `about` command can never drift apart
     COMMANDS     one declarative entry per command; `help`, tab-completion and
                  `man` are all generated from this list
     blocks       commands return plain-data blocks ({type:'list'}, …) instead of
                  HTML strings, and one renderer turns them into DOM. That keeps
                  your content inert, handles links in one place, and lets the
                  typing animation work on any block shape.
   ========================================================================== */

(function () {
  'use strict';

  const C = window.CONTENT;

  /* ------------------------------------------------------------------ dom */
  const screenEl = document.getElementById('screen');
  const promptEl = document.getElementById('prompt');
  const fieldEl = document.querySelector('.field');
  const inputEl = document.getElementById('input');
  const cursorEl = document.getElementById('cursor');
  const measureEl = document.getElementById('measure');
  const chipsEl = document.getElementById('chips');
  const liveEl = document.getElementById('live');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ----------------------------------------------------------------- state */
  const state = {
    cwd: [],            // path as an array of segments, [] is ~
    history: [],        // submitted command lines
    histIndex: -1,      // -1 means "editing a fresh line"
    draft: '',          // the line the user was typing before pressing Up
    typing: false,      // is the typing animation running?
    skip: false,        // set when the user asks to skip the animation
    motion: null,       // null = follow the OS setting
  };

  const motionOff = () =>
    state.motion === false || (state.motion === null && prefersReduced.matches);

  /* --------------------------------------------------------------- helpers */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const text = (t) => String(t);
  const slug = (s) =>
    String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

  function el(tag, cls, txt) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  /* Turn a string into text nodes + anchors, auto-linking anything URL-shaped.
     Bare domains are only linked when they carry a path (github.com/danuv98),
     which keeps sentences like "e.g." and "notes.txt" from turning into links. */
  const URL_RE = new RegExp(
    '(https?:\\/\\/[^\\s<>()]+' +
    '|www\\.[^\\s<()]+' +
    '|[\\w.+-]+@[\\w-]+\\.[\\w.]{2,}' +
    '|(?:[a-z0-9-]+\\.)+(?:com|dev|io|me|org|net|sh|app|xyz|ru|gg|co|info|site)\\/[^\\s<>()]*)',
    'g'
  );

  function fillText(node, str) {
    const src = text(str);
    let last = 0;
    let m;
    URL_RE.lastIndex = 0;

    while ((m = URL_RE.exec(src)) !== null) {
      const raw = m[0];

      // Don't swallow trailing punctuation such as the full stop in "see x.com."
      const trail = /[.,;:!?)\]]+$/.exec(raw);
      const body = trail ? raw.slice(0, raw.length - trail[0].length) : raw;

      if (m.index > last) node.appendChild(document.createTextNode(src.slice(last, m.index)));

      let href = body;
      if (/^https?:\/\//.test(body)) {
        href = body;
      } else if (/^www\./.test(body)) {
        href = 'https://' + body;
      } else if (body.indexOf('@') !== -1 && !/^\\w+:/.test(body)) {
        href = 'mailto:' + body;
      } else {
        href = 'https://' + body;
      }

      const a = el('a', null, body);
      a.href = href;
      if (!/^mailto:/.test(href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      node.appendChild(a);

      last = m.index + raw.length;
      if (trail) node.appendChild(document.createTextNode(trail[0]));
    }

    if (last < src.length) node.appendChild(document.createTextNode(src.slice(last)));
    return node;
  }

  /* `item` is a string or {text, url, sub}. */
  function fillItem(node, item) {
    if (item == null) return node;
    if (typeof item === 'string' || typeof item === 'number') {
      fillText(node, item);
      return node;
    }
    if (item.url) {
      const a = el('a', null, item.text != null ? item.text : item.url);
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      node.appendChild(a);
    } else {
      fillText(node, item.text != null ? item.text : '');
    }
    if (item.sub) {
      const s = el('span', 'dim', '  ' + item.sub);
      node.appendChild(s);
    }
    return node;
  }

  /* ============================================================ fake filesystem
     Built from CONTENT, so the filesystem is a view of your content rather
     than a second copy of it that can go stale.                            */

  function aboutText() {
    const out = [C.about.heading, ''];
    C.about.paragraphs.forEach((p) => { out.push(p, ''); });
    out.push('facts');
    C.about.facts.forEach(([k, v]) => out.push('  ' + k + ': ' + v));
    return out.join('\n');
  }

  function skillsText() {
    const out = [];
    C.skills.forEach((g, i) => {
      if (i) out.push('');
      out.push(g.group + ':');
      out.push('  ' + g.items.join(', '));
    });
    return out.join('\n');
  }

  function contactText() {
    return C.contact
      .map((r) => r.label.padEnd(10) + '  ' + r.value)
      .join('\n');
  }

  function resumeText() {
    return [
      C.resume.label,
      '',
      C.resume.url,
      '',
      C.resume.note,
    ].join('\n');
  }

  function projectDoc(p) {
    const out = [
      p.name,
      '='.repeat(Math.max(p.name.length, 3)),
      '',
      'status  ' + p.status,
      'year    ' + p.year,
      'stack   ' + p.stack.join(', '),
      '',
      p.summary,
      '',
    ];
    p.description.forEach((d) => out.push(d, ''));
    if (p.links.length) {
      out.push('links');
      p.links.forEach((l) => out.push('  ' + l.label + '  ' + l.url));
    }
    return out.join('\n').replace(/\n+$/, '');
  }

  function projectsIndexText() {
    const out = ['projects/', ''];
    C.projects.forEach((p) => {
      out.push(p.id + '-' + slug(p.name) + '.txt   ' + p.name + ' (' + p.status + ')');
    });
    out.push('', 'Use `project <n>` for a summary, or `cat` on a file above.');
    return out.join('\n');
  }

  const file = (body) => ({ type: 'file', body });
  const dir = (children) => ({ type: 'dir', children });

  const projectFiles = {};
  C.projects.forEach((p) => { projectFiles[p.id + '-' + slug(p.name) + '.txt'] = file(projectDoc(p)); });
  projectFiles['index.txt'] = file(projectsIndexText());

  const FS = dir({
    'about.txt': file(aboutText()),
    'skills.txt': file(skillsText()),
    'contact.txt': file(contactText()),
    'resume.txt': file(resumeText()),
    'projects': dir(projectFiles),
  });

  /* ------------------------------------------------------------ path logic */

  function toSegments(p) {
    let s = (p == null ? '' : String(p)).trim();
    if (s === '') return state.cwd.slice();

    let segs;
    if (s === '~') segs = [];
    else if (s.slice(0, 2) === '~/') segs = s.slice(2).split('/');
    else if (s.charAt(0) === '/') segs = s.slice(1).split('/');
    else segs = state.cwd.concat(s.split('/'));

    const out = [];
    for (const seg of segs) {
      if (seg === '' || seg === '.') continue;
      if (seg === '..') out.pop();
      else out.push(seg);
    }
    return out;
  }

  function lookup(segs) {
    let node = FS;
    for (const seg of segs) {
      if (node.type !== 'dir') return null;
      if (!Object.prototype.hasOwnProperty.call(node.children, seg)) return null;
      node = node.children[seg];
    }
    return node;
  }

  const disp = (segs) => '~' + segs.map((s) => '/' + s).join('');
  const cwdPath = () => disp(state.cwd);

  /* ================================================================ blocks */
  const B = {
    text: (t, cls) => ({ type: 'text', text: t, cls: cls }),
    error: (t) => ({ type: 'error', text: t }),
    pre: (t, cls) => ({ type: 'pre', text: t, cls: cls }),
    banner: (t) => ({ type: 'banner', text: t }),
    list: (items, cls) => ({ type: 'list', items: items, cls: cls }),
    kv: (rows) => ({ type: 'kv', rows: rows }),
    tags: (items) => ({ type: 'tags', items: items }),
    table: (headers, rows, nums) => ({ type: 'table', headers: headers, rows: rows, nums: nums }),
    spacer: () => ({ type: 'spacer' }),
    raw: (node) => ({ type: 'raw', node: node }),
  };

  const wrap = (node, cls) => {
    const box = el('div', 'block' + (cls ? ' ' + cls : ''));
    box.appendChild(node);
    return box;
  };

  const RENDER = {
    text: (b) => {
      const cls = b.cls === 'error' || b.cls === 'red' ? 'error' : b.cls;
      const d = el('div', 'line' + (cls ? ' ' + cls : ''));
      fillText(d, b.text);
      return { box: wrap(d), mode: 'type', host: d };
    },
    error: (b) => {
      const d = el('div', 'line error');
      fillText(d, b.text);
      return { box: wrap(d), mode: 'type', host: d };
    },
    pre: (b) => {
      const pre = el('pre', b.cls || null);
      pre.textContent = b.text;
      return { box: wrap(pre), mode: 'type', host: pre };
    },
    banner: (b) => {
      const pre = el('pre', 'banner');
      pre.textContent = b.text;
      return { box: wrap(pre), mode: 'type', host: pre };
    },
    list: (b) => {
      const ul = el('ul', 'list' + (b.cls ? ' ' + b.cls : ''));
      b.items.forEach((item) => {
        const li = el('li');
        const body = el('span', 'body');
        fillItem(body, item);
        li.appendChild(body);
        ul.appendChild(li);
      });
      return { box: wrap(ul), mode: 'type', host: ul };
    },
    kv: (b) => {
      const dl = el('dl', 'kv');
      b.rows.forEach(([k, v]) => {
        const dt = el('dt', null, k);
        const dd = el('dd');
        fillItem(dd, v);
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      return { box: wrap(dl), mode: 'type', host: dl };
    },
    tags: (b) => {
      const box = el('div', 'tags');
      b.items.forEach((t) => box.appendChild(el('span', 'tag', t)));
      return { box: wrap(box), mode: 'type', host: box };
    },
    table: (b) => {
      const nums = b.nums || [];
      const t = el('table', 'table');
      const thead = el('thead');
      const htr = el('tr');
      b.headers.forEach((h, i) => htr.appendChild(el('th', nums[i] ? 'num' : null, h)));
      thead.appendChild(htr);
      t.appendChild(thead);

      const tbody = el('tbody');
      b.rows.forEach((row) => {
        const tr = el('tr');
        row.forEach((cell, i) => {
          const td = el('td', nums[i] ? 'num' : null);
          fillItem(td, cell);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      t.appendChild(tbody);
      return { box: wrap(t), mode: 'type', host: t };
    },
    spacer: () => ({ box: el('div', 'spacer'), mode: 'none' }),
    raw: (b) => ({ box: b.node, mode: 'type', host: b.node }),
  };

  /* Text version of a block, used for the screen-reader status line. */
  function plain(b) {
    switch (b.type) {
      case 'list':
        return b.items
          .map((i) => '- ' + (typeof i === 'string' ? i : i && i.text != null ? i.text : ''))
          .join('\n');
      case 'kv':
        return b.rows.map((r) => r[0] + ': ' + (typeof r[1] === 'string' ? r[1] : (r[1] || {}).text || '')).join('\n');
      case 'tags':
        return b.items.join(', ');
      case 'table':
        return [b.headers.join('  ')]
          .concat(b.rows.map((r) => r.map((c) => (typeof c === 'string' ? c : (c || {}).text || '')).join('  ')))
          .join('\n');
      default:
        return b.text == null ? '' : String(b.text);
    }
  }

  /* ==================================================== output + animation */

  function scrollToEnd() {
    screenEl.scrollTop = screenEl.scrollHeight;
  }

  /* Collect every text node, in document order. */
  function textNodes(root) {
    const out = [];
    (function walk(node) {
      for (const child of node.childNodes) {
        if (child.nodeType === 3) out.push(child);
        else if (child.nodeType === 1) walk(child);
      }
    })(root);
    return out;
  }

  /* Reveal the host's existing content one character at a time, continuously.
     Every block type goes through here — text, lists, tags and tables alike —
     so output streams the whole way instead of appearing bar by bar.

     Working on the already-built DOM (rather than assigning textContent) means
     links and coloured spans survive the animation.
     `gen` is the screen generation this output belongs to: if the screen is
     cleared mid-animation the generation moves on and the rest is abandoned. */
  async function typeDom(host, gen) {
    if (motionOff() || state.skip) return;

    const nodes = textNodes(host);
    const full = nodes.map((n) => n.data);
    const total = full.reduce((a, s) => a + s.length, 0);
    if (!total) return;

    // Steady cadence for short output; quicker for long files so `cat` of a
    // big document doesn't crawl. Never a chunk bigger than one character.
    const delay = total > 300 ? 1 : total > 120 ? 2 : 6;

    nodes.forEach((n) => { n.data = ''; });

    let shown = 0;
    for (let i = 1; i <= total && !state.skip && gen === screenGen; i++) {
      shown = i;
      let rem = i;
      for (let k = 0; k < nodes.length && rem > 0; k++) {
        const take = Math.min(rem, full[k].length);
        nodes[k].data = full[k].slice(0, take);
        rem -= take;
      }
      if (i % 12 === 0) scrollToEnd();
      await sleep(delay);
    }

    // Restore the full text whether we finished, were skipped, or were cut off.
    nodes.forEach((n, k) => { n.data = full[k]; });
    scrollToEnd();
  }

  async function emit(block, gen) {
    const made = RENDER[block.type](block);
    if (gen !== screenGen) return;
    screenEl.appendChild(made.box);
    scrollToEnd();
    try {
      if (made.mode !== 'none') await typeDom(made.host, gen);
    } finally {
      scrollToEnd();
    }
  }

  /* Everything printed goes through one queue so output stays in order even
     when a command is still animating while the user types the next one.
     `pending` counts blocks still to come, and drives both the "you can skip
     this" state and when the skip flag is safe to clear. */
  let queue = Promise.resolve();
  let pending = 0;
  let screenGen = 0;
  const said = [];

  function say(blocks) {
    const list = [].concat(blocks).filter(Boolean);
    if (!list.length) return list;

    said.push(list.map(plain).join('\n'));
    pending += list.length;
    state.typing = true;

    queue = queue
      .then(async () => {
        const gen = screenGen;
        for (const b of list) {
          await emit(b, gen);
          pending -= 1;
          // The screen was cleared underneath us; drop the rest of this batch.
          if (gen !== screenGen) { pending = 0; return; }
        }
        if (pending === 0) {
          state.skip = false;
          state.typing = false;
        }
      })
      .catch((err) => {
        // One bad block must not poison the queue for every later command.
        pending = 0;
        state.skip = false;
        return emit(B.error('internal error: ' + (err && err.message ? err.message : err)), screenGen);
      });

    return list;
  }

  function announce() {
    if (!liveEl) return;
    const joined = said.join('\n').trim();
    liveEl.textContent = joined.slice(0, 1200);
  }

  /* ============================================================== commands */

  const COMMANDS = [];
  function cmd(spec) { COMMANDS.push(spec); return spec; }

  const findCommand = (name) =>
    COMMANDS.find((c) => c.name === name || (c.aliases || []).includes(name));

  /* --- info --------------------------------------------------------------- */

  cmd({
    name: 'about',
    group: 'info',
    usage: 'about',
    desc: 'a short bio',
    run() {
      return [
        B.text(C.meta.name + ' — ' + C.meta.tagline, 'green'),
        B.spacer(),
        ...C.about.paragraphs.map((p) => (p ? B.text(p) : B.spacer())),
        B.spacer(),
        B.kv(C.about.facts),
      ];
    },
  });

  cmd({
    name: 'projects',
    group: 'info',
    usage: 'projects',
    desc: 'list projects with numbers',
    run() {
      const rows = C.projects.map((p) => [
        String(p.id),
        { text: p.name, sub: '(' + p.status + ')' },
        p.summary,
        { text: p.stack.join(', ') },
      ]);
      return [
        B.text('projects', 'accent'),
        B.table(['#', 'name', 'summary', 'stack'], rows, [true, false, false, false]),
        B.text('Use `project <n>` for details.', 'dim'),
      ];
    },
  });

  cmd({
    name: 'project',
    group: 'info',
    usage: 'project <n>',
    args: '<n>',
    desc: 'details and links for one project',
    completeArg() {
      return C.projects.map((p) => String(p.id));
    },
    run(args) {
      const n = Number(args[0]);
      if (!args.length) return [B.error('project: missing number. Try `project ' + (C.projects[0] ? C.projects[0].id : '1') + '`.')];
      const p = C.projects.find((x) => x.id === n);
      if (!p) return [B.error('project: no such project: ' + args[0] + '. Try `projects`.')];

      const out = [
        B.text(p.id + '. ' + p.name, 'accent'),
        B.text(p.summary, 'green'),
        B.spacer(),
        B.kv([
          ['status', p.status],
          ['year', p.year],
          ['stack', p.stack.join(', ')],
        ]),
        ...p.description.map((d) => B.text(d)),
        B.spacer(),
      ];
      if (p.links.length) {
        out.push(B.text('links', 'accent'));
        out.push(B.list(p.links.map((l) => ({ text: l.label, url: l.url }))));
      } else {
        out.push(B.text('links: none published yet', 'dim'));
      }
      out.push(B.text('Try `cat ~/projects/' + p.id + '-' + slug(p.name) + '.txt` for the plain-text version.', 'dim'));
      return out;
    },
  });

  cmd({
    name: 'skills',
    group: 'info',
    usage: 'skills',
    desc: 'skills, grouped by category',
    run() {
      const out = [B.text('skills', 'accent')];
      C.skills.forEach((g, i) => {
        if (i) out.push(B.spacer());
        out.push(B.text(g.group, 'purple'));
        out.push(B.tags(g.items));
      });
      return out;
    },
  });

  cmd({
    name: 'contact',
    group: 'info',
    usage: 'contact',
    desc: 'my social links',
    run() {
      return [
        B.text('contact', 'accent'),
        B.spacer(),
        B.kv(C.contact.map((r) => [r.label, r.url ? { text: r.value, url: r.url } : { text: r.value }])),
      ];
    },
  });

  cmd({
    name: 'resume',
    group: 'info',
    usage: 'resume',
    desc: 'link to my CV',
    run() {
      return [
        B.text('resume', 'accent'),
        B.spacer(),
        B.list([{ text: C.resume.label, url: C.resume.url }]),
        B.text(C.resume.note, 'dim'),
      ];
    },
  });

  /* --- fake filesystem ---------------------------------------------------- */

  cmd({
    name: 'ls',
    group: 'files',
    usage: 'ls [-l] [path]',
    desc: 'list directory contents',
    run(args) {
      const long = args.some((a) => a.charAt(0) === '-' && a.indexOf('l') !== -1);
      const target = args.find((a) => a.charAt(0) !== '-') || '.';
      const segs = toSegments(target);
      const node = lookup(segs);

      if (!node) return [B.error('ls: no such file or directory: ' + disp(segs))];
      if (node.type === 'file') return [B.text(disp(segs))];

      const names = Object.keys(node.children).sort();
      if (!names.length) return [B.error('ls: ' + disp(segs) + ': empty')];
      if (!long) return [B.list(names.map((n) => (node.children[n].type === 'dir' ? n + '/' : n)))];

      return [
        B.table(
          ['type', 'size', 'name'],
          names.map((n) => {
            const child = node.children[n];
            return [
              child.type === 'dir' ? 'd' : '-',
              child.type === 'dir' ? '-' : String(child.body.length),
              child.type === 'dir' ? n + '/' : n,
            ];
          }),
          [false, true, false]
        ),
        B.text(names.length + ' entries in ' + disp(segs), 'dim'),
      ];
    },
  });

  cmd({
    name: 'cd',
    group: 'files',
    usage: 'cd [path]',
    desc: 'change directory (~, .., ~/projects)',
    run(args) {
      const target = args[0] || '~';
      const segs = toSegments(target);

      if (!segs.length) {
        state.cwd = [];
        renderPrompt();
        return [B.text(cwdPath(), 'dim')];
      }
      const node = lookup(segs);
      if (!node) return [B.error('cd: no such file or directory: ' + disp(segs))];
      if (node.type === 'file') return [B.error('cd: not a directory: ' + disp(segs))];

      state.cwd = segs;
      renderPrompt();
      return [];
    },
  });

  cmd({
    name: 'cat',
    group: 'files',
    usage: 'cat <file>',
    args: '<file>',
    desc: 'print a file from the fake filesystem',
    run(args) {
      if (!args.length) return [B.error('cat: missing operand. Files: ' + listNames(state.cwd).join(' '))];
      const segs = toSegments(args[0]);
      const node = lookup(segs);
      if (!node) return [B.error('cat: no such file or directory: ' + disp(segs))];
      if (node.type === 'dir') return [B.error('cat: ' + disp(segs) + ': is a directory')];
      return [B.pre(node.body)];
    },
  });

  cmd({
    name: 'pwd',
    group: 'files',
    usage: 'pwd',
    desc: 'print the current path',
    run() { return [B.text(cwdPath())]; },
  });

  /* --- utility ------------------------------------------------------------ */

  cmd({
    name: 'help',
    group: 'util',
    usage: 'help',
    desc: 'list all commands',
    run() {
      const groups = [
        ['info', 'information'],
        ['files', 'fake filesystem'],
        ['util', 'utilities'],
      ];
      const out = [
        B.text('available commands', 'accent'),
        B.spacer(),
      ];

      groups.forEach(([key, label]) => {
        out.push(B.text(label, 'purple'));
        out.push(
          B.table(
            ['command', 'description'],
            COMMANDS.filter((c) => c.group === key && !c.hidden).map((c) => [
              c.name,
              { text: c.desc, sub: c.usage !== c.name ? '(' + c.usage + ')' : '' },
            ]),
            [false, false]
          )
        );
      });

      out.push(B.text('examples', 'purple'));
      out.push(B.list([
        { text: 'ls -l', sub: 'long listing' },
        { text: 'cat ~/about.txt', sub: 'the filesystem mirrors these commands' },
        { text: 'cd ~/projects && ls', sub: 'directories work too' },
        { text: 'project 1', sub: 'a single project' },
        { text: 'theme', sub: 'show the colour theme' },
      ]));

      out.push(B.spacer());
      C.helpFooter.forEach((f) => out.push(B.text(f, 'dim')));
      out.push(B.spacer());
      out.push(B.text('There are a few commands that are not listed here. Good luck.', 'dim'));
      return out;
    },
  });

  cmd({
    name: 'man',
    group: 'util',
    usage: 'man <command>',
    args: '<command>',
    desc: 'show help for one command',
    completeArg() { return COMMANDS.filter((c) => !c.hidden).map((c) => c.name); },
    run(args) {
      if (!args.length) return [B.error('man: what manual page do you want?')];
      const c = findCommand(args[0]);
      if (!c) return [B.error('man: no entry for ' + args[0])];
      const rows = [
        ['usage', c.usage],
        ['about', c.desc],
      ];
      if (c.aliases && c.aliases.length) rows.push(['aliases', c.aliases.join(', ')]);
      if (c.args) rows.push(['arguments', c.args]);
      return [B.text(c.name, 'accent'), B.spacer(), B.kv(rows)];
    },
  });

  cmd({
    name: 'whoami',
    group: 'util',
    aliases: ['users'],
    usage: 'whoami',
    desc: 'who is logged in',
    run() {
      return [
        B.text(C.meta.user, 'green'),
        B.text('A guest on ' + C.meta.name + "'s portfolio. Type `contact` to reach the real person.", 'dim'),
      ];
    },
  });

  cmd({
    name: 'date',
    group: 'util',
    usage: 'date',
    desc: 'print the current date and time',
    run() {
      return [
        B.text(new Date().toString()),
        B.text('Last deploy: whenever you push to main.', 'dim'),
      ];
    },
  });

  cmd({
    name: 'echo',
    group: 'util',
    usage: 'echo <text>',
    args: '<text>',
    desc: 'print text back',
    run(args) {
      return [B.text(args.join(' '))];
    },
  });

  cmd({
    name: 'clear',
    group: 'util',
    aliases: ['cls'],
    usage: 'clear',
    desc: 'clear the screen (also Ctrl+L)',
    run() {
      clearScreen();
      return [];
    },
  });

  cmd({
    name: 'history',
    group: 'util',
    usage: 'history',
    desc: 'show command history',
    run(args) {
      if (args[0] === '-c') {
        state.history.length = 0;
        return [B.text('history cleared', 'dim')];
      }
      if (!state.history.length) return [B.text('no history yet', 'dim')];
      return [B.table(['#', 'command'], state.history.map((h, i) => [String(i + 1), h]), [true, false])];
    },
  });

  /* --- themes and motion --------------------------------------------------- */

  const THEMES = [
    { name: 'github', note: 'GitHub dark, canvas #0d1117' },
  ];
  const STORE = 'portfolio.theme';
  const currentTheme = () => document.documentElement.getAttribute('data-theme');

  function setTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    try { localStorage.setItem(STORE, name); } catch (_) {}
  }

  cmd({
    name: 'theme',
    group: 'util',
    usage: 'theme [name]',
    args: '[name]',
    desc: 'show the colour theme',
    completeArg() { return THEMES.map((t) => t.name); },
    run(args) {
      const name = args[0];
      if (!name) {
        return [
          B.text('themes', 'accent'),
          B.list(THEMES.map((t) => ({
            text: t.name,
            sub: t.name === currentTheme() ? '(current) — ' + t.note : t.note,
          }))),
          B.text('One scheme: the palette is fixed. Set it with `theme github`.', 'dim'),
        ];
      }
      if (!THEMES.some((t) => t.name === name)) {
        return [B.error('theme: unknown theme: ' + name + '. Available: ' + THEMES.map((t) => t.name).join(', '))];
      }
      setTheme(name);
      return [B.text('Theme set to ' + name + '.', 'green')];
    },
  });

  cmd({
    name: 'animation',
    group: 'util',
    usage: 'animation [on|off]',
    args: '[on|off]',
    desc: 'turn the typing effect on or off',
    completeArg() { return ['on', 'off', 'status']; },
    run(args) {
      const mode = args[0];
      if (!mode || mode === 'status') {
        const eff = motionOff()
          ? 'off' + (prefersReduced.matches ? ' (your system asks for reduced motion)' : '')
          : 'on';
        return [B.text('typing animation: ' + eff)];
      }
      if (mode !== 'on' && mode !== 'off') {
        return [B.error('animation: expected `on` or `off`, got: ' + mode)];
      }
      state.motion = mode === 'on';
      document.body.classList.toggle('no-motion', motionOff());
      return [B.text('typing animation: ' + (motionOff() ? 'off' : 'on'), 'green')];
    },
  });

  /* --- easter eggs (hidden from help) ------------------------------------- */

  cmd({
    name: 'sudo',
    group: 'util',
    usage: 'sudo <command>',
    hidden: true,
    desc: 'run a command as someone with more sense',
    run(args) {
      const target = args.join(' ');
      if (!target) return [B.error('usage: sudo hire-me')];
      if (target !== 'hire-me') {
        return [
          B.error('sudo: ' + target + ': command not allowed'),
          B.text('This incident has been reported to a very supportive mentor.', 'dim'),
        ];
      }
      return [
        B.text(C.eggs.sudoHireMe.prompt, 'orange'),
        B.spacer(),
        ...C.eggs.sudoHireMe.answer.map((l) => B.text(l)),
        B.spacer(),
        B.text('Type `contact` for links, or just say hello.', 'dim'),
      ];
    },
  });

  cmd({
    name: 'matrix',
    group: 'util',
    hidden: true,
    desc: '',
    run() {
      // The palette is fixed now, so this no longer repaints the screen.
      return [
        ...C.eggs.matrix.answer.map((l) => B.text(l, 'green')),
        B.text('(the colours stay GitHub dark — one scheme only now)', 'dim'),
      ];
    },
  });

  cmd({
    name: 'exit',
    group: 'util',
    hidden: true,
    desc: '',
    run() {
      return [...C.eggs.exit.answer.map((l) => B.text(l, 'dim')), B.spacer(), B.text('Type `help` to come back.', 'dim')];
    },
  });

  cmd({
    name: 'danu',
    group: 'util',
    hidden: true,
    desc: '',
    run() {
      return [
        B.text(C.meta.name + ' — ' + C.meta.tagline, 'green'),
        B.spacer(),
        ...C.about.paragraphs.map((p) => (p ? B.text(p) : B.spacer())),
      ];
    },
  });

  const listNames = (segs) => {
    const node = lookup(segs);
    return node && node.type === 'dir' ? Object.keys(node.children) : [];
  };

  /* =============================================================== the prompt */

  function promptSpans() {
    return [
      { cls: 'p-user', t: C.meta.user },
      { cls: 'p-host', t: '@' + C.meta.host },
      { cls: 'p-sep', t: ':' },
      { cls: 'p-path', t: cwdPath() },
      { cls: 'p-sym', t: '$' },
    ];
  }

  function renderPrompt() {
    promptEl.textContent = '';
    promptSpans().forEach((s) => promptEl.appendChild(el('span', s.cls, s.t)));
    inputEl.setAttribute('aria-label', 'Terminal input. Currently in ' + cwdPath());
  }

  /* Echo the submitted line so the transcript is copy-pasteable. */
  function echoLine(line) {
    const d = el('div', 'block');
    promptSpans().forEach((s) => d.appendChild(el('span', s.cls, s.t)));
    d.appendChild(document.createTextNode(' ' + line));
    return d;
  }

  function updateCursor() {
    const pos = inputEl.selectionStart == null ? inputEl.value.length : inputEl.selectionStart;
    measureEl.textContent = inputEl.value.slice(0, pos);
    const w = measureEl.getBoundingClientRect().width;
    const fieldW = fieldEl.getBoundingClientRect().width;
    const max = Math.max(0, fieldW - cursorEl.offsetWidth);
    cursorEl.style.transform = 'translateX(' + Math.min(w, max) + 'px)';
    cursorEl.classList.toggle('hidden', document.activeElement !== inputEl);
  }

  function clearScreen() {
    screenGen += 1;              // abandon anything still queued for the old screen
    screenEl.replaceChildren();
    said.length = 0;
    scrollToEnd();
  }

  /* =============================================================== executing */

  function runLine(raw) {
    const line = raw.trim();
    screenEl.appendChild(echoLine(raw));
    scrollToEnd();

    if (!line) return;

    said.length = 0;
    state.history.push(line);
    state.histIndex = -1;
    state.draft = '';

    const parts = line.split(/\s+/);
    const name = parts[0];
    const args = parts.slice(1);

    const c = findCommand(name);
    if (!c) {
      say([
        B.error('command not found: ' + name),
        B.text('Type `help` to see what this shell understands.', 'dim'),
      ]);
      announce();
      return;
    }

    const result = c.run(args, parts.slice(1));
    if (result === undefined) return;   // command already wrote its own output
    say(result);
    announce();
  }

  function submit() {
    const raw = inputEl.value;
    inputEl.value = '';
    updateCursor();
    if (state.typing) skipAnimation();
    queue = queue.then(() => runLine(raw));
  }

  /* A skip is sticky: it stays in effect until the queue drains, so a long
     burst of output doesn't resume animating halfway through. */
  function skipAnimation() {
    if (state.typing) state.skip = true;
  }

  /* ============================================================ tab complete */

  function lcp(list) {
    if (!list.length) return '';
    let prefix = list[0];
    for (const s of list) {
      while (s.indexOf(prefix) !== 0) prefix = prefix.slice(0, prefix.length - 1);
      if (!prefix) break;
    }
    return prefix;
  }

  /* Reconstruct the path to glue onto the match by trimming the half-typed
     segment off the end of what the user typed. That keeps ~/ , / and relative
     paths looking the way the user wrote them. */
  function pathCandidates(cmdName, argStr, onlyDirs) {
    const endsSlash = /\/$/.test(argStr);
    const segs = toSegments(argStr);
    const partial = endsSlash ? '' : segs.pop() || '';
    const node = lookup(segs);
    if (!node || node.type !== 'dir') return [];

    const lead = endsSlash ? argStr : argStr.slice(0, argStr.length - partial.length);

    return Object.keys(node.children)
      .filter((n) => n.indexOf(partial) === 0)
      .filter((n) => (onlyDirs ? node.children[n].type === 'dir' : true))
      .sort()
      .map((n) => lead + n + (node.children[n].type === 'dir' ? '/' : ''));
  }

  function complete() {
    const raw = inputEl.value;
    const trailingSpace = /\s$/.test(raw);
    const tokens = raw.split(/\s+/);

    // The command name is the first token even when the line ends in a space:
    // `cd ` + Tab should complete a directory, not fall back to the command list.
    const cmdName = tokens[0] || '';
    const argStr = trailingSpace ? '' : tokens.slice(1).join(' ');

    /* completing a command name — only while no argument has been started yet,
       otherwise `cat a` would try to complete a command called "cat a". */
    if (!trailingSpace && !argStr) {
      const names = COMMANDS.filter((c) => !c.hidden && c.name.indexOf(cmdName) === 0).map((c) => c.name);
      if (!names.length) return;

      // An exact command name wins outright rather than falling back to the
      // shared prefix, so `project` + Tab completes the command, not `projects`.
      if (names.indexOf(cmdName) !== -1) {
        inputEl.value = cmdName + ' ';
        updateCursor();
        return;
      }
      if (names.length === 1) {
        inputEl.value = names[0] + ' ';
        updateCursor();
        return;
      }
      const shared = lcp(names);
      if (shared.length > cmdName.length) {
        inputEl.value = shared;
        updateCursor();
        return;
      }
      say([B.text('possible commands: ' + names.join('  '), 'dim')]);
      return;
    }

    /* completing an argument */
    const c = findCommand(cmdName);
    let candidates;
    if (c && typeof c.completeArg === 'function') {
      candidates = c.completeArg().filter((x) => x.indexOf(argStr) === 0);
    } else if (['ls', 'cd', 'cat', 'man'].indexOf(cmdName) !== -1) {
      candidates = pathCandidates(cmdName, argStr, cmdName === 'cd');
    }

    if (!candidates || !candidates.length) return;

    if (candidates.length === 1) {
      inputEl.value = cmdName + ' ' + candidates[0];
      if (candidates[0].slice(-1) !== '/') inputEl.value += ' ';
      updateCursor();
      return;
    }

    const shared = lcp(candidates);
    if (shared.length > argStr.length) {
      inputEl.value = cmdName + ' ' + shared;
      updateCursor();
      return;
    }
    say([B.text('possible completions: ' + candidates.join('  '), 'dim')]);
  }

  /* ================================================================ shortcuts */

  function buildChips() {
    C.quickCommands.forEach((q) => {
      const b = el('button', 'chip', q.label);
      b.type = 'button';
      b.addEventListener('click', () => {
        inputEl.value = q.command;
        inputEl.focus();
        updateCursor();
        submit();
      });
      chipsEl.appendChild(b);
    });
  }

  /* ==================================================================== input */

  inputEl.addEventListener('keydown', (e) => {
    if (e.metaKey) return;                       // leave browser shortcuts alone

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        submit();
        return;

      case 'Tab':
        e.preventDefault();
        complete();
        return;

      case 'ArrowUp':
        e.preventDefault();
        if (!state.history.length) return;
        if (state.histIndex === -1) state.draft = inputEl.value;
        state.histIndex = state.histIndex === -1
          ? state.history.length - 1
          : Math.max(0, state.histIndex - 1);
        inputEl.value = state.history[state.histIndex];
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
        updateCursor();
        return;

      case 'ArrowDown':
        e.preventDefault();
        if (state.histIndex === -1) return;
        state.histIndex += 1;
        if (state.histIndex >= state.history.length) {
          state.histIndex = -1;
          inputEl.value = state.draft;
        } else {
          inputEl.value = state.history[state.histIndex];
        }
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
        updateCursor();
        return;

      case 'l':
        if (e.ctrlKey) { e.preventDefault(); clearScreen(); }
        return;

      case 'c':
        if (e.ctrlKey) {
          e.preventDefault();
          skipAnimation();
          inputEl.value = '';
          updateCursor();
          screenEl.appendChild(echoLine('^C'));
        }
        return;

      case 'k':
        if (e.ctrlKey) { e.preventDefault(); inputEl.value = ''; updateCursor(); }
        return;

      case 'Escape':
        // Let keyboard-only users escape the input, because Tab is spoken for
        // by completion and would otherwise trap them here forever.
        e.preventDefault();
        inputEl.blur();
        return;
    }

    /* Any other key while the animation is running skips it. */
    if (state.typing) skipAnimation();
  });

  inputEl.addEventListener('input', updateCursor);
  inputEl.addEventListener('click', updateCursor);
  inputEl.addEventListener('select', updateCursor);
  inputEl.addEventListener('blur', updateCursor);
  inputEl.addEventListener('focus', updateCursor);

  screenEl.addEventListener('click', () => { inputEl.focus(); skipAnimation(); });
  screenEl.addEventListener('mousedown', (e) => { if (e.target.closest('a')) e.preventDefault(); });

  /* Tab is captured above for completion, so the input is normally the only
     focus stop. Escape releases it; typing a printable character takes it back,
     which keeps the shell feeling responsive without trapping anyone. */
  document.addEventListener('keydown', (e) => {
    if (document.activeElement === inputEl) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const onControl = e.target && e.target.closest && e.target.closest('a, button, [tabindex]');
    if (onControl) return;
    if (e.key === 'Escape') return;
    if (e.key.length === 1 || e.key === 'Backspace') {
      inputEl.focus({ preventScroll: true });
      updateCursor();
    }
  });

  /* ==================================================================== boot */

  try {
    const saved = localStorage.getItem(STORE);
    if (saved && THEMES.some((t) => t.name === saved)) setTheme(saved);
  } catch (_) {}

  document.body.classList.toggle('no-motion', motionOff());
  prefersReduced.addEventListener('change', () => {
    document.body.classList.toggle('no-motion', motionOff());
  });

  renderPrompt();
  buildChips();
  updateCursor();

  /* Banner + welcome, typed out on first load. */
  say([
    B.banner(C.banner.join('\n')),
    B.spacer(),
    ...C.welcome.map((l) => B.text(l)),
    B.spacer(),
    B.text('Type `help` and press enter.', 'accent'),
    B.text('Tip: press any key to skip this animation.', 'dim'),
  ]);

  inputEl.focus();

  /* Some mobile browsers only allow focus after a tap. */
  document.addEventListener('touchstart', function once() {
    document.removeEventListener('touchstart', once);
    inputEl.focus({ preventScroll: true });
  }, { passive: true });

  window.addEventListener('resize', updateCursor);

  /* Expose a couple of handles for debugging in the console. */
  window.term = { say, runLine, clearScreen, state, COMMANDS, FS };
})();