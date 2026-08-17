// Password strength validation for enterprise security
// Requirements:
// - Minimum 8 characters (matches the app's broader password policy)
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
// - At least one special character

export interface PasswordStrengthResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'monkey',
  '1234567',
  'dragon',
  'master',
  'sunshine',
  'princess',
  'qazwsx',
  'admin',
]);

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];
  let strengthScore = 0;

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    strengthScore += 1;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    strengthScore += 1;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    strengthScore += 1;
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    strengthScore += 1;
  }

  // Check for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  } else {
    strengthScore += 1;
  }

  // Check for common weak passwords (case-insensitive)
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a more unique password');
  }

  // Check for repeated characters (e.g., "aaaa", "1111")
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password contains too many repeated characters');
  }

  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (strengthScore >= 4 && errors.length === 0) {
    strength = 'strong';
  } else if (strengthScore >= 3 && errors.length <= 1) {
    strength = 'good';
  } else if (strengthScore >= 2) {
    strength = 'fair';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

export function validatePasswordForAdminCreation(password: string): boolean {
  const result = validatePasswordStrength(password);
  return result.isValid;
}
