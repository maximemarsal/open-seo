import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Open SEO",
  description: "Cookie Policy for Open SEO - Learn about how we use cookies",
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Cookie Policy
        </h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
            </p>
            <p>
              Cookies allow a website to recognize your device and store some information about your preferences or past actions. This helps improve your browsing experience and allows websites to provide personalized content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. How We Use Cookies</h2>
            <p>
              Open SEO uses cookies for the following purposes:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Essential Cookies</h3>
            <p>
              These cookies are necessary for the Service to function properly. They enable core functionality such as:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>User authentication and session management</li>
              <li>Remembering your login status</li>
              <li>Security and fraud prevention</li>
              <li>Load balancing and performance</li>
            </ul>
            <p className="mt-4">
              These cookies cannot be disabled as they are essential for the Service to work.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Functional Cookies</h3>
            <p>
              These cookies enhance functionality and personalization:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Remembering your preferences and settings</li>
              <li>Storing your form inputs temporarily</li>
              <li>Language preferences</li>
              <li>UI customization settings</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.3 Analytics Cookies</h3>
            <p>
              These cookies help us understand how visitors interact with our Service:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Page views and navigation patterns</li>
              <li>Feature usage statistics</li>
              <li>Error tracking and debugging</li>
              <li>Performance monitoring</li>
            </ul>
            <p className="mt-4">
              We use this information to improve our Service and user experience. Analytics data is aggregated and anonymized.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Third-Party Cookies</h2>
            <p>
              We may use third-party services that set their own cookies:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Analytics Services</h3>
            <p>
              We may use analytics services (such as Google Analytics) that use cookies to collect information about your use of the Service. These services have their own privacy policies.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Authentication Services</h3>
            <p>
              If you log in using third-party authentication (e.g., Google, GitHub), those services may set cookies for authentication purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Types of Cookies We Use</h2>
            
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">Cookie Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">Purpose</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm">session_id</td>
                    <td className="px-4 py-3 text-sm">Maintains your login session</td>
                    <td className="px-4 py-3 text-sm">Session</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">auth_token</td>
                    <td className="px-4 py-3 text-sm">Authentication and security</td>
                    <td className="px-4 py-3 text-sm">30 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">preferences</td>
                    <td className="px-4 py-3 text-sm">Stores your UI preferences</td>
                    <td className="px-4 py-3 text-sm">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">_ga, _gid</td>
                    <td className="px-4 py-3 text-sm">Google Analytics (if used)</td>
                    <td className="px-4 py-3 text-sm">2 years / 24 hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Managing Cookies</h2>
            <p>
              You have control over cookies. You can:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.1 Browser Settings</h3>
            <p>
              Most browsers allow you to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>See what cookies you have and delete them individually</li>
              <li>Block third-party cookies</li>
              <li>Block all cookies from specific sites</li>
              <li>Block all cookies</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> Blocking essential cookies may prevent the Service from functioning properly.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.2 Browser-Specific Instructions</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
              <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies and site permissions</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">5.3 Opt-Out Tools</h3>
            <p>
              You can opt out of certain analytics cookies using:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Google Analytics Opt-out Browser Add-on</li>
              <li>Your browser's "Do Not Track" setting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Local Storage and Similar Technologies</h2>
            <p>
              In addition to cookies, we may use:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Local Storage:</strong> Stores data locally in your browser (e.g., draft articles, preferences)</li>
              <li><strong>Session Storage:</strong> Temporary storage that clears when you close your browser</li>
              <li><strong>IndexedDB:</strong> Browser database for storing larger amounts of data</li>
            </ul>
            <p className="mt-4">
              You can clear local storage through your browser settings, similar to clearing cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Cookies and API Keys</h2>
            <p>
              <strong>Important:</strong> Your API keys are NOT stored in cookies. They are stored securely on our servers using encryption. Cookies are only used for session management and preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Changes to This Cookie Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. More Information</h2>
            <p>
              For more information about cookies and how they work, you can visit:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><a href="https://www.allaboutcookies.org" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">www.allaboutcookies.org</a></li>
              <li><a href="https://www.youronlinechoices.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">www.youronlinechoices.com</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Contact Us</h2>
            <p>
              If you have questions about our use of cookies, please contact us at:
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

