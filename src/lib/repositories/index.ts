/**
 * Repository Layer
 *
 * Central exports for all repository patterns.
 * This is the data access layer that sits between services and models.
 */

export {
  BaseRepository,
  type RepositoryOptions,
  type PaginationOptions,
  type PaginatedResult,
} from './base-repository';

export {
  UserRepository,
  userRepository,
} from './user-repository';

export {
  CVRepository,
  cvRepository,
} from './cv-repository';

// TODO: Create these repositories
// export {
//   JobRepository,
//   jobRepository,
// } from './job-repository';

// export {
//   CoverLetterRepository,
//   coverLetterRepository,
// } from './cover-letter-repository';