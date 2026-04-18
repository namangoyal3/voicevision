export type CommandType = 'read' | 'describe' | 'stop' | 'help' | 'start_continuous' | 'stop_continuous' | 'chat' | 'unknown';

interface ParsedCommand {
  type: CommandType;
  raw: string;
}

const COMMAND_PATTERNS: { type: CommandType; patterns: RegExp[] }[] = [
  {
    type: 'read',
    patterns: [
      /\bread\b/i,
      /\btext\b/i,
      /\bwhat does it say\b/i,
      /\bwhat's written\b/i,
      /\bcan you read\b/i,
    ],
  },
  {
    type: 'describe',
    patterns: [
      /\bwhat do you see\b/i,
      /\bdescribe\b/i,
      /\bwhat is this\b/i,
      /\bwhat's this\b/i,
      /\bidentify\b/i,
      /\bwhat am i looking at\b/i,
      /\bwhat's in front\b/i,
      /\bwhat is in front\b/i,
      /\blook\b/i,
    ],
  },
  {
    type: 'start_continuous',
    patterns: [
      /\bstart watching\b/i,
      /\bcontinuous mode\b/i,
      /\bwatch continuously\b/i,
      /\bkeep watching\b/i,
      /\bmonitor\b/i,
      /\breal time\b/i,
    ],
  },
  {
    type: 'stop_continuous',
    patterns: [
      /\bstop watching\b/i,
      /\bdisable continuous\b/i,
      /\bend monitoring\b/i,
    ],
  },
  {
    type: 'stop',
    patterns: [
      /\bstop\b/i,
      /\bcancel\b/i,
      /\bquiet\b/i,
      /\bshut up\b/i,
      /\bsilence\b/i,
    ],
  },
  {
    type: 'help',
    patterns: [
      /\bhelp\b/i,
      /\bwhat can you do\b/i,
      /\bcommands\b/i,
      /\binstructions\b/i,
    ],
  },
  {
    type: 'chat',
    patterns: [
      /\btalk\b/i,
      /\bchat\b/i,
      /\bconversation\b/i,
      /\bquestion\b/i,
    ],
  },
];

export function parseCommand(transcript: string): ParsedCommand {
  const trimmed = transcript.trim().toLowerCase();

  for (const { type, patterns } of COMMAND_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return { type, raw: transcript };
      }
    }
  }

  return { type: 'unknown', raw: transcript };
}

export const HELP_TEXT =
  'You can say: "Read this" to read text. "Describe" for a scene description. "Start watching" for real-time monitoring. "Talk" to chat with me. "Stop" to cancel. "Help" for these instructions.';
