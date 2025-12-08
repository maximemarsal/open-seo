import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer | BlogGen AI",
  description: "Disclaimer for BlogGen AI - Important information about our service",
};

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Disclaimer
        </h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. AI-Generated Content</h2>
            <p>
              BlogGen AI uses artificial intelligence to generate blog articles. Please be aware that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Content Accuracy:</strong> AI-generated content may contain errors, inaccuracies, or outdated information. Always fact-check and verify information before publishing.</li>
              <li><strong>No Guarantee of Uniqueness:</strong> AI models may generate similar content for different users. Content is not guaranteed to be unique.</li>
              <li><strong>Human Review Required:</strong> All generated content should be reviewed, edited, and fact-checked by a human before publication.</li>
              <li><strong>No Professional Advice:</strong> Generated content does not constitute professional, legal, medical, financial, or other expert advice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. SEO Rankings</h2>
            <p>
              While BlogGen AI generates SEO-optimized content, we cannot guarantee:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>That your articles will rank on Google or other search engines</li>
              <li>Specific ranking positions or search visibility</li>
              <li>Increased website traffic or conversions</li>
              <li>SEO scores or metrics</li>
            </ul>
            <p className="mt-4">
              Search engine rankings depend on numerous factors beyond content quality, including domain authority, backlinks, technical SEO, competition, and search engine algorithms that change frequently.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Third-Party Services</h2>
            <p>
              BlogGen AI integrates with third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>AI Providers:</strong> We use your API keys to connect to OpenAI, Anthropic, Gemini, Perplexity, and other AI services. We are not responsible for their service availability, pricing changes, or terms of service.</li>
              <li><strong>WordPress:</strong> If you connect your WordPress site, we are not responsible for WordPress functionality, security, or any issues with your website.</li>
              <li><strong>Unsplash:</strong> Images are sourced from Unsplash. We are not responsible for image licensing, availability, or content.</li>
            </ul>
            <p className="mt-4">
              You are responsible for complying with the terms of service of all third-party services you use through BlogGen AI.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. API Costs</h2>
            <p>
              <strong>Important:</strong> BlogGen AI is free, but you pay directly to AI service providers for API usage.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Typical costs range from $0.01 to $0.05 per article, but actual costs depend on the AI model, article length, and provider pricing</li>
              <li>API costs can vary and may change without notice</li>
              <li>You are responsible for monitoring and managing your API usage and costs</li>
              <li>We are not responsible for unexpected API charges or billing disputes with providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Content Ownership and Rights</h2>
            <p>
              While you retain ownership of content generated through BlogGen AI:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for ensuring content does not infringe on third-party intellectual property rights</li>
              <li>You must comply with copyright laws and obtain necessary licenses for images, quotes, or other materials</li>
              <li>AI-generated content may not be eligible for copyright protection in some jurisdictions</li>
              <li>You are responsible for adding appropriate attributions, disclaimers, or credits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Service Availability</h2>
            <p>
              BlogGen AI is provided on an "as is" and "as available" basis. We do not guarantee:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Uninterrupted or error-free service</li>
              <li>Availability of all features at all times</li>
              <li>Compatibility with all devices or browsers</li>
              <li>Specific performance levels or response times</li>
            </ul>
            <p className="mt-4">
              The Service may be temporarily unavailable due to maintenance, updates, third-party service outages, or circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Data and Security</h2>
            <p>
              While we implement security measures to protect your data and API keys:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>No system is 100% secure</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You should regularly review and rotate your API keys</li>
              <li>We are not liable for unauthorized access resulting from your failure to secure your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. No Professional Advice</h2>
            <p>
              Content generated by BlogGen AI is for informational purposes only and does not constitute:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Legal, financial, medical, or professional advice</li>
              <li>Investment recommendations</li>
              <li>Health or medical diagnoses</li>
              <li>Tax, accounting, or legal guidance</li>
            </ul>
            <p className="mt-4">
              Always consult qualified professionals for advice in specialized fields.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BLOGGEN AI SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Any errors or inaccuracies in generated content</li>
              <li>Loss of data, revenue, or business opportunities</li>
              <li>Damages resulting from use or inability to use the Service</li>
              <li>Issues with third-party services or integrations</li>
              <li>SEO ranking results or search engine visibility</li>
              <li>API costs or billing disputes with providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. User Responsibility</h2>
            <p>
              You are solely responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Reviewing and editing all generated content before publication</li>
              <li>Ensuring content accuracy, legality, and compliance with applicable laws</li>
              <li>Verifying that content does not infringe on third-party rights</li>
              <li>Managing your API keys and monitoring API costs</li>
              <li>Maintaining backups of your content</li>
              <li>Complying with terms of service of AI providers and WordPress</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Changes to Disclaimer</h2>
            <p>
              We reserve the right to update this Disclaimer at any time. Material changes will be reflected in the "Last updated" date. Your continued use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Contact</h2>
            <p>
              If you have questions about this Disclaimer, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="font-semibold">Email:</p>
              <p>support@bloggen.ai</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

