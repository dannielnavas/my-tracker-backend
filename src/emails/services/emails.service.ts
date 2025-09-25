import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Resend } from 'resend';
import config from 'src/config';

@Injectable()
export class EmailsService {
  resend: Resend;
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {
    this.resend = new Resend(this.configService.apiKeyResend);
  }

  async sendEmail(email: string, subject: string, userName?: string) {
    const emailData: any = {
      from: 'Focus Loop Team <no-reply@focus-loop-api.danniel.dev>',
      to: email,
      subject,
    };

    emailData.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Focus Loop</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
          }

          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          }

          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }

          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }

          .logo {
            font-size: 2.5rem;
            font-weight: 700;
            color: white;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 1;
          }

          .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 1.1rem;
            font-weight: 300;
            position: relative;
            z-index: 1;
          }

          .content {
            background: white;
            padding: 50px 30px;
            position: relative;
          }

          .welcome-title {
            font-size: 2rem;
            color: #2d3748;
            text-align: center;
            margin-bottom: 20px;
            font-weight: 600;
          }

          .welcome-message {
            font-size: 1.1rem;
            color: #4a5568;
            text-align: center;
            margin-bottom: 30px;
            line-height: 1.8;
          }

          .features {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin: 40px 0;
          }

          .feature {
            display: flex;
            align-items: center;
            padding: 20px;
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border-radius: 15px;
            border-left: 4px solid #667eea;
            transition: transform 0.3s ease;
          }

          .feature-icon {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 20px;
            font-size: 1.5rem;
            color: white;
          }

          .feature-text {
            flex: 1;
          }

          .feature-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 5px;
          }

          .feature-description {
            color: #718096;
            font-size: 0.95rem;
          }

          .cta-section {
            text-align: center;
            margin: 40px 0;
            padding: 30px;
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border-radius: 15px;
          }

          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 1.1rem;
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
          }

          .footer {
            background: #2d3748;
            color: white;
            padding: 30px;
            text-align: center;
          }

          .footer-text {
            color: #a0aec0;
            font-size: 0.9rem;
            margin-bottom: 15px;
          }

          .social-links {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 20px;
          }

          .social-link {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-decoration: none;
            transition: transform 0.3s ease;
          }

          .social-link:hover {
            transform: scale(1.1);
          }

          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 15px;
            }

            .header, .content, .footer {
              padding: 30px 20px;
            }

            .logo {
              font-size: 2rem;
            }

            .welcome-title {
              font-size: 1.5rem;
            }

            .features {
              gap: 15px;
            }

            .feature {
              flex-direction: column;
              text-align: center;
            }

            .feature-icon {
              margin-right: 0;
              margin-bottom: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎯 Focus Loop</div>
            <div class="tagline">Maximize your productivity, achieve your goals</div>
          </div>

          <div class="content">
            <h1 class="welcome-title">Welcome${userName ? `, ${userName}` : ''}! 🎉</h1>
            <p class="welcome-message">
              We're excited to have you on Focus Loop. Your journey towards greater productivity and focus starts now.
            </p>

            <div class="features">
              <div class="feature">
                <div class="feature-icon">📊</div>
                <div class="feature-text">
                  <div class="feature-title">Smart Tracking</div>
                  <div class="feature-description">Monitor your progress with detailed metrics and real-time analytics</div>
                </div>
              </div>

              <div class="feature">
                <div class="feature-icon">🎯</div>
                <div class="feature-text">
                  <div class="feature-title">Clear Goals</div>
                  <div class="feature-description">Define and achieve your objectives with advanced planning tools</div>
                </div>
              </div>

              <div class="feature">
                <div class="feature-icon">⚡</div>
                <div class="feature-text">
                  <div class="feature-title">Maximum Productivity</div>
                  <div class="feature-description">Optimize your time with proven task management techniques</div>
                </div>
              </div>
            </div>

            <div class="cta-section">
              <h3 style="color: #2d3748; margin-bottom: 15px;">Ready to get started?</h3>
              <p style="color: #718096; margin-bottom: 25px;">Explore all the features that Focus Loop has to offer you</p>
              <a href="#" class="cta-button">Get Started Now</a>
            </div>
          </div>

          <div class="footer">
            <p class="footer-text">
              Thank you for joining Focus Loop. If you have any questions, don't hesitate to contact us.
            </p>
            <div class="social-links">
              <a href="#" class="social-link">📧</a>
              <a href="#" class="social-link">🐦</a>
              <a href="#" class="social-link">💼</a>
            </div>
            <p style="color: #718096; font-size: 0.8rem; margin-top: 20px;">
              © 2024 Focus Loop. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await this.resend.emails.send(emailData);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}
