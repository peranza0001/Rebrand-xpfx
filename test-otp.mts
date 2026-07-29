import { issueOtp } from './artifacts/api-server/src/lib/otp.ts';
issueOtp({
  email: 'test@example.com',
  intent: 'signup',
  signupPayload: {
    email: 'test@example.com',
    password: 'Password123!',
    fullName: 'Test User',
    country: 'US',
  },
});
console.log('OTP issued');
