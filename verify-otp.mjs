import { issueOtp } from './artifacts/api-server/src/lib/otp.ts';
const record = issueOtp({
  email: 'test@example.com',
  intent: 'signup',
  signupPayload: {
    email: 'test@example.com',
    password: 'Secret123!',
    fullName: 'Test User',
    country: 'US',
  },
});
console.log('ISSUED OTP RECORD:', record);
