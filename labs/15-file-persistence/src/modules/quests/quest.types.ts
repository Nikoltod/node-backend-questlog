export type QuestDifficulty = "easy" | "medium" | "hard";

export type Quest = {
    id: number;
    title: string;
    difficulty: QuestDifficulty;
    completed: boolean;
    createdAt: string;
    completedAt: string | null;
};

export type QuestStore = {
  nextQuestId: number;
  quests: Quest[];
};

export type CreateQuestInput = {
    title: string;
    difficulty: QuestDifficulty;
};

export type CreateQuestBody = {
    title: string;
    difficulty: QuestDifficulty;
};

export type CompleteQuestParams = {
    id: string;
};

export type CreateQuestRouteTypes = {
    Body: CreateQuestBody;
};

export type CompleteQuestRouteTypes = {
    Params: CompleteQuestParams;
};