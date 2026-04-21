import { ObjectId } from 'mongodb';
import { chunkText } from '../lib/chunk';
import { embedTexts } from '../lib/embed';
import { memoriesCollection, ensureIndexes } from '../lib/mongo';
import type { Memory } from '../lib/types';

const SEED_MEMORIES: string[] = [
  // childhood fragments
  `The kitchen light at my grandmother's house had a small pull-chain with a bead at the end. I remember standing on a chair to reach it, and how the bead was warm if the light had been on. The house smelled of camphor and starch. She boiled everything.`,
  `I was maybe seven when I realized my parents were lying to me about where the cat went. It wasn't a farm. I didn't say anything for years.`,
  `I used to think that if I held my breath while driving past a cemetery I was protecting the dead from forgetting themselves. I still do this sometimes, though I am thirty-four.`,

  // work / tech journal
  `Wrote a note today: the hardest part of a rewrite is that you know where the bodies are buried in the old system, and you will bury different ones in the new one without meaning to.`,
  `Debugging the checkout flow for three days. Finally found it: a race condition in a cache we added to fix a different race condition in a cache we added in 2019. Somewhere a person quit a job and didn't tell us about this.`,
  `A good product meeting ends with fewer todos than it starts with. Nobody ever writes this down. Everyone knows it.`,
  `The backend team keeps asking for more "context." I think what they actually want is to be told they matter. I don't know how to write that into a PRD.`,
  `I keep pushing back on adding an admin panel. The real reason is not "scope." The real reason is that once you have an admin panel, people start asking for things.`,

  // book quotes / half-remembered
  `Somewhere I read: the opposite of play is not work, it is depression. I have turned this over for years without finding its bottom.`,
  `A line from some novel I can't place: "She loved him the way one loves a city one has left: with the whole body, at a distance."`,
  `Someone wrote that attention is the rarest and purest form of generosity. I think I agree. I also think I use this to let myself off the hook for giving money.`,

  // travel notes
  `Train from Kyoto to Osaka, late October. An older woman across from me was eating a single persimmon with a small knife, very slowly, as if she had all afternoon. She did. So did I. I had forgotten this was possible.`,
  `Lisbon in February: the light is the color of weak tea. Every cafe plays fado or Nina Simone. I ate a pastel de nata every day for seven days.`,
  `Walking around Mexico City last spring I kept getting the sense that the whole place had been built on a lake. It had been. The buildings are sinking by centimeters a year. Everyone knows and nobody panics.`,

  // overheard dialogue
  `Overheard at the coffee place on 4th: "He told me I was his person. What does that even mean? I have a dentist. I have an accountant. I don't need a person."`,
  `On a bus in Queens, a man to his small daughter: "You can't just name everyone 'friend.' You have to see if they are one."`,
  `At the gym: "I am trying to be less of a guy about it." I wanted to know what "it" was so badly I stayed on the treadmill an extra ten minutes.`,

  // half-finished ideas
  `Idea: an app that only shows you the weather from the place you most recently left. A way of staying in two places at once. Probably bad business.`,
  `Thing to think about: why do we trust paper more than screens for important things? Wills, diaries, love letters. Is it just the object, or is it the absence of the blinking cursor?`,
  `What if the real skill of middle age is not learning new things, but learning which old things were wrong?`,
  `Pet theory: most apps are trying to be inboxes, because inboxes are the only UI everyone has agreed on. Every "feed" is just a social inbox. Every "library" is just a longer inbox.`,

  // song lyrics that stuck
  `I've been humming that Phoebe Bridgers line all week: "the end is near, the end is here." I think about it when I refresh the news.`,
  `A song I heard once in a taxi in Berlin and could never find again had a line I think was "we will all be rivers in the end." I have looked for it for five years.`,

  // fitness / body notes
  `Ran six miles this morning. The legs feel fine. The thing that hurts is some small muscle in my neck that I did not know existed until I turned 33.`,
  `Started lifting again after a year off. The weight that used to feel easy is humiliating. Every workout is a small grief, then a small repair.`,
  `Sleep tracker says my REM is down 20%. I can feel it. Dreams are thinner. I try to remember one and catch only the shape, like reaching into a pocket for keys that aren't there.`,

  // recipe observations
  `The secret to a good risotto is that you do not, in fact, have to stir it constantly. My grandmother would stir it for twenty minutes and then walk away for ten. The ten minutes mattered as much as the twenty.`,
  `Onions want more time than you think. Whatever recipe you are reading, double the onion time. This applies to most things.`,
  `I made my mother's tomato sauce for the first time in ten years. It tasted wrong. I called her. She said I had forgotten the sugar. She didn't seem surprised.`,

  // late-night shower thoughts
  `At 2am, worrying about a friend who has gone quiet on the group chat. She always goes quiet in April. I don't know why and I have never asked.`,
  `I have spent more of my life inside conversations with people I will never see again than with people I love. I don't know what to do with that sentence.`,
  `Every apartment I have ever rented has had one outlet that didn't work and which I never fixed. I think this is the most honest thing about me.`,

  // internet / culture
  `Noticed: the word "wholesome" has completely replaced the word "kind" online. They are not the same. "Wholesome" is performed; "kind" is often private. The shift is not neutral.`,
  `Everyone is making the same joke on Twitter today. I made it too. I felt briefly part of something and then slightly worse.`,
  `New subreddit discovered: r/AskOldPeople. I have been reading it for three hours. It is better than almost any book I have opened this year.`,

  // relationships
  `The thing I love most about her is that she reads the ingredient labels on everything. Not for health. For curiosity. She wants to know what is in the world.`,
  `My father and I can talk for two hours about the Red Sox and not once about anything else. This is, somehow, intimacy.`,
  `Friend from college came through town. We had dinner. Afterwards I realized neither of us had mentioned any of the things we used to talk about. We are not the same people. We are friendly strangers who share a past.`,

  // creative practice
  `The writing advice I keep coming back to: "Don't confuse being stuck with being done." Most of my stuck moments have, in retrospect, been about fear, not quality.`,
  `I have kept a notebook for fifteen years. I have read back through exactly none of it. I do not think this makes the keeping useless. I think the keeping is the point.`,
  `Drawing class last night. The teacher said: "Stop fixing. Move on. Fixing is a way of not drawing." I have thought about this all day in a context that has nothing to do with drawing.`,
];

