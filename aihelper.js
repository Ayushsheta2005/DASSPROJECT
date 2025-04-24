const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-turbo" });


const COMMAND_PATTERNS = {
  COACH: {
    command: "/coach",
    patterns: [
      "my coaches", "show coaches", "list coaches", "view coaches", "connected coaches",
      "display coaches", "get coaches", "see coaches", "coach list", "coaching team",
      "mentors", "my mentors", "show mentors", "who are my coaches", "available coaches",
      "check coaches", "current coaches", "coach info", "coaching staff"
    ],
    description: "View your connected coaches and their details"
  },
  ADD_GOAL: {
    command: "/addgoal",
    patterns: [
      "add goal", "create goal", "new goal", "set goal", "make goal", 
      "establish goal", "define goal", "start goal", "begin goal", "initiate goal",
      "goal creation", "create a new goal", "add a goal", "set up goal", "plan goal",
      "goal setting", "establish objective", "create objective", "new objective"
    ],
    description: "Add a new goal with your coach"
  },
  ADD_SESSION: {
    command: "/addsession",
    patterns: [
      "add session", "schedule session", "book session", "new session", "create session",
      "plan session", "arrange session", "set up session", "organize session", "make appointment",
      "book appointment", "schedule meeting", "plan meeting", "new meeting", "coaching session",
      "set up call", "schedule a call", "arrange meeting", "book a slot", "reserve time"
    ],
    description: "Schedule a new coaching session"
  },
  LIST_SESSIONS: {
    command: "/listsessions",
    patterns: [
      "list sessions", "show sessions", "my sessions", "view sessions", "all sessions",
      "upcoming sessions", "scheduled sessions", "display sessions", "session calendar",
      "future sessions", "sessions list", "view appointments", "show appointments",
      "my schedule", "upcoming meetings", "calendar", "upcoming calls", "meeting schedule"
    ],
    description: "View all your scheduled sessions"
  },
  LIST_GOALS: {
    command: "/listgoals",
    patterns: [
      "list goals", "show goals", "my goals", "view goals", "all goals",
      "display goals", "goal status", "goal progress", "goals overview",
      "current goals", "active goals", "see my goals", "check goals",
      "view objectives", "my objectives", "show targets", "view targets"
    ],
    description: "View all your goals"
  },
  LOGIN: {
    command: "/login",
    patterns: [
      "login", "sign in", "authenticate", "access account", "log in",
      "enter credentials", "account access", "user login", "sign on",
      "user authentication", "access platform", "enter account",
      "sign into account", "account login", "authentication", "credentials"
    ],
    description: "Login to your UExcelerate account"
  },
  SEARCH_COACH: {
    command: "/searchcoach",
    patterns: [
      "search coach", "find coach", "discover coach", "coach search", "look for coach",
      "locate coach", "coach discovery", "coach finder", "find new coach", "search for coach",
      "explore coaches", "browse coaches", "coach exploration", "coach matching",
      "get matched", "find mentor", "search mentor", "discover mentor", "coach recommendation"
    ],
    description: "Search for new coaches based on your needs"
  },
  ADD_ACTION: {
    command: "/addaction",
    patterns: [
      "add action", "create action", "new action", "set action", "make action",
      "define action", "action item", "create task", "add task", "new task",
      "create action step", "add action item", "define task", "establish action",
      "new action plan", "create action plan", "add activity", "new activity"
    ],
    description: "Add a new action for a goal"
  },
  LIST_ACTIONS: {
    command: "/listactions",
    patterns: [
      "list actions", "show actions", "my actions", "view actions", "all actions",
      "display actions", "action items", "view tasks", "show tasks", "my tasks",
      "action steps", "action overview", "view action items", "check actions",
      "action status", "task list", "view activities", "activity list"
    ],
    description: "View all your actions"
  },
  HELP: {
    command: null,
    patterns: [
      "help", "commands", "what can you do", "available commands", "how to use",
      "show help", "assistance", "support", "guide me", "instructions", "options",
      "features", "functionality", "capabilities", "functions", "available options"
    ],
    description: "Get help and see available commands"
  }
};


