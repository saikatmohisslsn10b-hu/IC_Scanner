/* Client-side logic gate evaluation — ZERO API cost */
export const GATE_TYPES = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'BUFFER'];

export const extractGateName = (rawText) => {
  if (!rawText) return null;
  const text = String(rawText).toUpperCase();

  // Order matters: check compound gates before their base substrings
  if (text.includes('NAND')) return 'NAND';
  if (text.includes('XNOR')) return 'XNOR';
  if (text.includes('NOR')) return 'NOR';
  if (text.includes('XOR')) return 'XOR';
  if (text.includes('AND')) return 'AND';
  if (text.includes('OR')) return 'OR';

  // NOT / Inverter synonyms
  if (text.includes('INVERT') || text.includes('NOT')) return 'NOT';

  // Non-inverting buffer synonyms
  if (text.includes('BUFFER') || text.includes('BUF')) return 'BUFFER';

  return null;
};

export const isSimpleGate = (rawText) => extractGateName(rawText) !== null;

export const evaluateGate = (rawText, inputs) => {
  const g = extractGateName(rawText);
  if (!inputs || inputs.length === 0 || !g) return 0;

  switch (g) {
    case 'AND':    return inputs.reduce((a, b) => a & b);
    case 'OR':     return inputs.reduce((a, b) => a | b);
    case 'NOT':    return inputs[0] ? 0 : 1;
    case 'BUFFER': return inputs[0] ? 1 : 0;
    case 'NAND':   return inputs.reduce((a, b) => a & b) ? 0 : 1;
    case 'NOR':    return inputs.reduce((a, b) => a | b) ? 0 : 1;
    case 'XOR':    return inputs.reduce((a, b) => a ^ b);
    case 'XNOR':   return inputs.reduce((a, b) => a ^ b) ? 0 : 1;
    default:       return 0;
  }
};

export const generateTruthTable = (rawText, inputCount) => {
  const g = extractGateName(rawText);
  const rows = [];
  const n = (g === 'NOT' || g === 'BUFFER') ? 1 : (inputCount || 2);

  for (let i = 0; i < Math.pow(2, n); i++) {
    const inputs = [];
    for (let j = n - 1; j >= 0; j--) {
      inputs.push((i >> j) & 1);
    }
    const output = evaluateGate(g, inputs);
    rows.push({ inputs, outputs: [output] });
  }
  return rows;
};

export const getInputLabels = (count) => {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
};