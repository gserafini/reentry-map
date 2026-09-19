// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const script = resolve('scripts/check-console.sh')
function running(pid) {
  try {
    return readFileSync('/proc/' + pid + '/stat', 'utf8').split(') ')[1][0] !== 'Z'
  } catch {
    return false
  }
}
function runGate(options = {}) {
  const directory = mkdtempSync(join(process.cwd(), '.console-shell-fixture-'))
  // /tmp is mounted noexec on dc3-1. Executable PATH fixtures must stay on the project filesystem.
  // Assert their resolution before launch so a rejected fixture cannot fall through to a real server command.
  const fixture = (name, content) => {
    const path = join(directory, name)
    writeFileSync(path, '#!/usr/bin/env bash\n' + content, { mode: 0o700 })
    const syntax = spawnSync('bash', ['-n', path], { encoding: 'utf8' })
    if (syntax.status) throw new Error(syntax.stderr)
  }
  const pids = () =>
    existsSync(join(directory, 'pids'))
      ? readFileSync(join(directory, 'pids'), 'utf8').trim().split(/\s+/).map(Number)
      : []
  const server = [
    'printf \'%s\\n\' "$$" >> "$CONSOLE_FIXTURE/pids"',
    'sleep 120 &',
    'CHILD_PID=$!',
    'printf \'%s\\n\' "$CHILD_PID" >> "$CONSOLE_FIXTURE/pids"',
    'trap \'kill "$CHILD_PID" 2>/dev/null || true; wait "$CHILD_PID" 2>/dev/null || true; exit 0\' TERM INT',
    "printf '✓ Ready\\n'",
    'wait "$CHILD_PID"',
    'exit 0',
  ].join('\n')
  try {
    if (!options.missingBuild) {
      mkdirSync(join(directory, '.next'))
      writeFileSync(
        join(directory, '.next', 'BUILD_ID'),
        options.emptyBuild ? '' : 'fixture-build-id\n'
      )
    }
    fixture('lsof', 'exit 1\n')
    fixture(
      'node',
      [
        'if [ "$1" = "-e" ]; then',
        '  printf \'port probe\\n\' >> "$CONSOLE_FIXTURE/commands"',
        '  exit "${CONSOLE_FIXTURE_OCCUPIED:-0}"',
        'fi',
        'if [ "$1" = "node_modules/next/dist/bin/next" ]; then',
        '  printf \'server %s\\n\' "$*" >> "$CONSOLE_FIXTURE/commands"',
        server,
        'fi',
        'printf \'check %s\\n\' "$*" >> "$CONSOLE_FIXTURE/commands"',
        'if [ "${CONSOLE_FIXTURE_SIGNAL:-0}" = "1" ]; then',
        '  kill -TERM "$PPID"',
        '  sleep 0.1',
        'fi',
        'exit "${CONSOLE_FIXTURE_EXIT:-0}"',
      ].join('\n')
    )
    fixture(
      'concurrently',
      'printf \'development %s\\n\' "$*" >> "$CONSOLE_FIXTURE/commands"\n' + server
    )
    const testPath = directory + ':' + process.env.PATH
    const resolved = spawnSync('bash', ['-c', 'command -v concurrently; command -v node'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: testPath },
    })
    if (resolved.stdout.trim() !== join(directory, 'concurrently') + '\n' + join(directory, 'node'))
      throw new Error(
        'Fixture command resolution escaped the isolated test directory; do not start the console gate.'
      )
    const result = spawnSync('bash', [script], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 12000,
      env: {
        ...process.env,
        PATH: testPath,
        TMPDIR: directory,
        CONSOLE_FIXTURE: directory,
        CONSOLE_FIXTURE_OCCUPIED: options.occupied ? '1' : '0',
        CONSOLE_FIXTURE_EXIT: String(options.checkExit || 0),
        CONSOLE_FIXTURE_SIGNAL: options.signal ? '1' : '0',
      },
    })
    return {
      ...result,
      trackedPids: pids(),
      remainingPids: pids().filter(running),
      commands: existsSync(join(directory, 'commands'))
        ? readFileSync(join(directory, 'commands'), 'utf8')
        : '',
    }
  } finally {
    for (const pid of pids()) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        /* Fixture already exited. */
      }
    }
    rmSync(directory, { recursive: true, force: true })
  }
}
describe('console gate server ownership', () => {
  it('checks the existing production build without starting a dev compiler or CSS watcher', () => {
    const result = runGate()
    expect(result.status, result.stdout + '\n' + result.stderr).toBe(0)
    expect(result.commands).toContain('server node_modules/next/dist/bin/next start --port 3004\n')
    expect(result.commands).not.toMatch(/development|next dev|tailwind:watch/)
  })
  it.each([{ missingBuild: true }, { emptyBuild: true }])(
    'refuses a missing or empty production build with a direct remedy: %j',
    (options) => {
      const result = runGate(options)
      expect(result.status).not.toBe(0)
      expect(result.stdout + result.stderr).toContain('npm run build')
      expect(result.trackedPids).toEqual([])
      expect(result.commands).toBe('')
    }
  )
  it('stops its own server and descendants after all checks succeed', () => {
    const result = runGate()
    expect(result.status, result.stdout + '\n' + result.stderr).toBe(0)
    expect(result.trackedPids).toHaveLength(2)
    expect(result.remainingPids).toEqual([])
    expect(result.commands).toContain('check scripts/check-console.mjs /resources')
    expect(result.commands).toContain('check scripts/check-console.mjs /admin')
  })
  it('preserves a failing checker status and still stops its process group', () => {
    const result = runGate({ checkExit: 17 })
    expect(result.status, result.stdout + '\n' + result.stderr).toBe(17)
    expect(result.remainingPids).toEqual([])
    expect(result.commands).not.toContain('/resources')
  })
  it('cleans up its complete process group when the gate is interrupted', () => {
    const result = runGate({ signal: true })
    expect(result.status, result.stdout + '\n' + result.stderr).toBe(143)
    expect(result.remainingPids).toEqual([])
  })
  it('refuses an occupied port without launching or killing any server', () => {
    const result = runGate({ occupied: true })
    expect(result.status).not.toBe(0)
    expect(result.trackedPids).toEqual([])
    expect(result.commands).toBe('port probe\n')
  })
})
