import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://marriage.resonatemovement.org';

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  variables?: Record<string, string>;
}

interface SendEmailResponse {
  id?: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate API key is configured
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email service not configured',
        } as SendEmailResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: SendEmailRequest = await req.json();
    const { to, subject, html, variables = {} } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: to, subject, html',
        } as SendEmailResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Interpolate variables in HTML and subject
    const processedSubject = interpolate(subject, { ...variables, portal_url: APP_URL });
    const processedHtml = interpolate(html, { ...variables, portal_url: APP_URL });

    // Wrap HTML with brand template
    const wrappedHtml = wrapEmailTemplate(processedHtml);

    // Send email via Resend with retry logic
    const result = await sendEmailWithRetry(to, processedSubject, wrappedHtml);

    if (result.success) {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as SendEmailResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Send email via Resend API with exponential backoff retry (3 attempts)
 */
async function sendEmailWithRetry(
  to: string,
  subject: string,
  html: string,
  maxAttempts = 3
): Promise<SendEmailResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Marriage Ministry <noreply@resonatemovement.org>',
          to,
          subject,
          html,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          id: responseData.id,
          success: true,
        };
      } else {
        // API returned an error
        lastError = new Error(responseData.message || 'Email send failed');
        console.error(`Attempt ${attempt} failed:`, lastError.message);

        // Don't retry on 4xx errors (bad request, invalid email, etc.)
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            error: lastError.message,
          };
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Attempt ${attempt} failed:`, lastError.message);
    }

    // If not the last attempt, wait with exponential backoff
    if (attempt < maxAttempts) {
      const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.log(`Retrying in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Email send failed after 3 attempts',
  };
}

/**
 * Interpolate {{variables}} in a template string
 */
function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
}

/**
 * Wrap email content with Resonate-branded template
 */
function wrapEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #373a36;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .email-container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .email-footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
          color: #9ca3af;
          font-size: 12px;
          text-align: center;
        }
        .email-footer a {
          color: #41748d;
          text-decoration: none;
        }
        .email-footer a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        ${content}
      </div>
      <div class="email-footer">
        <p>
          <strong>Resonate Marriage Ministry</strong><br>
          40650 Encyclopedia Cir., Fremont, CA 94538<br>
          <a href="{{portal_url}}/settings/notifications">Manage notification preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;
}
