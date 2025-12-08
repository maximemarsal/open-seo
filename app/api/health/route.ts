import { NextResponse } from 'next/server';
import { validateConfig } from '../../../lib/config';
import { WordPressService } from '../../../lib/services/wordpress';

export async function GET() {
  try {
    // Check environment variables
    const configStatus = {
      openai: !!process.env.OPENAI_API_KEY,
      perplexity: !!process.env.PERPLEXITY_API_KEY,
      wordpress: {
        url: !!process.env.WORDPRESS_URL,
        username: !!process.env.WORDPRESS_USERNAME,
        password: !!process.env.WORDPRESS_PASSWORD,
      },
    };

    // Test WordPress connection if credentials are available
    let wordpressConnection = false;
    if (configStatus.wordpress.url && configStatus.wordpress.username && configStatus.wordpress.password) {
      try {
        validateConfig();
        const wordpressService = new WordPressService();
        const connection = await wordpressService.testConnection();
        wordpressConnection = connection.success;
      } catch (error) {
        console.warn('WordPress connection test failed:', error);
      }
    }

    const allConfigured = configStatus.openai && 
                         configStatus.perplexity && 
                         configStatus.wordpress.url && 
                         configStatus.wordpress.username && 
                         configStatus.wordpress.password;

    return NextResponse.json({
      status: allConfigured ? 'healthy' : 'configuration_needed',
      config: configStatus,
      wordpress: {
        configured: configStatus.wordpress.url && configStatus.wordpress.username && configStatus.wordpress.password,
        connected: wordpressConnection,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
