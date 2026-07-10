import nodemailer from "nodemailer";

export async function sendOtpEmail(to: string, otp: string) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Zyphor Security" <${process.env.SMTP_USER}>`,
      to,
      subject: "Your Zyphor Login OTP",
      text: `Your Zyphor Device Verification OTP is: ${otp}\n\nThis code will expire in 10 minutes. If you did not attempt to log in, please secure your account immediately.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #333;">Zyphor Security Alert</h2>
          <p style="color: #555; font-size: 16px;">We detected a login attempt from a new device. Please use the following One-Time Passcode (OTP) to verify your identity:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; padding: 15px 30px; font-size: 24px; font-weight: bold; background-color: #f4f4f4; border-radius: 5px; letter-spacing: 5px; color: #000;">
              ${otp}
            </span>
          </div>
          <p style="color: #555; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">If you did not attempt to log in, please secure your account immediately by resetting your password.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}
