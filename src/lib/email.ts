// Brevo (formerly Sendinblue) Transactional Email Service integration
// Free tier provides 300 emails per day forever.

export async function sendOtpEmail(toEmail: string, otpCode: string, name?: string): Promise<{ success: boolean; message?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@campusfind.ai";
  const senderName = process.env.BREVO_SENDER_NAME || "CampusFind AI";

  if (!apiKey) {
    console.warn("[CampusFind Brevo] BREVO_API_KEY is not configured. OTP was printed to server log instead:", otpCode);
    return {
      success: false,
      message: "BREVO_API_KEY environment variable is not configured.",
    };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Code - CampusFind AI</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #f3f4f6; }
        .container { max-width: 520px; margin: 20px auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .logo { font-size: 24px; font-weight: 800; color: #3b82f6; letter-spacing: -0.5px; margin-bottom: 24px; text-align: center; }
        .logo span { color: #10b981; }
        h2 { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
        p { color: #9ca3af; font-size: 15px; line-height: 1.6; margin-top: 0; margin-bottom: 20px; }
        .otp-box { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 28px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; margin: 0; text-shadow: 0 0 10px rgba(96, 165, 250, 0.3); }
        .expiry-text { font-size: 13px; color: #f59e0b; font-weight: 600; margin-top: 8px; }
        .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 32px; border-top: 1px solid #1f2937; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">CampusFind<span>AI</span></div>
        <h2>Verify Your Campus Email</h2>
        <p>Hello ${name ? name : "Student"},</p>
        <p>Thank you for registering with <strong>CampusFind AI</strong>. Use the 6-digit verification code below to complete your registration:</p>
        
        <div class="otp-box">
          <div class="otp-code">${otpCode}</div>
          <div class="expiry-text">⏳ Code expires in 10 minutes</div>
        </div>

        <p>If you did not request this verification code, please ignore this email. Never share your verification code with anyone.</p>

        <div class="footer">
          &copy; ${new Date().getFullYear()} CampusFind AI &bull; Smart Lost & Found Network for Campuses
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: toEmail,
            name: name || toEmail,
          },
        ],
        subject: `${otpCode} is your CampusFind AI verification code`,
        htmlContent: htmlContent,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("[CampusFind Brevo Error]", res.status, errData);
      return {
        success: false,
        message: errData.message || `Brevo returned HTTP status ${res.status}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[CampusFind Brevo Exception]", err);
    return {
      success: false,
      message: err?.message || "Failed to reach Brevo email service.",
    };
  }
}
