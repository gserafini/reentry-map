import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'

// Native isolated Apache/ModSecurity fixture; never loads the live httpd.conf,
// app environment, authentication, database, or live audit/collection files.
assert.equal(process.getuid(), 0, 'Run this isolated native fixture as root')
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const fragmentPath = path.resolve(process.argv[2] || path.join(here, 'reentrymap-api-methods.conf'))
const receiptPath = process.argv[3] ? path.resolve(process.argv[3]) : null
const withoutFragment = process.argv.includes('--without-fragment')
const fragment = fs.readFileSync(fragmentPath, 'utf8')
assert.doesNotMatch(fragment, /ctl:|SecRuleEngine|ruleRemove|SecRuleRemove/)
const uuid = '12345678-1234-1234-1234-123456789abc'
const inventory = [
  ['PATCH', '/api/profile'],
  ['PATCH', '/api/reviews'],
  ['PATCH', '/api/admin/users'],
  ['PATCH', '/api/admin/expansion-priorities/[id]'],
  ['PATCH', '/api/admin/resources/[id]/update'],
  ['DELETE', '/api/reviews'],
  ['DELETE', '/api/favorites'],
  ['DELETE', '/api/reviews/helpfulness'],
  ['DELETE', '/api/ratings'],
  ['DELETE', '/api/admin/users'],
  ['DELETE', '/api/admin/expansion-priorities/[id]'],
  ['DELETE', '/api/admin/resources/[id]'],
  ['PUT', '/api/suggestions/[id]/status'],
  ['PUT', '/api/updates/[id]/status'],
  ['PUT', '/api/admin/resources/[id]'],
]
const actualInventory = []
function scanRoutes(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) scanRoutes(filename)
    else if (/^route\.[cm]?[jt]s$/.test(entry.name)) {
      const source = fs.readFileSync(filename, 'utf8')
      for (const match of source.matchAll(
        /export\s+(?:async\s+)?function\s+(PUT|PATCH|DELETE)\s*\(/g
      )) {
        actualInventory.push([match[1], '/' + path.relative(path.join(root, 'app'), directory)])
      }
    }
  }
}
scanRoutes(path.join(root, 'app/api'))
assert.deepEqual(
  actualInventory.sort(),
  [...inventory].sort(),
  'Review policy when API handlers change'
)

