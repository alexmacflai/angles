# Angles

Angles is a photography site by [Alex Cruz](https://www.alexcruz.studio/).

It has two modes:

- `archive`: the full image collection
- `selection`: a random 12-image cluster based on tag proximity

The app is built with Vite and TypeScript. Image originals live in `content/images/originals`, and a content pipeline generates the optimized assets and JSON manifest the site actually uses.

## Project Structure

- `content/about.md`: intro copy for the site
- `content/images/originals`: source images you add and remove
- `content/images/catalog.json`: synced metadata for each image
- `public/generated/images`: generated image variants for the frontend
- `src/generated/images.json`: generated manifest consumed by the app
- `scripts/content-pipeline.mjs`: image processing and catalog sync

## Local Development

Install dependencies:

```bash
npm install
```

Start the site:

```bash
npm run dev
```

`npm run dev` automatically runs the content pipeline first, so you do not need to run a second command for normal use.

While the content pipeline runs, the terminal shows:

- a progress bar
- percentage complete
- current image number and total image count
- the filename currently being processed

When processing is done, the terminal prints `Generated content for ... images.` and then Vite starts.

## Image Workflow

### Add Images

1. Copy new image files into `content/images/originals`.
2. Run `npm run dev`.
3. The pipeline will automatically:
   - discover the new files
   - add missing entries to `content/images/catalog.json`
   - assign fallback metadata when needed
   - generate optimized image variants in `public/generated/images`
   - rebuild `src/generated/images.json`
4. Open the site and confirm the images appear.

### Remove Images

1. Delete the image files from `content/images/originals`.
2. Run `npm run dev` again.
3. The pipeline will remove those images from:
   - `content/images/catalog.json`
   - `public/generated/images`
   - `src/generated/images.json`
   - the site itself

### Replace or Re-Export Images

1. Overwrite an existing file in `content/images/originals` using the same filename.
2. Run `npm run dev`.
3. The pipeline will regenerate the image outputs and update the stored `sourceHash` so file changes are detected by content, not by filesystem dates.

Existing `tags` and `alt` text stay in place when a file is replaced with the same filename.

## Metadata Notes

If an image is missing metadata, the pipeline currently fills in:

- `tags: ["untagged"]`
- `alt`: derived from the filename

You can improve those values later by editing `content/images/catalog.json`, but that is optional. The catalog is now a synced metadata file, not a manual prerequisite for adding images.

## Useful Commands

```bash
npm run dev
npm run build
npm test
```
