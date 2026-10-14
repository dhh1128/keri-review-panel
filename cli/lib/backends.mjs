// Backend adapters. Each turns one agent call — {prompt, schema, effort, model, cwd, readDirs} —
// into a headless CLI invocation of one engine, and returns the parsed final JSON plus metadata.
// Reviewers are read-only in every backend: the runner, not the agent, writes all files.

import { spawn } from 'node:child_process'
import { writeFileSync, readFileSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { canonicalize } from './schemas.mjs'

// Personas declare medium|deep; neither engine has "deep".
const EFFORT = { low: 'low', medium: 'medium', deep: 'high', high: 'high', xhigh: 'xhigh', max: 'max' }
const effortFor = (e) => EFFORT[e] || e || 'medium'

function run(cmd, args, { input, cwd, timeoutMs }) {
  return new Promise((resolve) => {
    // nice: a panel fans out several long agent processes on a shared workstation.
    const child = spawn('nice', ['-n', '19', cmd, ...args], { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = '', stderr = '', timedOut = false
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 5000) }, timeoutMs)
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: stderr + String(e), timedOut }) })
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }) })
    child.stdin.end(input)
  })
}

const tail = (s, n = 1500) => (s || '').slice(-n)

const codex = {
  name: 'codex',
  async call({ prompt, schema, effort, model, cwd, timeoutMs }) {
    const dir = mkdtempSync(join(tmpdir(), 'krp-codex-'))
    try {
      const schemaFile = join(dir, 'schema.json'), outFile = join(dir, 'last.json')
      writeFileSync(schemaFile, JSON.stringify(canonicalize(schema)))
      const args = ['exec', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only', '-C', cwd,
        '--output-schema', schemaFile, '-o', outFile, '-c', `model_reasoning_effort="${effortFor(effort)}"`]
      if (model) args.push('-m', model)
      args.push('-')
      const r = await run('codex', args, { input: prompt, cwd, timeoutMs })
      const meta = { engine: 'codex', model: model || '(codex default)', effort: effortFor(effort), exit: r.code, timed_out: r.timedOut }
      if (r.code !== 0 || !existsSync(outFile)) return { ok: false, error: `codex exit ${r.code}${r.timedOut ? ' (timeout)' : ''}: ${tail(r.stderr || r.stdout)}`, meta }
      const text = readFileSync(outFile, 'utf8')
      try { return { ok: true, value: JSON.parse(text), meta } } catch { return { ok: false, error: `codex final message is not JSON: ${tail(text, 500)}`, meta } }
    } finally { rmSync(dir, { recursive: true, force: true }) }
  },
}

const claude = {
  name: 'claude',
  async call({ prompt, schema, effort, model, cwd, readDirs, timeoutMs }) {
    const args = ['-p', '--output-format', 'json', '--json-schema', JSON.stringify(schema),
      '--effort', effortFor(effort),
      // --tools removes every other built-in tool, so no inherited user permission (an allowed Edit,
      // say) can reach a reviewer; --allowedTools then pre-approves these three, and dontAsk denies
      // anything else instead of stalling on a prompt. No Bash at all: `git log --output=<file>`
      // writes, and the proposal a reviewer reads is untrusted input.
      '--tools', 'Read,Grep,Glob', '--allowedTools', 'Read,Grep,Glob',
      '--permission-mode', 'dontAsk',
      // Not --bare: bare mode ignores a subscription login. Disabling hooks keeps a review call
      // from registering itself with the user's session tooling.
      '--settings', JSON.stringify({ disableAllHooks: true }),
      '--strict-mcp-config', '--no-session-persistence', '--disable-slash-commands']
    // --add-dir takes directories only; a file target is reached through its parent.
    for (const d of new Set((readDirs || []).map((p) => existsSync(p) && !statSync(p).isDirectory() ? dirname(p) : p))) args.push('--add-dir', d)
    if (model) args.push('--model', model)
    const r = await run('claude', args, { input: prompt, cwd, timeoutMs })
    const meta = { engine: 'claude', model: model || '(claude default)', effort: effortFor(effort), exit: r.code, timed_out: r.timedOut }
    let out
    try { out = JSON.parse(r.stdout) } catch { return { ok: false, error: `claude exit ${r.code}${r.timedOut ? ' (timeout)' : ''}; stdout not JSON: ${tail(r.stderr || r.stdout)}`, meta } }
    meta.cost_usd = out.total_cost_usd ?? null
    meta.num_turns = out.num_turns ?? null
    if (out.is_error || out.subtype !== 'success') return { ok: false, error: `claude ${out.subtype || 'error'}: ${tail(out.result || r.stderr)}`, meta }
    if (out.structured_output == null) return { ok: false, error: `claude returned no structured_output: ${tail(out.result, 500)}`, meta }
    return { ok: true, value: out.structured_output, meta }
  },
}

export const BACKENDS = { codex, claude }
