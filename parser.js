/**
 * EML to JSON Parser for Famly Form Filler Extension
 * Converts EML email files to structured JSON data
 */

class EMLParser {
  constructor() {
    this.raw = {};
    this.flat = [];
    this.phones = {};
    this.pendingLabel = null;
  }

  /**
   * Parse EML file content to JSON
   * @param {string} emlContent - Raw EML file content
   * @returns {Promise<Object>} Parsed JSON data
   */
  async parseEMLToJSON(emlContent) {
    try {
      // Extract HTML from EML
      const html = this.extractHTMLFromEML(emlContent);
      if (!html) {
        throw new Error('No HTML part found in EML file');
      }

      // Parse HTML to raw data
      const rawData = this.parseHTMLToRaw(html);
      
      // Normalize and structure the data
      return this.normalizeFields(rawData.raw, rawData.flat);
    } catch (error) {
      console.error('EML parsing error:', error);
      throw new Error(`Failed to parse EML: ${error.message}`);
    }
  }

  /**
   * Extract HTML content from EML file with proper character encoding
   * @param {string} emlContent - Raw EML content
   * @returns {string|null} Extracted HTML or null if not found
   */
  extractHTMLFromEML(emlContent) {
    // Look for HTML content with charset specification
    const htmlMatch = emlContent.match(/Content-Type: text\/html;.*?charset=(.*?)\r?\n\r?\n(.*)/is);
    
    if (htmlMatch && htmlMatch[2]) {
      const charset = htmlMatch[1].toLowerCase().trim();
      let htmlContent = this.decodeQuotedPrintable(htmlMatch[2]);
      
      // Handle different character encodings
      if (charset.includes('utf-8') || charset.includes('utf8')) {
        // UTF-8 is already handled by decodeQuotedPrintable
        return htmlContent;
      } else if (charset.includes('iso-8859-1') || charset.includes('latin1')) {
        // Convert ISO-8859-1 to UTF-8
        return this.convertLatin1ToUTF8(htmlContent);
      } else {
        // Default to UTF-8
        return htmlContent;
      }
    }

    // Fallback: try to find HTML content without charset specification
    const fallbackMatch = emlContent.match(/Content-Type: text\/html.*?\r?\n\r?\n(.*)/is);
    if (fallbackMatch && fallbackMatch[1]) {
      return this.decodeQuotedPrintable(fallbackMatch[1]);
    }

    return null;
  }

