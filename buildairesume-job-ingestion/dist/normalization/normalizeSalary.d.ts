import { JobSalary, SalaryPeriod } from '../models/Job';
export declare function normalizeSalary(rawSalaryText?: string, rawMin?: number, rawMax?: number, rawCurrency?: string, rawPeriod?: SalaryPeriod): JobSalary;
