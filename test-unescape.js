const { unescapeJson } = require('./dist/utils/json/jsonFormatter.js');

const input = 'a\\nb\\tc\\rd\\"e\\\\f';
console.log('Input:   ', JSON.stringify(input));
console.log('Expected:', JSON.stringify('a\nb\tc\rd"e\\f'));
console.log('Actual:  ', JSON.stringify(unescapeJson(input)));
console.log('Match:', unescapeJson(input) === 'a\nb\tc\rd"e\\f');
