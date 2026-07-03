import { CreateQuestInput, Quest } from "../types/quest.types";

export class QuestRepository {
    private quests: Quest[] = [];
    private nextQuestId = 1;

    findAll(): Quest[] {
        return this.quests;
    }

    findById(id: number): Quest | undefined {
        return this.quests.find((q) => q.id === id);
    }

    create(questData: CreateQuestInput): Quest {
        const quest: Quest = {
            id: this.nextQuestId,
            title: questData.title.trim(),
            difficulty: questData.difficulty,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.quests.push(quest);
        this.nextQuestId++;

        return {
            ...quest,
        };
    }

    save(quest: Quest): Quest {
        const index = this.quests.findIndex((q) => q.id === quest.id);

        if (index !== -1) {
            this.quests[index] = quest;
        }

        this.quests[index] = quest;

        return {
            ...quest
        };
    }
}