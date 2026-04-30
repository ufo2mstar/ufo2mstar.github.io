// @ts-check

/** @typedef {{ kind: 'user'|'repo', query: string, output: string }} State */
/** @typedef {{ fetch: (url: string) => Promise<any> }} Services */

// ─── controls ────────────────────────────────────────────────────────────────

const controls = [
  { type: 'select', id: 'kind', label: 'Look up', default: 'user',
    options: [
      { value: 'user', label: 'User' },
      { value: 'repo', label: 'Repo (owner/name)' },
    ],
  },
  { type: 'input',  id: 'query',  label: 'Identifier', default: 'octocat', placeholder: 'octocat or octocat/Hello-World' },
  { type: 'button', id: 'go',     label: 'Fetch' },
  { type: 'code',   id: 'output', label: 'Result', language: 'json', readonly: true, copyable: true, rows: 16 },
];

// ─── formatters ──────────────────────────────────────────────────────────────

/** @param {any} data */
function formatUser(data) {
  return {
    login:        data.login,
    name:         data.name,
    bio:          data.bio,
    html_url:     data.html_url,
    avatar_url:   data.avatar_url,
    company:      data.company,
    location:     data.location,
    blog:         data.blog || null,
    public_repos: data.public_repos,
    followers:    data.followers,
    following:    data.following,
    created_at:   data.created_at,
  };
}

/** @param {any} data */
function formatRepo(data) {
  return {
    full_name:   data.full_name,
    description: data.description,
    html_url:    data.html_url,
    language:    data.language,
    stars:       data.stargazers_count,
    forks:       data.forks_count,
    open_issues: data.open_issues_count,
    watchers:    data.subscribers_count,
    license:     data.license?.spdx_id || null,
    topics:      data.topics || [],
    created_at:  data.created_at,
    updated_at:  data.updated_at,
  };
}

// ─── logic ───────────────────────────────────────────────────────────────────

/**
 * @param {State} s
 * @param {Services} svc
 * @returns {Promise<{ output: string }>}
 */
async function execute(s, svc) {
  const q = (s.query || '').trim();
  if (!q) return { output: '' };

  if (s.kind === 'repo') {
    if (!q.includes('/')) return { output: 'Error: repo must be in owner/name format (e.g. octocat/Hello-World)' };
    const data = await svc.fetch(`https://api.github.com/repos/${q}`);
    return { output: JSON.stringify(formatRepo(data), null, 2) };
  }

  const data = await svc.fetch(`https://api.github.com/users/${q}`);
  return { output: JSON.stringify(formatUser(data), null, 2) };
}

// ─── tests ───────────────────────────────────────────────────────────────────

const tests = [
  { name: 'user lookup curates fields',
    state: { kind: 'user', query: 'octocat' },
    mockFetch: (url) => {
      if (!url.endsWith('/users/octocat')) throw new Error('unexpected url: ' + url);
      return { login: 'octocat', name: 'The Octocat', bio: 'GitHub mascot',
               html_url: 'https://github.com/octocat', avatar_url: 'https://avatars/x',
               company: '@github', location: 'SF', blog: '', public_repos: 8,
               followers: 1000, following: 9, created_at: '2011-01-25T18:44:36Z' };
    },
    expect: { output: { contains: '"login": "octocat"' } } },

  { name: 'repo lookup curates fields',
    state: { kind: 'repo', query: 'octocat/Hello-World' },
    mockFetch: (url) => {
      if (!url.endsWith('/repos/octocat/Hello-World')) throw new Error('unexpected url: ' + url);
      return { full_name: 'octocat/Hello-World', description: 'My first repo',
               html_url: 'https://github.com/octocat/Hello-World', language: 'C',
               stargazers_count: 2000, forks_count: 1500, open_issues_count: 1500,
               subscribers_count: 100, license: { spdx_id: 'MIT' },
               topics: ['demo'], created_at: '2011-01-26T19:01:12Z',
               updated_at: '2024-01-01T00:00:00Z' };
    },
    expect: { output: { regex: /"stars":\s*2000/ } } },

  { name: 'empty query returns empty output',
    state: { kind: 'user', query: '   ' },
    expect: { output: '' } },

  { name: 'repo without slash shows error',
    state: { kind: 'repo', query: 'octocat' },
    expect: { output: { contains: 'owner/name format' } } },
];

// ─── descriptor ──────────────────────────────────────────────────────────────

export default {
  id: 'github-metadata',
  title: 'GitHub Metadata',
  description: 'Look up public GitHub user or repo metadata via the REST API.',
  controls,
  execute,
  tests,
};
