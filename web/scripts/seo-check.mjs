import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (path) => {
  const filePath = join(root, path);
  if (!existsSync(filePath)) return '';
  return readFileSync(filePath, 'utf8');
};

const checks = [
  ['src/lib/seo.ts', 'NEXT_PUBLIC_SITE_URL'],
  ['src/app/layout.tsx', 'metadataBase: siteUrl'],
  ['src/app/layout.tsx', 'application/ld+json'],
  ['src/app/sitemap.ts', 'MetadataRoute.Sitemap'],
  ['src/app/robots.ts', 'MetadataRoute.Robots'],
  ['src/app/page.tsx', 'createPageMetadata'],
  ['src/app/features/page.tsx', 'Digital Invitation Features'],
  ['src/app/how-it-works/page.tsx', 'How Digital Invitations Work'],
  ['src/app/templates/page.tsx', 'Digital Invitation Templates'],
  ['src/app/guest-experience/page.tsx', 'Guest Invitation Experience'],
  ['src/app/invite/[id]/page.tsx', 'index: false'],
  ['src/app/invitation/[id]/page.tsx', 'index: false'],
];

const failures = checks.filter(([file, expected]) => !read(file).includes(expected));

if (failures.length > 0) {
  console.error('SEO checks failed:');
  for (const [file, expected] of failures) {
    console.error(`- ${file} is missing ${JSON.stringify(expected)}`);
  }
  process.exit(1);
}

console.log(`SEO checks passed (${checks.length} checks).`);
