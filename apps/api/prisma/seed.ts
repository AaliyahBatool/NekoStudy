import { prisma } from "../src/lib/db.js";

const scenes = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    name: "Rainy Library",
    category: "indoor",
    assetUrl: "https://example.com/scenes/rainy-library.glb",
    thumbnailUrl: "https://example.com/thumbnails/rainy-library.jpg",
    ambientAudioUrl: "https://example.com/audio/rain.mp3",
    licenseNote: "Placeholder asset. Replace before production.",
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    name: "Forest Cabin",
    category: "nature",
    assetUrl: "https://example.com/scenes/forest-cabin.glb",
    thumbnailUrl: "https://example.com/thumbnails/forest-cabin.jpg",
    ambientAudioUrl: "https://example.com/audio/forest.mp3",
    licenseNote: "Placeholder asset. Replace before production.",
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    name: "Ocean View",
    category: "nature",
    assetUrl: "https://example.com/scenes/ocean-view.glb",
    thumbnailUrl: "https://example.com/thumbnails/ocean-view.jpg",
    ambientAudioUrl: "https://example.com/audio/ocean.mp3",
    licenseNote: "Placeholder asset. Replace before production.",
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    name: "Quiet Cafe",
    category: "indoor",
    assetUrl: "https://example.com/scenes/quiet-cafe.glb",
    thumbnailUrl: "https://example.com/thumbnails/quiet-cafe.jpg",
    ambientAudioUrl: "https://example.com/audio/cafe.mp3",
    licenseNote: "Placeholder asset. Replace before production.",
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
    console.error("Failed to seed scenes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });