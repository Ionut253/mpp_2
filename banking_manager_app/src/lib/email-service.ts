import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized with API key');
} else {
  console.warn('SendGrid API key not found');
}

// Create test account for development
let devTransporter: nodemailer.Transporter | null = null;

async function createDevTransporter() {
  console.log('Creating development email transporter...');
  if (process.env.NODE_ENV === 'development') {
    try {
      // Generate test SMTP service account from ethereal.email
      console.log('Generating Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      console.log('Ethereal test account created:', testAccount.user);

      // Create a transporter using the test account
      devTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('Development email credentials:', {
        user: testAccount.user,
        pass: testAccount.pass,
        previewURL: 'https://ethereal.email'
      });
    } catch (error) {
      console.error('Failed to create development email transporter:', error);
      devTransporter = null;
    }
  }
}

export function generateVerificationCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('Generated verification code:', code);
  return code;
}

async function sendWithRetry(msg: sgMail.MailDataRequired, maxRetries = 3, delay = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`SendGrid attempt ${attempt} of ${maxRetries}...`);
      await sgMail.send(msg);
      console.log('Email sent successfully via SendGrid');
      return true;
    } catch (error: any) {
      console.error(`SendGrid attempt ${attempt} failed:`, error.message);
      
      // Check if it's a throttling error
      if (error.response?.body?.errors?.[0]?.message?.includes('throttled')) {
        console.log(`Throttling detected, waiting ${delay}ms before retry...`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          // Increase delay for next attempt
          delay *= 2;
          continue;
        }
      }
      
      // If it's not a throttling error or we're out of retries, give up
      return false;
    }
  }
  return false;
}

export async function sendVerificationCode(
  to: string,
  code: string
): Promise<boolean> {
  console.log(`Attempting to send verification code to ${to}`);
  console.log('Current environment:', process.env.NODE_ENV);

  const subject = 'Your Banking App Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verification Code</h2>
      <p>Your verification code is:</p>
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
        <strong>${code}</strong>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        This is an automated message, please do not reply.
      </p>
    </div>
  `;

  try {
    if (process.env.NODE_ENV === 'production') {
      console.log('Using SendGrid for email delivery');
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key is not configured');
      }
      if (!process.env.SENDGRID_FROM_EMAIL) {
        console.warn('SENDGRID_FROM_EMAIL not set, using default');
      }

      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com';
      console.log('Sending from:', fromEmail);

      // Use SendGrid in production with retry mechanism
      const msg = {
        to,
        from: fromEmail,
        subject,
        html,
      };

      return await sendWithRetry(msg);
    } else {
      console.log('Using Ethereal for development email delivery');
      // Use Ethereal in development
      if (!devTransporter) {
        console.log('No dev transporter found, creating one...');
        await createDevTransporter();
      }

      if (!devTransporter) {
        throw new Error('Development email transporter not initialized');
      }

      console.log('Sending development email...');
      const info = await devTransporter.sendMail({
        from: '"Banking App" <test@example.com>',
        to,
        subject,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Development email sent successfully');
      console.log('Preview URL:', previewUrl);
      console.log('Message ID:', info.messageId);
      return true;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return false;
  }
} 