const vendor = '/etc/apache2/conf.d/modsec_vendor_configs/OWASP3/rules'
const methodRules = fs.readFileSync(
  path.join(vendor, 'REQUEST-911-METHOD-ENFORCEMENT.conf'),
  'utf8'
)
const sqlFile = fs.readFileSync(
  path.join(vendor, 'REQUEST-942-APPLICATION-ATTACK-SQLI.conf'),
  'utf8'
)
const sqlStart = sqlFile.indexOf('SecRule REQUEST_COOKIES|')
const sqlEnd = sqlFile.indexOf('\n\n', sqlStart)
const sqlRule = sqlFile.slice(sqlStart, sqlEnd)
assert.match(sqlRule, /id:942100/)
assert.match(sqlRule, /@detectSQLi/)

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'reentrymap-method-policy-'))
fs.chmodSync(sandbox, 0o755)
const data = path.join(sandbox, 'data')
fs.mkdirSync(data, { mode: 0o700 })
const uid = spawnSync('id', ['-u', 'nobody'], { encoding: 'utf8' })
const gid = spawnSync('id', ['-g', 'nobody'], { encoding: 'utf8' })
assert.equal(uid.status, 0)
assert.equal(gid.status, 0)
fs.chownSync(data, Number(uid.stdout.trim()), Number(gid.stdout.trim()))
const web = path.join(sandbox, 'web')
fs.mkdirSync(web, { mode: 0o755 })
let backendHits = 0
const backend = http.createServer((req, res) => {
  backendHits++
  req.resume()
  res.writeHead(200, { 'content-type': 'application/json', 'x-fixture-handler': 'reached' })
  res.end(JSON.stringify({ fixture: true, method: req.method }))
})
await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve))
const backendPort = backend.address().port
const reservations = []
const bindings = []
for (const [label, host, enabled] of [
  ['production-std', 'reentrymap.org', true],
  ['production-ssl-context', 'reentrymap.org', true],
  ['staging-std', 'staging.reentrymap.org', true],
  ['staging-ssl-context', 'staging.reentrymap.org', true],
  ['baseline', 'baseline.fixture.invalid', false],
  ['unrelated', 'unrelated.fixture.invalid', false],
]) {
  const reservation = net.createServer()
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve))
  reservations.push(reservation)
  bindings.push({ label, host, port: reservation.address().port, enabled })
}
for (const reservation of reservations) await new Promise((resolve) => reservation.close(resolve))
const configPath = path.join(sandbox, 'httpd.conf')
const errorPath = path.join(sandbox, 'error.log')
const config = [
  `ServerRoot "${sandbox}"`,
  `PidFile "${sandbox}/httpd.pid"`,
  'LoadModule mpm_event_module /etc/apache2/modules/mod_mpm_event.so',
  'LoadModule unixd_module /etc/apache2/modules/mod_unixd.so',
  'LoadModule authz_core_module /etc/apache2/modules/mod_authz_core.so',
  'LoadModule proxy_module /etc/apache2/modules/mod_proxy.so',
  'LoadModule proxy_http_module /etc/apache2/modules/mod_proxy_http.so',
  // Without unique_id, native ModSecurity can silently skip enforcement.
  'LoadModule unique_id_module /etc/apache2/modules/mod_unique_id.so',
  'LoadModule security2_module /etc/apache2/modules/mod_security2.so',
  'ServerName fixture.invalid',
  'User nobody',
  'Group nobody',
  `ErrorLog "${errorPath}"`,
  'LogLevel warn',
  'SecRuleEngine On',
  'SecRequestBodyAccess On',
  'SecAuditEngine Off',
  'SecDefaultAction "phase:1,pass,nolog"',
  'SecDefaultAction "phase:2,deny,log,status:403"',
  `SecDataDir "${data}"`,
  `SecTmpDir "${data}"`,
  // Native vendor rules unchanged; immediate default denial makes their
  // individual decisions observable without the rest of the anomaly pipeline.
  `SecAction "id:900000,phase:1,pass,nolog,setvar:tx.executing_paranoia_level=1,setvar:tx.critical_anomaly_score=5,setvar:'tx.allowed_methods=GET HEAD POST OPTIONS'"`,
  methodRules,
  sqlRule,
  ...bindings.flatMap((binding) => [
    `Listen 127.0.0.1:${binding.port}`,
    `<VirtualHost 127.0.0.1:${binding.port}>`,
    `ServerName ${binding.host}`,
    'UseCanonicalName Off',
    `DocumentRoot "${web}"`,
    `<Directory "${web}">`,
    'Require all granted',
    '</Directory>',
    'ProxyRequests Off',
    `ProxyPass / http://127.0.0.1:${backendPort}/`,
    ...(binding.enabled && !withoutFragment ? [`Include "${fragmentPath}"`] : []),
    '</VirtualHost>',
  ]),
  '',
].join('\n')
fs.writeFileSync(configPath, config)
const syntax = spawnSync('/usr/sbin/httpd', ['-t', '-f', configPath], { encoding: 'utf8' })
if (syntax.status !== 0) {
  await new Promise((resolve) => backend.close(resolve))
  fs.rmSync(sandbox, { recursive: true, force: true })
  assert.fail(`Isolated Apache config invalid: ${syntax.stderr}`)
}
const apache = spawn('/usr/sbin/httpd', ['-f', configPath, '-DFOREGROUND'], { stdio: 'ignore' })
const results = []

function request(binding, method, target) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: binding.port,
        method,
        path: target,
        agent: false,
        headers: { Host: binding.host },
      },
      (res) => {
        res.resume()
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            handler: res.headers['x-fixture-handler'] === 'reached',
          })
        )
      }
    )
    req.setTimeout(3000, () => req.destroy(new Error('Isolated fixture timeout')))
    req.on('error', reject)
    req.end()
  })
}
async function check(label, binding, method, target, expected) {
  const before = backendHits
  const response = await request(binding, method, target)
  const hits = backendHits - before
  results.push({
    label,
    vhost: binding.label,
    method,
    path: target,
    expected,
    status: response.status,
    handlerHits: hits,
    pass:
      response.status === expected &&
      response.handler === (expected === 200) &&
      hits === (expected === 200 ? 1 : 0),
  })
}

