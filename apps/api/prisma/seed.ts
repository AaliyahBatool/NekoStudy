import { prisma } from '../src/lib/db.js';

const scenes = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    name: 'Rainy Library',
    category: 'indoor',
    assetKey: 'scenes/rainy-library.mp4',
    thumbnailKey: 'thumbnails/rainy-library.jpg',
    ambientAudioUrl: null,
    licenseNote: 'Placeholder asset. Replace before production.',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    name: 'Forest Cabin',
    category: 'nature',
    assetKey: 'scenes/forest-cabin.mp4',
    thumbnailKey: 'thumbnails/forest-cabin.jpg',
    ambientAudioUrl: null,
    licenseNote: 'Placeholder asset. Replace before production.',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    name: 'Ocean View',
    category: 'nature',
    assetKey: 'scenes/ocean-view.mp4',
    thumbnailKey: 'thumbnails/ocean-view.jpg',
    ambientAudioUrl: null,
    licenseNote: 'Placeholder asset. Replace before production.',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    name: 'Quiet Cafe',
    category: 'indoor',
    assetKey: 'scenes/quiet-cafe.mp4',
    thumbnailKey: 'thumbnails/quiet-cafe.jpg',
    ambientAudioUrl: null,
    licenseNote: 'Placeholder asset. Replace before production.',
  },
];

async function main() {
  for (const scene of scenes) {
    const { id, ...data } = scene;

    await prisma.scene.upsert({
      where: { id },
      create: scene,
      update: data,
    });
  }

  console.log(`Successfully seeded ${scenes.length} scenes.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed scenes:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
