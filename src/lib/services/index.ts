import 'server-only';
import { MongooseService, mongooseUtils } from '../mongoose-utils';
import User, { IUser } from '../../models/User';
import CV, { ICV } from '../../models/CV';
import JobApplication, { IJobApplication } from '../../models/JobApplication';
import CoverLetter, { ICoverLetter } from '../../models/CoverLetter';

// Create service instances
export const userService = new MongooseService<IUser>(User);
export const cvService = new MongooseService<ICV>(CV);
export const jobApplicationService = new MongooseService<IJobApplication>(JobApplication);
export const coverLetterService = new MongooseService<ICoverLetter>(CoverLetter);

// Export utilities
export { mongooseUtils };

// Export types
export type {
  IUser,
  ICV,
  IJobApplication,
  ICoverLetter
}; 