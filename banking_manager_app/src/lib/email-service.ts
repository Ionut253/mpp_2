import nodemailer, { Transporter } from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create nodemailer transporter for development
const devTransporter: Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  debug: process.env.NODE_ENV !== 'production' // Enable debug logs in development
});

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
    if (process.env.NODE_ENV === 'production' && process.env.SENDGRID_API_KEY) {
      // Use SendGrid in production
      const msg = {
        to,
        from: process.env.SMTP_FROM_EMAIL || 'noreply@yourdomain.com',
        subject,
        html,
      };
      await sgMail.send(msg);
    } else {
      // Use Mailtrap in development
      await devTransporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL || 'noreply@yourdomain.com',
        to,
        subject,
        html,
      });
    }
    console.log('Email sent successfully to:', to);
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