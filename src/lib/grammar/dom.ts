import { GrammarIssue } from './engine';

interface TextNodeInfo {
  node: Text;
  start: number;
  end: number;
}

export function highlightGrammarIssues(root: HTMLElement) {
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
  const { analyzeText } = require('./engine');
  const domIssues = analyzeText(fullText);

  // Apply highlights from back to front to avoid messing up offsets
  const sortedIssues = [...domIssues].sort((a: any, b: any) => b.startIndex - a.startIndex);

  const typeColors: Record<string, string> = {
    complex_word: 'rgba(168, 85, 247, 0.4)', // purple
    weakening: 'rgba(59, 130, 246, 0.4)',    // blue
    passive_voice: 'rgba(34, 197, 94, 0.4)', // green
    lengthy_sentence: 'rgba(234, 179, 8, 0.4)', // yellow
    complex_sentence: 'rgba(239, 68, 68, 0.4)', // red
  };

  for (const issue of sortedIssues) {
    // Find which text nodes overlap with the issue
    let startNodeIdx = textNodes.findIndex(n => issue.startIndex >= n.start && issue.startIndex < n.end);
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

      highlightNode.parentNode?.insertBefore(span, highlightNode);
      span.appendChild(highlightNode);
    }
  }

  return domIssues;
}