const levenshteinDistance = (str1, str2) => {
  const track = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  
  return track[str2.length][str1.length];
};


const calculateSimilarity = (str1, str2) => 
  {
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Word overlap for multi-word phrases
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  // Count matching words
  const wordIntersection = words1.filter(w => words2.includes(w)).length;
  const wordUnion = new Set([...words1, ...words2]).size;
  const wordOverlap = wordIntersection / wordUnion;
  
  // For very short inputs, use Levenshtein distance too
  const maxLength = Math.max(s1.length, s2.length);
  const levenDist = levenshteinDistance(s1, s2);
  const levenSimilarity = maxLength > 0 ? (maxLength - levenDist) / maxLength : 0;
  
  // Check for substring match (one string contains the other)
  const containsBonus = s1.includes(s2) || s2.includes(s1) ? 0.2 : 0;
  
  // Combine scores with weighting
  return (wordOverlap * 0.6) + (levenSimilarity * 0.3) + containsBonus;
};


const findBestMatch = (input) => 
  {
  const normalizedInput = input.toLowerCase().trim();
  let bestMatch = null;
  let highestScore = 0;
  let secondBestScore = 0;
  let secondBestMatch = null;

  // First, check for exact command matches
  if (normalizedInput.startsWith('/')) {
    const commandName = normalizedInput.split(' ')[0].substring(1); // Remove the /
    for (const [intent, data] of Object.entries(COMMAND_PATTERNS)) {
      if (data.command && data.command.substring(1) === commandName) {
        return { match: data, confidence: 1.0, alternativeMatch: null };
      }
    }
  }

  // Split input into words to check for word-level matches
  const inputWords = normalizedInput.split(/\s+/);
  
  // Score each pattern against input
  for (const [intent, data] of Object.entries(COMMAND_PATTERNS)) {
    for (const pattern of data.patterns) {
      // Calculate overall similarity
      const score = calculateSimilarity(normalizedInput, pattern);
      
      // Boost score if key action words are present
      const patternWords = pattern.toLowerCase().split(/\s+/);
      const keyWordMatch = patternWords.some(word => 
        word.length > 3 && inputWords.includes(word)
      );
      
      const finalScore = keyWordMatch ? score * 1.2 : score;
      
      if (finalScore > highestScore) {
        secondBestScore = highestScore;
        secondBestMatch = bestMatch;
        highestScore = finalScore;
        bestMatch = data;
      } else if (finalScore > secondBestScore) {
        secondBestScore = finalScore;
        secondBestMatch = data;
      }
    }
  }

  const threshold = 0.25;
  return { 
    match: highestScore > threshold ? bestMatch : null, 
    confidence: highestScore,
    alternativeMatch: secondBestMatch,
    alternativeConfidence: secondBestScore
  };
};


const generateHelpResponse = () => {
  const commandList = Object.values(COMMAND_PATTERNS)
    .filter(cmd => cmd.command) // Filter out null commands like HELP
    .map(cmd => `• ${cmd.command} - ${cmd.description}`)
    .join('\n');

  return {
    text: "Available Commands:",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📝 Available Commands",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Here are all the commands you can use:\n\n" + commandList
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "You can use these commands directly or describe what you want to do in natural language!"
        }
      }
    ]
  };
};


