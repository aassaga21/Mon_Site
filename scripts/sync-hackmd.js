// sync-hackmd.js — synchronise les notes HackMD taguées "portfolio" dans projects.html
// Usage : HACKMD_API_TOKEN=xxx node scripts/sync-hackmd.js
// Tag à utiliser sur HackMD : "portfolio"  (configurable via HACKMD_TAG)

const fs   = require('fs');
const path = require('path');

const HACKMD_TOKEN   = process.env.HACKMD_API_TOKEN;
const PORTFOLIO_TAG  = (process.env.HACKMD_TAG || 'portfolio').toLowerCase();
const PROJECTS_HTML  = path.join(__dirname, '..', 'projects.html');
const API_BASE       = 'https://api.hackmd.io/v1';

// --- Détection automatique de catégories ---
const CATEGORY_RULES = [
  { re: /r[eé]seau|network|cisco|vlan|vpn|opnsense|fortinet|bgp|ospf|switching|routage/i, tag: 'reseau' },
  { re: /cyber|s[eé]curit[eé]|firewall|sophos|kali|ids|ips|pentest|vuln|nmap/i,           tag: 'cyber' },
  { re: /cloud|aws|azure|ec2|rds|gcp|s3|lambda|openstack|devstack|infomaniak/i,            tag: 'cloud' },
  { re: /virtual|proxmox|vmware|hyper.v|esxi|microstack|vm\b/i,                            tag: 'virtualisation' },
  { re: /monitor|grafana|prometheus|zabbix|nagios|supervision|alerting/i,                  tag: 'monitoring' },
  { re: /ansible|terraform|automati|ci.?cd|devops|pipeline|bash|script/i,                 tag: 'automation' },
  { re: /web|php|html|javascript|http|nginx|apache|react|node\.?js/i,                     tag: 'web' },
];

function detectCategories(title, hackmdTags) {
  const text = `${title} ${hackmdTags.join(' ')}`;
  const cats = [...new Set(
    CATEGORY_RULES.filter(r => r.re.test(text)).map(r => r.tag)
  )];
  return cats.length > 0 ? cats : ['reseau'];
}

// --- Extraction de la description depuis le markdown ---
function extractDescription(markdown) {
  const content = markdown.replace(/^---[\s\S]*?---\n/, '');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (
      t.length > 30 &&
      !/^[#!`\[|>]/.test(t) &&
      !/^[-*]{2,}/.test(t)
    ) {
      return t
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .substring(0, 180);
    }
  }
  return 'Documentation technique disponible sur HackMD.';
}

// --- Génération des badges depuis le titre + tags HackMD ---
const TECH_KEYWORDS = [
  'Ansible','Terraform','Proxmox','VMware','Hyper-V','ESXi',
  'Azure','AWS','GCP','OpenStack','DevStack','MicroStack',
  'Cisco','Fortinet','OPNsense','Sophos','Pfsense',
  'VPN','IPsec','VLAN','BGP','OSPF',
  'Grafana','Prometheus','Zabbix','Nagios',
  'Docker','Kubernetes','GitLab','GitHub','GitOps',
  'PHP','Python','Bash','PowerShell','Node.js',
  'Ubuntu','Debian','Windows Server',
  'EC2','RDS','S3','VNet','Bastion','Lambda',
  'NETCONF','SSH','CI/CD','Infomaniak',
];

const SKIP_TAGS = ['documentation','portfolio','bachelor','tp','cours','projet','templates'];

function extractBadges(title, hackmdTags) {
  const text = `${title} ${hackmdTags.join(' ')}`;
  const fromKeywords = TECH_KEYWORDS.filter(kw => new RegExp(kw, 'i').test(text));
  const fromTags = hackmdTags.filter(t =>
    !SKIP_TAGS.some(s => t.toLowerCase().includes(s)) &&
    !fromKeywords.some(f => f.toLowerCase() === t.toLowerCase())
  );
  return [...fromKeywords, ...fromTags].slice(0, 5);
}

// --- Génération du HTML d'une carte projet ---
function noteToHtml(note, description) {
  const categories = detectCategories(note.title, note.tags || []);
  const badges     = extractBadges(note.title, note.tags || []);
  const noteUrl    = note.publishLink || `https://hackmd.io/@${note.userPath}/${note.shortId}`;
  const badgeHtml  = badges.map(b => `<span class="badge">${escapeHtml(b)}</span>`).join('');

  return `        <article class="card project-item" data-tags="${categories.join(' ')}">
          <div class="project-cover"></div>
          <div class="content">
            <h3>${escapeHtml(note.title)}</h3>
            <p>${escapeHtml(description)}</p>
            <div class="meta">
              ${badgeHtml}
            </div>
            <div class="project-actions" style="margin-top:12px">
              <a class="btn" href="${noteUrl}" target="_blank" rel="noopener">Documentation</a>
              <a class="btn primary" href="contact.html">Me contacter</a>
            </div>
          </div>
        </article>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Appel API HackMD ---
async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${HACKMD_TOKEN}` },
  });
  if (!res.ok) throw new Error(`HackMD API ${res.status}: ${res.statusText} (${endpoint})`);
  return res.json();
}

// --- Point d'entrée ---
async function main() {
  if (!HACKMD_TOKEN) {
    console.error('❌  HACKMD_API_TOKEN non défini.');
    process.exit(1);
  }

  console.log(`🔄  Récupération des notes HackMD (tag: "${PORTFOLIO_TAG}")…`);
  const allNotes = await apiFetch('/notes');

  const portfolioNotes = allNotes.filter(n =>
    Array.isArray(n.tags) && n.tags.map(t => t.toLowerCase()).includes(PORTFOLIO_TAG)
  );

  if (portfolioNotes.length === 0) {
    console.log(`ℹ️  Aucune note avec le tag "${PORTFOLIO_TAG}" trouvée. Rien à synchroniser.`);
    return;
  }

  console.log(`✅  ${portfolioNotes.length} note(s) trouvée(s).`);

  // Récupérer le contenu de chaque note pour extraire la description
  const cards = [];
  for (const note of portfolioNotes) {
    process.stdout.write(`   → ${note.title} … `);
    let description = 'Documentation technique disponible sur HackMD.';
    try {
      const full = await apiFetch(`/notes/${note.id}`);
      if (full.content) description = extractDescription(full.content);
      console.log('OK');
    } catch (err) {
      console.log(`(contenu inaccessible: ${err.message})`);
    }
    cards.push(noteToHtml(note, description));
  }

  // Remplacement entre les marqueurs
  let html = fs.readFileSync(PROJECTS_HTML, 'utf8');
  const START = '<!-- HACKMD-SYNC-START -->';
  const END   = '<!-- HACKMD-SYNC-END -->';
  const si = html.indexOf(START);
  const ei = html.indexOf(END);

  if (si === -1 || ei === -1) {
    console.error('❌  Marqueurs HACKMD-SYNC-START / HACKMD-SYNC-END introuvables dans projects.html.');
    process.exit(1);
  }

  const newBlock = `${START}\n${cards.join('\n')}\n        ${END}`;
  html = html.slice(0, si) + newBlock + html.slice(ei + END.length);

  fs.writeFileSync(PROJECTS_HTML, html, 'utf8');
  console.log(`\n🎉  projects.html mis à jour avec ${portfolioNotes.length} projet(s).`);
}

main().catch(err => { console.error(err); process.exit(1); });
