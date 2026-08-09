// ---- DOM references ----
const textInput = document.getElementById("textInput");
const compressBtn = document.getElementById("compressBtn");
const resultsSection = document.getElementById("resultsSection");
const originalBitsEl = document.getElementById("originalBits");
const compressedBitsEl = document.getElementById("compressedBits");
const savedPercentEl = document.getElementById("savedPercent");
const codesTableEl = document.getElementById("codesTable");
const treeContainerEl = document.getElementById("treeContainer");
const verifyResultEl = document.getElementById("verifyResult");

class HuffmanNode {
  constructor(char, freq, left = null, right = null) {
    this.char = char;
    this.freq = freq;
    this.left = left;
    this.right = right;
  }
  isLeaf() {
    return this.left === null && this.right === null;
  }
}

function buildFrequencyMap(text) {
  const freqMap = new Map();
  for (const char of text) {
    freqMap.set(char, (freqMap.get(char) || 0) + 1);
  }
  return freqMap;
}

function buildHuffmanTree(freqMap) {
  let nodes = [...freqMap.entries()].map(([char, freq]) => new HuffmanNode(char, freq));

  if (nodes.length === 1) {
    return new HuffmanNode(null, nodes[0].freq, nodes[0], null);
  }

  while (nodes.length > 1) {
    nodes.sort((a, b) => a.freq - b.freq);

    const left = nodes.shift();
    const right = nodes.shift();

    const merged = new HuffmanNode(null, left.freq + right.freq, left, right);
    nodes.push(merged);
  }

  return nodes[0];
}

function generateCodes(node, prefix = "", codesMap = new Map()) {
  if (node.isLeaf()) {
    codesMap.set(node.char, prefix === "" ? "0" : prefix);
    return codesMap;
  }
  if (node.left) generateCodes(node.left, prefix + "0", codesMap);
  if (node.right) generateCodes(node.right, prefix + "1", codesMap);
  return codesMap;
}

function encode(text, codesMap) {
  return [...text].map(char => codesMap.get(char)).join("");
}

function decode(bitString, root) {
  let result = "";
  let current = root;

  for (const bit of bitString) {
    current = bit === "0" ? current.left : current.right;
    if (current.isLeaf()) {
      result += current.char;
      current = root;
    }
  }
  return result;
}

function renderCodesTable(codesMap) {
  const entries = [...codesMap.entries()].sort((a, b) => a[1].length - b[1].length);

  codesTableEl.innerHTML = entries.map(([char, code]) => {
    const displayChar = char === " " ? "␣ (space)" : char === "\n" ? "↵ (newline)" : escapeHtml(char);
    return `
      <div class="code-item">
        <span class="code-char">${displayChar}</span>
        <span class="code-bits">${code}</span>
      </div>
    `;
  }).join("");
}

