#!/usr/bin/env node
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('validation-results/checkpoint-fase1-agent1-interim.json', 'utf8'));

const isUS = (t) => !t.match(/\.(L|AS|PA|F|BR|MC|MI|ST|HE|CO|OL|VI|SW|HK|TO|V)$/);

const us = { pass: 0, partial: 0, fail: 0 };
const intl = { pass: 0, partial: 0, fail: 0 };

data.passing_stocks.forEach(s => isUS(s.ticker) ? us.pass++ : intl.pass++);
data.partial_stocks.forEach(s => isUS(s.ticker) ? us.partial++ : intl.partial++);
data.failing_stocks.forEach(s => isUS(s.ticker) ? us.fail++ : intl.fail++);

const usTotal = us.pass + us.partial + us.fail;
const intlTotal = intl.pass + intl.partial + intl.fail;
const usRate = (us.pass / usTotal * 100).toFixed(1);
const intlRate = (intl.pass / intlTotal * 100).toFixed(1);

console.log('INTERIM ANALYSIS (400 stocks tested):');
console.log('');
console.log('US MARKET (' + usTotal + ' stocks):');
console.log('  Pass: ' + us.pass + ' (' + usRate + '%)');
console.log('  Partial: ' + us.partial + ' (' + ((us.partial/usTotal*100).toFixed(1)) + '%)');
console.log('  Fail: ' + us.fail + ' (' + ((us.fail/usTotal*100).toFixed(1)) + '%)');
console.log('  Status: ' + (usRate >= 95 ? '✅ PASS' : usRate >= 90 ? '⚠️ PARTIAL' : '❌ FAIL'));
console.log('');
console.log('INTERNATIONAL (' + intlTotal + ' stocks):');
console.log('  Pass: ' + intl.pass + ' (' + intlRate + '%)');
console.log('  Partial: ' + intl.partial + ' (' + ((intl.partial/intlTotal*100).toFixed(1)) + '%)');
console.log('  Fail: ' + intl.fail + ' (' + ((intl.fail/intlTotal*100).toFixed(1)) + '%)');
console.log('  Status: ' + (intlRate >= 70 ? '✅ ACCEPTABLE' : '⚠️ NEEDS IMPROVEMENT'));
console.log('');

// Find US stocks in partial/fail
const usPartial = data.partial_stocks.filter(s => isUS(s.ticker));
const usFail = data.failing_stocks.filter(s => isUS(s.ticker));

if (usPartial.length > 0) {
  console.log('US PARTIAL STOCKS (sample):');
  usPartial.slice(0, 10).forEach(s => {
    console.log('  ' + s.ticker + ': ' + s.methods + ' methods, IV=$' + s.iv.toFixed(2) + ', ' + (s.error || 'low methods'));
  });
  console.log('');
}

if (usFail.length > 0) {
  console.log('US FAILED STOCKS:');
  usFail.forEach(s => {
    console.log('  ' + s.ticker + ': ' + s.error);
  });
}
