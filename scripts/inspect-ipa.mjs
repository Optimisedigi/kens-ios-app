#!/usr/bin/env node
// Structural inspector for an .ipa produced by `eas build -p ios`.
// Verifies the watch app is actually embedded and wired correctly:
//   - Payload/<App>.app exists (exactly one)
//   - Payload/<App>.app/Watch/<Watch>.app exists
//   - watch Info.plist: WKApplication=true, CFBundleIdentifier ends .watchkitapp
//   - iOS Info.plist CFBundleShortVersionString == watch CFBundleShortVersionString
//   - both embedded.mobileprovision profiles include App Group
//     "group.com.optimisedigital.nevermisstwice" (unless --skip-provision).
//
// No external npm deps. Uses macOS `unzip`, `plutil`, and `security`.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { argv, exit } from 'node:process';

const APP_GROUP = 'group.com.optimisedigital.nevermisstwice';
const WATCH_SUFFIX = '.watchkitapp';

function usage(msg) {
  if (msg) console.error(`usage error: ${msg}`);
  console.error('Usage: node scripts/inspect-ipa.mjs <path-to-ipa> [--skip-provision]');
  exit(2);
}

function parseArgs(args) {
  const out = { ipaPath: undefined, skipProvision: false };
  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a === '--skip-provision') {
      out.skipProvision = true;
    } else if (a === '-h' || a === '--help') {
      usage();
    } else if (a.startsWith('--')) {
      usage(`unknown flag ${a}`);
    } else if (!out.ipaPath) {
      out.ipaPath = a;
    } else {
      usage(`unexpected positional argument ${a}`);
    }
  }
  if (!out.ipaPath) usage('missing <path-to-ipa>');
  return out;
}

function fail(which, details) {
  console.error(`FAIL: ${which} — ${details}`);
  exit(1);
}

