import { getCollection } from 'astro:content';
import { withBase } from '../lib/path';

export async function GET() {
  const allTools = await getCollection('tools');
  const allTutorials = await getCollection('tutorials');
  const allDevHub = await getCollection('devhub');

  const searchIndex = [
    ...allTools.map((t) => ({
      id: t.id,
      url: withBase(`/tools/${t.id}`),
      title: t.data.title,
      tagline: t.data.tagline,
      category: t.data.category,
      pricing: t.data.pricing,
      bottleneck: t.data.bottleneck,
      solution: t.data.solution,
      tags: t.data.tags,
    })),
    ...allTutorials.map((tut) => ({
      id: tut.id,
      url: withBase(`/tutorials/${tut.id}`),
      title: tut.data.title,
      tagline: tut.data.tagline,
      category: `${tut.data.category} · Guide`,
      pricing: tut.data.duration,
      bottleneck: tut.data.tagline,
      solution: tut.data.tagline,
      tags: tut.data.tags,
    })),
    ...allDevHub.map((script) => ({
      id: script.id,
      url: withBase(`/dev-hub/${script.id}`),
      title: script.data.title,
      tagline: script.data.tagline,
      category: `${script.data.tool_target} · Script`,
      pricing: script.data.language.toUpperCase(),
      bottleneck: script.data.bottleneck,
      solution: script.data.solution,
      tags: script.data.tags,
    })),
  ];

  return new Response(JSON.stringify(searchIndex), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
