import { MongooseService, mongooseUtils } from '../mongoose-utils.ts';
import User, { IUser } from '../../models/User';
import CV, { ICV } from '../../models/CV';
import JobApplication, { IJobApplication } from '../../models/JobApplication';
import CoverLetter, { ICoverLetter } from '../../models/CoverLetter';
import Template, { ITemplate } from '../../models/Template';
import Snippet, { ISnippet } from '../../models/Snippet';
import CVData, { ICVData } from '../../models/CVData';

// Create service instances
export const userService = new MongooseService<IUser>(User);
export const cvService = new MongooseService<ICV>(CV);
export const jobApplicationService = new MongooseService<IJobApplication>(JobApplication);
export const coverLetterService = new MongooseService<ICoverLetter>(CoverLetter);
export const templateService = new MongooseService<ITemplate>(Template);
export const snippetService = new MongooseService<ISnippet>(Snippet);
export const cvDataService = new MongooseService<ICVData>(CVData);

// Export utilities
export { mongooseUtils };

// Export types
export type {
  IUser,
  ICV,
  IJobApplication,
  ICoverLetter,
  ITemplate,
  ISnippet,
  ICVData
}; 