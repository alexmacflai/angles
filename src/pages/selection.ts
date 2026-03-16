import { bootstrapPage } from '../lib/page';
import { loadSelectionPageData } from '../lib/selection-data';

void loadSelectionPageData().then(({ about, images }) => {
  bootstrapPage({
    mode: 'selection',
    images,
    about,
  });
});
