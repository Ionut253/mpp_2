import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized with API key');
} else {
  console.error('SendGrid API key not found - email functionality will not work');
}

export function generateVerificationCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('Generated verification code:', code);
  return code;
}

async function sendWithRetry(msg: sgMail.MailDataRequired, maxRetries = 3, initialDelay = 2000): Promise<boolean> {
  const recipientEmail = Array.isArray(msg.to) 
    ? typeof msg.to[0] === 'string' 
      ? msg.to[0] 
      : msg.to[0].email
    : typeof msg.to === 'string'
      ? msg.to
      : msg.to?.email;

  if (!recipientEmail) {
    console.error('No recipient email provided');
    return false;
  }

  const isYahooDomain = recipientEmail.toLowerCase().includes('yahoo.com');
  const retries = isYahooDomain ? 5 : maxRetries;
  let delay = isYahooDomain ? 5000 : initialDelay; 

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`SendGrid attempt ${attempt} of ${retries} for recipient: ${recipientEmail}`);
      await sgMail.send(msg);
      console.log('Email sent successfully via SendGrid');
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.body?.errors?.[0]?.message || error.message;
      console.error(`SendGrid attempt ${attempt} failed:`, errorMessage);
      
      const isThrottled = errorMessage.toLowerCase().includes('throttle') || 
                         errorMessage.toLowerCase().includes('deferred') ||
                         errorMessage.toLowerCase().includes('rate limit');
      
      if (isThrottled && attempt < retries) {
        console.log(`Throttling detected for ${recipientEmail}, waiting ${delay}ms before retry...`);
        console.log({
          attempt,
          recipient: recipientEmail,
          delay,
          errorDetails: error.response?.body || 'No detailed error body'
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2 * (1 + Math.random() * 0.1), 30000); 
        continue;
      }
      
      if (attempt === retries) {
        console.error('Failed to send email after all retries:', {
          recipient: recipientEmail,
          totalAttempts: attempt,
          finalError: errorMessage
        });
        return false;
      }
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

  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key is not configured');
    return false;
  }

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
    console.log('Using SendGrid for email delivery');
    
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com';
    if (!process.env.SENDGRID_FROM_EMAIL) {
      console.warn('SENDGRID_FROM_EMAIL not set, using default:', fromEmail);
    }
    console.log('Sending from:', fromEmail);

    const msg = {
      to,
      from: fromEmail,
      subject,
      html,
    };

    return await sendWithRetry(msg);
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

export async function testSendGridConfiguration(): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured');
    return false;
  }

  if (!process.env.SENDGRID_FROM_EMAIL) {
    console.error('SendGrid from email not configured');
    return false;
  }

  console.log('SendGrid configuration appears valid');
  return true;
}