import { bootstrapPage } from '../lib/page';
import { images } from '../lib/content';
import { aboutHtml } from '../generated/about';

bootstrapPage({
  mode: 'archive',
  images,
  about: aboutHtml,
});
