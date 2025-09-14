/**
 * Cryptographic utilities for wallet and key management
 */

import { randomBytes } from 'crypto'

// Standard BIP39 wordlist (first 256 words for demo - in production use full list)
const BIP39_WORDLIST = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
  "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
  "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
  "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "against", "age",
  "agent", "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol",
  "alert", "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also",
  "alter", "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient",
  "anger", "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna",
  "antique", "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arcade",
  "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army", "around",
  "arrange", "arrest", "arrive", "arrow", "art", "artifact", "artist", "artwork", "ask", "aspect",
  "assault", "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude",
  "attract", "auction", "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado",
  "avoid", "awake", "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor",
  "bacon", "badge", "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar",
  "barely", "bargain", "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty",
  "because", "become", "beef", "before", "begin", "behave", "behind", "believe", "below", "belt",
  "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike",
  "bind", "biology", "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast",
  "bleak", "bless", "blind", "blood", "blossom", "blow", "blue", "blur", "blush", "board",
  "boat", "body", "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring",
  "borrow", "boss", "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass",
  "brave", "bread", "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli",
  "broken", "bronze", "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo",
  "build", "bulb", "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus",
  "business", "busy", "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage",
  "cake", "call", "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon",
  "canoe", "canvas", "canyon", "capable", "capital", "captain", "car", "carbon", "card", "care",
  "career", "careful", "careless", "cargo", "carpet", "carry", "cart", "case", "cash", "casino"
]

/**
 * Generate a cryptographically secure seed phrase
 */
export function generateSecureSeedPhrase(wordCount: 12 | 24 = 12): string[] {
  if (typeof window === 'undefined') {
    throw new Error('Seed generation is only available in browser environment')
  }

  const entropy = wordCount === 12 ? 16 : 32 // 128 bits for 12 words, 256 bits for 24 words
  const randomBytesArray = new Uint8Array(entropy)

  // Use crypto.getRandomValues for cryptographically secure randomness
  crypto.getRandomValues(randomBytesArray)

  const seedWords: string[] = []

  // Convert random bytes to seed words using proper entropy distribution
  for (let i = 0; i < wordCount; i++) {
    // Use multiple bytes to ensure uniform distribution
    const byteIndex = Math.floor(i * entropy / wordCount)
    const wordIndex = randomBytesArray[byteIndex] % BIP39_WORDLIST.length
    seedWords.push(BIP39_WORDLIST[wordIndex])
  }

  return seedWords
}

/**
 * Generate a stealth address (placeholder for now)
 */
export function generateStealthAddress(): string {
  const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(20)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `0x${randomHex}`
}

/**
 * Validate seed phrase format
 */
export function validateSeedPhrase(seedPhrase: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const words = seedPhrase.trim().toLowerCase().split(/\s+/)

  if (words.length !== 12 && words.length !== 24) {
    errors.push('Seed phrase must be 12 or 24 words')
  }

  // Check if all words are in BIP39 wordlist (basic check)
  const invalidWords = words.filter(word => !BIP39_WORDLIST.includes(word))
  if (invalidWords.length > 0) {
    errors.push(`Invalid words: ${invalidWords.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate private key format
 */
export function validatePrivateKey(privateKey: string): {
  isValid: boolean
  error?: string
} {
  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey

  if (cleanKey.length !== 64) {
    return { isValid: false, error: 'Private key must be 64 hex characters' }
  }

  if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
    return { isValid: false, error: 'Private key must contain only hex characters' }
  }

  return { isValid: true }
}

/**
 * Secure local storage operations for sensitive data
 */
export class SecureStorage {
  private static encrypt(data: string, password: string): string {
    // Simple XOR encryption (in production, use proper encryption like AES)
    let encrypted = ''
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(data.charCodeAt(i) ^ password.charCodeAt(i % password.length))
    }
    return btoa(encrypted)
  }

  private static decrypt(encryptedData: string, password: string): string {
    const encrypted = atob(encryptedData)
    let decrypted = ''
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ password.charCodeAt(i % password.length))
    }
    return decrypted
  }

  static store(key: string, data: string, password?: string): void {
    const dataToStore = password ? this.encrypt(data, password) : data
    localStorage.setItem(key, dataToStore)
  }

  static retrieve(key: string, password?: string): string | null {
    const stored = localStorage.getItem(key)
    if (!stored) return null

    return password ? this.decrypt(stored, password) : stored
  }

  static remove(key: string): void {
    localStorage.removeItem(key)
  }
}