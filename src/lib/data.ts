import companiesJson from "@/data/companies.json";
import questionsJson from "@/data/questions.json";
import type { Company, Question } from "@/lib/types";

export const questions: Question[] = questionsJson as Question[];
export const companies: Company[] = companiesJson as Company[];

const questionsByCompany = new Map<string, Question[]>();
for (const q of questions) {
  const list = questionsByCompany.get(q.company);
  if (list) {
    list.push(q);
  } else {
    questionsByCompany.set(q.company, [q]);
  }
}

const companyBySlug = new Map<string, Company>(companies.map((c) => [c.slug, c]));
const questionById = new Map<string, Question>(questions.map((q) => [q.id, q]));

export function getCompany(slug: string): Company | undefined {
  return companyBySlug.get(slug);
}

export function getCompanyQuestions(slug: string): Question[] {
  return questionsByCompany.get(slug) ?? [];
}

export function getQuestionById(id: string): Question | undefined {
  return questionById.get(id);
}

export function getRandomQuestion(): Question {
  return questions[Math.floor(Math.random() * questions.length)];
}

export const TIMEFRAME_LABELS: Record<Question["timeframe"], string> = {
  "30days": "30 Days",
  "3months": "3 Months",
  "6months": "6 Months",
  moreThan6Months: "6+ Months",
  allTime: "All Time",
};