const extractParams = (text, commandType) => {
  const params = {};
  
  // Extract coach information
  const coachMatch = text.match(/(?:with|for|and)\s+(?:coach\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (coachMatch) params.coachName = coachMatch[1].trim();
  
  // Extract date information - supports multiple formats
  const datePatterns = [
    /(?:on|for|at)\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,  // MM/DD/YYYY
    /(?:on|for|at)\s+(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,    // YYYY/MM/DD
    /(?:on|for|at)\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i  // Month Day, Year
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      params.date = match[1];
      break;
    }
  }
  
  // Extract time information
  const timeMatch = text.match(/(?:at|from)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (timeMatch) params.time = timeMatch[1];
  
  // Extract duration if applicable
  const durationMatch = text.match(/(?:for|duration|lasting)\s+(\d+)\s*(?:min|minutes|hrs|hours)?/i);
  if (durationMatch) params.duration = durationMatch[1];
  
  // Extract name/title for goals, actions, sessions
  if (commandType === 'goal') {
    const nameMatch = text.match(/goal(?:\s+called|named|titled|about|for)?\s+["']?([^"']+)["']?/i);
    if (nameMatch) params.name = nameMatch[1].trim();
  } else if (commandType === 'action') {
    const nameMatch = text.match(/action(?:\s+called|named|titled|about|for)?\s+["']?([^"']+)["']?/i);
    if (nameMatch) params.name = nameMatch[1].trim();
  } else if (commandType === 'session') {
    const nameMatch = text.match(/session(?:\s+called|named|titled|about|for)?\s+["']?([^"']+)["']?/i);
    if (nameMatch) params.name = nameMatch[1].trim();
  }
  
  return params;
};

/**
 * Process natural language input and detect command intent
 * @param {string} text - User's message
 * @returns {Object} Response object with command, params and message
 */
const processNaturalLanguage = async (text) => {
  const normalizedInput = text.toLowerCase().trim();
  
  // Check for direct command usage
  if (normalizedInput.startsWith('/')) {
    const command = normalizedInput.split(' ')[0];
    // Verify it's a valid command
    const validCommands = Object.values(COMMAND_PATTERNS)
      .map(c => c.command)
      .filter(Boolean);
      
    if (validCommands.includes(command)) {
      return {
        command,
        params: {},
        message: `Executing ${command}...`
      };
    }
  }

  // Check for help request
  if (COMMAND_PATTERNS.HELP.patterns.some(pattern => 
    normalizedInput.includes(pattern) || calculateSimilarity(normalizedInput, pattern) > 0.7)) {
    return {
      command: null,
      params: {},
      message: generateHelpResponse()
    };
  }

  // Find best matching command with improved matching
  const { match, confidence, alternativeMatch, alternativeConfidence } = findBestMatch(normalizedInput);

  // If we have a good match
  if (match && confidence > 0.25) {
    // Determine the command type to extract relevant params
    let commandType = '';
    if (match.command === '/addgoal' || match.command === '/listgoals') {
      commandType = 'goal';
    } else if (match.command === '/addaction' || match.command === '/listactions') {
      commandType = 'action';
    } else if (match.command === '/addsession' || match.command === '/listsessions') {
      commandType = 'session';
    }
    
    // Extract any parameters from the text
    const params = extractParams(text, commandType);
    
    // If confidence is borderline and we have an alternative, suggest it
    if (confidence < 0.4 && alternativeMatch && alternativeConfidence > 0.2) {
      return {
        command: match.command,
        params,
        message: {
          text: `I'll help you with that using the ${match.command} command.`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `I'll help you with that using the *${match.command}* command.`
              }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Did you actually want to ${alternativeMatch.description.toLowerCase()} using *${alternativeMatch.command}* instead?`
              }
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: `Use ${alternativeMatch.command}`,
                    emoji: true
                  },
                  value: alternativeMatch.command,
                  action_id: `execute_command_${alternativeMatch.command.substring(1)}`
                }
              ]
            }
          ]
        }
      };
    }
    
    return {
      command: match.command,
      params,
      message: {
        text: `I'll help you with that using the ${match.command} command.`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `I'll help you with that using the *${match.command}* command.`
            }
          }
        ]
      }
    };
  }

  // No good match found, provide a helpful response with suggestions
  const topCommands = Object.values(COMMAND_PATTERNS)
    .filter(cmd => cmd.command) // Filter out null commands
    .sort(() => 0.5 - Math.random()) // Random shuffle
    .slice(0, 3); // Take first 3
    
  return {
    command: null,
    params: {},
    message: {
      text: "I'm not sure what you want to do. Here are some commands you might be interested in:",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "I'm not sure what you want to do. Here are some commands you might be interested in:"
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: topCommands.map(cmd => `• *${cmd.command}* - ${cmd.description}`).join('\n')
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Or type 'help' to see all available commands."
          }
        }
      ]
    }
  };
};

module.exports = {
  processNaturalLanguage,
  generateHelpResponse
};