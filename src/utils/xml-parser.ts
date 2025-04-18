/**
 * A simple XML parser that can extract elements from an XML string
 * This handles CDATA sections and attributes better than regex
 */
export function extractElements(xml: string, tagName: string): string[] {
  const results: string[] = [];
  
  // Use DOMParser in a way compatible with Bun's environment
  try {
    // Method 1: Try using server-side DOMParser if available (Node.js with DOM libraries)
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const parser = new (globalThis as any).DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const elements = doc.getElementsByTagName(tagName);
    
    for (let i = 0; i < elements.length; i++) {
      results.push(elements[i].textContent || "");
    }
    
    return results;
  } catch (e) {
    // Method 2: Fallback to a more manual approach if DOMParser is not available
    try {
      // Simple pattern that handles CDATA better than a simple regex
      const pattern = new RegExp(`<${tagName}[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|([^<]+))</${tagName}>`, 'gs');
      const matches = Array.from(xml.matchAll(pattern));
      
      for (const match of matches) {
        // Extract content from either CDATA section (group 1) or plain text (group 2)
        const content = match[1] || match[2] || "";
        results.push(content.trim());
      }
      
      return results;
    } catch (e2) {
      console.error("Error parsing XML:", e2);
      return [];
    }
  }
} 