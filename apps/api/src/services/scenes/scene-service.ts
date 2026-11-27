import { prisma } from '../../lib/db.js';
import { env } from '../../config/env.js';

function resolveAssetUrl(key: string): string {
  return `${env.ASSET_BASE_URL.replace(/\/+$/, '')}/${key
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

function toSceneResponse(scene: {
  id: string;
  name: string;
  category: string;
  thumbnailKey: string;
  ambientAudioUrl: string | null;
}) {
  return {
    id: scene.id,
    name: scene.name,
    category: scene.category,
    thumbnailUrl: resolveAssetUrl(scene.thumbnailKey),
    ambientAudioUrl: scene.ambientAudioUrl,
  };
}

export async function listScenes(category?: string) {
  const scenes = await prisma.scene.findMany({
    where: category ? { category } : undefined,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      category: true,
      thumbnailKey: true,
      ambientAudioUrl: true,
    },
  });

  return scenes.map(toSceneResponse);
}

export async function getSceneById(id: string) {
  const scene = await prisma.scene.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      category: true,
      assetKey: true,
      thumbnailKey: true,
      ambientAudioUrl: true,
    },
  });

  if (!scene) return null;

  return {
    ...toSceneResponse(scene),
    assetUrl: resolveAssetUrl(scene.assetKey),
  };
}