function plutilJsonFromFile(path) {
  let raw;
  try {
    raw = execFileSync('plutil', ['-convert', 'json', '-o', '-', path], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    fail(
      `plutil parse of ${path}`,
      `plutil error: ${err.stderr?.toString().trim() || err.message}`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`JSON parse of plutil output for ${path}`, err.message);
  }
}

function extractProvisionPlist(provisionPath, tmpDir) {
  // mobileprovision is a CMS-signed plist. `security cms -D` extracts the
  // inner XML plist; we write it to a temp file then use `plutil -extract`
  // to read just the keys we care about. We can't `plutil -convert json` the
  // whole profile because it legitimately contains <data> (DeveloperCertificates)
  // and <date> (ExpirationDate / CreationDate) values which plutil's JSON
  // converter rejects with "Invalid object in plist for JSON format". This
  // is a plutil limitation, not a corruption: real production profiles always
  // contain those types. We only need Entitlements for assertAppGroup.
  let xml;
  try {
    xml = execFileSync('security', ['cms', '-D', '-i', provisionPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    fail(`security cms -D on ${provisionPath}`, err.stderr?.toString().trim() || err.message);
  }
  const xmlPath = join(tmpDir, `provision-${basename(provisionPath)}-${Date.now()}.plist`);
  writeFileSync(xmlPath, xml);
  let raw;
  try {
    raw = execFileSync('plutil', ['-extract', 'Entitlements', 'json', '-o', '-', xmlPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    fail(
      `plutil -extract Entitlements on ${xmlPath}`,
      err.stderr?.toString().trim() || err.message,
    );
  }
  let entitlements;
  try {
    entitlements = JSON.parse(raw);
  } catch (err) {
    fail(`JSON parse of Entitlements for ${xmlPath}`, err.message);
  }
  return { Entitlements: entitlements };
}

function findExactlyOneAppDir(payloadDir) {
  if (!existsSync(payloadDir) || !statSync(payloadDir).isDirectory()) {
    fail('Payload/', `directory at ${payloadDir}`);
  }
  const apps = readdirSync(payloadDir).filter((n) => n.endsWith('.app'));
  if (apps.length === 0) {
    fail('Payload/*.app', `no .app bundle found in ${payloadDir}`);
  }
  if (apps.length > 1) {
    fail('Payload/*.app', `expected exactly one .app, got ${apps.length} (${apps.join(', ')})`);
  }
  const appPath = join(payloadDir, apps[0]);
  if (!statSync(appPath).isDirectory()) {
    fail('Payload/*.app', `${appPath} is not a directory`);
  }
  return appPath;
}

function findEmbeddedWatchApp(iosAppDir) {
  const watchDir = join(iosAppDir, 'Watch');
  if (!existsSync(watchDir) || !statSync(watchDir).isDirectory()) {
    fail(
      'Watch/ directory',
      `missing ${watchDir} — iOS app does not embed a watchOS app (canonical failure mode #1: watch target not embedded)`,
    );
  }
  const watchApps = readdirSync(watchDir).filter((n) => n.endsWith('.app'));
  if (watchApps.length !== 1) {
    fail(
      'Watch/*.app',
      `expected exactly one .app inside ${watchDir}, got ${watchApps.length} (${watchApps.join(', ') || 'none'})`,
    );
  }
  const watchAppPath = join(watchDir, watchApps[0]);
  if (!statSync(watchAppPath).isDirectory()) {
    fail('Watch/*.app', `${watchAppPath} is not a directory`);
  }
  return watchAppPath;
}

function requireInfoPlist(appDir, label) {
  const p = join(appDir, 'Info.plist');
  if (!existsSync(p)) {
    fail(`${label} Info.plist`, `missing at ${p}`);
  }
  return plutilJsonFromFile(p);
}

function requireProvision(appDir, label, tmpDir) {
  const p = join(appDir, 'embedded.mobileprovision');
  if (!existsSync(p)) {
    fail(
      `${label} embedded.mobileprovision`,
      `missing at ${p} (real production IPAs always include one; pass --skip-provision only for synthetic fixtures)`,
    );
  }
  return extractProvisionPlist(p, tmpDir);
}

function assertAppGroup(provision, label) {
  const ent = provision?.Entitlements;
  if (!ent || typeof ent !== 'object') {
    fail(`${label} provision Entitlements`, `missing Entitlements dict`);
  }
  const groups = ent['com.apple.security.application-groups'];
  if (!Array.isArray(groups) || !groups.includes(APP_GROUP)) {
    fail(
      `${label} App Group entitlement`,
      `expected array containing "${APP_GROUP}", got ${JSON.stringify(groups)}`,
    );
  }
}

function main() {
  const args = parseArgs(argv);
  const ipaPath = args.ipaPath;

  if (!ipaPath.endsWith('.ipa')) {
    usage(`path must end in .ipa (got ${ipaPath})`);
  }
  if (!existsSync(ipaPath)) {
    fail('ipa path', `no file at ${ipaPath}`);
  }
  if (!statSync(ipaPath).isFile()) {
    fail('ipa path', `${ipaPath} is not a regular file`);
  }

  const tmpDir = mkdtempSync(join(tmpdir(), 'nmt-ipa-'));
  try {
    try {
      execFileSync('unzip', ['-q', ipaPath, '-d', tmpDir], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      fail(
        'unzip',
        `failed to extract ${ipaPath}: ${err.stderr?.toString().trim() || err.message}`,
      );
    }

    const payloadDir = join(tmpDir, 'Payload');
    const iosAppDir = findExactlyOneAppDir(payloadDir);
    const watchAppDir = findEmbeddedWatchApp(iosAppDir);

    const iosInfo = requireInfoPlist(iosAppDir, 'iOS');
    const watchInfo = requireInfoPlist(watchAppDir, 'watch');

    if (watchInfo.WKApplication !== true) {
      fail(
        'watch Info.plist WKApplication',
        `expected boolean true, got ${JSON.stringify(watchInfo.WKApplication)}`,
      );
    }

    const watchBundleId = watchInfo.CFBundleIdentifier;
    if (typeof watchBundleId !== 'string' || !watchBundleId.endsWith(WATCH_SUFFIX)) {
      fail(
        'watch CFBundleIdentifier',
        `expected string ending in "${WATCH_SUFFIX}", got ${JSON.stringify(watchBundleId)}`,
      );
    }

    const iosVer = iosInfo.CFBundleShortVersionString;
    const watchVer = watchInfo.CFBundleShortVersionString;
    if (!iosVer) {
      fail('iOS CFBundleShortVersionString', 'unset');
    }
    if (!watchVer) {
      fail('watch CFBundleShortVersionString', 'unset');
    }
    if (iosVer !== watchVer) {
      fail(
        'CFBundleShortVersionString match',
        `iOS=${JSON.stringify(iosVer)} watch=${JSON.stringify(watchVer)} (App Store Connect will reject mismatched versions — failure #7)`,
      );
    }

    if (!args.skipProvision) {
      const iosProvision = requireProvision(iosAppDir, 'iOS', tmpDir);
      const watchProvision = requireProvision(watchAppDir, 'watch', tmpDir);
      assertAppGroup(iosProvision, 'iOS');
      assertAppGroup(watchProvision, 'watch');
    }

    const provisionNote = args.skipProvision
      ? 'App Group SKIPPED (--skip-provision)'
      : 'App Group OK';
    console.log(
      `OK: ipa ${basename(ipaPath)} embeds watch app ${watchBundleId} version ${watchVer} ${provisionNote}`,
    );
    exit(0);
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
}

main();
