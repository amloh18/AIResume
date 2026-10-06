import { GrammarIssue, analyzeText } from './engine';

interface TextNodeInfo {
  node: Text;
  start: number;
  end: number;
}

function getSelectionOffsets(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  const preStart = range.cloneRange();
  preStart.selectNodeContents(root);
  preStart.setEnd(range.startContainer, range.startOffset);
  const start = preStart.toString().length;

  const preEnd = range.cloneRange();
  preEnd.selectNodeContents(root);
  preEnd.setEnd(range.endContainer, range.endOffset);
  const end = preEnd.toString().length;

  return { start, end };
}

function restoreSelectionOffsets(root: HTMLElement, offsets: { start: number; end: number }) {
  const selection = window.getSelection();
  if (!selection) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node: Node | null = walker.nextNode();
  let current = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffset = 0;
  let endOffset = 0;

  while (node) {
    const textNode = node as Text;
    const len = textNode.data.length;

    if (!startNode && offsets.start <= current + len) {
      startNode = textNode;
      startOffset = Math.max(0, offsets.start - current);
    }
    if (!endNode && offsets.end <= current + len) {
      endNode = textNode;
      endOffset = Math.max(0, offsets.end - current);
      break;
    }

    current += len;
    node = walker.nextNode();
  }

  if (!startNode || !endNode) return;
  const range = document.createRange();
  range.setStart(startNode, Math.min(startOffset, startNode.length));
  range.setEnd(endNode, Math.min(endOffset, endNode.length));
  selection.removeAllRanges();
  selection.addRange(range);
}

export function highlightGrammarIssues(root: HTMLElement) {
  const selectionOffsets = getSelectionOffsets(root);
  // First, remove existing highlights
  const existingSpans = root.querySelectorAll('span.grammar-highlight');
  existingSpans.forEach(span => {
    const fragment = document.createDocumentFragment();
    while (span.firstChild) {
      fragment.appendChild(span.firstChild);
    }
    span.parentNode?.replaceChild(fragment, span);
  });

  // Re-normalize to merge adjacent text nodes
  root.normalize();

  // Extract text nodes and their global offsets
  const textNodes: TextNodeInfo[] = [];
  let currentOffset = 0;
  let fullText = '';

  function traverse(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      textNodes.push({
        node: node as Text,
        start: currentOffset,
        end: currentOffset + text.length
      });
      currentOffset += text.length;
      fullText += text;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Add a space for block elements like <p> or <br> to ensure word boundaries
      const tagName = (node as Element).tagName.toLowerCase();
      if (tagName === 'br' || tagName === 'p' || tagName === 'div' || tagName === 'li') {
        fullText += ' ';
        currentOffset += 1;
      }
      if (tagName !== 'script' && tagName !== 'style') {
        node.childNodes.forEach(traverse);
      }
    }
  }

  traverse(root);

  // Re-run analyzeText on fullText to get correct offsets for the DOM text
  const locale = (root as any).dataset?.grammarLocale as 'us' | 'uk' | undefined;
  const domIssues = analyzeText(fullText, { locale });

  // Apply highlights from back to front to avoid messing up offsets
  const sortedIssues = [...domIssues].sort((a: any, b: any) => b.startIndex - a.startIndex);

  const typeColors: Record<string, string> = {
    complex_word: 'rgba(168, 85, 247, 0.4)', // purple
    weakening: 'rgba(59, 130, 246, 0.4)',    // blue
    passive_voice: 'rgba(34, 197, 94, 0.4)', // green
    lengthy_sentence: 'rgba(234, 179, 8, 0.4)', // yellow
    complex_sentence: 'rgba(239, 68, 68, 0.4)', // red
    spelling_variant: 'rgba(239, 68, 68, 0.4)' // red
  };

  for (const issue of sortedIssues) {
    // Find which text nodes overlap with the issue
    const startNodeIdx = textNodes.findIndex(n => issue.startIndex >= n.start && issue.startIndex < n.end);
    let endNodeIdx = textNodes.findIndex(n => issue.endIndex > n.start && issue.endIndex <= n.end);

    // If exact match end is not found (e.g. end of string), find the last node it touches
    if (startNodeIdx === -1) continue;
    if (endNodeIdx === -1) {
      endNodeIdx = textNodes.length - 1;
      while (endNodeIdx > startNodeIdx && textNodes[endNodeIdx].start >= issue.endIndex) {
        endNodeIdx--;
      }
    }

    const color = typeColors[issue.type] || 'rgba(255, 255, 255, 0.2)';

    for (let i = endNodeIdx; i >= startNodeIdx; i--) {
      const nodeInfo = textNodes[i];
      const nodeStartInText = Math.max(0, issue.startIndex - nodeInfo.start);
      const nodeEndInText = Math.min(nodeInfo.node.length, issue.endIndex - nodeInfo.start);

      if (nodeStartInText >= nodeEndInText) continue;

      // Split text node
      const textNode = nodeInfo.node;
      
      // If we don't start at 0, split the beginning
      let highlightNode = textNode;
      if (nodeStartInText > 0) {
        highlightNode = textNode.splitText(nodeStartInText);
      }
      
      // If we don't end at the end of the (possibly newly split) node, split the end
      const highlightLength = nodeEndInText - nodeStartInText;
      if (highlightLength < highlightNode.length) {
        highlightNode.splitText(highlightLength);
      }

      // Wrap in span
      const span = document.createElement('span');
      span.className = 'grammar-highlight';
      span.dataset.issueId = issue.id;
      // encode issue details in dataset so we can retrieve them on click
      span.dataset.issueData = JSON.stringify(issue);
      span.style.backgroundColor = color;
      span.style.borderRadius = '2px';
      span.style.cursor = 'pointer';
      span.title = issue.suggestion ? `${issue.message}\nFix: ${issue.suggestion}` : issue.message;

      highlightNode.parentNode?.insertBefore(span, highlightNode);
      span.appendChild(highlightNode);
    }
  }

  if (selectionOffsets) {
    restoreSelectionOffsets(root, selectionOffsets);
  }

  return domIssues;
}
