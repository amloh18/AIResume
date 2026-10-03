import { Issue, ResumeState, IssueType } from './types';

export interface Rule {
    id: string;
    type: IssueType;
    evaluate: (state: ResumeState) => Issue[];
}

export class RuleRegistry {
    private rules: Rule[] = [];

    register(rule: Rule) {
        this.rules.push(rule);
    }

    registerMany(rules: Rule[]) {
        rules.forEach(r => this.register(r));
    }

    clear() {
        this.rules = [];
    }

    runAll(state: ResumeState): Issue[] {
        let allIssues: Issue[] = [];
        this.rules.forEach(rule => {
            try {
                const issues = rule.evaluate(state);
                allIssues = allIssues.concat(issues);
            } catch (error) {
                console.error(`Rule execution failed: ${rule.id}`, error);
            }
        });
        return allIssues;
    }
}

export const globalRegistry = new RuleRegistry();
