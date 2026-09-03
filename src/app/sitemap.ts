import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://flexifund.ai';
  const routes = [
    '',
    '/onboarding',
    '/profile',
    '/upload',
    '/dashboard',
    '/income',
    '/expenses',
    '/resilience',
    '/savings',
    '/opportunities',
    '/what-if',
    '/credit',
    '/action-plan',
    '/settings',
    '/privacy',
    '/security',
    '/help',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }));
}
