import { ValidationError } from "../errors/app-error";
import { QuestRepository } from "../repositories/quest.repositories";
import { CreateQuestInput, Quest } from "../types/quest.types";

export class QuestService {
    constructor(private readonly questRepository: QuestRepository) {}

    listQuests(): { count: number; quests: Quest[] } {
        const quests = this.questRepository.findAll();

        return {
            count: quests.length,
            quests
        };
    }

    createQuest(input: CreateQuestInput): Quest {
        const title = input.title.trim();
        

        if (!title) {
            throw new ValidationError("Quest title cannot be empty");
        }

        const quest = this.questRepository.create({
            title,
            difficulty: input.difficulty,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        });

        return {
            ...quest
        }
    }

    completeQuest(id: number): Quest {
        const quest = this.questRepository.findById(id);

        if (!quest) {
            throw new ValidationError("Quest not found");
        }

        if (quest.completed) {
            throw new ValidationError("Quest is already completed");
        }
        const completedQuest: Quest = {
            ...quest,
            completed: true,
            completedAt: new Date().toISOString()
        };

        const savedQuest = this.questRepository.save(completedQuest);

        return {
            ...savedQuest
        }
    }
}