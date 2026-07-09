import { ValidationError } from "labs/13-services-and-repositories/src/errors/app-error";
import { QuestRepository } from "./quest.repository";
import { CreateQuestInput, Quest } from "./quest.types";
import { NotFoundError } from "labs/12-fastify-project-structure/src/errors/app-error";

export class QuestService {
    constructor(private readonly questRepository: QuestRepository) {}

    async listQuests() {
        const quests = await this.questRepository.findAll();

        return {
            count: quests.length,
            quest: quests,
        }
    }

    async createQuest(input: CreateQuestInput) {
        const title = input.title.trim();

        if(!title) {
            throw new ValidationError("Quest title not found.");
        }

        return this.questRepository.create({
            title,
            difficulty: input.difficulty,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null,
        });
    }

    async completeQuest(id: number) {
        const quest = await this.questRepository.findById(id);

        if(!quest) {
            throw new NotFoundError("Quest was not found.");
        }

        if(quest.completed) {
            return quest;
        }

        const completedQuest: Quest = {
            ...quest,
            completed: true,
            completedAt: new Date().toISOString(),
        }

        const savedQuest = await this.questRepository.save(completedQuest);

        if(!savedQuest) {
            throw new NotFoundError("Quest was not found.");
        }

        return savedQuest;
    } 
}