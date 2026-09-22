import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const tools = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tools' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    type: z.enum(['software', 'plugin', 'utility']).default('plugin'),
    category: z.enum([
      'Video Editing',
      'Format Ingestion',
      'Automation & AI',
      'Audio Repair & Cleanup',
      'Color Grading & VFX',
      'Workflow & Organization',
      'Subtitling & Transcription',
      'Export & Compression'
    ]),
    nle_compatibility: z.array(z.string()),
    os: z.array(z.enum(['macOS', 'Windows', 'Linux', 'iOS', 'Android', 'iPadOS'])),
    pricing: z.enum(['Free', 'Open-Source', 'One-Time', 'Subscription', 'Freemium']),
    price_detail: z.string().optional(),
    developer_type: z.enum(['Indie', 'Studio', 'Open-Source', 'Enterprise']),
    website_url: z.string(),
    github_url: z.string().optional().default(''),
    icon: z.string().default('tool'),
    logo: z.string().optional(),
    featured: z.boolean().default(false),
    hidden_gem: z.boolean().default(false),
    rank: z.number().default(99),
    bottleneck: z.string(),
    solution: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

const devhub = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/devhub' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    language: z.enum(['bash', 'python', 'javascript', 'extendscript', 'json']),
    tool_target: z.enum(['FFmpeg', 'DaVinci Resolve', 'Adobe Premiere Pro', 'Adobe After Effects', 'CLI', 'System']),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    author: z.string().default('Editors Den Community'),
    github_link: z.string().optional().default(''),
    bottleneck: z.string(),
    solution: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

const tutorials = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tutorials' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    youtube_url: z.string(),
    channel_name: z.string().optional(),
    creator_type: z.enum(['Channel', 'Course', 'Playlist', 'Video Essay']).default('Channel'),
    nle: z.string().default('Universal'),
    duration: z.string().default('Ongoing Archive'),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'All Levels']).default('All Levels'),
    category: z.enum([
      'Premiere Pro',
      'After Effects',
      'Motion Design',
      'Filmmaking',
      'Music',
      'VFX',
      '3D'
    ]),
    categories: z.array(z.enum([
      'Premiere Pro',
      'After Effects',
      'Motion Design',
      'Filmmaking',
      'Music',
      'VFX',
      '3D'
    ])).default([]),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Editors Den'),
    featured: z.boolean().default(false),
    rank: z.number().default(99),
  }),
});

export const collections = { tools, devhub, tutorials };
