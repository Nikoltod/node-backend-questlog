import { NotFoundError } from "../../errors/app-error";
import { QuestRepository } from "./quest.repository";
import { CreateQuestInput, Quest } from "./quest.types";

export class QuestService {
    constructor(private readonly QuestRepository: QuestRepository) {}

    listQuests() {
        const quests = this.QuestRepository.findAll();

        return {
            count: quests.length,
            quests,
        };
    }

    createQuest(input: CreateQuestInput) {
        const title = input.title.trim();

        if(!title) {
            throw new NotFoundError("Quest title is required.");
        }

        return this.QuestRepository.create({
            title,
            difficulty: input.difficulty,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
        });
    }

    completeQuest(id: number) {
        const quest = this.QuestRepository.findById(id);

        if(!quest) {
            throw new NotFoundError("Quest was not found.");
        }

        if(quest.completed){
            return quest;
        }

        const completedQuest: Quest = {
            ...quest,
            completed: true,
            completedAt: new Date().toISOString(),
        }

        const savedQuest = this.QuestRepository.save(completedQuest);

        if(!savedQuest) {
            throw new NotFoundError("Quest was not found.");
        }

        return savedQuest;
    }
}