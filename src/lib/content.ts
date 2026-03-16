import generatedImages from '../generated/images.json';
import { aboutHtml, aboutMeta } from '../generated/about';
import type { ImageRecord } from '../types';
import { normalizeImageRecord } from './image-record';

export const images = (generatedImages as ImageRecord[]).map((image) => normalizeImageRecord(image)) satisfies ImageRecord[];

export { aboutHtml, aboutMeta };
