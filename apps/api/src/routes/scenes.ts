import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { getSceneById, listScenes } from '../services/scenes/scene-service.js';
import { AppError } from '../lib/errors.js';

const router: RouterType = Router();

const sceneIdSchema = z.string().uuid();

const categoryQuerySchema = z
  .object({
    category: z.string().trim().min(1).max(50).optional(),
  })
  .strict();

// GET /api/v1/scenes?category=
router.get('/', async (req, res) => {
  const { category } = categoryQuerySchema.parse(req.query);

  const scenes = await listScenes(category);

  res.status(200).json(scenes);
});

// GET /api/v1/scenes/:id
router.get('/:id', async (req, res) => {
  const id = sceneIdSchema.parse(req.params.id);
  const scene = await getSceneById(id);

  if (!scene) {
    throw new AppError('NOT_FOUND', 404, 'Scene not found');
  }

  res.status(200).json(scene);
});

export default router;
