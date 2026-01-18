import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Open SEO",
  description: "Terms of Service for Open SEO - Read our terms and conditions",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Terms of Service
        </h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Open SEO ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
            </p>
            <p>
              These Terms apply to all users of the Service, including without limitation users who are browsers, vendors, customers, merchants, and contributors of content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
            <p>
              Open SEO is a platform that enables users to generate SEO-optimized blog articles using artificial intelligence. The Service:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Uses your own API keys to connect to AI providers (OpenAI, Anthropic, Gemini, Perplexity, etc.)</li>
              <li>Generates blog articles based on topics and parameters you provide</li>
              <li>Optionally publishes articles directly to your WordPress site</li>
              <li>Provides SEO optimization and metadata generation</li>
            </ul>
            <p className="mt-4">
              <strong>Important:</strong> Open SEO is provided free of charge. You pay directly to AI service providers for API usage. We do not charge subscription fees or markup on API costs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. User Accounts</h2>
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Account Creation</h3>
            <p>
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Account Termination</h3>
            <p>
              You may delete your account at any time. We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent, abusive, or illegal activity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. API Keys and Third-Party Services</h2>
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Your Responsibility</h3>
            <p>
              You are solely responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Obtaining and maintaining valid API keys from AI service providers</li>
              <li>All costs associated with API usage (you pay directly to providers)</li>
              <li>Complying with the terms of service of AI providers (OpenAI, Anthropic, etc.)</li>
              <li>Managing API key security and access</li>
              <li>Monitoring your API usage and costs</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Our Role</h3>
            <p>
              We act as an intermediary platform. We:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Store your API keys securely and encrypted</li>
              <li>Use your API keys only to process your article generation requests</li>
              <li>Do not use your API keys for any other purpose</li>
              <li>Do not charge markup fees on API usage</li>
              <li>Are not responsible for API provider outages, rate limits, or policy changes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Content and Intellectual Property</h2>
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.1 Your Content</h3>
            <p>
              You retain all rights to articles and content generated through the Service. You grant us a limited license to store and process your content solely to provide the Service.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.2 AI-Generated Content</h3>
            <p>
              Articles generated by AI may not be unique and may be similar to content generated for other users. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Reviewing and editing generated content before publication</li>
              <li>Ensuring content accuracy and compliance with applicable laws</li>
              <li>Verifying that content does not infringe on third-party rights</li>
              <li>Adding necessary disclaimers or attributions</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.3 Prohibited Content</h3>
            <p>
              You agree not to use the Service to generate content that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Is illegal, harmful, or violates any laws</li>
              <li>Infringes on intellectual property rights</li>
              <li>Is defamatory, harassing, or discriminatory</li>
              <li>Contains malware, viruses, or malicious code</li>
              <li>Violates the terms of service of AI providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. WordPress Integration</h2>
            <p>
              If you choose to connect your WordPress site:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for maintaining valid WordPress credentials</li>
              <li>We store your WordPress URL and authentication tokens securely</li>
              <li>We publish articles only when you explicitly request publication</li>
              <li>You are responsible for reviewing articles before they go live</li>
              <li>We are not liable for any issues with your WordPress site</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Service Availability</h2>
            <p>
              We strive to provide reliable service but do not guarantee:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Uninterrupted or error-free operation</li>
              <li>Availability of third-party AI services</li>
              <li>Specific response times or performance levels</li>
            </ul>
            <p className="mt-4">
              The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Fees and Payment</h2>
            <p>
              <strong>Open SEO is free to use.</strong> We do not charge subscription fees, usage fees, or any other charges.
            </p>
            <p>
              You pay directly to AI service providers (OpenAI, Anthropic, etc.) for API usage. Typical costs range from $0.01 to $0.05 per article, depending on the AI model and article length.
            </p>
            <p>
              We are not responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI provider pricing changes</li>
              <li>API usage costs incurred through your use of the Service</li>
              <li>Billing disputes with AI providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <p>
              We do not warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Service will meet your requirements</li>
              <li>Generated content will be accurate, complete, or error-free</li>
              <li>The Service will be uninterrupted, timely, secure, or error-free</li>
              <li>Defects will be corrected</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BLOGGEN AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p>
              Our total liability for any claims arising from or related to the Service shall not exceed the amount you paid to us in the past 12 months (which is $0, as the Service is free).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Open SEO and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your use of the Service</li>
              <li>Content you generate or publish</li>
              <li>Violation of these Terms</li>
              <li>Violation of any third-party rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on this page and updating the "Last updated" date.
            </p>
            <p>
              Your continued use of the Service after changes become effective constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">14. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="font-semibold">Email:</p>
              <p>contact@open-seo.tech</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

