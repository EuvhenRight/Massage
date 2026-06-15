/**
 * Seeds `studioVideo/current` so the admin manager can edit the doc
 * (and the public page reads metadata from Firestore instead of falling
 * back to the hard-coded default).
 *
 * Requires `.env.local` with Firebase client keys.
 *
 * Usage:
 *   npx tsx scripts/seed-studio-video.ts
 *   npx tsx scripts/seed-studio-video.ts --url=/video/studio.mp4 --title="Our Studio"
 *   npx tsx scripts/seed-studio-video.ts --inactive
 *   npx tsx scripts/seed-studio-video.ts --force   # overwrite an existing doc
 */
import "./load-env";
import {
  DEFAULT_STUDIO_VIDEO_TITLE,
  DEFAULT_STUDIO_VIDEO_URL,
  getStudioVideo,
  saveStudioVideo,
} from "../lib/studio-video-firestore";

type CliArgs = {
  url: string;
  title: string;
  poster: string | null;
  active: boolean;
  force: boolean;
};

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let url = DEFAULT_STUDIO_VIDEO_URL;
  let title = DEFAULT_STUDIO_VIDEO_TITLE;
  let poster: string | null = null;
  let active = true;
  let force = false;

  for (const raw of args) {
    if (raw === "--inactive") {
      active = false;
      continue;
    }
    if (raw === "--force") {
      force = true;
      continue;
    }
    const m = raw.match(/^--([^=]+)=(.*)$/);
    if (!m) {
      console.error(`Unknown argument: ${raw}`);
      process.exit(1);
    }
    const [, key, value] = m;
    switch (key) {
      case "url":
        url = value;
        break;
      case "title":
        title = value;
        break;
      case "poster":
        poster = value || null;
        break;
      default:
        console.error(`Unknown flag: --${key}`);
        process.exit(1);
    }
  }

  return { url, title, poster, active, force };
}

async function main() {
  const args = parseArgs();

  const existing = await getStudioVideo();
  if (existing && !args.force) {
    console.log("studioVideo/current already exists — skipping (pass --force to overwrite):");
    console.log(JSON.stringify(existing, null, 2));
    return;
  }

  await saveStudioVideo({
    title: args.title,
    videoUrl: args.url,
    posterUrl: args.poster,
    active: args.active,
  });

  console.log(
    `${existing ? "Overwrote" : "Created"} studioVideo/current:\n` +
      JSON.stringify(
        {
          title: args.title,
          videoUrl: args.url,
          posterUrl: args.poster,
          active: args.active,
        },
        null,
        2,
      ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
