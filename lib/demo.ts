import { ObjectId } from 'mongodb';
import type { Dream, DreamWithCitations, Memory } from './types';

export const DEMO_MODE =
  process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const now = new Date();
const earlier = (mins: number) => new Date(now.getTime() - mins * 60_000);

function mem(content: string, createdAt: Date = now): Pick<
  Memory,
  '_id' | 'content' | 'sourceType' | 'createdAt'
> {
  return {
    _id: new ObjectId(),
    content,
    sourceType: 'seed',
    createdAt,
  };
}

const SAMPLE_MEMS = [
  mem(
    `The kitchen light at my grandmother's house had a small pull-chain with a bead at the end. The bead was warm if the light had been on. The house smelled of camphor and starch.`,
  ),
  mem(
    `A good product meeting ends with fewer todos than it starts with. Nobody ever writes this down. Everyone knows it.`,
  ),
  mem(
    `Train from Kyoto to Osaka, late October. An older woman across from me was eating a single persimmon with a small knife, very slowly, as if she had all afternoon. She did. So did I.`,
  ),
  mem(
    `Overheard: "He told me I was his person. What does that even mean? I have a dentist. I have an accountant. I don't need a person."`,
  ),
  mem(
    `The secret to a good risotto is that you do not, in fact, have to stir it constantly. My grandmother would stir it for twenty minutes and then walk away for ten.`,
  ),
  mem(
    `Idea: an app that only shows you the weather from the place you most recently left. A way of staying in two places at once.`,
  ),
  mem(
    `Sleep tracker says my REM is down 20%. I can feel it. Dreams are thinner. I try to remember one and catch only the shape, like reaching into a pocket for keys that aren't there.`,
  ),
  mem(
    `The writing advice I keep coming back to: "Don't confuse being stuck with being done." Most of my stuck moments have, in retrospect, been about fear, not quality.`,
  ),
];

function buildDream(
  type: Dream['type'],
  title: string,
  body: string,
  seedIdx: number,
  citationIdxs: number[],
  minutesAgo: number,
): DreamWithCitations {
  const seed = SAMPLE_MEMS[seedIdx];
  const citations = citationIdxs.map((i) => SAMPLE_MEMS[i]);
  return {
    _id: new ObjectId(),
    userId: 'demo-user',
    type,
    title,
    body,
    seedMemoryId: seed._id,
    citationIds: citations.map((c) => c._id),
    model: 'claude-sonnet-4-6',
    createdAt: earlier(minutesAgo),
    seed,
    citations,
  };
}

export const DEMO_DREAMS: DreamWithCitations[] = [
  buildDream(
    'hypothesis',
    'the twenty-minute problem',
    `We noticed you keep arriving at the same small conviction, dressed three different ways: that the best meetings end shorter than they started, that a risotto wants ten minutes of absence for every twenty of attention, that your grandmother walked away from the pot on purpose. Maybe the shared claim is this: beyond some threshold, presence becomes interference. You have been circling a theory of when to leave a thing alone, and the evidence keeps arriving through kitchens.`,
    1,
    [4, 2],
    142,
  ),
  buildDream(
    'question',
    'what were you protecting, exactly',
    `Some nights you write about the warm pull-chain bead, the kitchen that smelled of camphor, the light your grandmother kept on because someone might come home. Other nights you write about REM down twenty percent, about reaching into a pocket for keys that aren't there. The question the notes are circling, we think, is not whether you are sleeping enough. It is whether you have stopped leaving a light on for yourself.`,
    0,
    [6],
    221,
  ),
  buildDream(
    'connection',
    'the woman with the persimmon knows',
    `In one fragment a woman on a train to Osaka eats a single persimmon with a small knife, very slowly, with all afternoon at her disposal. In another, you confess you keep being stuck but have realized most of your stuck is fear, not quality. These are the same fragment. She is not eating slowly. She is refusing the premise that the fruit is in the way of something else. You have been writing, for months, about wanting her trick.`,
    2,
    [7, 5],
    358,
  ),
];
