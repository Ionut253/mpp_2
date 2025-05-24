import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create test account for development
let devTransporter: nodemailer.Transporter | null = null;

async function createDevTransporter() {
  if (process.env.NODE_ENV === 'development') {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();

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
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationCode(
  to: string,
  code: string
): Promise<boolean> {
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
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key is not configured');
      }

      // Use SendGrid in production
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com',
        subject,
        html,
      };
      await sgMail.send(msg);
      console.log('Email sent successfully via SendGrid to:', to);
    } else {
      // Use Ethereal in development
      if (!devTransporter) {
        await createDevTransporter();
      }

      if (!devTransporter) {
        throw new Error('Development email transporter not initialized');
      }

      const info = await devTransporter.sendMail({
        from: '"Banking App" <test@example.com>',
        to,
        subject,
        html,
      });

      console.log('Development email sent. Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Test the email configuration on startup
if (process.env.NODE_ENV !== 'production') {
  devTransporter.verify((error: Error | null) => {
    if (error) {
      console.error('Email configuration error:', error);
    } else {
      console.log('Email server (Mailtrap) is ready to send messages');
    }
  });
} 