  /**
   * Convert Latin-1 (ISO-8859-1) encoded text to UTF-8
   * @param {string} text - Latin-1 encoded text
   * @returns {string} UTF-8 encoded text
   */
  convertLatin1ToUTF8(text) {
    try {
      // Convert Latin-1 bytes to UTF-8
      const bytes = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) {
        bytes[i] = text.charCodeAt(i) & 0xFF;
      }
      
      // Decode as Latin-1 and then encode as UTF-8
      const decoder = new TextDecoder('latin1');
      const encoder = new TextEncoder();
      const decoded = decoder.decode(bytes);
      return decoded;
    } catch (error) {
      console.warn('Latin-1 to UTF-8 conversion warning:', error);
      return text; // Return original if conversion fails
    }
  }

  /**
   * Decode quoted-printable encoding with comprehensive Unicode support
   * @param {string} text - Encoded text
   * @returns {string} Decoded text
   */
  decodeQuotedPrintable(text) {
    // First, handle basic quoted-printable decoding
    let decoded = text
      .replace(/=\r?\n/g, '') // Remove soft line breaks
      .replace(/=([0-9A-F]{2})/gi, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
    
    // Handle double-encoded UTF-8 characters (like Ã­ for í)
    decoded = this.fixDoubleEncodedUTF8(decoded);
    
    // Handle UTF-8 multi-byte sequences more comprehensively
    try {
      // Common UTF-8 encoded accented characters
      const utf8Replacements = {
        // Lowercase vowels with acute accent
        '=C3=A1': 'á', '=C3=A9': 'é', '=C3=AD': 'í', '=C3=B3': 'ó', '=C3=BA': 'ú',
        // Uppercase vowels with acute accent
        '=C3=81': 'Á', '=C3=89': 'É', '=C3=8D': 'Í', '=C3=93': 'Ó', '=C3=9A': 'Ú',
        // Lowercase vowels with grave accent
        '=C3=A0': 'à', '=C3=A8': 'è', '=C3=AC': 'ì', '=C3=B2': 'ò', '=C3=B9': 'ù',
        // Uppercase vowels with grave accent
        '=C3=80': 'À', '=C3=88': 'È', '=C3=8C': 'Ì', '=C3=92': 'Ò', '=C3=99': 'Ù',
        // Lowercase vowels with circumflex
        '=C3=A2': 'â', '=C3=AA': 'ê', '=C3=AE': 'î', '=C3=B4': 'ô', '=C3=BB': 'û',
        // Uppercase vowels with circumflex
        '=C3=82': 'Â', '=C3=8A': 'Ê', '=C3=8E': 'Î', '=C3=94': 'Ô', '=C3=9B': 'Û',
        // Lowercase vowels with umlaut
        '=C3=A4': 'ä', '=C3=AB': 'ë', '=C3=AF': 'ï', '=C3=B6': 'ö', '=C3=BC': 'ü',
        // Uppercase vowels with umlaut
        '=C3=84': 'Ä', '=C3=8B': 'Ë', '=C3=8F': 'Ï', '=C3=96': 'Ö', '=C3=9C': 'Ü',
        // Special characters
        '=C3=B1': 'ñ', '=C3=91': 'Ñ', '=C3=A7': 'ç', '=C3=87': 'Ç',
        // Other common accented characters
        '=C3=BA': 'ú', '=C3=9A': 'Ú', '=C3=BA': 'ú', '=C3=9A': 'Ú'
      };
      
      // Apply all UTF-8 replacements
      Object.entries(utf8Replacements).forEach(([encoded, replacement]) => {
        decoded = decoded.replace(new RegExp(encoded, 'g'), replacement);
      });
      
      // Handle any remaining UTF-8 sequences using a more generic approach
      if (decoded.includes('=C3=') || decoded.includes('=C2=')) {
        // Try to decode remaining UTF-8 sequences
        decoded = this.decodeRemainingUTF8(decoded);
      }
      
    } catch (error) {
      console.warn('UTF-8 decoding warning:', error);
    }
    
    return decoded;
  }

  /**
   * Fix double-encoded UTF-8 characters (common in EML files)
   * @param {string} text - Text with double-encoded characters
   * @returns {string} Fixed text
   */
  fixDoubleEncodedUTF8(text) {
    // Common double-encoded UTF-8 characters
    const doubleEncodedReplacements = {
      // Irish and other accented characters
      'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
      'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã"': 'Ó', 'Ãš': 'Ú',
      'Ã ': 'à', 'Ã¨': 'è', 'Ã¬': 'ì', 'Ã²': 'ò', 'Ã¹': 'ù',
      'Ã€': 'À', 'Ãˆ': 'È', 'ÃŒ': 'Ì', 'Ã': 'Ò', 'Ã™': 'Ù',
      'Ã¢': 'â', 'Ãª': 'ê', 'Ã®': 'î', 'Ã´': 'ô', 'Ã»': 'û',
      'Ã‚': 'Â', 'ÃŠ': 'Ê', 'ÃŽ': 'Î', 'Ã"': 'Ô', 'Ã›': 'Û',
      'Ã¤': 'ä', 'Ã«': 'ë', 'Ã¯': 'ï', 'Ã¶': 'ö', 'Ã¼': 'ü',
      'Ã„': 'Ä', 'Ã‹': 'Ë', 'Ã': 'Ï', 'Ã–': 'Ö', 'Ãœ': 'Ü',
      // Special characters
      'Ã±': 'ñ', 'Ã': 'Ñ', 'Ã§': 'ç', 'Ã‡': 'Ç'
    };
    
    // Apply all double-encoded replacements
    Object.entries(doubleEncodedReplacements).forEach(([encoded, replacement]) => {
      text = text.replace(new RegExp(encoded, 'g'), replacement);
    });
    
    return text;
  }

  /**
   * Decode remaining UTF-8 sequences that weren't caught by specific replacements
   * @param {string} text - Text with remaining UTF-8 sequences
   * @returns {string} Decoded text
   */
  decodeRemainingUTF8(text) {
    try {
      // Find all remaining UTF-8 sequences and decode them
      return text.replace(/=C3=([0-9A-F]{2})/gi, (match, hex) => {
        const byte1 = 0xC3; // UTF-8 continuation byte prefix
        const byte2 = parseInt(hex, 16);
        
        // Reconstruct the UTF-8 character
        const charCode = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F);
        return String.fromCharCode(charCode);
      });
    } catch (error) {
      console.warn('Remaining UTF-8 decoding warning:', error);
      return text;
    }
  }

  /**
   * Parse HTML table to raw data
   * @param {string} html - HTML content
   * @returns {Object} Raw and flat data arrays
   */
  parseHTMLToRaw(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Find the email fields table
    const table = doc.querySelector('#emailFieldsTable');
    if (!table) {
      throw new Error('Email fields table not found in HTML');
    }

    const rows = table.querySelectorAll('tr');
    const raw = {};
    const flat = [];

    rows.forEach(row => {
      const labelNode = row.querySelector('td.questionColumn, td[class*="question"]');
      const valueNode = row.querySelector('td.valueColumn, td[class*="value"]');

      if (!labelNode || !valueNode) return;

      const label = this.cleanText(labelNode.textContent);
      const value = this.cleanText(valueNode.textContent);

      if (!label || !value) return;

      // Handle duplicate labels by converting to array
      if (raw[label]) {
        if (!Array.isArray(raw[label])) {
          raw[label] = [raw[label]];
        }
        raw[label].push(value);
      } else {
        raw[label] = value;
      }

      flat.push([label, value]);
    });

    return { raw, flat };
  }

  /**
   * Clean and normalize text content
   * @param {string} text - Raw text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text) return '';
    
    // Debug: Log any suspicious encoding patterns
    if (text.includes('Ã­') || text.includes('Ã¡') || text.includes('Ã©')) {
      console.log('Found double-encoded characters in:', text);
    }
    
    // Normalize Unicode characters and clean whitespace
    let cleaned = text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
      .replace(/\u200B/g, '') // Remove zero-width spaces
      .replace(/\uFEFF/g, ''); // Remove BOM
    
    // Additional Unicode normalization
    try {
      // Normalize Unicode characters (NFD to NFC)
      if (typeof cleaned.normalize === 'function') {
        cleaned = cleaned.normalize('NFC');
      }
    } catch (error) {
      console.warn('Unicode normalization warning:', error);
    }
    
    return cleaned;
  }

  /**
   * Normalize and structure the parsed data
   * @param {Object} raw - Raw field data
   * @param {Array} flat - Flat field array
   * @returns {Object} Structured JSON data
   */
  normalizeFields(raw, flat) {
    // First pass: collect phone numbers and associate them with contacts
    this.collectPhoneNumbers(flat);

    // Build all contact data
    const parents = this.buildParentsArray(raw);
    const guardian = this.buildGuardianData(raw);
    const emergency_contact = this.buildEmergencyContactData(raw);
    const child = this.buildChildData(raw);

    // Process address_same_as_above logic after building the structure
    this.processAddressSameAsAbove(parents, guardian, emergency_contact, child);

    return {
      creche_name: raw['Please choose from the list below'] || '',
      start_date: raw['Required Start Date'] || '',
      placement_type: raw['Type of Placement'] || '',
      term_hours: raw['Average Weekly Term Hours'] || '',
      holiday_hours: raw['Average Weekly Holiday Hours'] || '',
      notes: raw['Notes'] || '',
      child: child,
      parents: parents,
      guardian: guardian,
      primary_contact: this.buildPrimaryContactData(raw),
      emergency_contact: emergency_contact,
      doctor: this.buildDoctorData(raw),
      immunisations: this.extractImmunisations(raw),
      special_needs: this.extractSpecialNeeds(raw)
    };
  }

  /**
   * Process address_same_as_above logic for all contacts
   * @param {Array} parents - Parents array
   * @param {Object} guardian - Guardian object
   * @param {Object} emergency_contact - Emergency contact object
   * @param {Object} child - Child object
   */
  processAddressSameAsAbove(parents, guardian, emergency_contact, child) {
    // First, handle Parent 1 - if same as above, use child's address
    if (parents.length > 0) {
      const parent1 = parents[0];
      if (parent1.address_same_as_above && 
          parent1.address_same_as_above.toLowerCase().includes('yes') && 
          child && child.address) {
        parent1.address = child.address;
      }
    }

    // Process parents array - if Parent 2 has same as above, use Parent 1's address
    if (parents.length > 1) {
      const parent2 = parents[1];
      if (parent2.address_same_as_above && 
          parent2.address_same_as_above.toLowerCase().includes('yes') && 
          parents[0] && parents[0].address) {
        parent2.address = parents[0].address;
      }
    }

    // Process guardian - if same as above, use Parent 1's address
    if (guardian.address_same_as_above && 
        guardian.address_same_as_above.toLowerCase().includes('yes') && 
        parents.length > 0 && parents[0].address) {
      guardian.address = parents[0].address;
    }

    // Process emergency contact - if same as above, use Parent 1's address
    if (emergency_contact.address_same_as_above && 
        emergency_contact.address_same_as_above.toLowerCase().includes('yes') && 
        parents.length > 0 && parents[0].address) {
      emergency_contact.address = parents[0].address;
    }
  }

  /**
   * Collect and associate phone numbers with contacts
   * @param {Array} flat - Flat field array
   */
  collectPhoneNumbers(flat) {
    flat.forEach(([label, value]) => {
      // Determine contact type based on label
      if (label.includes('Parent 1 - Name')) {
        this.pendingLabel = 'parent1';
      } else if (label.includes('Parent 2 - Name')) {
        this.pendingLabel = 'parent2';
      } else if (label.includes('Guardian Email')) {
        this.pendingLabel = 'guardian';
      } else if (label.includes('Other Email') || label.includes('Primary Contact')) {
        this.pendingLabel = 'primary';
      } else if (label.includes('Emergency Contact Name')) {
        this.pendingLabel = 'emergency';
      } else if (label.includes('Doctors Name')) {
        this.pendingLabel = 'doctor';
      }

      // Associate phone numbers
      if (label.includes('Mobile')) {
        if (!this.phones[this.pendingLabel]) this.phones[this.pendingLabel] = {};
        this.phones[this.pendingLabel].mobile = value;
      } else if (label.includes('Landline')) {
        if (!this.phones[this.pendingLabel]) this.phones[this.pendingLabel] = {};
        this.phones[this.pendingLabel].landline = value;
      }
    });
  }

  /**
   * Build child data object
   * @param {Object} raw - Raw field data
   * @returns {Object} Child data
   */
  buildChildData(raw) {
    return {
      name: raw["Child's Name (as it appears on birth certificate)"] || '',
      known_as: raw['Known as (if different from above)'] || '',
      dob: raw['Date of Birth'] || '',
      gender: raw['Sex: Male/Female'] || '',
      address: raw['Address'] || '',
      first_language: raw["Child's First Language"] || ''
    };
  }

  /**
   * Build parents array
   * @param {Object} raw - Raw field data
   * @returns {Array} Parents array
   */
  buildParentsArray(raw) {
    const parents = [];

    if (raw['Parent 1 - Name']) {
      parents.push({
        name: raw['Parent 1 - Name'],
        mobile: this.phones.parent1?.mobile || '',
        landline: this.phones.parent1?.landline || '',
        email: raw['Parent 1 Email'] || '',
        address_same_as_above: raw['Parent 1 Address - Same as above?'] || '',
        address: raw['Parent 1 Address'] || ''
      });
    }

    if (raw['Parent 2 - Name']) {
      parents.push({
        name: raw['Parent 2 - Name'],
        mobile: this.phones.parent2?.mobile || '',
        landline: this.phones.parent2?.landline || '',
        email: raw['Parent 2 Email'] || '',
        address_same_as_above: raw['Address - Same as above?'] || '',
        address: raw['Parent 2 Address'] || ''
      });
    }

    return parents;
  }

  /**
   * Build guardian data object
   * @param {Object} raw - Raw field data
   * @returns {Object} Guardian data
   */
  buildGuardianData(raw) {
    // Try multiple possible field names for guardian provided
    // Check if guardian email exists to determine if guardian is provided
    const guardianEmail = raw['Guardian Email'] || '';
    const guardianProvided = raw['Do you wish to add another Guardian\'s details?'] || 
                           raw['Guardian Details'] || 
                           raw['Add Guardian'] || 
                           raw['Guardian Provided'] || 
                           (guardianEmail ? 'Yes' : 'No');
    
    return {
      provided: guardianProvided,
      email: guardianEmail,
      mobile: this.phones.guardian?.mobile || '',
      address_same_as_above: raw['Guardian Address - Same as above?'] || '',
      address: raw['Guardian Eircode'] || raw['Guardian Address'] || '',
      note: raw['Additional Text'] || ''
    };
  }

  /**
   * Build primary contact data object
   * @param {Object} raw - Raw field data
   * @returns {Object} Primary contact data
   */
  buildPrimaryContactData(raw) {
    return {
      type: raw['Primary Contact'] || '',
      email: raw['Other Email'] || '',
      mobile: this.phones.primary?.mobile || ''
    };
  }

  /**
   * Build emergency contact data object
   * @param {Object} raw - Raw field data
   * @returns {Object} Emergency contact data
   */
  buildEmergencyContactData(raw) {
    return {
      name: raw['Emergency Contact Name'] || '',
      mobile: this.phones.emergency?.mobile || '',
      landline: this.phones.emergency?.landline || '',
      email: raw['Email'] || '',
      address_same_as_above: raw['Emergency Contact Address - Same as above?'] || '',
      address: raw['Alternative contact Address'] || ''
    };
  }

  /**
   * Build doctor data object
   * @param {Object} raw - Raw field data
   * @returns {Object} Doctor data
   */
  buildDoctorData(raw) {
    return {
      name: raw['Doctors Name'] || '',
      landline: raw['Doctors Landline'] || this.phones.doctor?.landline || '',
      mobile: raw['Doctors Mobile'] || this.phones.doctor?.mobile || '',
      email: raw['Doctors Email'] || '',
      address: raw['Doctors Address'] || ''
    };
  }

  /**
   * Extract immunisation data
   * @param {Object} raw - Raw field data
   * @returns {Array} Immunisation array
   */
  extractImmunisations(raw) {
    const definitions = {
      "(2 Months) 6 in 1 + MenB* + PCV +Rotavirus": "Please enter date of 6 in 1 + MenB* + PCV +Rotavirus",
      "(4 Months) 6 in 1 + MenB* + Rotavirus": "Please enter date of 6 in 1 + MenB* + Rotavirus",
      "(6 Months) 6 in 1+ Men C+ PCV Vaccination": "Please enter date of 6 in 1 + PCV + MenC",
      "(12 Months) MMR + MenB": "Please enter date of MMR + PCV Vaccination",
      "(13 Months) Hib/MenC + PCV": "Please enter date of Hib/MenC + PCV"
    };

    const immunisations = [];
    
    Object.entries(definitions).forEach(([label, dateLabel]) => {
      if (raw[label] || raw[dateLabel]) {
        immunisations.push({
          label: label,
          received: raw[label] || '',
          date: raw[dateLabel] || ''
        });
      }
    });

    return immunisations;
  }

  /**
   * Extract special needs data
   * @param {Object} raw - Raw field data
   * @returns {Array} Special needs array
   */
  extractSpecialNeeds(raw) {
    const labels = [
      "Medical Condition(s)",
      "Additional needs e.g. physical, intellectual",
      "Hearing or speech difficulties",
      "Allergies e.g. food, medicine, other pollutants",
      "Specific cultural/dietary requirements",
      "Additional Medical Requirements"
    ];

    let detailsList = raw["As you answered 'Yes', we require additional information."] || [];
    if (!Array.isArray(detailsList)) {
      detailsList = [detailsList];
    }

    let pointer = 0;
    const result = [];

    labels.forEach(label => {
      const entry = {
        type: label,
        provided: raw[label] || 'No',
        details: null
      };

      if (entry.provided.toLowerCase() === 'yes' && detailsList[pointer]) {
        entry.details = detailsList[pointer++];
      }

      result.push(entry);
    });

    return result;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EMLParser;
} else if (typeof window !== 'undefined') {
  window.EMLParser = EMLParser;
} 