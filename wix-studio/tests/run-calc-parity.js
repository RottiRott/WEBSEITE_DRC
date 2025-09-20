#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PARAMS = { eurKm: 1.0, setup: 40, minPrice: 125, ladder: 40, steiger: 340 };
const RATES = {
  ERST: [
    { min: 2, max: 3.99, price: 5 },
    { min: 4, max: 5.99, price: 7 },
    { min: 6, max: 7.99, price: 9 },
    { min: 8, max: 9.99, price: 12 },
    { min: 10, max: 999, price: 15 }
  ],
  FOLGE: [
    { min: 2, max: 3.99, price: 4 },
    { min: 4, max: 5.99, price: 5 },
    { min: 6, max: 7.99, price: 7 },
    { min: 8, max: 9.99, price: 10 },
    { min: 10, max: 999, price: 15 }
  ]
};

const round = (value) => Number(Number(value).toFixed(2));

function bandPrice(type, height) {
  const band = type === 'Folgereinigung' ? RATES.FOLGE : RATES.ERST;
  const h = Number(height) || 0;
  for (const range of band) {
    if (h >= range.min && h <= range.max) {
      return range.price;
    }
  }
  return band[band.length - 1].price;
}

function legacyCalculateQuote(rawInput = {}) {
  const typ = rawInput.typ === 'Folgereinigung' ? 'Folgereinigung' : 'Erstreinigung';
  const lfm = Number(rawInput.lfm) || 0;
  const hoehe = Number(rawInput.hoehe) || 0;
  const km = Number(rawInput.km ?? rawInput.km_einfach ?? rawInput.kmEinfach) || 0;
  const hasGuard = rawInput.schutz === true || String(rawInput.schutz || '').toLowerCase() === 'ja';
  const guardClean = hasGuard ? Number(rawInput.schutz_clean) || 0 : 0;
  const guardMont = hasGuard ? Number(rawInput.schutz_mont ?? rawInput.schutzMont) || 0 : 0;
  const guardDemont = hasGuard ? Number(rawInput.schutz_demont ?? rawInput.schutzDemont) || 0 : 0;

  const rate = bandPrice(typ, hoehe);

  const base = lfm * rate;
  const travel = km * 2 * PARAMS.eurKm;
  const setup = PARAMS.setup;
  const guardCleanTotal = guardClean * rate;
  const guardMontTotal = guardMont * rate;
  const guardDemontTotal = guardDemont * rate;

  const needSteiger = hasGuard && hoehe > 5 && guardClean + guardMont + guardDemont > 0;
  const steiger = needSteiger ? PARAMS.steiger : 0;
  const ladder = !needSteiger && hoehe > 6 ? PARAMS.ladder : 0;

  const subtotal = base + travel + setup + guardCleanTotal + guardMontTotal + guardDemontTotal + steiger + ladder;
  const minimumApplied = subtotal < PARAMS.minPrice;
  const totalValue = minimumApplied ? PARAMS.minPrice : subtotal;
  const total = round(totalValue);

  const breakdown = {
    rate,
    distanceKm: round(km),
    base: round(base),
    travel: round(travel),
    setup: round(setup),
    guardClean: round(guardCleanTotal),
    guardMount: round(guardMontTotal),
    guardDemount: round(guardDemontTotal),
    steiger: round(steiger),
    ladder: round(ladder),
    subtotal: round(subtotal),
    minimumApplied
  };

  const warnings = minimumApplied ? ['MIN_PRICE_APPLIED'] : undefined;
  return { total, breakdown, warnings };
}

async function loadNewCalculator() {
  const filePath = path.join(__dirname, '../backend/calc.jsw');
  const code = await fs.readFile(filePath, 'utf8');
  const transformed = code.replace(/export\s+function\s+calculateQuote/, 'function calculateQuote');
  const context = { console, Intl, Number, Math };
  context.globalThis = context;
  vm.createContext(context);
  const script = new vm.Script(`${transformed}; globalThis.__calc = calculateQuote;`, { filename: 'calc.jsw' });
  script.runInContext(context);
  if (typeof context.__calc !== 'function') {
    throw new Error('calculateQuote konnte nicht geladen werden.');
  }
  return context.__calc;
}

function compareBreakdown(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const va = a[key];
    const vb = b[key];
    if (typeof va === 'number' || typeof vb === 'number') {
      if (Number.isNaN(va) && Number.isNaN(vb)) {
        continue;
      }
      if (round(va ?? 0) !== round(vb ?? 0)) {
        return false;
      }
    } else if (va !== vb) {
      return false;
    }
  }
  return true;
}

function normaliseWarnings(value) {
  return Array.isArray(value) ? value.slice().sort() : [];
}

async function main() {
  const casesPath = path.join(__dirname, 'calc-parity.json');
  const content = await fs.readFile(casesPath, 'utf8');
  const cases = JSON.parse(content);

  const newCalculator = await loadNewCalculator();

  let failures = 0;
  for (const testCase of cases) {
    const legacy = legacyCalculateQuote(testCase.input);
    const modern = newCalculator(testCase.input);

    const totalOk = legacy.total === modern.total;
    const breakdownOk = compareBreakdown(legacy.breakdown, modern.breakdown);
    const warningsOk = JSON.stringify(normaliseWarnings(legacy.warnings)) === JSON.stringify(normaliseWarnings(modern.warnings));

    if (totalOk && breakdownOk && warningsOk) {
      console.log(`✅ ${testCase.name}: ${modern.total}`);
    } else {
      failures += 1;
      console.error(`❌ ${testCase.name}`);
      if (!totalOk) {
        console.error(`   total legacy=${legacy.total} modern=${modern.total}`);
      }
      if (!breakdownOk) {
        console.error('   breakdown legacy=', legacy.breakdown, 'modern=', modern.breakdown);
      }
      if (!warningsOk) {
        console.error('   warnings legacy=', legacy.warnings, 'modern=', modern.warnings);
      }
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} Testfälle weisen Abweichungen auf.`);
    process.exit(1);
  }

  console.log('\n🎉 Alle Paritätstests bestanden.');
}

main().catch((error) => {
  console.error('Testlauf fehlgeschlagen:', error);
  process.exit(1);
});