async function main() {
  const userId = process.env.DEFAULT_USER_ID || 'demo-user';
  console.log(`Seeding memories for userId=${userId}...`);

  await ensureIndexes();
  const memories = await memoriesCollection();

  const before = await memories.deleteMany({ userId, sourceType: 'seed' });
  if (before.deletedCount) {
    console.log(`Cleared ${before.deletedCount} existing seed memories.`);
  }

  const allChunks: { content: string; tokenCount: number }[] = [];
  for (const src of SEED_MEMORIES) {
    for (const c of chunkText(src)) allChunks.push(c);
  }
  console.log(`Chunked ${SEED_MEMORIES.length} sources into ${allChunks.length} chunks.`);

  console.log('Embedding...');
  const vectors = await embedTexts(allChunks.map((c) => c.content));

  const now = new Date();
  const docs: Memory[] = allChunks.map((c, i) => ({
    _id: new ObjectId(),
    userId,
    sourceType: 'seed',
    content: c.content,
    embedding: vectors[i],
    tokenCount: c.tokenCount,
    createdAt: now,
  }));

  await memories.insertMany(docs);
  console.log(`Inserted ${docs.length} memories.`);

  console.log('\nDone. Next:');
  console.log(' 1. In Atlas, create the "memories_vector" search index (see README).');
  console.log(' 2. Run `pnpm dev` and `pnpm dream:local` to generate dreams.');

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
