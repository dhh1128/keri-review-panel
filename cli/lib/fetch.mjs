// Fetch the proposal deterministically, before any model sees it. GitHub content is mutable, so a
// run is only reproducible if it records exactly what it read: the caller writes this snapshot
// to <out>/proposal/ with its hash and, for a PR, the head commit.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const MAX_DIFF = 400_000

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
}

const comment = (c) => `**${c.author?.login || c.user?.login || 'unknown'}**${c.path ? ` on \`${c.path}${c.line ? `:${c.line}` : ''}\`` : ''}:\n\n${c.body || ''}\n`

function githubPr(url, owner, repo, num) {
  const pr = JSON.parse(sh('gh', ['pr', 'view', url, '--json', 'title,body,url,author,state,headRefOid,baseRefName,comments,reviews']))
  const inline = JSON.parse(sh('gh', ['api', '--paginate', '--slurp', `repos/${owner}/${repo}/pulls/${num}/comments`])).flat()
  let diff = sh('gh', ['pr', 'diff', url])
  const truncated = diff.length > MAX_DIFF
  if (truncated) diff = diff.slice(0, MAX_DIFF)
  const text = [
    `# PR: ${pr.title}`, `${pr.url} — by ${pr.author?.login}, ${pr.state}, base ${pr.baseRefName}, head ${pr.headRefOid}`, '',
    '## Description', '', pr.body || '(empty)', '',
    '## Conversation', '', ...pr.comments.map(comment), ...pr.reviews.filter((r) => r.body).map((r) => comment({ ...r, body: `[review: ${r.state}] ${r.body}` })),
    '## Inline review comments', '', ...inline.map(comment),
    `## Diff${truncated ? ` (truncated to ${MAX_DIFF} chars)` : ''}`, '', '```diff', diff, '```',
  ].join('\n')
  return { kind: 'github-pr', text, meta: { head: pr.headRefOid, comments: pr.comments.length, reviews: pr.reviews.length, inline_comments: inline.length, diff_truncated: truncated } }
}

function githubIssue(url) {
  const is = JSON.parse(sh('gh', ['issue', 'view', url, '--json', 'title,body,url,author,state,comments']))
  const text = [`# Issue: ${is.title}`, `${is.url} — by ${is.author?.login}, ${is.state}`, '', is.body || '(empty)', '', '## Comments', '', ...is.comments.map(comment)].join('\n')
  return { kind: 'github-issue', text, meta: { comments: is.comments.length } }
}

function githubDiscussion(owner, repo, num) {
  const q = `query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){discussion(number:$n){title body url author{login}
    comments(first:100){totalCount nodes{author{login} body replies(first:100){totalCount nodes{author{login} body}}}}}}}`
  const d = JSON.parse(sh('gh', ['api', 'graphql', '-f', `query=${q}`, '-F', `o=${owner}`, '-F', `r=${repo}`, '-F', `n=${num}`])).data.repository.discussion
  const lines = [`# Discussion: ${d.title}`, `${d.url} — by ${d.author?.login}`, '', d.body || '(empty)', '', '## Comments', '']
  let incomplete = d.comments.totalCount > d.comments.nodes.length
  for (const c of d.comments.nodes) {
    lines.push(comment(c))
    for (const r of c.replies.nodes) lines.push(`> reply — ${comment(r).replace(/\n/g, '\n> ')}`)
    if (c.replies.totalCount > c.replies.nodes.length) incomplete = true
  }
  return { kind: 'github-discussion', text: lines.join('\n'), meta: { comments: d.comments.totalCount, incomplete } }
}

export function fetchProposal(input, baseDir) {
  const s = input.trim()
  const gh = s.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(pull|issues|discussions)\/(\d+)/)
  let got
  if (gh) {
    const [, owner, repo, kind, num] = gh
    // GitHub's web UI redirects between /pull/N and /issues/N, so people paste either; the API does not.
    const asIssue = () => githubIssue(`https://github.com/${owner}/${repo}/issues/${num}`)
    const asPr = () => githubPr(`https://github.com/${owner}/${repo}/pull/${num}`, owner, repo, num)
    if (kind === 'discussions') got = githubDiscussion(owner, repo, Number(num))
    else { try { got = kind === 'pull' ? asPr() : asIssue() } catch { got = kind === 'pull' ? asIssue() : asPr() } }
    got.source = s
  } else if (/^https?:\/\//.test(s)) {
    got = { kind: 'url', text: sh('curl', ['-sSL', '--max-time', '60', s]), meta: { note: 'raw fetch; HTML is not cleaned' }, source: s }
  } else {
    const p = resolve(baseDir, s)
    if (!s.includes('\n') && s.length < 4096 && existsSync(p) && statSync(p).isFile()) got = { kind: 'file', text: readFileSync(p, 'utf8'), meta: {}, source: p }
    else got = { kind: 'text', text: s, meta: {}, source: '(pasted text)' }
  }
  return got
}
