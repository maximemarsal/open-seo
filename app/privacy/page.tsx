import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | BlogGen AI",
  description: "Privacy Policy for BlogGen AI - Learn how we protect your data and API keys",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Privacy Policy
        </h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Introduction</h2>
            <p>
              Welcome to BlogGen AI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information and API keys. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
            <p>
              By using BlogGen AI, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Email address, username, and password when you create an account</li>
              <li><strong>API Keys:</strong> Your API keys for OpenAI, Anthropic, Gemini, Perplexity, and other AI service providers. These are stored securely and encrypted</li>
              <li><strong>Content:</strong> Articles, topics, and other content you generate through our platform</li>
              <li><strong>WordPress Credentials:</strong> If you choose to connect your WordPress site, we store your WordPress URL and authentication tokens</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> How you interact with our service, including pages visited, features used, and time spent</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
              <li><strong>Log Data:</strong> Server logs, error reports, and performance metrics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide, maintain, and improve our service</li>
              <li>To authenticate your API keys and process your article generation requests</li>
              <li>To connect to your WordPress site and publish articles when requested</li>
              <li>To communicate with you about your account, service updates, and support requests</li>
              <li>To analyze usage patterns and improve our platform</li>
              <li>To detect, prevent, and address technical issues and security threats</li>
              <li>To comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. API Key Security</h2>
            <p>
              Your API keys are critical to your account security. We implement the following security measures:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Encryption:</strong> All API keys are encrypted at rest using industry-standard encryption algorithms</li>
              <li><strong>Secure Transmission:</strong> API keys are transmitted over HTTPS/TLS connections</li>
              <li><strong>Access Control:</strong> Only authorized systems can access your API keys, and only for processing your requests</li>
              <li><strong>No Sharing:</strong> We never share your API keys with third parties or use them for purposes other than your requests</li>
              <li><strong>You Control Costs:</strong> You pay directly to AI providers. We do not charge markup fees on API usage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Data Sharing and Disclosure</h2>
            <p>We do not sell, trade, or rent your personal information or API keys to third parties. We may share information only in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Providers:</strong> We may use third-party services (hosting, analytics) that process data on our behalf under strict confidentiality agreements</li>
              <li><strong>Legal Requirements:</strong> If required by law, court order, or government regulation</li>
              <li><strong>Protection of Rights:</strong> To protect our rights, property, or safety, or that of our users</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide services. You can delete your account and all associated data at any time through your account settings. API keys are deleted immediately upon account deletion.
            </p>
            <p>
              We may retain certain information for legal, accounting, or security purposes even after account deletion, but this will be anonymized where possible.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Your Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Restriction:</strong> Request restriction of processing</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at the email address provided below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to enhance your experience, analyze usage, and improve our service. You can control cookies through your browser settings. For more information, please see our Cookie Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Children's Privacy</h2>
            <p>
              Our service is not intended for users under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="font-semibold">Email:</p>
              <p>privacy@bloggen.ai</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

