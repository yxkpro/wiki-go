/**
 * A simplified version of the meaw library for East Asian Width calculations
 * Required by mte-kernel for table editing
 */

(function(global) {
  // East Asian Width (EAW) property values
  const EAW = {
    F: 'F', // Fullwidth
    H: 'H', // Halfwidth
    W: 'W', // Wide
    Na: 'Na', // Narrow
    A: 'A', // Ambiguous
    N: 'N'  // Neutral
  };

  /**
   * Gets the East Asian Width property of a character
   * This is a simplified implementation that handles the most common cases
   *
   * @param {string} char - A character or string
   * @param {number} [pos=0] - Position in the string to check
   * @returns {string} The EAW property ('F', 'H', 'W', 'Na', 'A', or 'N')
   */
  function getEAW(char, pos = 0) {
    // Get the character at the specified position
    const ch = typeof char === 'string' ? char.charAt(pos) : String(char);

    // Get the code point
    const cp = ch.codePointAt(0);
    if (cp === undefined) return EAW.N;

    // Basic ASCII range (most Latin letters, digits, punctuation)
    if (cp >= 0x0020 && cp <= 0x007F) {
      return EAW.Na; // Narrow
    }

    // CJK Unified Ideographs (Chinese, Japanese, Korean characters)
    if ((cp >= 0x4E00 && cp <= 0x9FFF) || // CJK Unified Ideographs
        (cp >= 0x3400 && cp <= 0x4DBF) || // CJK Unified Ideographs Extension A
        (cp >= 0x20000 && cp <= 0x2A6DF) || // CJK Unified Ideographs Extension B
        (cp >= 0x2A700 && cp <= 0x2B73F) || // CJK Unified Ideographs Extension C
        (cp >= 0x2B740 && cp <= 0x2B81F) || // CJK Unified Ideographs Extension D
        (cp >= 0x2B820 && cp <= 0x2CEAF)) { // CJK Unified Ideographs Extension E
      return EAW.W; // Wide
    }

    // Hiragana and Katakana
    if ((cp >= 0x3040 && cp <= 0x309F) || // Hiragana
        (cp >= 0x30A0 && cp <= 0x30FF)) { // Katakana
      return EAW.W; // Wide
    }

    // Fullwidth Forms
    if (cp >= 0xFF01 && cp <= 0xFF60) {
      return EAW.F; // Fullwidth
    }

    // Halfwidth Forms
    if (cp >= 0xFF61 && cp <= 0xFFDC) {
      return EAW.H; // Halfwidth
    }

    // Emoji and symbols (many are wide)
    if ((cp >= 0x1F300 && cp <= 0x1F64F) || // Miscellaneous Symbols and Pictographs
        (cp >= 0x1F680 && cp <= 0x1F6FF)) { // Transport and Map Symbols
      return EAW.W; // Wide
    }

    // Default to Narrow for remaining characters
    // In a complete implementation, we'd need more precise categorization
    return EAW.Na;
  }

  // Create the MeawLib object
  const MeawLib = {
    getEAW: getEAW
  };

  // Export to global scope
  global.MeawLib = MeawLib;
})(typeof window !== 'undefined' ? window : this);