try {
  let ready = false
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await request(bindings[0], 'GET', '/startup')
      ready = true
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  assert.ok(ready, 'Isolated Apache did not become ready')
  assert.doesNotMatch(fs.readFileSync(errorPath, 'utf8'), /ModSecurity requires/)
  for (const binding of bindings.filter((item) => item.enabled)) {
    for (const [method, route] of inventory) {
      const target = route.replace('[id]', uuid)
      await check('required application method reaches backend', binding, method, target, 200)
      await check('query string preserves exact route', binding, method, target + '?fixture=1', 200)
    }
    for (const [method, target] of [
      ['DELETE', '/api/profile'],
      ['PUT', '/api/profile'],
      ['PATCH', '/api/favorites'],
      ['PROPFIND', '/api/profile'],
      ['PATCH', '/profile'],
      ['PATCH', '/api/profile/extra'],
      ['PATCH', '/prefix/api/profile'],
      ['PATCH', '/API/profile'],
      ['PATCH', '/api/profile/'],
      ['PATCH', '/api/%70rofile'],
      ['PATCH', '/api/profile.json'],
      ['PATCH', '/api/admin/resources/not-a-uuid/update'],
      ['DELETE', '/api/admin/resources/' + uuid + '/extra'],
      ['PUT', '/api/suggestions/' + uuid + '/status/extra'],
      ['PATCH', '/other?look=/api/profile'],
    ])
      await check('unlisted method/path remains denied', binding, method, target, 403)
    for (const method of ['GET', 'HEAD', 'POST', 'OPTIONS'])
      await check('ordinary method policy retained', binding, method, '/api/profile', 200)
    await check(
      'independent SQLi engine control',
      binding,
      'GET',
      '/api/profile?q=' + encodeURIComponent("1' OR '1'='1' -- "),
      403
    )
    for (const method of ['PATCH', 'DELETE', 'PUT']) {
      const target = inventory.find(([verb]) => verb === method)[1].replace('[id]', uuid)
      await check(
        'SQL injection rule still blocks permitted method',
        binding,
        method,
        target + '?q=' + encodeURIComponent("1' OR '1'='1' -- "),
        403
      )
    }
  }
  for (const binding of bindings.filter((item) => !item.enabled)) {
    for (const [method, route] of inventory)
      await check(
        'baseline/unrelated vhost remains protected',
        binding,
        method,
        route.replace('[id]', uuid),
        403
      )
    await check('baseline/unrelated normal GET remains usable', binding, 'GET', '/api/profile', 200)
  }
  const log = fs.readFileSync(errorPath, 'utf8')
  assert.ok(/\[id "911100"\]/.test(log), 'Positive method-policy engine control missing')
  assert.ok(/\[id "942100"\]/.test(log), 'Positive real libinjection engine control missing')
  const failures = results.filter((result) => !result.pass)
  const receipt = {
    mode: withoutFragment ? 'baseline-without-fragment' : 'candidate',
    syntax: 'Syntax OK',
    nativeRules: [911100, 942100],
    policyRuleIds: [999090, 999091, 999092],
    handlerInventory: inventory,
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    results,
  }
  if (receiptPath)
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 })
  console.log(
    JSON.stringify(
      {
        mode: receipt.mode,
        syntax: receipt.syntax,
        nativeRules: receipt.nativeRules,
        policyRuleIds: receipt.policyRuleIds,
        total: receipt.total,
        passed: receipt.passed,
        failed: receipt.failed,
        failures: failures.slice(0, 6),
        receipt: receiptPath,
      },
      null,
      2
    )
  )
  if (failures.length) process.exitCode = 1
} finally {
  if (apache.exitCode === null && apache.signalCode === null) {
    const exited = once(apache, 'exit')
    apache.kill('SIGTERM')
    await exited
  }
  await new Promise((resolve) => backend.close(resolve))
  fs.rmSync(sandbox, { recursive: true, force: true })
}
