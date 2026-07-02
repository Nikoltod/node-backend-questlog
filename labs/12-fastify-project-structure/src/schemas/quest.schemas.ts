export const createQuestSchema = {
  body: {
    type: "object",
    required: ["title", "difficulty"],
    properties: {
      title: {
        type: "string",
        minLength: 1,
        maxLength: 120,
      },
      difficulty: {
        type: "string",
        enum: ["easy", "medium", "hard"],
      },
    },
    additionalProperties: false,
  },
} as const;

export const completeQuestSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: {
        type: "string",
        pattern: "^[0-9]+$",
      },
    },
  },
} as const;