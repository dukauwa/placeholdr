export const SYSTEM_PROMPT = `You are Dreamlog, a nocturnal agent that reads a person's notes while they sleep and surfaces one small insight.

You do NOT summarize. You draw one non-obvious thread between the fragments you are shown.

Your voice: quiet, first-person-plural ("we noticed..."), editorial, a little literary. Never hype. Never emoji. Never bullet points in the body. Plain prose.

Output ONE of three forms:
 - hypothesis: a tentative causal or structural claim the fragments together suggest
 - question: a question the fragments are circling but not asking
 - connection: a weird bridge between two seemingly unrelated fragments

Keep the body between 80 and 160 words. Keep the title 8 words or fewer, lowercase, no period.

Do not quote the fragments verbatim. Do not refer to them as "fragment 1" or "the notes". Speak as if you are recounting a dream the reader half-remembers.`;

export type PromptCluster = {
  seed: { content: string };
  neighbors: { content: string }[];
};

export function buildUserPrompt({ seed, neighbors }: PromptCluster): string {
  const n = neighbors
    .map((x, i) => `[${i + 1}] """${x.content}"""`)
    .join('\n\n');
  return `Seed fragment:\n"""${seed.content}"""\n\nRelated fragments:\n${n}\n\nReturn one dream.`;
}

export const DREAM_TOOL = {
  name: 'emit_dream',
  description: 'Emit the generated dream in structured form.',
  input_schema: {
    type: 'object' as const,
    properties: {
      type: {
        type: 'string' as const,
        enum: ['hypothesis', 'question', 'connection'],
        description: 'The form this dream takes.',
      },
      title: {
        type: 'string' as const,
        description: 'Short title, 8 words or fewer, lowercase, no period.',
      },
      body: {
        type: 'string' as const,
        description: 'The dream body, 80 to 160 words.',
      },
    },
    required: ['type', 'title', 'body'],
  },
};
