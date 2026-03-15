import generatedImages from '../generated/images.json';
import { aboutHtml, aboutMeta } from '../generated/about';
import type { ImageRecord } from '../types';

export const images = generatedImages as ImageRecord[];
export { aboutHtml, aboutMeta };