function renderTree(root) {
  let nextLeafX = 0;
  const positions = new Map();
  const LEVEL_HEIGHT = 70;
  const LEAF_SPACING = 60;

  function assignPositions(node, depth) {
    if (node.isLeaf()) {
      const x = nextLeafX * LEAF_SPACING;
      nextLeafX++;
      positions.set(node, { x, y: depth * LEVEL_HEIGHT });
      return x;
    }

    const leftX = node.left ? assignPositions(node.left, depth + 1) : null;
    const rightX = node.right ? assignPositions(node.right, depth + 1) : null;
    const x = leftX !== null && rightX !== null
      ? (leftX + rightX) / 2
      : (leftX !== null ? leftX : rightX);

    positions.set(node, { x, y: depth * LEVEL_HEIGHT });
    return x;
  }

  assignPositions(root, 0);

  const allX = [...positions.values()].map(p => p.x);
  const allY = [...positions.values()].map(p => p.y);
  const width = Math.max(...allX) + 80;
  const height = Math.max(...allY) + 70;
  const offsetX = 40;

  let svgContent = "";

  function drawEdges(node) {
    const pos = positions.get(node);
    if (node.left) {
      const leftPos = positions.get(node.left);
      svgContent += `<line x1="${pos.x + offsetX}" y1="${pos.y + 20}" x2="${leftPos.x + offsetX}" y2="${leftPos.y + 20}" stroke="#3a3a55" stroke-width="2" />`;
      svgContent += `<text x="${(pos.x + leftPos.x) / 2 + offsetX - 10}" y="${(pos.y + leftPos.y) / 2 + 20}" fill="#7c6fe8" font-size="12" font-family="Consolas, monospace">0</text>`;
      drawEdges(node.left);
    }
    if (node.right) {
      const rightPos = positions.get(node.right);
      svgContent += `<line x1="${pos.x + offsetX}" y1="${pos.y + 20}" x2="${rightPos.x + offsetX}" y2="${rightPos.y + 20}" stroke="#3a3a55" stroke-width="2" />`;
      svgContent += `<text x="${(pos.x + rightPos.x) / 2 + offsetX + 6}" y="${(pos.y + rightPos.y) / 2 + 20}" fill="#a06fe8" font-size="12" font-family="Consolas, monospace">1</text>`;
      drawEdges(node.right);
    }
  }
  drawEdges(root);

  function drawNodes(node) {
    const pos = positions.get(node);
    const cx = pos.x + offsetX;
    const cy = pos.y + 20;

    if (node.isLeaf()) {
      const label = node.char === " " ? "␣" : node.char === "\n" ? "↵" : escapeHtml(node.char);
      svgContent += `<circle cx="${cx}" cy="${cy}" r="16" fill="#7c6fe8" />`;
      svgContent += `<text x="${cx}" y="${cy + 4}" fill="white" font-size="12" font-weight="bold" text-anchor="middle" font-family="Consolas, monospace">${label}</text>`;
      svgContent += `<text x="${cx}" y="${cy + 30}" fill="#8888a5" font-size="10" text-anchor="middle" font-family="Consolas, monospace">${node.freq}</text>`;
    } else {
      svgContent += `<circle cx="${cx}" cy="${cy}" r="14" fill="#2a2a40" stroke="#3a3a55" stroke-width="1.5" />`;
      svgContent += `<text x="${cx}" y="${cy + 4}" fill="#b8b8d0" font-size="10" text-anchor="middle" font-family="Consolas, monospace">${node.freq}</text>`;
    }

    if (node.left) drawNodes(node.left);
    if (node.right) drawNodes(node.right);
  }
  drawNodes(root);

  treeContainerEl.innerHTML = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${svgContent}
    </svg>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function runHuffmanCoding() {
  const text = textInput.value;
  if (text.length === 0) return;

  const freqMap = buildFrequencyMap(text);
  const tree = buildHuffmanTree(freqMap);
  const codesMap = generateCodes(tree);
  const encoded = encode(text, codesMap);
  const decoded = decode(encoded, tree);

  const originalBits = text.length * 8;
  const compressedBits = encoded.length;
  const savedPercent = originalBits > 0
    ? Math.round((1 - compressedBits / originalBits) * 100)
    : 0;

  originalBitsEl.textContent = `${originalBits} bits`;
  compressedBitsEl.textContent = `${compressedBits} bits`;
  savedPercentEl.textContent = `${savedPercent}%`;

  renderCodesTable(codesMap);
  renderTree(tree);

  const isCorrect = decoded === text;
  verifyResultEl.className = "verify-result " + (isCorrect ? "success" : "failure");
  verifyResultEl.textContent = isCorrect
    ? `✓ Decoded text matches perfectly: "${decoded}"`
    : `✗ Something went wrong — decoded text doesn't match.`;

  resultsSection.classList.remove("hidden");
}

compressBtn.addEventListener("click", runHuffmanCoding);

runHuffmanCoding();
